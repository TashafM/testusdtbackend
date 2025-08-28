// utils/sendMail.js

const nodemailer = require("nodemailer");
const path = require("path");
const ejs = require("ejs")

const transporter = nodemailer.createTransport({
  service: "gmail", // Or any SMTP
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendOTPEmail = async (email, otp, name) => {
  const templatePath = path.join(__dirname, "../", "views", "otp-send.ejs");

  const htmlContent = await ejs.renderFile(templatePath, {
    otp,
    username: name || 'User'
  });

  const mailOptions = {
    from: '"Remining" <noreply-email@gmail.com>',
    to: email,
    subject: "Your OTP for Login",
    // text: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendOTPEmail;
