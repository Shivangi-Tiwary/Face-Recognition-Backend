const Ticket = require("../models/Ticket");
const User = require("../models/User");

/* ── CREATE TICKET (User) ── */
exports.createTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, category, priority } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required" });
    }

    const ticket = await Ticket.create({
      title,
      description,
      category: category || "Other",
      priority: priority || "Medium",
      userId,
      activityLog: [{ action: `Ticket created by user`, by: "User", at: new Date() }],
    });

    res.status(201).json({ success: true, ticket });
  } catch (err) {
    console.error("Create Ticket Error:", err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
};

/* ── GET MY TICKETS (User) ── */
exports.getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category } = req.query;

    const query = { userId };
    if (status && status !== "All") query.status = status;
    if (category && category !== "All") query.category = category;

    const tickets = await Ticket.find(query).sort({ createdAt: -1 });

    const summary = {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "Open").length,
      inProgress: tickets.filter((t) => t.status === "In Progress").length,
      resolved: tickets.filter((t) => t.status === "Resolved").length,
      pending: tickets.filter((t) => t.status === "Pending").length,
    };

    res.json({ success: true, summary, tickets });
  } catch (err) {
    console.error("Get My Tickets Error:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
};

/* ── GET SINGLE TICKET (User - own ticket only) ── */
exports.getTicketById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const ticket = await Ticket.findOne({ _id: id, userId }).populate(
      "userId",
      "name email"
    );

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    res.json({ success: true, ticket });
  } catch (err) {
    console.error("Get Ticket Error:", err);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
};

/* ── ADD COMMENT (User on own ticket) ── */
exports.addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { text } = req.body;

    const user = await User.findById(userId).select("name");
    const ticket = await Ticket.findOne({ _id: id, userId });

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (!text) return res.status(400).json({ error: "Comment text required" });

    ticket.comments.push({ author: user.name, text, createdAt: new Date() });
    ticket.activityLog.push({
      action: `Comment added by ${user.name}`,
      by: user.name,
      at: new Date(),
    });

    await ticket.save();
    res.json({ success: true, ticket });
  } catch (err) {
    console.error("Add Comment Error:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
};

/* ══════════════════════════════════════════════
   ADMIN-ONLY ROUTES BELOW
═══════════════════════════════════════════════ */

/* ── GET ALL TICKETS (Admin) ── */
exports.getAllTickets = async (req, res) => {
  try {
    const { status, category, priority } = req.query;

    const query = {};
    if (status && status !== "All") query.status = status;
    if (category && category !== "All") query.category = category;
    if (priority && priority !== "All") query.priority = priority;

    const tickets = await Ticket.find(query)
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    const summary = {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "Open").length,
      inProgress: tickets.filter((t) => t.status === "In Progress").length,
      resolved: tickets.filter((t) => t.status === "Resolved").length,
      critical: tickets.filter((t) => t.priority === "Critical").length,
    };

    res.json({ success: true, summary, tickets });
  } catch (err) {
    console.error("Get All Tickets Error:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
};

/* ── UPDATE TICKET STATUS (Admin) ── */
exports.updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    ticket.status = status;
    ticket.activityLog.push({
      action: `Status changed to ${status}`,
      by: "Admin",
      at: new Date(),
    });

    await ticket.save();
    res.json({ success: true, ticket });
  } catch (err) {
    console.error("Update Ticket Error:", err);
    res.status(500).json({ error: "Failed to update ticket" });
  }
};

/* ── ADD ADMIN COMMENT ── */
exports.addAdminComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (!text) return res.status(400).json({ error: "Comment text required" });

    ticket.comments.push({ author: "Admin", text, createdAt: new Date() });
    ticket.activityLog.push({ action: `Comment added by Admin`, by: "Admin", at: new Date() });

    await ticket.save();
    res.json({ success: true, ticket });
  } catch (err) {
    console.error("Admin Comment Error:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
};

/* ── ADMIN CREATE TICKET (on behalf of user) ── */
exports.adminCreateTicket = async (req, res) => {
  try {
    const { title, description, category, priority, userEmail } = req.body;

    let userId;
    if (userEmail) {
      const user = await User.findOne({ email: userEmail });
      if (!user) return res.status(404).json({ error: "User not found" });
      userId = user._id;
    } else {
      return res.status(400).json({ error: "userEmail required" });
    }

    const ticket = await Ticket.create({
      title,
      description,
      category: category || "Other",
      priority: priority || "Medium",
      userId,
      activityLog: [{ action: "Ticket created by Admin", by: "Admin", at: new Date() }],
    });

    res.status(201).json({ success: true, ticket });
  } catch (err) {
    console.error("Admin Create Ticket Error:", err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
};