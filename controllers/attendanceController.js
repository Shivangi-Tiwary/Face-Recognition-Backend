const User = require("../models/User");
const Attendance = require("../models/Attendance");
const aiService = require("../utils/aiService");
const { upload } = require("../middleware/auth.middleware");

/**
 * Attendance Controller - Unified with AI Service Utility
 */

// 1. CHECK IN WITH FACE
exports.checkIn = [
  upload.single("faceImage"),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Face image required" });

      const query = { faceEnrolled: true, faceEmbedding: { $exists: true } };
      if (req.body.userId) {
        query._id = req.body.userId;
      }

      const users = await User.find(query);
      if (!users.length) return res.status(404).json({ error: "No enrolled users found" });

      const stored = {};
      users.forEach(u => (stored[u._id] = u.faceEmbedding));

      const match = await aiService.compareFace(req.file.buffer, req.file.mimetype, stored);
      if (!match?.user_id) return res.status(404).json({ error: "Face not recognized" });

      const user = await User.findById(match.user_id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const today = new Date().toISOString().split("T")[0];
      const existing = await Attendance.findOne({ userId: user._id, date: today });
      if (existing) return res.status(400).json({ error: "Already checked in today" });

      const now = new Date();
      let status = "on-time";
      if (now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30)) status = "late";

      const attendance = await Attendance.create({
        userId: user._id,
        checkIn: now,
        date: today,
        status,
        confidence: match.confidence,
        location: req.body.location || "Office",
      });

      res.json({ success: true, message: `Welcome, ${user.name}!`, user, attendance });
    } catch (err) {
      console.error("Check-in Error:", err.message);
      next(err);
    }
  },
];

// 2. CHECK OUT WITH FACE
exports.checkOut = [
  upload.single("faceImage"),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Face image required" });

      const query = { faceEnrolled: true, faceEmbedding: { $exists: true } };
      if (req.body.userId) {
        query._id = req.body.userId;
      }

      const users = await User.find(query);
      if (!users.length) return res.status(404).json({ error: "No enrolled users found" });

      const stored = {};
      users.forEach(u => (stored[u._id] = u.faceEmbedding));

      const match = await aiService.compareFace(req.file.buffer, req.file.mimetype, stored);
      if (!match?.user_id) return res.status(404).json({ error: "Face not recognized" });

      const today = new Date().toISOString().split("T")[0];
      const attendance = await Attendance.findOne({ userId: match.user_id, date: today });
      if (!attendance) return res.status(404).json({ error: "No check-in record found for today" });
      if (attendance.checkOut) return res.status(400).json({ error: "Already checked out" });

      attendance.checkOut = new Date();
      await attendance.save();

      res.json({ success: true, message: `Goodbye!`, attendance });
    } catch (err) {
      console.error("Check-out Error:", err.message);
      next(err);
    }
  },
];

// 3. GET TODAY'S ATTENDANCE (Admin)
exports.getTodayAttendance = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const attendance = await Attendance.find({ date: today }).populate("userId", "name email").sort({ checkIn: -1 });
    const totalUsers = await User.countDocuments({ faceEnrolled: true });
    
    res.json({
      success: true,
      summary: {
        total: totalUsers,
        present: attendance.length,
        absent: totalUsers - attendance.length,
        onTime: attendance.filter(a => a.status === "on-time").length,
        late: attendance.filter(a => a.status === "late").length
      },
      attendance
    });
  } catch (err) { next(err); }
};

// 4. GET USER HISTORY
exports.getUserHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const history = await Attendance.find({ userId }).sort({ date: -1 }).limit(100);
    res.json({ success: true, history });
  } catch (err) { next(err); }
};

// 5. GET ATTENDANCE REPORT
exports.getReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
    const attendance = await Attendance.find(query).populate("userId", "name email").sort({ date: -1 });
    res.json({ success: true, count: attendance.length, data: attendance });
  } catch (err) { next(err); }
};