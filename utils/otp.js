const crypto = require("crypto");

exports.generateOtp = () => {
  otp = String(crypto.randomInt(100000, 999999));
  console.log(otp)
  return otp
};