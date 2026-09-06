const multer = require("multer");

// Central error handler: converts thrown errors into proper HTTP responses
function errorHandler(err, req, res, next) {
  console.error("Error:", err.message);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err.message === "Only PDF files are allowed!") {
    return res.status(400).json({ error: err.message });
  }

  return res.status(err.status || 500).json({
    error: err.message || "Something went wrong",
  });
}

module.exports = errorHandler;