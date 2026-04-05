const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const Room = require("../models/Room");

const onlineUsers = new Map();

module.exports = (io) => {
  // Auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);

    io.emit("online_users", Array.from(onlineUsers.keys()));
    console.log(`🟢 Connected: ${userId}`);

    const rooms = await Room.find({ members: userId });
    rooms.forEach(r => socket.join(r._id.toString()));

    // ── JOIN A ROOM ──
    socket.on("join_room", async (roomId) => {
      socket.join(roomId);
    });

    // ── SEND MESSAGE ──
    socket.on("send_message", async ({ roomId, content, type = "text", fileName = null }) => {
  try {
    const msg = await Message.create({
      roomId,
      sender: userId,
      content,
      type,
      fileName,
      readBy: [userId]
    });

    await Room.findByIdAndUpdate(roomId, {
      lastMessage: msg._id,
      lastMessageAt: new Date()
    });

    const populated = await msg.populate("sender", "name email");
    io.to(roomId).emit("new_message", populated);
  } catch (err) {
    socket.emit("error", { message: "Failed to send message" });
  }
});
    // ── TYPING INDICATORS ──
    socket.on("typing", ({ roomId }) => {
      socket.to(roomId).emit("user_typing", { userId, roomId });
    });

    socket.on("stop_typing", ({ roomId }) => {
      socket.to(roomId).emit("user_stop_typing", { userId, roomId });
    });

    // ── MARK MESSAGES AS READ ──
    socket.on("mark_read", async ({ roomId }) => {
      await Message.updateMany(
        { roomId, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );
      socket.to(roomId).emit("messages_read", { roomId, userId });
    });

    // ── DELETE MESSAGE ──
    socket.on("delete_message", async ({ messageId, roomId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg || msg.sender.toString() !== userId) return;
        msg.deletedAt = new Date();
        await msg.save();
        io.to(roomId).emit("message_deleted", { messageId, roomId });
      } catch (err) {
        socket.emit("error", { message: "Failed to delete message" });
      }
    });

    // ── LEAVE GROUP ──
    socket.on("leave_group", async ({ roomId }) => {
      socket.leave(roomId);
      io.to(roomId).emit("member_left", { userId, roomId });
    });

    // ── DISCONNECT ──
    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      io.emit("online_users", Array.from(onlineUsers.keys()));
      console.log(`🔴 Disconnected: ${userId}`);
    });
  });
};