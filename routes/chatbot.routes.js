
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");

// SIMPLE CHAT ROUTE (NO AI)
router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // simple reply logic
    let reply = "I did not understand that.";

    if (message.toLowerCase().includes("hello")) {
      reply = "Hi! How can I help you?";
    } else if (message.toLowerCase().includes("face")) {
      reply = "Face recognition system is active.";
    } else if (message.toLowerCase().includes("admin")) {
      reply = "Admin panel allows user monitoring.";
    }

    res.json({ reply });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
