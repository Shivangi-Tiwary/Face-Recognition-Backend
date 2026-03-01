const router = require("express").Router();
const {
  register,
  registerWithFace,
  login,
  loginWithFace,
  verifyOtp,
  resendOtp
} = require("../controllers/auth.controller");

router.post("/register", register);
router.post("/register-with-face", registerWithFace);
router.post("/login", login);
router.post("/login-with-face", loginWithFace);

router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

module.exports = router;
