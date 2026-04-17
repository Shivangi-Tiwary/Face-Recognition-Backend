require("dns").setDefaultResultOrder("ipv4first");
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/error.middleware");
const protect = require("./middleware/protect.middleware");

const app = express();
app.set("trust proxy", 1);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// Connect MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Test route
app.get("/", (req, res) => {
  res.send("Backend running successfully");
});

// ================= API ROUTES =================

// Public
app.use("/api/auth",      require("./routes/auth.routes"));

// Protected
app.use("/api/admin",      protect, require("./routes/admin"));
app.use("/api/tickets",    protect, require("./routes/ticket.routes"));
app.use("/api/chatbot",    protect, require("./routes/chatbot.routes"));
app.use("/api/analytics",  protect, require("./routes/analytics.routes"));
app.use("/api/attendance", require("./routes/attendance.routes"));
app.use("/api/dashboard",  protect, require("./routes/dashboard.routes"));
app.use("/api/chat",       protect, require("./routes/chat.routes"));
app.use("/api/user",              require("./routes/userDashboard.routes"));

// Error handler (must be AFTER all routes)
app.use(errorHandler);

// Socket.io
require("./socket/index")(io);

// ================= SERVE REACT BUILD (optional) =================

const clientDist = path.join(__dirname, "..", "face-recognition", "dist");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));

  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ================= SERVER =================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});