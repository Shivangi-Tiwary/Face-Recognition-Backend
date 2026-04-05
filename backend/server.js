require("dns").setDefaultResultOrder("ipv4first");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/error.middleware");

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app); // wrap express in http server

const io = new Server(server, {
  cors: { origin: "*" }
});

connectDB();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Existing routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/face", require("./routes/face.routes"));
app.use("/api/analytics", require("./routes/analytics.routes"));
app.use("/api/attendance", require("./routes/attendance.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
// Chat route
app.use("/api/chat", require("./routes/chat.routes"));

app.use(errorHandler);

// Socket.io
require("./socket/index")(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`)); // use server.listen not app.listen