const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getLoginTrends,
  getTopUsers
} = require('../controllers/analyticsController');

// You might have an auth middleware - add it if you have one
// const { authMiddleware } = require('../middleware/auth.middleware');

// Public routes (or add authMiddleware if you want them protected)
router.get('/dashboard', getDashboardStats);
router.get('/trends', getLoginTrends);
router.get('/top-users', getTopUsers);

module.exports = router;