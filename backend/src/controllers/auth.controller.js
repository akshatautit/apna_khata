const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { issueToken } = require("../middlewares/auth");
const { jwtExpiresIn } = require("../config/env");

function sanitizeUser(user) {
  return { id: (user._id || user.id).toString(), name: user.name, email: user.email };
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "email and password are required" });
    if (password.length < 6)
      return res.status(400).json({ error: "password must be at least 6 characters" });

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(409).json({ error: "email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name || String(email).split("@")[0],
      email: String(email).toLowerCase(),
      passwordHash,
    });

    const token = issueToken(user);
    return res.status(201).json({ token, expiresIn: jwtExpiresIn, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Register failed" });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "email and password are required" });

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user || !user.passwordHash)
      return res.status(401).json({ error: "No account with this email. Register first." });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Wrong password for this email." });

    const token = issueToken(user);
    return res.json({ token, expiresIn: jwtExpiresIn, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Login failed" });
  }
}

// GET /api/auth/me (protected)
async function me(req, res) {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "not found" });
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed" });
  }
}

module.exports = { register, login, me };