// const mysql = require("mysql2");

// const pool = mysql.createPool({
//   host: "localhost",
//   user: "root",
//   database: "node-course",
//   password: "33447755",
// });

// module.exports = pool.promise();

//----------------------------------------------------------------------------

// const Sequelize = require("sequelize");

// const sequelize = new Sequelize("node-course", "root", "33447755", {
//   dialect: "mysql",
//   host: "localhost",
// });

// module.exports = sequelize;

//-------------------------------mongoDb Driver---------------------------------------------

// const mongdb = require("mongodb");

// const MongoClient = mongdb.MongoClient;

// let _db;

// const mongoConect = (callbak) => {
//   MongoClient.connect(
//     "mongodb+srv://dorudia:doru3344@cluster0.5hrrygn.mongodb.net/?appName=Cluster0"
//   )
//     .then((client) => {
//       console.log("✅Connected to mongoDB!");
//       _db = client.db("node-shop");
//       callbak();
//     })
//     .catch((err) => {
//       console.log(err);
//       throw err;
//     });
// };

// const getDb = () => {
//   if (_db) {
//     return _db;
//   }
//   throw "No database found!";
// };

// exports.mongoConect = mongoConect;
// exports.getDb = getDb;
