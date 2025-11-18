const serverless = require("serverless-http");
const app = require("../app"); // importă app.js
module.exports.handler = serverless(app);
