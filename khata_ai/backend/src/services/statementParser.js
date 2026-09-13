const TXN_START_RE = /^(\d{1,4})\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(.*)$/;
const MONEY_RE = /(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}/g;
const PP_DATE_RE = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}$/;
const PP_TXN_RE = /^(DEBIT|CREDIT|CASHBACK|REFUND|SENT|RECEIVED)\s+₹?([\d,]+(?:\.\d{1,2})?)\t*(.*)$/i;

const MONTHS = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

const CATEGORY_RULES = [
  { category: "Food", keywords: ["zomato", "swiggy", "dominos", "domino", "kfc", "mcdonald", "donald", "mcd ", "pizza", "burger", "cafe", "restaurant", "hotel", "dhaba", "eatery", "biryani", "udupi", "annapurna", "chaiwala", "coffee", "food", "snacks", "momos", "bakery", "baker", "ice cream", "thali", "chaat", "canteen", "lunch", "dinner", "tiffin", "bawarchi", "j cafe", "grill", "barbecue", "barbeque", "fried", "chicken", "caterer", "caterers", "puri", "dosa", "rolls", "paratha", "chowmein", "noodle", "wadapav", "bhel", "sweet", "sweets", "vada"] },
  { category: "Grocery", keywords: ["d mart", "dmart", "big basket", "bigbasket", "jiomart", "reliance fresh", "reliance smart", "smart bazar", "more store", "supermarket", "grocery", "groceries", "kirana", "provision", "dugdh", "dairy", "vegetables", "vegetable", "fruits", "fruit", "mandi", "sabji", "sabzi", "ration shop", "amul", "mother dairy", "natures basket", "nature's basket", "veggie", "fresh mart", "freshstore", "big bazaar", "spencers", "easyday", "zepto", "blinkit"] },
  { category: "Transport", keywords: ["ola", "uber", "rapido", "indrive", "petrol", "diesel", "fuel", "metro", "irctc", "train", "railways", "railway", "bus", "taxi", "cab", "auto", "rickshaw", "ricksha", "parking", "toll", "fastag", "indian oil", "hpcl", "bharat", "reliance oil", "shell", "castrol", "challan", "rto", "vahan", "airport", "flight", "mmrda", "aviation", "maha mumbai", "smart mumbai"] },
  { category: "Bills & Utilities", keywords: ["electricity", "electric", "msedcl", "bseb", "adani", "torrent", "mahanagar gas", "cng", "lpg", "gas", "cylinder", "water", "broadband", "wifi", "internet", "recharge", "mobile", "jio", "airtel", "vi ", "vodafone", "idea", "bsnl", "postpaid", "prepaid", "utility", "bills", "insurance", "dth", "tatasky", "tata sky", "sundirect", "dishtv", "aws"] },
  { category: "Entertainment", keywords: ["netflix", "prime", "prime video", "hotstar", "disney", "spotify", "youtube", "gaana", "wynk", "bookmyshow", "pvr", "pvrcinemas", "inox", "cinema", "imax", "movie", "game", "playstation", "steam", "xbox", "ze5", "sonyliv", "sony liv", "amazon music", "play store", "app store"] },
  { category: "Shopping", keywords: ["myntra", "amazon", "flipkart", "ajio", "meesho", "shopping", "clothing", "apparel", "fashion", "footwear", "lifestyle", "zudio", "max", "raymond", "fabindia", "saree", "sarees", "saravana", "westside", "trends", "nykaa", "tatacliq", "reliance digital", "croma", "vijay sales", "decathlon", "levis", "nike", "adidas", "puma", "pantaloons", "allensolly", "allen solly", "lenskart", "eyewear", "tanishq", "jewellers", "jewellery", "foxtale", "savana"] },
  { category: "Health", keywords: ["hospital", "pharmacy", "medplus", "apollo", "doctor", "clinic", "medical", "dental", "care", "health", "netmeds", "pharmeasy", "chemist", "wellness", "lifeline", "1mg", "ayur", "physio", "diagnostic", "pathology", "dentist"] },
  { category: "Rent", keywords: ["rent", "lease"] },
  { category: "Salary", keywords: ["salary", "payout", "voucher", "revenue", "refund", "reimbursement", "reimburse", "bonus", "incentive", "stipend"] },
  { category: "Transfer", keywords: ["fund transfer", "neft", "imps", "rtgs", "transfer", "transferred", "upi transfer", "sent to"] },
  { category: "ATM", keywords: ["atm", "cash withdrawal", "withdrawal", "cash"] },
];

function toNumber(moneyStr) {
  return parseFloat(moneyStr.replace(/,/g, ""));
}

function isMoneyLine(line) {
  return /(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}/.test(line);
}

