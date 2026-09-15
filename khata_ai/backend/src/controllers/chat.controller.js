const { getEntries } = require("../services/historyStore");

const CATEGORIES = [
  "Food",
  "Grocery",
  "Transport",
  "Bills & Utilities",
  "Entertainment",
  "Shopping",
  "Health",
  "Rent",
  "Salary",
  "Transfer",
  "ATM",
  "Other",
];

const CATEGORY_ALIASES = {
  food: "Food",
  grocery: "Grocery",
  groceries: "Grocery",
  vegetables: "Grocery",
  transport: "Transport",
  travel: "Transport",
  cab: "Transport",
  petrol: "Transport",
  "bills & utilities": "Bills & Utilities",
  "bills and utilities": "Bills & Utilities",
  bills: "Bills & Utilities",
  utilities: "Bills & Utilities",
  electricity: "Bills & Utilities",
  recharge: "Bills & Utilities",
  entertainment: "Entertainment",
  movie: "Entertainment",
  shopping: "Shopping",
  clothes: "Shopping",
  health: "Health",
  medical: "Health",
  hospital: "Health",
  rent: "Rent",
  salary: "Salary",
  income: "Salary",
  transfer: "Transfer",
  sent: "Transfer",
  atm: "ATM",
  cash: "ATM",
  other: "Other",
};

const GREETINGS = ["hi", "hello", "hey", "namaste", "namaskar"];
const RESPONSE_CATEGORIES = ["overview", "summary", "overall", "total", "analysis", "all"];
const RESPONSE_SPENT = ["spent", "kharacha", "kharcha", "kharach", "expense", "expenditure"];
const RESPONSE_RECEIVED = ["received", "income", "earned", "credit", "kamai"];
const RESPONSE_NET = ["net", "balance", "profit", "bachat", "savings"];
const RESPONSE_SCORE = ["score", "ledger"];
const RESPONSE_COUNT = ["count", "kitni", "transactions", "transaction", "how many"];

function latestStatement() {
  const entries = getEntries();
  return entries[0] || null;
}

function containsAny(text, words) {
  return words.some((w) => text.includes(w));
}

function categoryTotals(transactions, category) {
  let spent = 0;
  let received = 0;
  let count = 0;
  for (const t of transactions) {
    if (t.category !== category) continue;
    count += 1;
    if (t.type === "credit") received += t.amount;
    else spent += t.amount;
  }
  return {
    spent: Math.round(spent * 100) / 100,
    received: Math.round(received * 100) / 100,
    count,
    transactions: transactions.filter((t) => t.category === category).slice(0, 50),
  };
}

function detectCategory(message) {
  const norm = ` ${message.toLowerCase()} `;
  for (const c of CATEGORIES) {
    if (norm.includes(` ${c.toLowerCase()} `)) return c;
  }
  for (const [alias, cat] of Object.entries(CATEGORY_ALIASES)) {
    if (norm.includes(` ${alias} `)) return cat;
  }
  return null;
}

function formatINR(n) {
  return (
    "₹" +
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function sendResponse(res, payload) {
  res.json(payload);
}

// POST /api/chat/message — answers a chat message against the latest upload.
function chatMessage(req, res) {
  const raw = (req.body && req.body.message) || "";
  const message = raw.trim();
  if (!message) {
    return sendResponse(res, { type: "error", message: "Type a message first." });
  }

  const meta = latestStatement();
  if (!meta) {
    return sendResponse(res, {
      type: "empty",
      message: "No statement uploaded yet. Upload a PDF on the Statements page first, then come back here.",
    });
  }

  const lower = message.toLowerCase();

  if (containsAny(lower, GREETINGS)) {
    return sendResponse(res, {
      type: "summary",
      focus: null,
      summary: meta.summary,
      message: `Hi! I can help you understand "${meta.fileName}". Pick a category below or ask a question.`,
    });
  }

  const category = detectCategory(lower);
  if (category) {
    const totals = categoryTotals(meta.transactions, category);
    if (totals.count === 0) {
      return sendResponse(res, {
        type: "category",
        category,
        message: `No "${category}" transactions found in this statement.`,
        count: 0,
        spent: 0,
        received: 0,
        transactions: [],
      });
    }
    return sendResponse(res, {
      type: "category",
      category,
      title: `${category} — ${totals.count} transaction${totals.count === 1 ? "" : "s"}`,
      message: `Here are your ${category.toLowerCase()} transactions from "${meta.fileName}".`,
      spent: totals.spent,
      received: totals.received,
      count: totals.count,
      transactions: totals.transactions,
    });
  }

  if (containsAny(lower, RESPONSE_SPENT)) {
    return sendResponse(res, {
      type: "summary",
      focus: "spent",
      summary: meta.summary,
      message: `You spent ${formatINR(meta.summary.totalSpent)} in total.`,
    });
  }
  if (containsAny(lower, RESPONSE_RECEIVED)) {
    return sendResponse(res, {
      type: "summary",
      focus: "received",
      summary: meta.summary,
      message: `You received ${formatINR(meta.summary.totalReceived)} in total.`,
    });
  }
  if (containsAny(lower, RESPONSE_NET)) {
    return sendResponse(res, {
      type: "summary",
      focus: "net",
      summary: meta.summary,
      message: `Your net balance is ${formatINR(meta.summary.net)} (${meta.summary.net >= 0 ? "positive" : "negative"}).`,
    });
  }
  if (containsAny(lower, RESPONSE_SCORE)) {
    return sendResponse(res, {
      type: "summary",
      focus: "score",
      summary: meta.summary,
      message: `Your ledger score is ${meta.summary.ledgerScore}/100.`,
    });
  }
  if (containsAny(lower, RESPONSE_COUNT)) {
    return sendResponse(res, {
      type: "summary",
      focus: "count",
      summary: meta.summary,
      message: `${meta.summary.transactionCount} transactions were parsed.`,
    });
  }
  if (containsAny(lower, RESPONSE_CATEGORIES)) {
    return sendResponse(res, {
      type: "summary",
      focus: "overview",
      summary: meta.summary,
      message: `Overview of "${meta.fileName}":`,
    });
  }

  // No simple match → Step 3 (AI analysis) comes here later.
  return sendResponse(res, {
    type: "fallback",
    categories: CATEGORIES,
    message:
      'I didn\'t quite get that. I can answer things like "Food", "Overview", "total spent", "net balance", or "ledger score" for the latest statement.',
  });
}

module.exports = { chatMessage };