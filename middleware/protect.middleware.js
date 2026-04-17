const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protect Middleware - Validates JWT and attaches user to request.
 * Can also check for specific roles if needed.
 */
module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, error: "Malformed token" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user and exclude sensitive fields
    const user = await User.findById(payload.id).select("-password -faceEmbedding");
    
    if (!user) {
      return res.status(401).json({ success: false, error: "User session not found" });
    }

    // Role-based logic for future use or specific overrides
    // req.isAdmin = user.role === 'admin';

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, error: "Session expired. Please login again." });
    }
    return res.status(401).json({ success: false, error: "Invalid authentication token" });
  }
};