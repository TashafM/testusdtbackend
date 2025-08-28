const mongoose = require("mongoose");

// const subscriptionSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//   planName: String,
//   amount: Number,
//   reward: Number,
//   startDate: Date,
//   endDate: Date,
//   isWithdrawn: { type: Boolean, default: false }
// });

// module.exports = mongoose.model("Subscription", subscriptionSchema);

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  planName: String,
  amount: Number,
  reward: Number,
  txnId: String,
  startDate: Date,
  endDate: Date,
  plan: Number,
  isWithdrawn: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["pending", "active", "rejected"],
    default: "pending",
  },
  
});

module.exports = mongoose.model("Subscription", subscriptionSchema);
