const Product = require("../models/product");
const { validationResult } = require("express-validator");
const fileHelper = require("../util/file");

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: [],
    product: {
      title: "",
      imageUrl: "",
      price: "",
      description: "",
    },
    addedValues: {
      title: "",
      imageUrl: "",
      price: "",
      description: "",
    },
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;

  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      product: {
        title: title,
        price: price,
        description: description,
      },
      hasError: true,
      errorMessage: "Attached file is not an image",
      validationErrors: [],
      addedValues: {
        title: title,
        // imageUrl: image.path,
        price: price,
        description: description,
      },
    });
  }

  const imageUrl = image.path;

  const product = new Product({
    title,
    price,
    description,
    imageUrl,
    userId: req.session.user._id,
  });
  console.log({ imageUrl });

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("❌ ➡️", errors.array()[0]);
    return res.render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      product: product,
      hasError: true,
      errorMessage: errors.array()[0].msg,
      addedValues: {
        title: title,
        // imageUrl: imageUrl,
        price: price,
        description: description,
      },
    });
  }

  product
    .save()
    .then((result) => {
      // console.log(result);
      console.log("✅Created Product");
      res.redirect("/admin/products");
    })
    .catch((err) => {
      console.log("❌Error Creating Product", err);
      res.redirect("/500");
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    // Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: [],
        addedValues: {
          title: product.title,
          imageUrl: product.imageUrl,
          price: product.price,
          description: product.description,
        },
      });
    })
    .catch((err) => console.log(err));
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("❌ ➡️", errors.array()[0]);
    return res.render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/add-product",
      editing: false,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId,
      },
      hasError: true,
      errorMessage: errors.array()[0].msg,
      addedValues: {
        title: req.body.title,
        // imageUrl: req.body.imageUrl,
        price: req.body.price,
        description: req.body.description,
      },
    });
  }

  Product.findById(prodId)
    .then((product) => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }

      return product.save().then((result) => {
        console.log("✅UPDATED PRODUCT!");
        res.redirect("/admin/products");
      });
    })
    .catch((err) => {
      console.log("❌Error Updating Product", err);
      res.redirect("/500");
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    .then((products) => {
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
      });
    })
    .catch((err) => console.log(err));
};

exports.postDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        console.log("Product not found");
      }
      fileHelper.deleteFile(product.imageUrl);
    })
    .catch((err) => {
      console.log(err);
      return res.redirect("/admin/products");
    });
  Product.deleteOne({ _id: prodId, userId: req.user._id })
    .then(() => {
      console.log("DESTROYED PRODUCT");
      res.redirect("/admin/products");
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/500");
    });
};
