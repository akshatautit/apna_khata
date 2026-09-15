const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "history.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");
}

function readAll() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeAll(entries) {
  ensureStore();
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(entries, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function addEntry({ fileName, totalPages, transactionCount, summary, transactions }) {
  const now = new Date();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName,
    uploadedAt: now.toISOString(),
    uploadedDate: now.toISOString().slice(0, 10),
    totalPages,
    transactionCount,
    summary,
    transactions,
  };
  const entries = readAll();
  entries.push(entry);
  writeAll(entries);
  console.log(`[history] added entry ${entry.id} | total entries: ${entries.length}`);
  return entry;
}

function getEntries() {
  return readAll().sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
}

module.exports = { addEntry, getEntries };