const axios = require("axios");
require("../config/env");

const MAX_TRANSACTIONS = 120;

function statementContext(meta) {
  const all = meta.transactions || [];
  const shown = all.slice(0, MAX_TRANSACTIONS).map((t) => ({
    date: t.date,
    merchant: t.merchant,
    category: t.category,
    type: t.type,
    amount: t.amount,
  }));
  return {
    fileName: meta.fileName,
    uploadedDate: meta.uploadedDate,
    summary: meta.summary || null,
    transactionCount: meta.transactionCount ?? all.length,
    transactionsIncluded: shown.length,
    transactionsOmitted: Math.max(0, all.length - shown.length),
    transactions: shown,
  };
}

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "list_transactions",
        description:
          "Call this when the user wants a list or bullets of spends, expenses, payments, received money, or transactions. The app renders the list. Do not write the rows yourself.",
        parameters: {
          type: "OBJECT",
          properties: {
            flow: {
              type: "STRING",
              description: "debit for spends and expenses, credit for money received, all for every row.",
            },
            category: {
              type: "STRING",
              description:
                "Optional. One of Food, Grocery, Transport, Bills & Utilities, Entertainment, Shopping, Health, Rent, Salary, Transfer, ATM, Other. Omit if the user did not name a category.",
            },
          },
          required: ["flow"],
        },
      },
      {
        name: "get_total",
        description: "Call this when the user wants one total: spent, received, net, ledger score, or how many transactions.",
        parameters: {
          type: "OBJECT",
          properties: {
            focus: {
              type: "STRING",
              description: "spent, received, net, score, or count.",
            },
          },
          required: ["focus"],
        },
      },
    ],
  },
];

function readModelParts(data) {
  return data?.candidates?.[0]?.content?.parts || [];
}

/**
 * Local chat functions run before this. Gemini may call one of those functions.
 * If it does not, it answers in text. Returns null when the key is missing or the call fails.
 * @returns {Promise<{kind:"tool",name:string,args:object}|{kind:"text",message:string}|null>}
 */
async function answerQuestion(question, meta) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  if (!apiKey || !question || !meta) return null;

  const prompt = [
    "You are Khaata, a personal money assistant for one uploaded statement.",
    "If a function can answer, call that function and do not write the list yourself.",
    "Otherwise answer using ONLY the JSON below.",
    "Write amounts with ₹, for example ₹250.00. Never write the words Indian Rupees.",
    "When you list more than one item, put each item on its own line starting with '- '.",
    "Answer only what was asked. Do not recite spent, received, net, and score unless the question asks for an overview.",
    "If transactionCount is 0 or transactions is empty, say the file was saved but no bank or PhonePe rows were parsed. Do not guess spending.",
    "If the question is not about this statement, say you can only discuss this statement.",
    "",
    "Statement JSON:",
    JSON.stringify(statementContext(meta)),
    "",
    "Question:",
    question,
  ].join("\n");

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const res = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        tools: TOOLS,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        timeout: 20000,
      }
    );

    const parts = readModelParts(res.data);
    const call = parts.find((part) => part.functionCall);
    if (call) {
      console.log(`[chat-ai] function ${call.functionCall.name}`);
      return {
        kind: "tool",
        name: call.functionCall.name,
        args: call.functionCall.args || {},
      };
    }

    const text = parts
      .map((part) => part.text || "")
      .join("")
      .trim();

    if (!text) {
      console.error("[chat-ai] empty response → fallback phrase");
      return null;
    }
    console.log(`[chat-ai] answered (${text.length} chars)`);
    return { kind: "text", message: text };
  } catch (e) {
    console.error(
      `[chat-ai] HTTP ${e.response?.status || "network"} → fallback phrase:`,
      e.message
    );
    return null;
  }
}

module.exports = { answerQuestion };
