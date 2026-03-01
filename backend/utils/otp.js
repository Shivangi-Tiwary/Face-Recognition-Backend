const crypto = require("crypto");

exports.generateOtp = () => {
  return String(crypto.randomInt(100000, 999999));
};