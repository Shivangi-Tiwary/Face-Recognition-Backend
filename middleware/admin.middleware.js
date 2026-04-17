/**
 * Admin Role Protection Middleware
 */
module.exports = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ success: false, error: "Access denied. Admin privileges required." });
  }
};
