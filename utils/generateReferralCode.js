// utils/generateReferralCode.js
const User = require("../models/User");

async function generateUniqueReferralCode(length = 8) {
  let code;
  let exists = true;

  while (exists) {
    code = Math.random().toString(36).substring(2, 2 + length).toUpperCase();
    exists = await User.findOne({ referralCode: code });
  }

  return code;
}

module.exports = generateUniqueReferralCode;
