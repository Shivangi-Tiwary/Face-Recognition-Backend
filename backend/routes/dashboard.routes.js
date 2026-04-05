const express = require("express");
const router = express.Router();
const auth = require("../middleware/protect.middleware");
const ctrl = require("../controllers/dashboard.controller");

router.get("/user", auth, ctrl.getUserDashboard);
router.get("/user/attendance", auth, ctrl.getAttendanceHistory);

module.exports = router;