function extractAmounts(block) {
  const found = block.join("\n").match(MONEY_RE);
  if (!found || found.length === 0) return null;
  const nums = found.map(toNumber);
  const balance = nums[nums.length - 1];
  const rest = nums.slice(0, -1);
  if (rest.length === 0) return { balance, values: [], amount: null };
  const amount = rest[rest.length - 1];
  return { balance, values: rest, amount };
}

function classifyType(amounts, prevBalance, remark) {
  const { balance, amount } = amounts;
  if (prevBalance != null && balance != null && amount != null) {
    const delta = balance - prevBalance;
    if (Math.abs(Math.abs(delta) - amount) < 0.01) {
      return delta > 0 ? "credit" : "debit";
    }
  }
  const lower = (remark || "").toLowerCase();
  if (/credit|deposited|interest|received|salary|fund transfer|paid by.*credit/.test(lower)) return "credit";
  if (/\bupi\/|debit|chq|atm|withdrawal|fee|naps|neft.*dr/.test(lower)) return "debit";
  return "debit";
}

function extractMerchant(remark, rawText) {
  const text = remark || rawText || "";
  if (!text.trim()) return "Unknown";
  const upiMatch = text.match(/UPI\/([^/\s][^/]*?)\s*(?:\/|$)/i);
  if (upiMatch) return upiMatch[1].trim();
  const paidMatch = text.match(/(?:Paid to|Payment to|Received from|Sent to)\s+([^,;]+)/i);
  if (paidMatch) return paidMatch[1].trim();
  const rechargedMatch = text.match(/Mobile recharged\s+\S+\s+([^,;]+)/i);
  if (rechargedMatch) return rechargedMatch[1].trim();
  const firstLine = text.split("\n")[0].trim();
  return firstLine.slice(0, 40) || firstLine;
}

function extractCategoryWords(merchant, remark) {
  const words = [`${merchant}`];
  for (const w of (remark || "").split(/\s+/)) {
    if (/^[A-Za-z]{3,}$/.test(w)) words.push(w);
  }
  return words.join(" ").toLowerCase();
}

const CATEGORY_WORD_RE = [
  { category: "Grocery", re: /\b(mart|grocery|provision|kirana|supermarket|dairy|dugdh|foods|vegetable|fruits|mandi|sabji|sabzi|zepto|blinkit)\b/ },
  { category: "Food", re: /\b(eat|eats|tea|chai|cafe|biryani|momos|tiffin|thali|vada|sweet)\b/ },
  { category: "Transport", re: /\b(bus|taxi|cab|auto|rail|metro|petrol|diesel|fuel|toll)\b/ },
  { category: "Bills & Utilities", re: /\b(gas|water|wifi|jio|utility|bill|recharge|aws)\b/ },
  { category: "Shopping", re: /\b(max|style|fashion|trend|store|shop|collection|foxtale|savana)\b/ },
  { category: "Health", re: /\b(care|health|medical|cure)\b/ },
  { category: "Transfer", re: /\b(transfer|sent|neft|imps)\b/ },
  { category: "ATM", re: /\b(atm|withdrawal|cash)\b/ },
];

function categorize(merchant, remark) {
  const haystack = extractCategoryWords(merchant, remark);
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => haystack.includes(k))) return rule.category;
  }
  for (const rule of CATEGORY_WORD_RE) {
    if (rule.re.test(haystack)) return rule.category;
  }
  return "Other";
}

