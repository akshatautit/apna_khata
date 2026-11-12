const mongoose = require("mongoose");
const { mongoUri } = require("./config/env");

async function connectDB() {
  if (!mongoUri) {
    console.warn("[db] MONGODB_URI not set — skipping MongoDB connection. History will be unavailable.");
    return false;
  }
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    console.log("[db] connected to MongoDB");
    return true;
  } catch (err) {
    console.error("[db] connection failed:", err.message);
    throw err;
  }
}

module.exports = { connectDB, mongoose };