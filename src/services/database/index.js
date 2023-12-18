require('dotenv').config();
const UserDatabaseMongoDB = require("./userDatabase.mongodb")
const connectionInfo = process.env.DB_CONNECTION_STRING

const database = connectionInfo
    ? new UserDatabaseMongoDB(connectionInfo)
    : new UserDatabaseMongoDB(connectionInfo)

module.exports = database