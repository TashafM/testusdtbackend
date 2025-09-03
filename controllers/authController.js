const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const generateUniqueReferralCode = require("../utils/generateReferralCode");
const sendOTPEmail = require("../utils/sendMail");

exports.postSignup = async (req, res) => {
  const { name, email, password, confirmPassword, otp } = req.body;

  if (!name || !email || !password || !confirmPassword || !otp) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res
      .status(404)
      .json({ errorCode: -1, message: "No OTP sent to this email" });
  }

  if (user.password) {
    return res
      .status(400)
      .json({ errorCode: 1, message: "User already registered" });
  }

  if (user.otp !== otp) {
    return res.status(400).json({ errorCode: 1, message: "Invalid OTP" });
  }

  if (user.otpExpiresAt < new Date()) {
    return res.status(400).json({ errorCode: 2, message: "OTP expired" });
  }

  // ✅ OTP verified, proceed with user creation
  const hashedPassword = await bcrypt.hash(password, 10);

  user.name = name;
  user.password = hashedPassword;
  user.otp = null;
  user.otpExpiresAt = null;
  user.isVerified = true;

  await user.save();

  // JWT Login token
  const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: false, // Use true with HTTPS
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({ message: "User registered and logged in" });
};

exports.postSendOtp = async (req, res) => {
  const { email, referredByCode, purpose, name } = req.body;

  if (!email || !purpose) {
    return res.status(400).json({ message: "Email is required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  let user = await User.findOne({ email });

  // Purpose: SIGNUP
  if (purpose === "signup") {
    if (user && user.password) {
      return res
        .status(400)
        .json({ errorCode: 1, message: "User already registered" });
    }

    if (!user) {
      const referralCode = await generateUniqueReferralCode();
      const referredBy = referredByCode || null;
      user = new User({ email, referralCode, referredBy });
    } else {    
      // user exists but maybe from incomplete signup
      if (!user.referredBy && referredByCode) {
        user.referredBy = referredByCode;
      }
    }
  }

  // Purpose: FORGOT PASSWORD
  if (purpose === "forgotPassword") {
    if (!user || !user.password) {
      return res.status(400).json({ message: "User not registered" });
    }
  }

  // Set OTP
  user.otp = otp;
  user.otpExpiresAt = otpExpiresAt;

  await user.save();
  await sendOTPEmail(email, otp, name);

  res.status(200).json({ message: "OTP sent successfully" });
};

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !user.password) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("token", token, {
    httpOnly: true,
    // secure: false,
    secure: true,
    // sameSite: "lax",
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({ message: "Logged in successfully" });
};

exports.postVerifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ message: "Email & OTP required" });

  const user = await User.findOne({ email });
  if (!user || user.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (user.otpExpiresAt < new Date()) {
    return res.status(400).json({ message: "OTP expired" });
  }

  // OTP matched, create JWT
  const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  // Set cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: false, // Use true in production with HTTPS
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Clear OTP
  user.otp = null;
  user.otpExpiresAt = null;
  await user.save();

  res.status(200).json({ message: "OTP verified. Logged in successfully" });
};

exports.postForgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "User not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  user.otp = otp;
  user.otpExpiresAt = otpExpiresAt;
  await user.save();

  await sendOTPEmail(email, otp);

  return res.status(200).json({ message: "OTP sent to your email" });
};
