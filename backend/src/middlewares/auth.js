const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");

/**
 * Reads the Bearer token from Authorization header and sets req.user.
 * Call with `auth(true)` (default) to require login, `auth(false)` for optional auth.
 */
function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

    if (!token) {
      if (required) return res.status(401).json({ error: "Authentication required" });
      req.user = null;
      return next();
    }

    try {
      const payload = jwt.verify(token, jwtSecret);
      req.user = { id: payload.sub, email: payload.email };
      return next();
    } catch (err) {
      if (required) return res.status(401).json({ error: "Invalid or expired token" });
      req.user = null;
      return next();
    }
  };
}

function issueToken(user) {
  return jwt.sign(
    { sub: user.id || user._id.toString(), email: user.email },
    jwtSecret,
    { expiresIn: require("../config/env").jwtExpiresIn }
  );
}

module.exports = { auth, issueToken };