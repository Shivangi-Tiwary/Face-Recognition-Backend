const jwt = require("jsonwebtoken");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const multer = require("multer");

// ================= MULTER =================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// ================= RATE LIMITERS =================

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body.email || ipKeyGenerator(req),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body.email || ipKeyGenerator(req),
});

const faceAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: "Too many face authentication attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req),
});

// ================= HELPERS =================

const bufferToBase64 = (buffer, mimetype) => {
  return `data:${mimetype};base64,${buffer.toString("base64")}`;
};

// ================= AUTH MIDDLEWARE =================

const authenticate = (req, res, next) => {
  console.log("\n========== AUTH DEBUG ==========");
  console.log("HEADERS:", req.headers);

  const authHeader = req.headers.authorization;

  console.log("AUTH HEADER:", authHeader);

  if (!authHeader) {
    console.log("❌ NO AUTH HEADER");
    return res.status(401).json({ error: "Missing token" });
  }

  const token = authHeader.split(" ")[1];

  console.log("TOKEN:", token);
  console.log("JWT SECRET:", process.env.JWT_SECRET);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("DECODED:", decoded);
    console.log("========== AUTH OK ==========\n");

    req.user = decoded;
    next();
  } catch (err) {
    console.log("JWT ERROR:", err.message);
    console.log("========== AUTH FAILED ==========\n");
    return res.status(401).json({ error: "Invalid token" });
  }
};

// ================= EXPORTS =================

module.exports = {
  upload,
  registrationLimiter,
  loginLimiter,
  faceAuthLimiter,
  bufferToBase64,
  authenticate,
};