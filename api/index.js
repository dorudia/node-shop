const { app, connectDB } = require("../app");
const serverless = require("serverless-http");

connectDB().then(() => console.log("MongoDB connected"));

module.exports.handler = serverless(app);
