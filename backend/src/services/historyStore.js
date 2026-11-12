const mongoose = require("mongoose");
const Statement = require("../models/Statement");

function normalize(doc) {
  const obj = (typeof doc.toObject === "function") ? doc.toObject() : doc;
  return {
    id: (obj._id ? obj._id.toString() : obj.id),
    fileName: obj.fileName,
    uploadedAt: obj.uploadedAt instanceof Date
      ? obj.uploadedAt.toISOString()
      : obj.uploadedAt,
    uploadedDate: obj.uploadedDate,
    totalPages: obj.totalPages,
    transactionCount: obj.transactionCount,
    summary: obj.summary,
    transactions: obj.transactions || [],
  };
}

async function addEntry({ fileName, totalPages, transactionCount, summary, transactions, userId = null }) {
  const now = new Date();
  const doc = await Statement.create({
    fileName,
    uploadedAt: now,
    uploadedDate: now.toISOString().slice(0, 10),
    totalPages,
    transactionCount,
    summary,
    transactions,
    user: userId,
  });
  console.log(`[history] added entry ${doc._id} | (mongo)`);
  return normalize(doc);
}

async function getEntries({ userId = null } = {}) {
  if (mongoose.connection.readyState !== 1) {
    console.warn("[history] mongo not connected — returning empty list");
    return [];
  }
  try {
    const filter = userId ? { user: userId } : { user: null };
    const docs = await Statement.find(filter).sort({ uploadedAt: -1 }).lean();
    return docs.map(normalize);
  } catch (err) {
    console.error("[history] getEntries failed:", err.message);
    return [];
  }
}

module.exports = { addEntry, getEntries };