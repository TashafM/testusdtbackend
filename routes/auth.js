// routes/auth.js

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const sendOTPEmail = require("../utils/sendMail");
const jwt = require("jsonwebtoken");
const generateUniqueReferralCode = require("../utils/generateReferralCode");
const authenticated = require("../middleware/authenticated");
const bcrypt = require("bcryptjs");

const authController = require("../controllers/authController");

router.post("/signup", authController.postSignup);

router.post("/login", authController.postLogin);

router.post("/send-otp", authController.postSendOtp);

// OTP VERIFY ROUTE
router.post("/verify-otp", authController.postVerifyOtp);

router.get("/check-login", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ loggedIn: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ loggedIn: true, email: decoded.email });
  } catch (err) {
    return res.json({ loggedIn: false });
  }
});

// routes/auth.js or wherever your route is
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    // sameSite: "Lax",
    sameSite: "none",
  });
  return res.status(200).json({ message: "Logged out" });
});

// ✅ Protected route: Get logged-in user info
router.get("/user", authenticated, async (req, res) => {
  const user = req.user;
  res.json({
    email: user.email,
    referralCode: user.referralCode,
    referredBy: user.referredBy || null,
    balance: user.balance || 0,
    bonus: user.referralBonus || 0,
  });
});

// ✅ Protected route: Referral info
router.get("/referral-info", authenticated, async (req, res) => {
  const user = req.user;
  res.json({
    referralCode: user.referralCode,
    referredBy: user.referredBy || null,
  });
});

// Forgot Password
router.post("/forgot-password", authController.postForgotPassword );

// Reset Password
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const user = await User.findOne({ email });
  if (!user || user.otp !== otp || user.otpExpiresAt < new Date()) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  user.otp = null;
  user.otpExpiresAt = null;

  await user.save();
  res.status(200).json({ message: "Password reset successful" });
});

router.get("/otp", (req, res) => {
  res.render("otp-send", { username: "Tashaf", otp: "898784" });
});


module.exports = router;
