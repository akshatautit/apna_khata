const app = require("./app");
const { port } = require("./config/env");
const { connectDB } = require("./db");

(async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error("[db] startup connection failed; history will be disabled:", err.message);
  }
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`[env] NODE_ENV=${process.env.NODE_ENV || "not-set"} | RENDER=${process.env.RENDER || "not-set"}`);
    console.log(`[env] GEMINI_API_KEY=${process.env.GEMINI_API_KEY ? "SET (" + process.env.GEMINI_API_KEY.length + " chars)" : "MISSING"}`);
    console.log(`[env] GEMINI_MODEL=${process.env.GEMINI_MODEL || "gemini-3.6-flash (default)"}`);
    console.log(`[env] MONGODB_URI=${process.env.MONGODB_URI ? "SET" : "MISSING"}`);
  });
})();