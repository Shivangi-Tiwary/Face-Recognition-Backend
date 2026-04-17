
const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  message: String,
  reply: String
}, { timestamps: true });

module.exports = mongoose.model("Chat", chatSchema);
