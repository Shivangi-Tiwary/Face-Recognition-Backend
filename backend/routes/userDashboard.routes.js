const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const {
  getUserDashboard,
  getAttendanceHistory,
} = require("../controllers/dashboard.controller");

const {
  createTicket,
  getMyTickets,
  getTicketById,
  addComment,
  getAllTickets,
  updateTicketStatus,
  addAdminComment,
  adminCreateTicket,
} = require("../controllers/ticket.controller");

/* ── INLINE AUTH MIDDLEWARE ── */
const protect = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user?.role === "admin") return next();
  res.status(403).json({ error: "Admin access required" });
};

/* ── USER DASHBOARD ── */
router.get("/dashboard", protect, getUserDashboard);
router.get("/attendance/history", protect, getAttendanceHistory);

/* ── USER TICKETS ── */
router.post("/tickets", protect, createTicket);
router.get("/tickets", protect, getMyTickets);
router.get("/tickets/:id", protect, getTicketById);
router.post("/tickets/:id/comment", protect, addComment);

/* ── ADMIN TICKETS ── */
router.get("/admin/tickets", protect, isAdmin, getAllTickets);
router.patch("/admin/tickets/:id/status", protect, isAdmin, updateTicketStatus);
router.post("/admin/tickets/:id/comment", protect, isAdmin, addAdminComment);
router.post("/admin/tickets", protect, isAdmin, adminCreateTicket);

module.exports = router;