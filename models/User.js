const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Role
  role: { type: String, enum: ["user", "admin"], default: "user" },

  // Student details
  enrollment: { type: String },
  department: { type: String },

  // Face recognition fields
  faceEmbedding: [Number],
  faceImageUrl: String,
  faceEnrolled: { type: Boolean, default: false },

  // Metadata
  enrolledAt: Date,
  lastFaceLogin: Date,

  // OTP
  mfaOtp:      { type: String },
  mfaOtpExpiry:{ type: Date },
  mfaVerified: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);