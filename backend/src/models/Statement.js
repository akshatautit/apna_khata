const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: String,
    spent: Number,
    received: Number,
    count: Number,
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    sno: Number,
    date: String,
    rawDate: String,
    merchant: String,
    category: String,
    type: String,
    amount: Number,
    balance: Number,
  },
  { _id: false }
);

const summarySchema = new mongoose.Schema(
  {
    totalSpent: Number,
    totalReceived: Number,
    net: Number,
    ledgerScore: Number,
    transactionCount: Number,
    categories: [categorySchema],
  },
  { _id: false }
);

const statementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    fileName: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedDate: { type: String, required: true },
    totalPages: Number,
    transactionCount: Number,
    summary: summarySchema,
    transactions: [transactionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Statement", statementSchema);