const express = require("express");
const router = express.Router();
const protect = require("../middleware/protect.middleware");
const adminOnly = require("../middleware/admin.middleware");
const { 
  createTicket, 
  getMyTickets, 
  getTicketById, 
  addComment,
  getAllTickets,
  updateTicketStatus,
  adminCreateTicket
} = require("../controllers/ticket.controller");

/**
 * Unified Ticket Routes
 */

// User Routes
router.post("/", protect, createTicket);
router.get("/my", protect, getMyTickets);
router.get("/:id", protect, getTicketById);
router.post("/:id/comment", protect, addComment);

// Admin Routes
router.get("/admin/all", protect, adminOnly, getAllTickets);
router.patch("/admin/:id/status", protect, adminOnly, updateTicketStatus);
router.post("/admin", protect, adminOnly, adminCreateTicket);

module.exports = router;