function formatDate(dd, mm, yyyy) {
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Parses raw PDF text into structured transactions.
 * Auto-detects between bank statement format ("SNo DD.MM.YYYY remarks... amount balance")
 * and PhonePe statement format ("Mon DD, YYYY" + "Type ₹amount details").
 * @param {string} rawText
 * @returns {Array<object>} transaction objects
 */
function parseTransactions(rawText) {
  if (!rawText || !rawText.trim()) return [];
  return looksLikePhonePe(rawText)
    ? parsePhonePeTransactions(rawText)
    : parseBankTransactions(rawText);
}

function looksLikePhonePe(rawText) {
  const lines = rawText.split("\n");
  const dateHits = lines.filter((l) => PP_DATE_RE.test(l.trim())).length;
  return dateHits >= 2 || /Transaction Statement for/i.test(rawText);
}

function parsePhonePeTransactions(rawText) {
  const lines = (rawText || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const transactions = [];
  let sno = 0;
  let current = null;
  let inFooter = false;

  for (const line of lines) {
    if (inFooter) {
      if (/^--\s*\d+\s+of\s+\d+\s*--/.test(line)) inFooter = false;
      continue;
    }
    if (/^Page\s+\d+\s+of\s+\d+/.test(line)) {
      inFooter = true;
      continue;
    }
    if (/^Date\s+Transaction\s+Details\s+Type\s+Amount$/.test(line)) continue;

    if (PP_DATE_RE.test(line)) {
      if (current && current.amount != null) transactions.push(finalize(current));
      const [mon, dd, yyyy] = line.replace(",", "").split(/\s+/);
      current = {
        sno: ++sno,
        date: `${dd}/${MONTHS[mon]}/${yyyy}`,
        rawDate: line,
        merchant: "",
        category: "Other",
        type: "debit",
        amount: null,
        balance: null,
        detailsRaw: "",
      };
      continue;
    }

    if (!current) continue;

    const txn = line.match(PP_TXN_RE);
    if (txn) {
      const [, typeToken, amount, details] = txn;
      current.type = /DEBIT|SENT/i.test(typeToken) ? "debit" : "credit";
      current.amount = parseFloat(amount.replace(/,/g, ""));
      current.detailsRaw = `${current.detailsRaw} ${details || ""}`.trim();
      continue;
    }

    if (current.amount == null) continue;

    const detailLine = line.replace(/^Transaction ID\s+\S+/, "")
      .replace(/^UTR No\.?\s*\S+/, "")
      .replace(/^(Paid by|Credited to)\s+\S+/, "")
      .replace(/^Airtel Prepaid Reference ID\s+\S+/, "")
      .trim();

    if (detailLine) current.detailsRaw = `${current.detailsRaw} ${detailLine}`.trim();
  }
  if (current && current.amount != null) transactions.push(finalize(current));

  return transactions;
}

function finalize(txn) {
  const remark = txn.detailsRaw || "";
  const merchant = extractMerchant(remark, remark);
  txn.merchant = merchant || "Unknown";
  txn.category = categorize(merchant || "", remark);
  txn.amount = Math.round(txn.amount * 100) / 100;
  return txn;
}

function parseBankTransactions(rawText) {
  const lines = (rawText || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const blocks = [];
  let current = null;

  for (const line of lines) {
    const m = line.match(TXN_START_RE);
    if (m) {
      if (current) blocks.push(current);
      current = {
        sno: parseInt(m[1], 10),
        rawDate: `${m[2]}.${m[3]}.${m[4]}`,
        date: formatDate(m[2], m[3], m[4]),
        remark: m[5],
        lines: [line],
      };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);

  let prevBalance = null;
  const transactions = [];

  for (const block of blocks) {
    const bodyLines = block.lines.slice(1);
    const amounts = extractAmounts(bodyLines);
    if (!amounts) continue;

    const header = block.remark;
    const body = bodyLines.filter((l) => !isMoneyLine(l)).join(" ");
    const remarkWords = `${header} ${body}`.trim();
    const merchantLine = [header, ...bodyLines.filter((l) => !/^[\d,.\s]+$/.test(l))].join("\n");
    const merchant = extractMerchant(merchantLine);
    const type = classifyType(amounts, prevBalance, remarkWords);

    const amount = Math.round((amounts.amount || 0) * 100) / 100;

    const txn = {
      sno: block.sno,
      date: block.date,
      rawDate: block.rawDate,
      merchant: merchant || "Unknown",
      category: categorize(merchant || "", remarkWords),
      type,
      amount,
      balance: amounts.balance,
    };
    transactions.push(txn);
    prevBalance = amounts.balance;
  }

  return transactions;
}

/**
 * Aggregates transactions into a summary (spent, received, categories,
 * ledger score) for the dashboard.
 * @param {Array<object>} transactions
 * @returns {object}
 */
function buildSummary(transactions) {
  let totalSpent = 0;
  let totalReceived = 0;

  for (const t of transactions) {
    if (t.type === "credit") totalReceived += t.amount;
    else totalSpent += t.amount;
  }

  totalSpent = Math.round(totalSpent * 100) / 100;
  totalReceived = Math.round(totalReceived * 100) / 100;

  const categoryMap = {};
  for (const t of transactions) {
    if (!categoryMap[t.category]) {
      categoryMap[t.category] = { spent: 0, received: 0, count: 0 };
    }
    const entry = categoryMap[t.category];
    entry.count += 1;
    if (t.type === "credit") {
      entry.received = Math.round((entry.received + t.amount) * 100) / 100;
    } else {
      entry.spent = Math.round((entry.spent + t.amount) * 100) / 100;
    }
  }

  const categories = Object.entries(categoryMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.spent + b.received - (a.spent + a.received));

  let ledgerScore = 50;
  if (totalReceived > 0) {
    const savingsRate = (totalReceived - totalSpent) / totalReceived;
    ledgerScore = Math.round(Math.max(0, Math.min(100, savingsRate * 100)));
  } else if (totalSpent > 0) {
    const avgTxn = transactions.length ? totalSpent / transactions.length : 0;
    ledgerScore = Math.round(Math.max(30, Math.min(70, (10000 / avgTxn))));
  }

  return {
    totalSpent,
    totalReceived,
    net: Math.round((totalReceived - totalSpent) * 100) / 100,
    categories,
    ledgerScore,
    transactionCount: transactions.length,
  };
}

module.exports = { parseTransactions, buildSummary };