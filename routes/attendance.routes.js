const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getUserHistory,
  getReport
} = require('../controllers/attendanceController');

const protect = require("../middleware/protect.middleware");

// Public (Face Kiosk)
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);

// Protected (Admin/User Management)
router.get('/today', protect, getTodayAttendance);
router.get('/history/:userId', protect, getUserHistory);
router.get('/report', protect, getReport);

module.exports = router;