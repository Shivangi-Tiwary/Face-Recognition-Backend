const User = require("../models/User");
const Attendance = require("../models/Attendance");
const axios = require("axios");
const FormData = require("form-data");
const { upload } = require("../middleware/auth.middleware");

const fastapi = axios.create({
  baseURL: process.env.FASTAPI_URL || "http://127.0.0.1:8000",
  timeout: 120000,
  maxBodyLength: Infinity,
  maxContentLength: Infinity
});

/* ================= CHECK IN WITH FACE ================= */
exports.checkIn = [
  upload.single("faceImage"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Face image required" });

      // Get all enrolled users
      const users = await User.find({
        faceEnrolled: true,
        faceEmbedding: { $exists: true }
      });

      if (!users.length) {
        return res.status(404).json({ error: "No enrolled users found" });
      }

      // Prepare embeddings for comparison
      const stored = {};
      users.forEach(u => (stored[u._id] = u.faceEmbedding));

      // Compare with FastAPI
      const form = new FormData();
      form.append("image", req.file.buffer, { 
        filename: "face.jpg", 
        contentType: req.file.mimetype 
      });
      form.append("stored_embeddings", JSON.stringify(stored));

      const { data } = await fastapi.post("/compare-embeddings", form, {
        headers: form.getHeaders()
      });

      if (!data?.user_id) {
        return res.status(404).json({ error: "Face not recognized" });
      }

      const user = await User.findById(data.user_id);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Check if already checked in today
      const today = new Date().toISOString().split('T')[0]; // "2025-02-14"
      
      const existingAttendance = await Attendance.findOne({
        userId: user._id,
        date: today
      });

      if (existingAttendance) {
        return res.status(400).json({ 
          error: "Already checked in today",
          checkInTime: existingAttendance.checkIn
        });
      }

      // Determine status based on time
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      let status = 'on-time';
      if (hour > 9 || (hour === 9 && minute > 30)) {
        status = 'late'; // After 9:30 AM
      }

      // Create attendance record
      const attendance = await Attendance.create({
        userId: user._id,
        checkIn: now,
        date: today,
        status,
        confidence: data.confidence,
        location: req.body.location || 'Office'
      });

      console.log(`✅ Check-in: ${user.name} at ${now.toLocaleTimeString()} (${status})`);

      res.json({
        success: true,
        message: `Welcome, ${user.name}!`,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        },
        attendance: {
          checkIn: attendance.checkIn,
          status: attendance.status,
          confidence: data.confidence
        }
      });

    } catch (err) {
      console.error("Check-in Error:", err.message);
      
      if (err.code === 11000) {
        return res.status(400).json({ error: "Already checked in today" });
      }
      
      res.status(500).json({ error: "Check-in failed" });
    }
  }
];

/* ================= CHECK OUT WITH FACE ================= */
exports.checkOut = [
  upload.single("faceImage"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Face image required" });

      // Recognize user (same as check-in)
      const users = await User.find({
        faceEnrolled: true,
        faceEmbedding: { $exists: true }
      });

      const stored = {};
      users.forEach(u => (stored[u._id] = u.faceEmbedding));

      const form = new FormData();
      form.append("image", req.file.buffer, { 
        filename: "face.jpg", 
        contentType: req.file.mimetype 
      });
      form.append("stored_embeddings", JSON.stringify(stored));

      const { data } = await fastapi.post("/compare-embeddings", form, {
        headers: form.getHeaders()
      });

      if (!data?.user_id) {
        return res.status(404).json({ error: "Face not recognized" });
      }

      const user = await User.findById(data.user_id);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Find today's attendance
      const today = new Date().toISOString().split('T')[0];
      const attendance = await Attendance.findOne({
        userId: user._id,
        date: today
      });

      if (!attendance) {
        return res.status(404).json({ error: "No check-in record found for today" });
      }

      if (attendance.checkOut) {
        return res.status(400).json({ 
          error: "Already checked out",
          checkOutTime: attendance.checkOut
        });
      }

      // Update check-out time
      attendance.checkOut = new Date();
      await attendance.save();

      // Calculate work duration
      const duration = (attendance.checkOut - attendance.checkIn) / 1000 / 60 / 60; // hours
      const durationFormatted = `${Math.floor(duration)}h ${Math.round((duration % 1) * 60)}m`;

      console.log(`✅ Check-out: ${user.name} at ${attendance.checkOut.toLocaleTimeString()}`);

      res.json({
        success: true,
        message: `Goodbye, ${user.name}!`,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        },
        attendance: {
          checkIn: attendance.checkIn,
          checkOut: attendance.checkOut,
          duration: durationFormatted,
          status: attendance.status
        }
      });

    } catch (err) {
      console.error("Check-out Error:", err.message);
      res.status(500).json({ error: "Check-out failed" });
    }
  }
];

/* ================= GET TODAY'S ATTENDANCE ================= */
exports.getTodayAttendance = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const attendance = await Attendance.find({ date: today })
      .populate('userId', 'name email')
      .sort({ checkIn: -1 });
    
    const totalUsers = await User.countDocuments({ faceEnrolled: true });
    const present = attendance.length;
    const absent = totalUsers - present;
    
    res.json({
      success: true,
      date: today,
      summary: {
        total: totalUsers,
        present,
        absent,
        onTime: attendance.filter(a => a.status === 'on-time').length,
        late: attendance.filter(a => a.status === 'late').length
      },
      attendance: attendance.map(a => ({
        userId: a.userId._id,
        name: a.userId.name,
        email: a.userId.email,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        status: a.status,
        confidence: a.confidence
      }))
    });
    
  } catch (err) {
    console.error("Get Attendance Error:", err);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
};

/* ================= GET USER ATTENDANCE HISTORY ================= */
exports.getUserHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;
    
    let query = { userId };
    
    // Filter by month/year if provided
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${month.padStart(2, '0')}-31`;
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(100);
    
    const stats = {
      totalDays: attendance.length,
      onTime: attendance.filter(a => a.status === 'on-time').length,
      late: attendance.filter(a => a.status === 'late').length,
      averageConfidence: (attendance.reduce((sum, a) => sum + a.confidence, 0) / attendance.length).toFixed(2)
    };
    
    res.json({
      success: true,
      userId,
      stats,
      history: attendance
    });
    
  } catch (err) {
    console.error("User History Error:", err);
    res.status(500).json({ error: "Failed to fetch user history" });
  }
};

/* ================= GET ATTENDANCE REPORT ================= */
exports.getReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    const attendance = await Attendance.find(query)
      .populate('userId', 'name email')
      .sort({ date: -1, checkIn: -1 });
    
    res.json({
      success: true,
      period: { startDate, endDate },
      totalRecords: attendance.length,
      data: attendance.map(a => ({
        date: a.date,
        userId: a.userId._id,
        name: a.userId.name,
        email: a.userId.email,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        status: a.status,
        confidence: a.confidence,
        location: a.location
      }))
    });
    
  } catch (err) {
    console.error("Report Error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
};