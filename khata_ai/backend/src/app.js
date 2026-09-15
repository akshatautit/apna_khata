const express = require("express");
const cors = require("cors");
const apiRouter = require("./routes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());

// Simple request logger — helps debug on Render (visible in Logs tab)
app.use((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.originalUrl}`);
  next();
});

// Mount all /api routes
app.use("/api", apiRouter);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Khaata AI backend is running!" });
});

// 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Central error handler (must be last)
app.use(errorHandler);

module.exports = app;