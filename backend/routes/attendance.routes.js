const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getUserHistory,
  getReport
} = require('../controllers/attendanceController');

// Attendance routes
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/today', getTodayAttendance);
router.get('/history/:userId', getUserHistory);
router.get('/report', getReport);

module.exports = router;