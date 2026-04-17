const nodemailer = require("nodemailer");

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASS;

let transporter = null;

if (user && pass) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass }
  });
  console.log("📧 Mailer configured: Using Gmail");
} else {
  console.warn("\n⚠️  [WARNING]: GMAIL_USER or GMAIL_APP_PASS missing in .env.");
  console.warn("⚠️  [FALLBACK]: OTPs will be logged to the console instead of sent via email.\n");
}

exports.sendOtp = async (to, otp) => {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Auth Service" <${user}>`,
        to,
        subject: "Your Verification Code",
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px">
            <h2 style="margin-bottom:8px">Verification Code</h2>
            <p style="color:#555">Use the code below to complete your login. It expires in <strong>10 minutes</strong>.</p>
            <div style="font-size:36px;font-weight:bold;letter-spacing:12px;margin:24px 0;color:#111">${otp}</div>
            <p style="color:#999;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `
      });
      console.log(`✅ Email sent to ${to}`);
    } catch (err) {
      console.error(`❌ Email failed to ${to}: ${err.message}`);
      console.log(`🔑 [FALLBACK] OTP for ${to}: ${otp}`);
    }
  } else {
    // Development fallback
    console.log("-----------------------------------------");
    console.log(`🔑 [DEV-OTP] Verification code for ${to}: ${otp}`);
    console.log("-----------------------------------------");
  }
};