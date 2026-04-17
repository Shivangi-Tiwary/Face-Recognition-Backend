const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    default: null
  },
  date: {
    type: String, // Format: "2025-02-14"
    required: true
  },
  status: {
    type: String,
    enum: ['on-time', 'late', 'half-day', 'absent'],
    default: 'on-time'
  },
  confidence: {
    type: Number, // Face recognition confidence
    required: true
  },
  location: {
    type: String,
    default: 'Office'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Compound index: one attendance record per user per day
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);