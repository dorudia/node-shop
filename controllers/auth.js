const User = require("../models/user");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const crypto = require("crypto");
const { validationResult } = require("express-validator");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "dorudia@gmail.com",
    pass: "nimztburkujuaqqf",
  },
});

exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    isAuthenticated: false,
    errorMessage: req.flash("error"),
    oldInput: {
      email: "",
      password: "",
    },
  });
};

exports.getSignup = (req, res, next) => {
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    isAuthenticated: false,
    errorMessage: req.flash("error"),
    oldInput: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      isAuthenticated: false,
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
      },
    });
  } // Se termina aici
  User.findOne({ email: email }).then((user) => {
    if (!user) {
      console.log("User not found");
      req.flash("error", "User not found");
      return res.render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        isAuthenticated: false,
        errorMessage: req.flash("error"),
        oldInput: {
          email: email,
          password: password,
        },
      });
    } else {
      return bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              console.log(err);
              res.redirect("/");
            });
          }
          req.flash("error", "Invalid password");
          res.render("auth/login", {
            path: "/login",
            pageTitle: "Login",
            isAuthenticated: false,
            errorMessage: req.flash("error"),
            oldInput: {
              email: email,
              password: password,
            },
          });
        })
        .catch((err) => console.log(err));
    }
  });
};

exports.postSignup = (req, res, next) => {
  const { email, password, confirmPassword } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      isAuthenticated: false,
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: confirmPassword,
      },
    });
  }

  User.findOne({ email: email })
    .then((user) => {
      if (user) {
        req.flash("error", "User already exists");
        console.log("User already exists");
        return res.render("auth/signup", {
          path: "/signup",
          pageTitle: "Signup",
          isAuthenticated: false,
          errorMessage: req.flash("error"),
          oldInput: {
            email: email,
            password: password,
            confirmPassword: confirmPassword,
          },
        }); // ✅ redirect + stop aici
      }

      // dacă user nu există, hashăm parola
      return bcrypt.hash(password, 12).then((hashedPassword) => {
        return User.create({
          email,
          password: hashedPassword,
          cart: { items: [] },
        });
      });
    })
    .then((newUser) => {
      if (!newUser) return; // aici vine dacă s-a făcut redirect deja

      req.session.isLoggedIn = true;
      req.session.user = newUser;
      req.session.save((err) => {
        transporter
          .sendMail({
            from: "dorudia@gmail.com",
            to: email,
            subject: "Signup succeeded!",
            text: "Wlecome, You successfully signed up to our website node-shop!",
          })
          .catch((err) => console.log("Error sending email", err));
        res.redirect("/login");
      });
    })
    .catch((err) => console.log("Error creating user", err));
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  res.render("auth/reset-password", {
    path: "/reset",
    pageTitle: "Reset Password",
    isAuthenticated: false,
    errorMessage: req.flash("error"),
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with that email found.");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user
          .save()
          .then((result) => {
            res.redirect("/");
            transporter
              .sendMail({
                from: "dorudia@gmail.com",
                to: req.body.email,
                subject: "Reset Password",
                html: `
                <h1>You requested a password reset</h1>
                <h2>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</h2>
                `,
              })
              .catch((err) => console.log("Error sending email", err));
          })
          .catch((err) => console.log(err));
      })
      .catch((err) => console.log(err));
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      res.render("auth/new-password-form", {
        path: "/new-password",
        pageTitle: "New Password",
        isAuthenticated: false,
        errorMessage: req.flash("error"),
        userId: user._id.toString(),
        passwordToken: token,
      });
    })
    .catch((err) => console.log(err));
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      res.redirect("/login");
    })
    .catch((err) => console.log(err));
};
