const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

module.exports = {
  port: process.env.PORT || 5000,
  maxFileSizeMB: 10,
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "khata-dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};