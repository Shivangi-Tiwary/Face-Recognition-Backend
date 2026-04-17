const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { body, validationResult } = require("express-validator");

// Helper for express-validator results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, error: errors.array()[0].msg });
  next();
};

/* ── VALIDATIONS ── */
exports.validateTicket = [
  body("title").notEmpty().withMessage("Subject title is required").trim().isLength({ max: 100 }),
  body("description").notEmpty().withMessage("Issue description is required").trim().isLength({ min: 10 }),
  validate
];

/* ── CREATE TICKET (User) ── */
exports.createTicket = [...exports.validateTicket, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title, description, category, priority } = req.body;

    const ticket = await Ticket.create({
      title,
      description,
      category: category || "Other",
      priority: priority || "Medium",
      userId,
      requester: req.user.name,
      email: req.user.email,
      activityLog: [{ action: `Ticket raised by student`, by: req.user.name || "User", at: new Date() }],
    });

    res.status(201).json({ success: true, ticket });
  } catch (err) { next(err); }
}];

/* ── GET MY TICKETS (User) ── */
exports.getMyTickets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, category } = req.query;
    const query = { userId };
    if (status && status !== "All") query.status = status;
    if (category && category !== "All") query.category = category;
    const tickets = await Ticket.find(query).sort({ createdAt: -1 });
    res.json({ success: true, tickets });
  } catch (err) { next(err); }
};

/* ── GET SINGLE TICKET ── */
exports.getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id).populate("userId", "name email");
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json({ success: true, ticket });
  } catch (err) { next(err); }
};

/* ── UPDATE TICKET STATUS (Admin) ── */
exports.updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    ticket.status = status;
    ticket.activityLog.push({ action: `Status updated to ${status}`, by: "Admin", at: new Date() });
    await ticket.save();
    res.json({ success: true, ticket });
  } catch (err) { next(err); }
};

/* ── ADD COMMENT ── */
exports.addComment = [
  body("text").notEmpty().withMessage("Comment cannot be empty").trim(),
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { text } = req.body;
      const ticket = await Ticket.findById(id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      ticket.comments.push({ author: req.user.name || "User", text, createdAt: new Date() });
      await ticket.save();
      res.json({ success: true, ticket });
    } catch (err) { next(err); }
  }
];

// Admin: Get all tickets
exports.getAllTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find().populate("userId", "name email").sort({ createdAt: -1 });
    res.json({ success: true, tickets });
  } catch (err) { next(err); }
};

// Admin: Add comment
exports.addAdminComment = [
  body("text").notEmpty().withMessage("Comment cannot be empty").trim(),
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { text } = req.body;
      const ticket = await Ticket.findById(id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      ticket.comments.push({ author: "Admin", text, createdAt: new Date() });
      await ticket.save();
      res.json({ success: true, ticket });
    } catch (err) { next(err); }
  }
];

// Admin: Create ticket on behalf of user
exports.adminCreateTicket = async (req, res, next) => {
  try {
    const { title, description, userEmail, category, priority } = req.body;
    const user = await User.findOne({ email: userEmail });
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const ticket = await Ticket.create({ 
      title, 
      description, 
      category: category || "Other",
      priority: priority || "Medium",
      userId: user._id, 
      requester: user.name,
      email: user.email,
      activityLog: [{ action: "Created by Admin", by: "Admin", at: new Date() }] 
    });
    
    res.status(201).json({ success: true, ticket });
  } catch (err) { next(err); }
};