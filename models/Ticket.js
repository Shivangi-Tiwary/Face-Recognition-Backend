const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    requester: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    category: {
      type: String,
      enum: [
        "Recognition Failure",
        "Hardware",
        "AI Model",
        "Enrollment",
        "Access Control",
        "Other",
      ],
      required: true,
      default: "Other",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Pending", "Resolved", "Closed"],
      default: "Open",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    agent: {
      type: String,
      default: "Unassigned",
    },
    assignedTo: {
      type: String,
      default: "Admin",
    },
    comments: [
      {
        author: { type: String },
        text: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    activityLog: [
      {
        action: { type: String },
        by: { type: String },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Auto-generate ticketId and fill user details before validation
ticketSchema.pre("validate", async function (next) {
  try {
    // 1. Generate ticketId if missing
    if (!this.ticketId) {
      const count = await mongoose.model("Ticket").countDocuments();
      this.ticketId = `TKT-${String(count + 1).padStart(3, "0")}`;
    }

    // 2. Fill requester and email from User model if missing but userId exists
    if (this.userId && (!this.requester || !this.email)) {
      const User = mongoose.model("User");
      const user = await User.findById(this.userId);
      if (user) {
        if (!this.requester) this.requester = user.name;
        if (!this.email) this.email = user.email;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Ticket", ticketSchema);