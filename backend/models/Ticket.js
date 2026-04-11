const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["Recognition Failure", "Hardware", "AI Model", "Enrollment", "Access Control", "Other"],
      default: "Other",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Pending"],
      default: "Open",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

// Auto-generate ticketId like TKT-001
ticketSchema.pre("save", async function (next) {
  if (!this.ticketId) {
    const count = await mongoose.model("Ticket").countDocuments();
    this.ticketId = `TKT-${String(count + 1).padStart(3, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Ticket", ticketSchema);