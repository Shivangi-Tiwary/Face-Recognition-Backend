const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const FormData = require("form-data");
const {
  upload,
  registrationLimiter,
  loginLimiter,
  faceAuthLimiter
} = require("../middleware/auth.middleware");
const { sendOtp } = require("../utils/mailer");
const { generateOtp } = require("../utils/otp");
const { validatePassword } = require("../utils/passwordPolicy");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const fastapi = axios.create({
  baseURL: process.env.FASTAPI_URL || "http://127.0.0.1:8000",
  timeout: 120000,
  maxBodyLength: Infinity,
  maxContentLength: Infinity
});

fastapi.interceptors.request.use(
  config => {
    console.log(`📤 FastAPI Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    console.error("❌ Request Setup Error:", error.message);
    return Promise.reject(error);
  }
);

fastapi.interceptors.response.use(
  response => {
    console.log(`✅ FastAPI Response: ${response.status}`);
    return response;
  },
  error => {
    if (error.code === "ECONNREFUSED") {
      console.error("❌ ECONNREFUSED: FastAPI is not running on port 8000");
    } else if (error.code === "ETIMEDOUT") {
      console.error("❌ ETIMEDOUT: FastAPI request timed out");
    } else if (error.response) {
      console.error(`❌ FastAPI Error ${error.response.status}:`, error.response.data);
    } else {
      console.error("❌ Network Error:", error.message);
    }
    return Promise.reject(error);
  }
);

/* ================= SHARED MFA HELPER ================= */
async function issueMfa(user) {
  const otp = generateOtp();
  user.mfaOtp = otp;
  user.mfaOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  user.mfaVerified = false;
  await user.save();

  await sendOtp(user.email, otp);
  console.log(`📧 OTP sent to ${user.email}`);

  // Short-lived token just to identify the user during OTP step
  const pendingToken = jwt.sign(
    { id: user._id, mfaPending: true },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  return { mfaPending: true, pendingToken };
}

/* ================= REGISTER ================= */
exports.register = [
  registrationLimiter,
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password)
        return res.status(400).json({ error: "All fields required" });

      const { valid, errors } = validatePassword(password);
      if (!valid)
        return res.status(400).json({ error: "Weak password", details: errors });

      if (await User.findOne({ email }))
        return res.status(400).json({ error: "Email already registered" });

      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, password: hashed });

      const mfa = await issueMfa(user);
      res.status(201).json({ success: true, ...mfa });
    } catch (err) {
      next(err);
    }
  }
];

/* ================= LOGIN ================= */
exports.login = [
  loginLimiter,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ error: "User not found" });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: "Wrong password" });

      const mfa = await issueMfa(user);
      res.json({ success: true, ...mfa });
    } catch (err) {
      next(err);
    }
  }
];

/* ================= VERIFY OTP ================= */
exports.verifyOtp = async (req, res, next) => {
  try {
    const { pendingToken, otp } = req.body;
    if (!pendingToken || !otp)
      return res.status(400).json({ error: "pendingToken and otp are required" });

    let payload;
    try {
      payload = jwt.verify(pendingToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Session expired. Please login again." });
    }

    if (!payload.mfaPending)
      return res.status(400).json({ error: "Invalid token type" });

    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.mfaOtp || !user.mfaOtpExpiry)
      return res.status(400).json({ error: "No OTP found. Please login again." });

    if (new Date() > user.mfaOtpExpiry)
      return res.status(401).json({ error: "OTP expired. Please login again." });

    if (user.mfaOtp !== otp.trim())
      return res.status(401).json({ error: "Incorrect OTP" });

    // Clear OTP and mark verified
    user.mfaOtp = undefined;
    user.mfaOtpExpiry = undefined;
    user.mfaVerified = true;
    await user.save();

    // Issue real JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
};

/* ================= RESEND OTP ================= */
exports.resendOtp = async (req, res, next) => {
  try {
    const { pendingToken } = req.body;
    if (!pendingToken)
      return res.status(400).json({ error: "pendingToken required" });

    let payload;
    try {
      payload = jwt.verify(pendingToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Session expired. Please login again." });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const mfa = await issueMfa(user);
    res.json({ success: true, ...mfa, message: "New OTP sent" });
  } catch (err) {
    next(err);
  }
};

/* ================= REGISTER WITH FACE ================= */
/* ================= REGISTER WITH FACE ================= */
exports.registerWithFace = [
  registrationLimiter,
  upload.single("faceImage"),
  async (req, res, next) => {
    let user;
    try {
      const { name, email, password } = req.body;

      console.log("📝 Registration attempt:", { name, email, hasFile: !!req.file });

      if (!name || !email || !password || !req.file)
        return res.status(400).json({ error: "Name, email, password & faceImage required" });

      const { valid, errors } = validatePassword(password);
      if (!valid)
        return res.status(400).json({ error: "Weak password", details: errors });

      if (await User.findOne({ email }))
        return res.status(400).json({ error: "Email already registered" });

      const hashed = await bcrypt.hash(password, 10);
      user = await User.create({ name, email, password: hashed });
      console.log("✅ User created:", user._id);

      const form = new FormData();
      form.append("image", req.file.buffer, {
        filename: "face.jpg",
        contentType: req.file.mimetype
      });
      form.append("user_id", user._id.toString());

      console.log("📤 Sending to FastAPI /extract-embedding...");
      const fastapiResponse = await fastapi.post("/extract-embedding", form, {
        headers: form.getHeaders()
      });

      const data = fastapiResponse.data;

      if (!data?.embedding || !Array.isArray(data.embedding))
        throw new Error("Invalid embedding from FastAPI");

      console.log("✅ Embedding validated - length:", data.embedding.length);

      const uploadRes = await supabase.storage
        .from("faces")
        .upload(`${user._id}.jpg`, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (uploadRes.error) throw uploadRes.error;

      const { data: urlData } = supabase.storage
        .from("faces")
        .getPublicUrl(`${user._id}.jpg`);

      user.faceEmbedding = data.embedding;
      user.faceImageUrl = urlData.publicUrl;
      user.faceEnrolled = true;
      user.enrolledAt = new Date();
      await user.save();

      console.log("✅ Face registration complete!");

      const mfa = await issueMfa(user);
      res.status(201).json({ success: true, ...mfa });

    } catch (err) {
      console.error("❌ FACE REGISTRATION FAILED:", err.message);

      if (user?._id && !user.faceEnrolled) {
        await User.findByIdAndDelete(user._id);
      }

      if (err.code === "ECONNREFUSED")
        return res.status(503).json({ error: "Face service unavailable" });

      res.status(500).json({ error: "Face enrollment failed", details: err.message });
    }
  }
];

/* ================= LOGIN WITH FACE ================= */
exports.loginWithFace = [
  faceAuthLimiter,
  upload.single("faceImage"),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Face image required" });

      console.log("👤 Face login attempt");

      const users = await User.find({
        faceEnrolled: true,
        faceEmbedding: { $exists: true }
      });

      if (!users.length)
        return res.status(404).json({ error: "No enrolled users" });

      console.log(`📊 Comparing against ${users.length} enrolled users`);

      const stored = {};
      users.forEach(u => (stored[u._id] = u.faceEmbedding));

      const form = new FormData();
      form.append("image", req.file.buffer, {
        filename: "face.jpg",
        contentType: req.file.mimetype
      });
      form.append("stored_embeddings", JSON.stringify(stored));

      console.log("📤 Sending to FastAPI for comparison...");
      const { data } = await fastapi.post("/compare-embeddings", form, {
        headers: form.getHeaders()
      });

      if (!data?.user_id)
        return res.status(404).json({ error: "Face not recognized", confidence: 0 });

      console.log(`✅ Match found: ${data.user_id} (confidence: ${data.confidence})`);

      const user = await User.findById(data.user_id);
      if (!user) return res.status(404).json({ error: "User not found" });

      user.lastFaceLogin = new Date();
      await user.save();

      const mfa = await issueMfa(user);
      res.json({ success: true, ...mfa, confidence: data.confidence });

    } catch (err) {
      console.error("❌ FACE LOGIN ERROR:", err.message);

      if (err.response?.status === 404)
        return res.status(404).json({ error: "Face not recognized" });

      if (err.code === "ECONNREFUSED")
        return res.status(503).json({ error: "Face service unavailable" });

      res.status(500).json({ error: "Face login failed", details: err.message });
    }
  }
];

























// const User = require("../models/User");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const axios = require("axios");
// const { createClient } = require("@supabase/supabase-js");
// const FormData = require("form-data");
// const {
//   upload,
//   registrationLimiter,
//   loginLimiter,
//   faceAuthLimiter,
//   bufferToBase64
// } = require("../middleware/auth.middleware");

// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_KEY
// );

// // Enhanced FastAPI client with better error handling
// const fastapi = axios.create({
//   baseURL: process.env.FASTAPI_URL || "http://127.0.0.1:8000",
//   timeout: 120000,
//   maxBodyLength: Infinity,
//   maxContentLength: Infinity
// });

// // Request logging
// fastapi.interceptors.request.use(
//   config => {
//     console.log(`📤 FastAPI Request: ${config.method.toUpperCase()} ${config.url}`);
//     return config;
//   },
//   error => {
//     console.error('❌ Request Setup Error:', error.message);
//     return Promise.reject(error);
//   }
// );

// // Response logging
// fastapi.interceptors.response.use(
//   response => {
//     console.log(`✅ FastAPI Response: ${response.status}`);
//     return response;
//   },
//   error => {
//     if (error.code === 'ECONNREFUSED') {
//       console.error('❌ ECONNREFUSED: FastAPI is not running on port 8000');
//       console.error('   → Start FastAPI: uvicorn main:app --reload --port 8000');
//     } else if (error.code === 'ETIMEDOUT') {
//       console.error('❌ ETIMEDOUT: FastAPI request timed out');
//     } else if (error.response) {
//       console.error(`❌ FastAPI Error ${error.response.status}:`, error.response.data);
//     } else {
//       console.error('❌ Network Error:', error.message);
//     }
//     return Promise.reject(error);
//   }
// );

// /* ================= REGISTER ================= */
// exports.register = [
//   registrationLimiter,
//   async (req, res, next) => {
//     try {
//       const { name, email, password } = req.body;
//       if (!name || !email || !password)
//         return res.status(400).json({ error: "All fields required" });

//       const exists = await User.findOne({ email });
//       if (exists) return res.status(400).json({ error: "Email already registered" });

//       const hashed = await bcrypt.hash(password, 10);
//       const user = await User.create({ name, email, password: hashed });

//       const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
//       res.status(201).json({ success: true, token, user });
//     } catch (err) {
//       next(err);
//     }
//   }
// ];

// /* ================= LOGIN ================= */
// exports.login = [
//   loginLimiter,
//   async (req, res, next) => {
//     try {
//       const { email, password } = req.body;
//       const user = await User.findOne({ email });
//       if (!user) return res.status(404).json({ error: "User not found" });

//       const match = await bcrypt.compare(password, user.password);
//       if (!match) return res.status(401).json({ error: "Wrong password" });

//       const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
//       res.json({ success: true, token, user });
//     } catch (err) {
//       next(err);
//     }
//   }
// ];

// /* ================= REGISTER WITH FACE ================= */
// /* ================= REGISTER WITH FACE (DEBUG VERSION) ================= */
// exports.registerWithFace = [
//   registrationLimiter,
//   upload.single("faceImage"),
//   async (req, res, next) => {
//     let user;
//     try {
//       const { name, email, password } = req.body;
      
//       console.log('📝 Registration attempt:', { name, email, hasFile: !!req.file });
      
//       if (!name || !email || !password || !req.file) {
//         console.log('❌ Missing fields');
//         return res.status(400).json({ error: "Name, email, password & faceImage required" });
//       }

//       if (await User.findOne({ email })) {
//         console.log('❌ Email exists');
//         return res.status(400).json({ error: "Email already registered" });
//       }

//       // Hash password and create user
//       console.log('🔐 Hashing password...');
//       const hashed = await bcrypt.hash(password, 10);
      
//       console.log('💾 Creating user in database...');
//       user = await User.create({ name, email, password: hashed });
//       console.log('✅ User created:', user._id);

//       // Prepare multipart/form-data
//       console.log('📦 Preparing form data...');
//       const form = new FormData();
//       form.append("image", req.file.buffer, { 
//         filename: "face.jpg", 
//         contentType: req.file.mimetype 
//       });
//       form.append("user_id", user._id.toString());
//       console.log('✅ Form data ready');

//       console.log('📤 Sending to FastAPI /extract-embedding...');
//       const fastapiResponse = await fastapi.post("/extract-embedding", form, {
//         headers: form.getHeaders()
//       });

//       console.log('✅ FastAPI responded with status:', fastapiResponse.status);
//       console.log('📦 Response data:', JSON.stringify(fastapiResponse.data).substring(0, 200) + '...');

//       const data = fastapiResponse.data;

//       if (!data) {
//         console.error('❌ No data in FastAPI response');
//         throw new Error("No data returned from FastAPI");
//       }

//       if (!data.embedding) {
//         console.error('❌ No embedding in response:', data);
//         throw new Error("No embedding in FastAPI response");
//       }

//       if (!Array.isArray(data.embedding)) {
//         console.error('❌ Embedding is not an array:', typeof data.embedding);
//         throw new Error("Invalid embedding format");
//       }

//       console.log('✅ Embedding validated - length:', data.embedding.length);

//       // Upload face image to Supabase
//       console.log('📤 Uploading image to Supabase storage...');
//       const uploadRes = await supabase.storage
//         .from("faces")
//         .upload(`${user._id}.jpg`, req.file.buffer, {
//           contentType: req.file.mimetype,
//           upsert: true
//         });

//       if (uploadRes.error) {
//         console.error('❌ Supabase upload error:', uploadRes.error);
//         throw uploadRes.error;
//       }

//       console.log('✅ Supabase upload successful');

//       const { data: urlData } = supabase.storage
//         .from("faces")
//         .getPublicUrl(`${user._id}.jpg`);

//       console.log('✅ Got public URL:', urlData.publicUrl);

//       // Save embedding and URL to user
//       console.log('💾 Saving embedding to user document...');
//       user.faceEmbedding = data.embedding;
//       user.faceImageUrl = urlData.publicUrl;
//       user.faceEnrolled = true;
//       user.enrolledAt = new Date();
//       await user.save();

//       console.log('✅ Face registration complete!');

//       // Send JWT token
//       const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
//       res.status(201).json({ success: true, token, user });

//     } catch (err) {
//       console.error("❌❌❌ FACE REGISTRATION FAILED ❌❌❌");
//       console.error("Error name:", err.name);
//       console.error("Error message:", err.message);
//       console.error("Error code:", err.code);
//       console.error("Full error:", err);
      
//       // Only delete user if it was created and embedding failed
//       if (user?._id && !user.faceEnrolled) {
//         console.log('🗑️ Cleaning up user:', user._id);
//         await User.findByIdAndDelete(user._id);
//       }
      
//       // Send more specific error
//       if (err.code === 'ECONNREFUSED') {
//         return res.status(503).json({ 
//           error: "Face service unavailable. Please try again later.",
//           details: "FastAPI server is not running"
//         });
//       }
      
//       res.status(500).json({ 
//         error: "Face enrollment failed. Try again.",
//         details: err.message 
//       });
//     }
//   }
// ];

// /* ================= LOGIN WITH FACE ================= */
// exports.loginWithFace = [
//   faceAuthLimiter,
//   upload.single("faceImage"),
//   async (req, res, next) => {
//     try {
//       if (!req.file) return res.status(400).json({ error: "Face image required" });

//       console.log('👤 Face login attempt');

//       // Get all users who have face embeddings
//       const users = await User.find({
//         faceEnrolled: true,
//         faceEmbedding: { $exists: true }
//       });

//       if (!users.length)
//         return res.status(404).json({ error: "No enrolled users" });

//       console.log(`📊 Comparing against ${users.length} enrolled users`);

//       // Prepare stored embeddings object
//       const stored = {};
//       users.forEach(u => (stored[u._id] = u.faceEmbedding));

//       // Send image to FastAPI using FormData
//       const form = new FormData();
//       form.append("image", req.file.buffer, { 
//         filename: "face.jpg", 
//         contentType: req.file.mimetype 
//       });
//       form.append("stored_embeddings", JSON.stringify(stored));

//       console.log('📤 Sending to FastAPI for comparison...');

//       const { data } = await fastapi.post("/compare-embeddings", form, {
//         headers: form.getHeaders()
//       });

//       if (!data?.user_id)
//         return res.status(404).json({ error: "Face not recognized", confidence: 0 });

//       console.log(`✅ Match found: ${data.user_id} (confidence: ${data.confidence})`);

//       // Fetch matched user
//       const user = await User.findById(data.user_id);
//       if (!user) return res.status(404).json({ error: "User not found" });

//       // Update last face login
//       user.lastFaceLogin = new Date();
//       await user.save();

//       // Send JWT token
//       const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
//       res.json({
//         success: true,
//         token,
//         user,
//         confidence: data.confidence
//       });

//     } catch (err) {
//       console.error("❌ FACE LOGIN ERROR:", err.message);
      
//       // Handle specific FastAPI errors
//       if (err.response?.status === 404) {
//         return res.status(404).json({ error: "Face not recognized" });
//       }
      
//       if (err.code === 'ECONNREFUSED') {
//         return res.status(503).json({ 
//           error: "Face service unavailable",
//           details: "FastAPI server is not running"
//         });
//       }
      
//       res.status(500).json({ 
//         error: "Face login failed",
//         details: err.message 
//       });
//     }
//   }
// ];