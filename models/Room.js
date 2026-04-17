const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  type: { type: String, enum: ["dm", "group"], required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  name: { type: String },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  lastMessageAt: { type: Date, default: Date.now },
  inviteCode: { type: String, unique: true, sparse: true } // ← new
}, { timestamps: true });

module.exports = mongoose.model("Room", roomSchema);