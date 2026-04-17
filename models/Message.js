const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ["text", "image"], default: "text" },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  deletedAt: { type: Date, default: null },
  fileName: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);