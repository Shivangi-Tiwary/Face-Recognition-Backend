const router = require("express").Router();
const {
  register,
  registerWithFace,
  login,
  loginWithFace,
  enrollFace,
  verifyOtp,
  resendOtp
} = require("../controllers/auth.controller");

const protect = require("../middleware/protect.middleware");

router.post("/register", register);
router.post("/register-with-face", registerWithFace);
router.post("/login", login);
router.post("/login-with-face", loginWithFace);
router.post("/enroll-face", protect, enrollFace); // Protect this!

router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

module.exports = router;