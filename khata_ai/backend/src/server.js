const app = require("./app");
const { port } = require("./config/env");

// Start the HTTP server on the configured port.
// On Render, PORT is injected automatically (or set via render.yaml).
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`[env] NODE_ENV=${process.env.NODE_ENV || "not-set"} | RENDER=${process.env.RENDER || "not-set"}`);
  console.log(`[env] GEMINI_API_KEY=${process.env.GEMINI_API_KEY ? "SET (" + process.env.GEMINI_API_KEY.length + " chars)" : "MISSING"}`);
  console.log(`[env] GEMINI_MODEL=${process.env.GEMINI_MODEL || "gemini-3.6-flash (default)"}`);
});


