const express = require("express");
const { check, body } = require("express-validator");

const authController = require("../controllers/auth");

const router = express.Router();

router.get("/login", authController.getLogin);

router.get("/signup", authController.getSignup);

router.post(
  "/login",
  check("email")
    .isEmail()
    .withMessage("Please enter a valid email.")
    .normalizeEmail(),
  check("password")
    .isLength({ min: 4 })
    .withMessage("Password must be at least 4 characters long!!!")
    .trim(),
  authController.postLogin
);

router.post(
  "/signup",
  check("email")
    .isEmail()
    .withMessage("Please enter a valid email.")
    .normalizeEmail(),
  check("password")
    .isLength({ min: 4 })
    .withMessage("Password must be at least 4 characters long.")
    .trim(),
  check("confirmPassword")
    .custom((value, { req }) => {
      if (value.trim() !== req.body.password.trim()) {
        throw new Error("Password and confirm password have to match");
      }
      return true;
    })
    .trim(),
  authController.postSignup
);

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;
