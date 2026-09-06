const { extractPdfText } = require("../services/pdfParser");

// POST /api/statements/upload — accepts a PDF, returns its raw text
async function uploadStatement(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded" });
  }

  const { text, pages } = await extractPdfText(req.file.buffer);

  res.json({
    message: "PDF parsed successfully",
    fileName: req.file.originalname,
    totalPages: pages,
    rawText: text,
  });
}

module.exports = { uploadStatement };