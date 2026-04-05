const Room = require("../models/Room");
const Message = require("../models/Message");
const User = require("../models/User");
const mongoose = require("mongoose");

/* ── GET OR CREATE DM ROOM ── */
exports.getOrCreateDM = async (req, res) => {
  try {
    const myId = req.user.id;
    const { targetUserId } = req.params;

    // Check if DM room already exists
    let room = await Room.findOne({
      type: "dm",
      members: { $all: [myId, targetUserId], $size: 2 }
    }).populate("members", "name email");

    if (!room) {
      room = await Room.create({
        type: "dm",
        members: [myId, targetUserId]
      });
      room = await room.populate("members", "name email");
    }

    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ error: "Failed to get/create DM" });
  }
};

/* ── CREATE GROUP ── */
exports.createGroup = async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    const myId = req.user.id;

    if (!name || !memberIds?.length)
      return res.status(400).json({ error: "Name and members required" });

    const allMembers = [...new Set([myId, ...memberIds])];

    const room = await Room.create({
      type: "group",
      name,
      members: allMembers,
      admin: myId
    });

    const populated = await room.populate("members", "name email");
    res.status(201).json({ success: true, room: populated });
  } catch (err) {
    res.status(500).json({ error: "Failed to create group" });
  }
};

/* ── GET MY ROOMS ── */
exports.getMyRooms = async (req, res) => {
  try {
    const myId = req.user.id;

    const rooms = await Room.find({ members: myId })
      .populate("members", "name email")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 });

    res.json({ success: true, rooms });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
};

/* ── GET MESSAGES IN A ROOM ── */
exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({
      roomId,
      deletedAt: null
    })
      .populate("sender", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

/* ── GET ALL USERS (for sidebar) ── */
exports.getAllUsers = async (req, res) => {
  try {
    const myId = req.user.id;
    const users = await User.find({ _id: { $ne: myId } })
      .select("name email faceImageUrl lastFaceLogin");
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

/* ── ADD MEMBER TO GROUP ── */
exports.addMember = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const myId = req.user.id;

    const room = await Room.findById(roomId);
    if (!room || room.type !== "group")
      return res.status(404).json({ error: "Group not found" });

    if (room.admin.toString() !== myId)
      return res.status(403).json({ error: "Only admin can add members" });

    if (!room.members.includes(userId)) {
      room.members.push(userId);
      await room.save();
    }

    res.json({ success: true, message: "Member added" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add member" });
  }
};