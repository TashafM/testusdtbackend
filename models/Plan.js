const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
  name: String,
  amount: Number,
  reward: Number,
  durationDays: Number,
});

module.exports = mongoose.model("Plan", planSchema);
