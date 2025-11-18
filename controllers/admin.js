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

  const imageUrl = req.file.path;

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

const { cloudinary } = require("../util/cloudinary"); // exportă cloudinary.v2 acolo

exports.postEditProduct = async (req, res, next) => {
  const prodId = req.body.productId;
  const image = req.file;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const updatedDesc = req.body.description;

  try {
    const product = await Product.findById(prodId);
    if (!product) return res.redirect("/");

    if (product.userId.toString() !== req.user._id.toString()) {
      return res.redirect("/");
    }

    const oldImageUrl = product.imageUrl;
    const oldPublicId = oldImageUrl ? extractPublicId(oldImageUrl) : null;

    product.title = updatedTitle;
    product.price = updatedPrice;
    product.description = updatedDesc;

    if (image) {
      // noul URL (multer-storage-cloudinary)
      const newUrl = image.path;
      const newPublicId = extractPublicId(newUrl);

      product.imageUrl = newUrl;

      try {
        await product.save(); // încercăm să salvăm cu noul URL
      } catch (saveErr) {
        // save a picat → curățăm imaginea nouă (ca să nu rămână orphan)
        if (newPublicId) {
          try {
            await cloudinary.uploader.destroy(newPublicId);
          } catch (cleanupErr) {
            console.error("Cleanup failed for new image:", cleanupErr);
          }
        }
        console.error("Error saving product after image upload:", saveErr);
        return res.redirect("/500");
      }

      // dacă ajungem aici, save a reușit -> ștergem imaginea veche
      if (oldPublicId) {
        try {
          await cloudinary.uploader.destroy(oldPublicId);
        } catch (destroyErr) {
          console.error(
            "Failed to delete old image from Cloudinary:",
            destroyErr
          );
          // nu blocăm utilizatorul — logăm doar
        }
      }

      return res.redirect("/admin/products");
    } else {
      // fără imagine nouă — doar salvăm modificările obișnuite
      await product.save();
      return res.redirect("/admin/products");
    }
  } catch (err) {
    console.error("Error in postEditProduct:", err);
    return res.redirect("/500");
  }
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

exports.postDeleteProduct = async (req, res, next) => {
  const prodId = req.body.productId;
  try {
    const product = await Product.findById(prodId);
    if (!product) {
      return res.redirect("/admin/products");
    }

    const publicId = product.imageUrl
      ? extractPublicId(product.imageUrl)
      : null;

    // Ștergem din DB (asigurăm integritatea DB)
    await Product.deleteOne({ _id: prodId, userId: req.user._id });

    // Apoi încercăm să ștergem imaginea din Cloudinary
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error(
          "Failed to delete image from Cloudinary after product deletion:",
          err
        );
        // nu putem face rollback ușor; logăm și, eventual, planificăm retry
      }
    }

    console.log("DESTROYED PRODUCT");
    return res.redirect("/admin/products");
  } catch (err) {
    console.error("Error deleting product:", err);
    return res.redirect("/500");
  }
};

// utility function to extract public ID from Cloudinary URL
function extractPublicId(url) {
  // Exemple URL:
  // https://res.cloudinary.com/dvxjznoxa/image/upload/v1763482049/node-shop/asdfg.jpg
  // public_id -> node-shop/asdfg
  try {
    const parts = url.split("/"); // desparte
    // găsim segmentul după "upload/" și luăm restul până la extensie
    const uploadIndex = parts.findIndex((p) => p === "upload");
    if (uploadIndex === -1) return null;
    const afterUpload = parts.slice(uploadIndex + 1).join("/"); // v1763.../node-shop/asdfg.jpg
    // scoatem eventualul version prefix (v12345) dacă există
    const segments = afterUpload.split("/");
    if (segments[0].startsWith("v") && /^\bv\d+\b/.test(segments[0])) {
      segments.shift();
    }
    const last = segments.join("/"); // node-shop/asdfg.jpg
    const publicId = last.replace(/\.[^/.]+$/, ""); // scoatem extensia
    return publicId;
  } catch (err) {
    return null;
  }
}
