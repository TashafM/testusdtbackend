const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authenticated");

const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");

// Static plans data (could also be stored in DB)
const STATIC_PLANS = {
  Plot: { amount: 15, reward: 20, durationDays: 10, plan: 1 },
  Acre: { amount: 33, reward: 45, durationDays: 10, plan: 2 },
  Estate: { amount: 50, reward: 70, durationDays: 10, plan: 3 },
  Town: { amount: 100, reward: 142, durationDays: 10, plan: 4 },
};

// GET /plans/user
router.get("/user", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Get user's subscribed plans
    const subscribedPlans = await Subscription.find({ user: userId });

    const now = new Date();

    const activePlans = subscribedPlans.map((sub) => {
      const planData = STATIC_PLANS[sub.planName]; // Get matching plan details

      if (sub.status !== "active") {
        return {
          ...sub.toObject(),
          plan: planData?.plan, // Attach the plan number
        };
      }

      const totalSeconds = (sub.endDate - sub.startDate) / 1000;
      // const rewardPerSecond = (sub.reward - sub.amount) / totalSeconds;
      const rewardPerSecond = sub.reward / totalSeconds;

      const elapsedSeconds = Math.max(0, (now - sub.startDate) / 1000);
      // const earned = Math.min(
      //   rewardPerSecond * elapsedSeconds,
      //   sub.reward - sub.amount
      // );
      const earned = Math.min(rewardPerSecond * elapsedSeconds, sub.reward);

      return {
        ...sub.toObject(),
        plan: planData?.plan, // Attach plan number for active plans also
        mined: parseFloat(earned.toFixed(4)),
      };
    });

    // 3. Exclude only 'pending' and 'active' plans from available list
    const subscribedNames = subscribedPlans
      .filter((p) => ["pending", "active"].includes(p.status))
      .map((p) => p.planName);

    // 4. Build available plans list
    const availablePlans = Object.entries(STATIC_PLANS)
      .filter(([name]) => !subscribedNames.includes(name))
      .map(([name, data]) => ({
        planName: name,
        ...data,
      }));

    // 5. Final response
    res.json({
      activePlans,
      availablePlans,
    });
  } catch (err) {
    console.error("Error in GET /plans/user", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /plans/subscribe – subscribe to a mining plan
// router.post("/subscribe", authMiddleware, async (req, res) => {
//   const { planName } = req.body;
//   const plan = STATIC_PLANS[planName];

//   if (!plan) return res.status(400).json({ message: "Invalid plan" });

//   // Check if the user already subscribed to this plan
//   const alreadySubscribed = await Subscription.findOne({
//     user: req.user._id,
//     planName,
//   });

//   if (alreadySubscribed) {
//     return res
//       .status(400)
//       .json({ message: "You already subscribed to this plan" });
//   }

//   const startDate = new Date();
//   const endDate = new Date(
//     startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000
//   );

//   const newSub = new Subscription({
//     user: req.user._id,
//     planName,
//     amount: plan.amount,
//     reward: plan.reward,
//     startDate,
//     endDate,
//   });

//   await newSub.save();

//   // Referral bonus - one time only
//   const user = await User.findById(req.user._id);

//   // Check if user has a referrer and has not yet triggered the referral reward
//   if (user.referredBy && !user.hasClaimedReferral) {
//     const referrer = await User.findOne({ referralCode: user.referredBy });
//     if (referrer) {
//       const bonus = plan.amount * 0.1;

//       // Update referral bonus
//       referrer.referralBonus += bonus;
//       await referrer.save();

//       // Mark referral as claimed so it's not given again
//       user.hasClaimedReferral = true;
//       await user.save();
//     }
//   }

//   res.json({ message: "Subscribed successfully", plan: newSub });
// });

router.post("/subscribe", authMiddleware, async (req, res) => {
  const { planName, txnId } = req.body;

  if (!planName || !txnId) {
    return res
      .status(400)
      .json({ message: "Plan name and transaction ID are required" });
  }

  const plan = STATIC_PLANS[planName];
  if (!plan) {
    return res.status(400).json({ message: "Invalid plan name" });
  }

  const existingSub = await Subscription.findOne({
    user: req.user._id,
    planName,
    status: { $in: ["pending", "active"] },
  });

  if (existingSub) {
    return res.status(400).json({
      message:
        "You already have a pending or active subscription for this plan",
    });
  }

  const newSub = new Subscription({
    user: req.user._id,
    planName,
    amount: plan.amount,
    reward: plan.reward,
    txnId,
    status: "pending",
  });

  await newSub.save();

  res.json({
    message: "Subscription created in pending state. Awaiting admin approval.",
    subscription: newSub,
  });
});

// POST /plans/withdraw – user requests manual withdrawal
router.post("/withdraw", authMiddleware, async (req, res) => {
  const { subscriptionId } = req.body;

  const sub = await Subscription.findOne({
    _id: subscriptionId,
    user: req.user._id,
  });

  if (!sub) return res.status(404).json({ message: "Subscription not found" });
  if (sub.isWithdrawn)
    return res.status(400).json({ message: "Already withdrawn" });

  const now = new Date();
  if (now < sub.endDate) {
    return res.status(400).json({ message: "Mining period not completed yet" });
  }

  // Mark as withdrawn
  sub.isWithdrawn = true;
  await sub.save();

  res.json({
    message: "Withdrawal request submitted (manual process in 2 hours)",
    amount: sub.reward,
  });
});

// GET /plans/live-counter – return mining progress till now
router.get("/live-counter", authMiddleware, async (req, res) => {
  try {
    const subs = await Subscription.find({
      user: req.user._id,
      isWithdrawn: false,
    });

    const now = new Date();
    const counters = subs.map((sub) => {
      const totalSeconds = (sub.endDate - sub.startDate) / 1000;
      // const rewardPerSecond = (sub.reward - sub.amount) / totalSeconds;
      const elapsedSeconds = Math.max(0, (now - sub.startDate) / 1000);
      // const earned = Math.min(
      //   rewardPerSecond * elapsedSeconds,
      //   sub.reward - sub.amount
      // );
      const rewardPerSecond = sub.reward / totalSeconds;
      const earned = Math.min(rewardPerSecond * elapsedSeconds, sub.reward);

      return {
        subscriptionId: sub._id,
        planName: sub.planName,
        mining: earned.toFixed(4),
        startDate: sub.startDate,
        endDate: sub.endDate,
        fullReward: sub.reward,
      };
    });

    res.json(counters);
  } catch (err) {
    res.status(500).json({ message: "Failed to calculate live counter" });
  }
});

router.get("/referrals", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id);

  const referredUsers = await User.find({ referredBy: user.referralCode });

  // For each referred user, check if they have any active plan
  const response = await Promise.all(
    referredUsers.map(async (refUser) => {
      const hasActivePlan = await Subscription.exists({ user: refUser._id });
      return {
        email: refUser.email,
        status: hasActivePlan ? "Active" : "Pending",
      };
    })
  );

  res.json({ referrals: response });
});

router.post("/referral-withdraw", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id);

  // 1. Check if user has an active mining plan
  const now = new Date();
  const activePlan = await Subscription.findOne({
    user: user._id,
    endDate: { $gt: now }, // plan still active
  });

  if (!activePlan) {
    return res.status(400).json({
      message: "You must have an active plan to withdraw referral bonus.",
    });
  }

  // 2. Check if referral bonus is at least $10
  const bonusAmount = user.referralBonus || 0;

  if (bonusAmount < 10) {
    return res.status(400).json({
      message: "Minimum referral withdrawal amount is $10.",
    });
  }

  // 3. Reset referral bonus and mark as withdrawn
  user.referralBonus = 0;
  await user.save();

  // (Optional) Save log of this withdrawal
  // await ReferralWithdrawal.create({ user: user._id, amount: bonusAmount, status: "pending" });

  res.json({
    message: "Referral bonus withdrawal request submitted (manual in 2 hours)",
    amount: bonusAmount,
  });
});

module.exports = router;
