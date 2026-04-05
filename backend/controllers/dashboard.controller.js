const Attendance = require("../models/Attendance");
const User = require("../models/User");

/* ── GET USER DASHBOARD DATA ── */
exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password -faceEmbedding");

    // Today's attendance
    const today = new Date().toISOString().split("T")[0];
    const todayAttendance = await Attendance.findOne({ userId, date: today });

    // This month's stats
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;

    const monthAttendance = await Attendance.find({
      userId,
      date: { $gte: monthStart, $lte: monthEnd }
    });

    // Calculate working days in month so far
    const todayDate = new Date();
    let workingDays = 0;
    for (let d = 1; d <= todayDate.getDate(); d++) {
      const day = new Date(todayDate.getFullYear(), todayDate.getMonth(), d).getDay();
      if (day !== 0 && day !== 6) workingDays++;
    }

    const presentDays = monthAttendance.length;
    const onTime = monthAttendance.filter(a => a.status === "on-time").length;
    const late = monthAttendance.filter(a => a.status === "late").length;
    const halfDay = monthAttendance.filter(a => a.status === "half-day").length;
    const absentDays = workingDays - presentDays;

    // Recent attendance (last 7 records)
    const recentAttendance = await Attendance.find({ userId })
      .sort({ date: -1 })
      .limit(7);

    res.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        faceEnrolled: user.faceEnrolled,
        enrolledAt: user.enrolledAt,
        role: user.role
      },
      today: todayAttendance ? {
        status: todayAttendance.status,
        checkIn: todayAttendance.checkIn,
        checkOut: todayAttendance.checkOut,
        confidence: todayAttendance.confidence
      } : null,
      monthStats: {
        workingDays,
        presentDays,
        absentDays: absentDays < 0 ? 0 : absentDays,
        onTime,
        late,
        halfDay,
        attendancePercentage: workingDays > 0
          ? ((presentDays / workingDays) * 100).toFixed(1)
          : 0
      },
      recentAttendance: recentAttendance.map(a => ({
        date: a.date,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        status: a.status,
        confidence: a.confidence
      }))
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};

/* ── GET FULL ATTENDANCE HISTORY ── */
exports.getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    let query = { userId };

    if (month && year) {
      const m = String(month).padStart(2, "0");
      query.date = {
        $gte: `${year}-${m}-01`,
        $lte: `${year}-${m}-31`
      };
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(100);

    res.json({ success: true, attendance });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attendance history" });
  }
};