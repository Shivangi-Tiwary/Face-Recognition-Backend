const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const protect = require("../middleware/protect.middleware");

// Controllers
const {
  getUserDashboard,
  getAttendanceHistory,
} = require("../controllers/dashboard.controller");

const {
  createTicket,
  getMyTickets,
  getTicketById,
  addComment,
} = require("../controllers/ticket.controller");

/**
 * User Dashboard Routes
 * Mounted at /api/user in server.js
 */

// Dashboard Stats
router.get("/dashboard", protect, getUserDashboard);
router.get("/attendance/history", protect, getAttendanceHistory);

// Checkout on Logout or Manual
router.post("/checkout", protect, async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const attendance = await Attendance.findOne({ userId: req.user.id, date: today });
    if (!attendance) return res.status(404).json({ error: "No check-in found for today" });
    if (attendance.checkOut) return res.status(400).json({ error: "Already checked out" });

    attendance.checkOut = new Date();
    await attendance.save();

    res.json({ success: true, message: "Checked out successfully" });
  } catch (err) { next(err); }
});

// User Tickets
router.post("/tickets", protect, createTicket);
router.get("/tickets", protect, getMyTickets);
router.get("/tickets/:id", protect, getTicketById);
router.post("/tickets/:id/comment", protect, addComment);

module.exports = router;