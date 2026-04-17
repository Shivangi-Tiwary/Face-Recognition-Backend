const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const { body, validationResult } = require("express-validator");

// Utilities
const aiService = require("../utils/aiService");
const { upload, registrationLimiter, loginLimiter, faceAuthLimiter } = require("../middleware/auth.middleware");
const { sendOtp } = require("../utils/mailer");
const { generateOtp } = require("../utils/otp");

// Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Helper for express-validator results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, error: errors.array()[0].msg });
  next();
};

// MFA Helper
async function issueMfa(user) {
  const otp = generateOtp();
  user.mfaOtp = otp;
  user.mfaOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  user.mfaVerified = false;
  await user.save();
  await sendOtp(user.email, otp);
  const pendingToken = jwt.sign({ id: user._id, mfaPending: true }, process.env.JWT_SECRET, { expiresIn: "15m" });
  return { mfaPending: true, pendingToken };
}

// 1. REGISTER (Password)
exports.validateRegister = [
  body("name").notEmpty().withMessage("Name is required").trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  validate
];

exports.register = [registrationLimiter, ...exports.validateRegister, async (req, res, next) => {
  try {
    const { name, email, password, role, enrollment, department } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ error: "Email already exists" });

    // Map 'student' to 'user' for database compatibility
    const dbRole = role === "admin" ? "admin" : "user";
    
    const user = await User.create({ 
      name, 
      email, 
      password: await bcrypt.hash(password, 10),
      role: dbRole,
      enrollment,
      department
    });

    const mfa = await issueMfa(user);
    res.status(201).json({ success: true, ...mfa });
  } catch (err) { next(err); }
}];

// 2. LOGIN (Password)
exports.validateLogin = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
  validate
];

exports.login = [loginLimiter, ...exports.validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: "Invalid email or password" });
    const mfa = await issueMfa(user);
    res.json({ success: true, ...mfa });
  } catch (err) { next(err); }
}];

// 3. VERIFY OTP
exports.verifyOtp = async (req, res, next) => {
  try {
    const { pendingToken, otp } = req.body;
    if (!pendingToken || !otp) return res.status(400).json({ error: "pendingToken and otp required" });
    const payload = jwt.verify(pendingToken, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user || user.mfaOtp !== otp.trim() || new Date() > user.mfaOtpExpiry) return res.status(401).json({ error: "Invalid or expired OTP" });
    user.mfaOtp = undefined; user.mfaOtpExpiry = undefined; user.mfaVerified = true;
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name, email: user.email }, process.env.JWT_SECRET);
    res.json({ success: true, token, user });
  } catch (err) { next(err); }
};

// 4. REGISTER WITH FACE
exports.registerWithFace = [registrationLimiter, upload.single("faceImage"), ...exports.validateRegister, async (req, res, next) => {
  let user;
  try {
    const { name, email, password, role, enrollment, department } = req.body;
    if (!req.file) return res.status(400).json({ error: "Face image is required for this registration mode" });
    if (await User.findOne({ email })) return res.status(400).json({ error: "Email already exists" });

    const embedding = await aiService.extractEmbedding(req.file.buffer, req.file.mimetype);
    
    // Map 'student' to 'user' for database compatibility
    const dbRole = role === "admin" ? "admin" : "user";

    user = await User.create({ 
      name, 
      email, 
      password: await bcrypt.hash(password, 10), 
      role: dbRole,
      enrollment,
      department,
      faceEmbedding: embedding, 
      faceEnrolled: true, 
      enrolledAt: new Date() 
    });

    const { error: uploadError } = await supabase.storage.from("faces").upload(`${user._id}.jpg`, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (uploadError) throw new Error(`Supabase upload error: ${uploadError.message}`);
    user.faceImageUrl = supabase.storage.from("faces").getPublicUrl(`${user._id}.jpg`).data.publicUrl;
    await user.save();
    const mfa = await issueMfa(user);
    res.status(201).json({ success: true, ...mfa });
  } catch (err) { if (user?._id) await User.findByIdAndDelete(user._id); next(err); }
}];

// 5. LOGIN WITH FACE
exports.loginWithFace = [faceAuthLimiter, upload.single("faceImage"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Face image is required" });
    const users = await User.find({ faceEnrolled: true });
    if (!users.length) return res.status(404).json({ error: "No enrolled faces found in the system" });
    const stored = {}; users.forEach(u => (stored[u._id] = u.faceEmbedding));
    const match = await aiService.compareFace(req.file.buffer, req.file.mimetype, stored);
    if (!match?.user_id) return res.status(401).json({ error: "Face not recognized" });
    const user = await User.findById(match.user_id);
    user.lastFaceLogin = new Date(); await user.save();
    const mfa = await issueMfa(user);
    res.json({ success: true, ...mfa, confidence: match.confidence });
  } catch (err) { next(err); }
}];

// 6. ENROLL FACE (Protected for existing users)
exports.enrollFace = [upload.single("faceImage"), async (req, res, next) => {
  try {
    const userId = req.user.id;
    if (!req.file) return res.status(400).json({ error: "No image file provided" });
    const embedding = await aiService.extractEmbedding(req.file.buffer, req.file.mimetype, userId);
    const { error: uploadError } = await supabase.storage.from("faces").upload(`${userId}.jpg`, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (uploadError) throw new Error(`Supabase upload error: ${uploadError.message}`);
    const publicUrl = supabase.storage.from("faces").getPublicUrl(`${userId}.jpg`).data.publicUrl;
    await User.findByIdAndUpdate(userId, { faceEmbedding: embedding, faceImageUrl: publicUrl, faceEnrolled: true, enrolledAt: new Date() });
    res.json({ success: true, message: "Face enrolled successfully", faceImageUrl: publicUrl });
  } catch (err) { next(err); }
}];

exports.resendOtp = async (req, res, next) => {
  try {
    const { pendingToken } = req.body;
    if (!pendingToken) return res.status(400).json({ error: "Missing pendingToken" });
    const payload = jwt.verify(pendingToken, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const mfa = await issueMfa(user);
    res.json({ success: true, ...mfa, message: "New OTP sent to your registered email" });
  } catch (err) { next(err); }
};