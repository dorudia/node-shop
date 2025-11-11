const path = require("path");
const { check, body } = require("express-validator");

const express = require("express");

const adminController = require("../controllers/admin");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

// /admin/add-product => GET
router.get("/add-product", isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get("/products", isAuth, adminController.getProducts);

// // /admin/add-product => POST
router.post(
  "/add-product",
  check("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .isLength({ min: 3, max: 100 })
    .trim()
    .withMessage("Title must be between 3 and 100 characters long"),
  check("imageUrl").isURL().trim().withMessage("Please enter a valid URL"),
  check("price").isFloat().trim().withMessage("Please enter a valid price"),
  check("description")
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 4, max: 400 })
    .trim()
    .withMessage("Description must be between 5 and 400 characters long"),
  isAuth,
  adminController.postAddProduct
);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

router.post(
  "/edit-product",
  check("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .isLength({ min: 3, max: 100 })
    .trim()
    .withMessage("Title must be between 3 and 100 characters long"),
  check("imageUrl").isURL().trim().withMessage("Please enter a valid URL"),
  check("price").isFloat().trim().withMessage("Please enter a valid price"),
  check("description")
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 4, max: 400 })
    .trim()
    .withMessage("Description must be between 5 and 400 characters long"),
  isAuth,
  adminController.postEditProduct
);

router.post("/delete-product", isAuth, adminController.postDeleteProduct);

module.exports = router;
