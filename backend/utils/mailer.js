const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS
  }
});

exports.sendOtp = async (to, otp) => {
  await transporter.sendMail({
    from: `"MyApp Auth" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Your verification code",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px">
        <h2 style="margin-bottom:8px">Verification Code</h2>
        <p style="color:#555">Use the code below to complete your login. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:12px;margin:24px 0;color:#111">${otp}</div>
        <p style="color:#999;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `
  });
};