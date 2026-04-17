const Room = require("../models/Room");
const Message = require("../models/Message");
const User = require("../models/User");
const crypto = require("crypto");
const { sendOtp } = require("../utils/mailer"); // reuse nodemailer

/* ── GET OR CREATE DM ROOM ── */
exports.getOrCreateDM = async (req, res) => {
  try {
    const myId = req.user.id;
    const { targetUserId } = req.params;

    let room = await Room.findOne({
      type: "dm",
      members: { $all: [myId, targetUserId], $size: 2 }
    }).populate("members", "name email");

    if (!room) {
      room = await Room.create({ type: "dm", members: [myId, targetUserId] });
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

    if (!name) return res.status(400).json({ error: "Group name required" });

    const allMembers = [...new Set([myId, ...(memberIds || [])])];
    const inviteCode = crypto.randomBytes(6).toString("hex"); // e.g. "a1b2c3d4e5f6"

    const room = await Room.create({
      type: "group",
      name,
      members: allMembers,
      admin: myId,
      inviteCode
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

    const messages = await Message.find({ roomId, deletedAt: null })
      .populate("sender", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

/* ── GET ALL USERS ── */
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

    if (!room.members.map(m => m.toString()).includes(userId)) {
      room.members.push(userId);
      await room.save();
    }

    res.json({ success: true, message: "Member added" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add member" });
  }
};

/* ── GENERATE INVITE LINK ── */
exports.getInviteLink = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);
    if (!room || room.type !== "group")
      return res.status(404).json({ error: "Group not found" });

    // Regenerate invite code if needed
    if (!room.inviteCode) {
      room.inviteCode = crypto.randomBytes(6).toString("hex");
      await room.save();
    }

    const inviteLink = `${process.env.FRONTEND_URL}/join/${room.inviteCode}`;
    res.json({ success: true, inviteLink, inviteCode: room.inviteCode });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate invite link" });
  }
};

/* ── JOIN VIA INVITE CODE ── */
exports.joinViaInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const myId = req.user.id;

    const room = await Room.findOne({ inviteCode });
    if (!room) return res.status(404).json({ error: "Invalid invite link" });

    if (!room.members.map(m => m.toString()).includes(myId)) {
      room.members.push(myId);
      await room.save();
    }

    res.json({ success: true, message: "Joined group!", roomId: room._id });
  } catch (err) {
    res.status(500).json({ error: "Failed to join group" });
  }
};

/* ── SEND INVITE VIA EMAIL ── */
exports.sendInviteEmail = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { email } = req.body;

    const room = await Room.findById(roomId);
    if (!room || room.type !== "group")
      return res.status(404).json({ error: "Group not found" });

    if (!room.inviteCode) {
      room.inviteCode = crypto.randomBytes(6).toString("hex");
      await room.save();
    }

    const inviteLink = `${process.env.FRONTEND_URL}/join/${room.inviteCode}`;

    // Reuse your existing mailer
    const { sendOtp: sendMail } = require("../utils/mailer");
    await sendMail(email, `You've been invited to join "${room.name}"!\n\nClick here: ${inviteLink}`);

    res.json({ success: true, message: `Invite sent to ${email}` });
  } catch (err) {
    res.status(500).json({ error: "Failed to send invite" });
  }
};

/* ── DELETE MESSAGE ── */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const myId = req.user.id;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    if (msg.sender.toString() !== myId)
      return res.status(403).json({ error: "You can only delete your own messages" });

    msg.deletedAt = new Date();
    await msg.save();

    res.json({ success: true, message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete message" });
  }
};

/* ── LEAVE GROUP ── */
exports.leaveGroup = async (req, res) => {
  try {
    const { roomId } = req.params;
    const myId = req.user.id;

    const room = await Room.findById(roomId);
    if (!room || room.type !== "group")
      return res.status(404).json({ error: "Group not found" });

    // Remove user from members
    room.members = room.members.filter(m => m.toString() !== myId);

    // If admin leaves, assign new admin
    if (room.admin.toString() === myId && room.members.length > 0) {
      room.admin = room.members[0];
    }

    // If no members left, delete the group
    if (room.members.length === 0) {
      await Room.findByIdAndDelete(roomId);
      return res.json({ success: true, message: "Group deleted as no members remain" });
    }

    await room.save();
    res.json({ success: true, message: "Left group successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to leave group" });
  }
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    const fileName = `${Date.now()}_${req.file.originalname}`;
    const { error } = await supabase.storage
      .from("chat-files")
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("chat-files")
      .getPublicUrl(fileName);

    res.json({ success: true, url: data.publicUrl });
  } catch (err) {
    res.status(500).json({ error: "File upload failed" });
  }
};