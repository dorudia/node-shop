const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config(); // citește .env

// cloudinary va citi automat CLOUDINARY_URL din .env
cloudinary.config({
  secure: true, // folosește HTTPS
});

// configurăm storage-ul pentru multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "node-shop", // folderul unde vor fi salvate imaginile
    allowed_formats: ["jpg", "jpeg", "png"], // ce formate acceptăm
  },
});

module.exports = { cloudinary, storage };
