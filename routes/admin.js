const express = require("express");
const router = express.Router();
const User = require("../models/User");
const adminOnly = require("../middleware/admin.middleware");
const protect = require("../middleware/protect.middleware");

// Get all students/users
router.get("/students", protect, adminOnly, async (req, res, next) => {
  try {
    const students = await User.find().select("-password -faceEmbedding");
    res.json(students);
  } catch (error) { next(error); }
});

// Get single student by ID
router.get("/students/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const student = await User.findById(req.params.id).select("-password -faceEmbedding");
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (error) { next(error); }
});

module.exports = router;