const { PDFParse } = require("pdf-parse");

/**
 * Extracts raw text from a PDF buffer (pdf-parse v2 API).
 * @param {Buffer} buffer - the PDF file content
 * @returns {Promise<{ text: string, pages: number }>}
 */
async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return { text: result.text, pages: result.total };
}

module.exports = { extractPdfText };