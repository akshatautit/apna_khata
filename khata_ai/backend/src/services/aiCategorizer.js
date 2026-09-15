const axios = require("axios");

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

console.log(
  `[ai] key=${GEMINI_API_KEY ? "present" : "missing"} model=${MODEL}`
);

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

function parseAiJson(text) {
  if (!text) return null;
  const cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Uses Google Gemini (free tier) to categorize unknown merchant names.
 * Fallback-safe: returns null on any error/missing key so uploads never break.
 * @param {string[]} merchants unique merchant names
 * @returns {Promise<Object<string,string>|null>} map of merchant -> category
 */
async function aiCategorize(merchants) {
  if (!GEMINI_API_KEY || !merchants || merchants.length === 0) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const prompt = [
      "You are a bank statement spending categorizer.",
      `Classify each merchant into exactly ONE of: ${CATEGORIES.join(", ")}.`,
      "Return ONLY a JSON object mapping each exact merchant name to a category. No extra text.",
      "Merchants:",
      ...merchants.map((m) => `- ${m}`),
    ].join("\n");

    const res = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": GEMINI_API_KEY,
        },
      }
    );

    const data = res.data;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = parseAiJson(text);
    if (!parsed) {
      console.error("[ai] response was not valid JSON → fallback keywords");
      return null;
    }

    console.log(`[ai] parsed ${Object.keys(parsed).length} merchant→category entries`);
    const map = {};
    for (const m of merchants) {
      const c = parsed[m];
      map[m] = CATEGORIES.includes(c) ? c : "Other";
    }
    return map;
  } catch (e) {
    console.error(
      `[ai] HTTP ${e.response?.status || "network"} → falling back to keywords:`,
      e.message
    );
    return null;
  }
}

module.exports = { aiCategorize };