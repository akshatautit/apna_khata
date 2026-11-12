const multer = require("multer");
const { maxFileSizeMB } = require("../config/env");

// Store the uploaded PDF in memory (not on disk) since we just parse it
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: maxFileSizeMB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"), false);
    }
  },
});

module.exports = upload;