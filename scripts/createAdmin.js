const mongoose = require("mongoose");
const Admin = require("../models/Admin");
mongoose.connect('mongodb+srv://tashaf:tashaf@cluster0.wm7rrsk.mongodb.net/reminingapp');

(async () => {
  const admin = new Admin({ username: "admin", password: "secure@123" });
  await admin.save();
  console.log("Admin created");
  process.exit();
})();
