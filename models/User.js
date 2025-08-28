const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema({
//   email: { type: String, unique: true, required: true },
//   otp: String,
//   otpExpiresAt: Date,
//   referralCode: { type: String, unique: true, immutable: true },
//   referredBy: { type: String, immutable: true },
//   hasClaimedReferral: { type: Boolean, default: false },
//   balance: { type: Number, default: 0 },
//   referralBonus: { type: Number, default: 0 },
// });

// module.exports = mongoose.model("User", userSchema);

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true, required: true },
  password: { type: String }, // hashed
  isVerified: { type: Boolean, default: false }, // 👈 important

  otp: String,
  otpExpiresAt: Date,

  referralCode: { type: String, unique: true, immutable: true },
  referredBy: { type: String, immutable: true },
  hasClaimedReferral: { type: Boolean, default: false },

  balance: { type: Number, default: 0 },
  referralBonus: { type: Number, default: 0 },
});

module.exports = mongoose.model("User", userSchema);
