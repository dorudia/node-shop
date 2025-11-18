const Product = require("../models/product");
const Order = require("../models/order");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY_TEST);

exports.getProducts = (req, res, next) => {
  Product.find()
    .then((products) => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "All Products",
        path: "/products",
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => console.log(err));
};

exports.getIndex = (req, res, next) => {
  Product.find()
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
        // isAuthenticated: req.session.isLoggedIn,
        // csrfToken: req.csrfToken(),
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items.filter((p) => p.productId);
      total = 0;
      products.forEach((p) => {
        total += p.quantity * p.productId.price;
      });
      console.log("😡", JSON.stringify(products, null, 2));

      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
        totalSum: total,
      });
    })
    .catch((err) => console.log(err));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      console.log(result);
      res.redirect("/cart");
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => console.log(err));
};

exports.getCheckout = (req, res, next) => {
  let products;
  let total = 0;

  req.user
    .populate("cart.items.productId")
    .then((user) => {
      // 1. Filtrăm produsele invalide (cele șterse din DB)
      products = user.cart.items.filter((p) => p.productId);

      // 2. Curățăm cart-ul automat (opțional dar recomandat)
      user.cart.items = products;
      return user.save();
    })
    .then(() => {
      // 3. Calculăm totalul
      total = 0;
      products.forEach((p) => {
        total += p.quantity * p.productId.price;
      });

      // 4. Creăm sesiunea Stripe
      return stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: products.map((p) => {
          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: p.productId.title,
                description: p.productId.description,
              },
              unit_amount: p.productId.price * 100, // centi
            },
            quantity: p.quantity,
          };
        }),
        mode: "payment",
        success_url:
          req.protocol + "://" + req.get("host") + "/checkout/success",
        cancel_url: req.protocol + "://" + req.get("host") + "/checkout/cancel",
      });
    })
    .then((session) => {
      // 5. Randăm pagina
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products: products,
        totalSum: total,
        sessionId: session.id,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items
        .filter((i) => i.productId)
        .map((i) => {
          return { quantity: i.quantity, product: { ...i.productId._doc } };
        });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save().then((result) => {
        return req.user.clearCart();
      });
    })
    .then((result) => {
      res.redirect("/orders");
    })
    .catch((err) => console.log(err));
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.session.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders.reverse(),
      });
    })
    .catch((err) => console.log(err));
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("No order found"));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unauthorized"));
      }
      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);

      const pdfDoc = new PDFDocument({ margin: 50 });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${invoiceName}"`);

      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      // === HEADER ===
      pdfDoc
        .fontSize(26)
        .fillColor("#333")
        .text("Invoice", { align: "center", underline: true });
      pdfDoc.moveDown();

      pdfDoc
        .fontSize(14)
        .fillColor("#555")
        .text(`Order ID: ${order._id}`)
        .text(
          `Date: ${new Date(order.createdAt).toLocaleDateString("ro-RO", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}`
        );
      pdfDoc.moveDown(2);

      // === TABLE HEADER ===
      const startX = 60;
      let y = pdfDoc.y;

      pdfDoc
        .fontSize(16)
        .fillColor("#000")
        .text("Product", startX, y)
        .text("Qty", startX + 220, y)
        .text("Price", startX + 300, y)
        .text("Subtotal", startX + 400, y);

      y += 20;

      // Linie sub antet
      pdfDoc
        .moveTo(startX, y)
        .lineTo(startX + 480, y)
        .strokeColor("#aaa")
        .stroke();

      y += 10;

      // === PRODUCTS ===
      let totalPrice = 0;
      order.products.forEach((p) => {
        const subtotal = p.quantity * p.product.price;
        totalPrice += subtotal;

        pdfDoc
          .fontSize(14)
          .fillColor("#333")
          .text(p.product.title, startX, y)
          .text(p.quantity.toString(), startX + 220, y)
          .text(`$${p.product.price.toFixed(2)}`, startX + 300, y)
          .text(`$${subtotal.toFixed(2)}`, startX + 400, y);

        y += 20;
      });

      // Linie finală
      pdfDoc
        .moveTo(startX, y)
        .lineTo(startX + 480, y)
        .strokeColor("#aaa")
        .stroke();

      y += 30;

      // === TOTAL ===
      pdfDoc
        .fontSize(18)
        .fillColor("#000")
        .text(`Total: $${totalPrice.toFixed(2)}`, startX + 350, y);

      pdfDoc.end();

      const fileStream = fs.createReadStream(invoicePath);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="' + invoiceName + '"'
      );
      fileStream.pipe(res);
    })
    .catch((err) => console.log(err));
};
