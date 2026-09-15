const { extractPdfText } = require("../services/pdfParser");
const { parseTransactions, buildSummary } = require("../services/statementParser");
const { aiCategorize } = require("../services/aiCategorizer");
const { addEntry, getEntries } = require("../services/historyStore");

// POST /api/statements/upload — accepts a PDF, extracts raw text + structured data
async function uploadStatement(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded" });
  }

  console.log(`[upload] file: ${req.file.originalname} (${req.file.size} bytes)`);

  const { text, pages } = await extractPdfText(req.file.buffer);
  const transactions = parseTransactions(text);
  console.log(`[upload] pages: ${pages} | transactions: ${transactions.length}`);

  const unknownMerchants = [
    ...new Set(
      transactions.filter((t) => t.category === "Other").map((t) => t.merchant)
    ),
  ];
  console.log(`[upload] Other merchants after keywords: ${unknownMerchants.length}`);

  if (unknownMerchants.length > 0) {
    const map = await aiCategorize(unknownMerchants);
    if (map) {
      let applied = 0;
      for (const t of transactions) {
        if (t.category === "Other" && map[t.merchant] && map[t.merchant] !== "Other") {
          t.category = map[t.merchant];
          applied++;
        }
      }
      console.log(`[upload] AI map applied to ${applied} transaction(s)`);
    } else {
      console.log("[upload] AI returned null → keeping keyword-only categories");
    }
  }

  const summary = buildSummary(transactions);

  try {
    const entry = addEntry({
      fileName: req.file.originalname,
      totalPages: pages,
      transactionCount: summary.transactionCount,
      summary,
      transactions,
    });
    console.log(`[upload] history saved: ${entry.id}`);
  } catch (e) {
    console.error("[upload] history save failed:", e.message);
  }

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