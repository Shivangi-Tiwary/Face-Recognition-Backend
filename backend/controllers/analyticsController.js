const User = require("../models/User");

/* ================= GET DASHBOARD STATS ================= */
exports.getDashboardStats = async (req, res) => {
  try {
    // Total users count
    const totalUsers = await User.countDocuments();
    
    // Face enrolled users count
    const faceEnrolledUsers = await User.countDocuments({ faceEnrolled: true });
    
    // Calculate enrollment rate
    const enrollmentRate = totalUsers > 0 
      ? ((faceEnrolledUsers / totalUsers) * 100).toFixed(1) 
      : 0;
    
    // Today's face logins
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayFaceLogins = await User.countDocuments({
      lastFaceLogin: { $gte: today }
    });
    
    // Total face logins ever
    const totalFaceLogins = await User.countDocuments({
      lastFaceLogin: { $exists: true }
    });
    
    // Recent face logins (last 10)
    const recentLogins = await User.find({ 
      faceEnrolled: true,
      lastFaceLogin: { $exists: true }
    })
    .sort({ lastFaceLogin: -1 })
    .limit(10)
    .select('name email lastFaceLogin enrolledAt');
    
    // Users who enrolled but never logged in with face
    const enrolledButNotUsed = await User.countDocuments({
      faceEnrolled: true,
      lastFaceLogin: { $exists: false }
    });
    
    // This week's face logins
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekFaceLogins = await User.countDocuments({
      lastFaceLogin: { $gte: weekAgo }
    });
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        faceEnrolledUsers,
        enrollmentRate: `${enrollmentRate}%`,
        todayFaceLogins,
        totalFaceLogins,
        weekFaceLogins,
        enrolledButNotUsed
      },
      recentLogins: recentLogins.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        lastFaceLogin: user.lastFaceLogin,
        enrolledAt: user.enrolledAt
      }))
    });
    
  } catch (err) {
    console.error("Analytics Error:", err);
    res.status(500).json({ error: "Failed to fetch analytics data" });
  }
};

/* ================= GET LOGIN TRENDS ================= */
exports.getLoginTrends = async (req, res) => {
  try {
    const { days = 7 } = req.query; // Default last 7 days
    
    const trends = [];
    const now = new Date();
    
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const count = await User.countDocuments({
        lastFaceLogin: { $gte: date, $lt: nextDay }
      });
      
      trends.push({
        date: date.toISOString().split('T')[0],
        logins: count
      });
    }
    
    res.json({ success: true, trends });
    
  } catch (err) {
    console.error("Trends Error:", err);
    res.status(500).json({ error: "Failed to fetch login trends" });
  }
};

/* ================= GET TOP USERS ================= */
exports.getTopUsers = async (req, res) => {
  try {
    // Get users sorted by most recent face login
    const topUsers = await User.find({ 
      faceEnrolled: true,
      lastFaceLogin: { $exists: true }
    })
    .sort({ lastFaceLogin: -1 })
    .limit(5)
    .select('name email lastFaceLogin enrolledAt');
    
    res.json({
      success: true,
      topUsers: topUsers.map((user, index) => ({
        rank: index + 1,
        name: user.name,
        email: user.email,
        lastLogin: user.lastFaceLogin,
        enrolledSince: user.enrolledAt
      }))
    });
    
  } catch (err) {
    console.error("Top Users Error:", err);
    res.status(500).json({ error: "Failed to fetch top users" });
  }
};