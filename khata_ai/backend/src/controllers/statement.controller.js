const { extractPdfText } = require("../services/pdfParser");
const { parseTransactions, buildSummary } = require("../services/statementParser");
const { aiCategorize } = require("../services/aiCategorizer");
const { addEntry, getEntries } = require("../services/historyStore");

// POST /api/statements/upload — accepts a PDF, extracts raw text + structured data
async function uploadStatement(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded" });
  }

  const { text, pages } = await extractPdfText(req.file.buffer);

  const transactions = parseTransactions(text);

  const unknownMerchants = [
    ...new Set(
      transactions.filter((t) => t.category === "Other").map((t) => t.merchant)
    ),
  ];
  if (unknownMerchants.length > 0) {
    const map = await aiCategorize(unknownMerchants);
    if (map) {
      for (const t of transactions) {
        if (t.category === "Other" && map[t.merchant] && map[t.merchant] !== "Other") {
          t.category = map[t.merchant];
        }
      }
    }
  }

  const summary = buildSummary(transactions);

  try {
    addEntry({
      fileName: req.file.originalname,
      totalPages: pages,
      transactionCount: summary.transactionCount,
      summary,
      transactions,
    });
  } catch {}

  res.json({
    message: "PDF parsed successfully",
    fileName: req.file.originalname,
    totalPages: pages,
    rawText: text,
    transactions,
    summary,
  });
}

function getHistory(req, res) {
  res.json({ entries: getEntries() });
}

module.exports = { uploadStatement, getHistory };