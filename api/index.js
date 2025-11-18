// api/index.js
const serverless = require("serverless-http");
const { app } = require("../app");
const mongoose = require("mongoose");

let conn = null;

async function connectDB() {
  if (conn) return conn; // deja conectat
  conn = await mongoose.connect(process.env.MONGODB_URL);
  return conn;
}

module.exports.handler = async (req, res) => {
  try {
    await connectDB(); // asigură conexiunea
    return serverless(app)(req, res);
  } catch (err) {
    console.error("MongoDB connection error:", err);
    res.status(500).send("Internal Server Error");
  }
};
