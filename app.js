// const path = require("path");
// const mongoose = require("mongoose");
// const express = require("express");
// const bodyParser = require("body-parser");
// const User = require("./models/user");
// const errorController = require("./controllers/error");
// const session = require("express-session");
// const MongoDBStore = require("connect-mongodb-session")(session);
// const csrf = require("csurf");
// const flash = require("connect-flash");
// const multer = require("multer");
// const dotenv = require("dotenv").config();
// const { storage } = require("./util/cloudinary");
// // const PORT = process.env.PORT || 3000;

// const app = express();
// const store = new MongoDBStore({
//   uri: "mongodb+srv://dorudia:doru3344@cluster0.5hrrygn.mongodb.net/node-shop?appName=NodeShop",
//   collection: "sessions",
// });

// app.set("view engine", "ejs");
// app.set("views", "views");

// const adminRoutes = require("./routes/admin");
// const shopRoutes = require("./routes/shop");
// const authRoutes = require("./routes/auth");

// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(multer({ storage }).single("image"));

// app.use(express.static(path.join(__dirname, "public")));
// // app.use("/images", express.static(path.join(__dirname, "images")));

// app.use(
//   session({
//     secret: "my secret",
//     resave: false,
//     saveUninitialized: false,
//     store: store,
//   })
// );

// const csrfProtection = csrf();
// app.use(csrfProtection);

// app.use(flash());

// app.use((req, res, next) => {
//   if (!req.session.user) {
//     return next();
//   }
//   User.findById(req.session.user._id)
//     .then((user) => {
//       if (!user) {
//         return next();
//       }
//       req.user = user;
//       next();
//     })
//     .catch((err) => {
//       throw new Error(err);
//       // next(new Error(err));
//     });
// });

// app.use((req, res, next) => {
//   res.locals.isAuthenticated = req.session.isLoggedIn;
//   res.locals.csrfToken = req.csrfToken();
//   next();
// });

// app.use("/admin", adminRoutes);
// app.use(shopRoutes);
// app.use(authRoutes);

// app.get("/500", errorController.get500);

// app.use(errorController.get404);

// // Pentru serverless deployment
// let conn = null;

// async function connectDB() {
//   if (conn) return conn; // deja conectat
//   conn = await mongoose.connect(process.env.MONGODB_URL);
//   return conn;
// }

// mongoose.connect(process.env.MONGODB_URL)
//   .then(() => app.listen(PORT, ...))
//   .catch(err => console.log(err));

// module.exports = app;

const path = require("path");
const mongoose = require("mongoose");
const express = require("express");
const bodyParser = require("body-parser");
const User = require("./models/user");
const errorController = require("./controllers/error");
const session = require("express-session");
// const MongoDBStore = require("connect-mongodb-session")(session);
const MongoStore = require("connect-mongo");
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
require("dotenv").config(); // deblocat pentru local
const { storage } = require("./util/cloudinary");

const PORT = process.env.PORT || 3000;

const app = express();

// const store = new MongoDBStore({
//   uri: process.env.MONGODB_URL,
//   collection: "sessions",
// });

const store = MongoStore.create({
  mongoUrl: process.env.MONGODB_URL,
  collectionName: "sessions",
});

app.set("view engine", "ejs");
app.set("views", "views");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage }).single("image"));

app.use(express.static(path.join(__dirname, "public")));
// nu mai folosi /images pe disk, Cloudinary e folosit deja

app.use(
  session({
    secret: process.env.SESSION_SECRET || "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

const csrfProtection = csrf();
app.use(csrfProtection);

app.use(flash());

// setare user în req.user
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      throw new Error(err);
    });
});

// variabile locale pentru template-uri
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

// routes
app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get("/500", errorController.get500);
app.use(errorController.get404);

// --- CONNECT MONGODB + START SERVER ---
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.log(err));

module.exports = app; // poți să-l lași pentru test/unit
