const router = require("express").Router();
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const adminAuth = require("./../middleware/adminAuth");

const STATIC_PLANS = require("../constants/plans");


// Static plans data (could also be stored in DB)
// const STATIC_PLANS = {
//   Plot: { amount: 15, reward: 20, durationDays: 10 },
//   Acre: { amount: 33, reward: 45, durationDays: 10 },
//   Estate: { amount: 50, reward: 70, durationDays: 10 },
//   Township: { amount: 100, reward: 142, durationDays: 10 },
// };


// 🔐 Admin Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin || !(await admin.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ adminId: admin._id }, process.env.ADMIN_SECRET, { expiresIn: "1d" });

  res
    .cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 24 * 60 * 60 * 1000,
    })
    .json({ message: "Login successful" });
});

// // ✅ Get All Users with Plans
// router.get("/users", adminAuth, async (req, res) => {
//   const users = await User.find();
//   const userData = await Promise.all(users.map(async (user) => {
//     const plans = await Subscription.find({ user: user._id });
//     return {
//       email: user.email,
//       referralBonus: user.referralBonus,
//       balance: user.balance,
//       plans,
//     };
//   }));

//   res.json(userData);
// });

// routes/admin.js

// routes/admin.js

// router.get("/users", adminAuth, async (req, res) => {
//     try {
//       const page = parseInt(req.query.page) || 1;
//       const limit = parseInt(req.query.limit) || 10;
//       const skip = (page - 1) * limit;
  
//       const totalUsers = await User.countDocuments();
  
//       const users = await User.find()
//         .sort({ createdAt: -1 })
//         .select("-password")
//         .skip(skip)
//         .limit(limit)
//         .lean();
  
//       const userIds = users.map((u) => u._id);
  
//       const subscriptions = await Subscription.find({ user: { $in: userIds } }).lean();
  
//       const plansByUser = {};
//       for (const sub of subscriptions) {
//         const uid = sub.user.toString();
//         if (!plansByUser[uid]) plansByUser[uid] = [];
//         plansByUser[uid].push(sub);
//       }
  
//       let totalActivePlansCount = 0;
  
//       const usersWithPlans = users.map((user) => {
//         const plans = plansByUser[user._id.toString()] || [];
  
//         const activePlans = plans.filter(
//           (plan) => !plan.isWithdrawn && new Date(plan.endDate) > new Date()
//         );
  
//         totalActivePlansCount += activePlans.length;
  
//         return {
//           ...user,
//           planCount: plans.length,
//           activePlanCount: activePlans.length,
//           plans, // includes planName, amount, reward, startDate, endDate, isWithdrawn
//         };
//       });
  
//       res.json({
//         totalUsers,
//         totalActivePlansCount,
//         page,
//         limit,
//         users: usersWithPlans,
//       });
//     } catch (err) {
//       console.error("Admin Get Users Error:", err);
//       res.status(500).json({ message: "Server error" });
//     }
//   });
  
  
// router.get("/users", adminAuth, async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const totalUsers = await User.countDocuments();

//     const users = await User.find()
//       .sort({ createdAt: -1 })
//       .select("-password")
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     const userIds = users.map((u) => u._id);

//     // Fetch only subscriptions that are NOT 'pending' or 'rejected'
//     const subscriptions = await Subscription.find({
//       user: { $in: userIds },
//       status: { $nin: ["pending", "rejected"] },
//     }).lean();

//     const plansByUser = {};
//     for (const sub of subscriptions) {
//       const uid = sub.user.toString();
//       if (!plansByUser[uid]) plansByUser[uid] = [];
//       plansByUser[uid].push(sub);
//     }

//     let totalActivePlansCount = 0;

//     const usersWithPlans = users.map((user) => {
//       const plans = plansByUser[user._id.toString()] || [];

//       const activePlans = plans.filter(
//         (plan) => !plan.isWithdrawn && new Date(plan.endDate) > new Date()
//       );

//       totalActivePlansCount += activePlans.length;

//       return {
//         ...user,
//         planCount: plans.length,
//         activePlanCount: activePlans.length,
//         plans, // filtered plans (excluding pending/rejected)
//       };
//     });

//     res.json({
//       totalUsers,
//       totalActivePlansCount,
//       page,
//       limit,
//       users: usersWithPlans,
//     });
//   } catch (err) {
//     console.error("Admin Get Users Error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

router.get("/users", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments();

    const users = await User.find()
      .sort({ createdAt: -1 })
      .select("-password")
      .skip(skip)
      .limit(limit)
      .lean();

    const userIds = users.map((u) => u._id);

    // ✅ Include all except rejected
    const subscriptions = await Subscription.find({
      user: { $in: userIds },
      status: { $ne: "rejected" },
    }).lean();

    const plansByUser = {};
    for (const sub of subscriptions) {
      const uid = sub.user.toString();
      if (!plansByUser[uid]) plansByUser[uid] = [];
      plansByUser[uid].push(sub);
    }

    let totalActivePlansCount = 0;

    const usersWithPlans = users.map((user) => {
      const plans = plansByUser[user._id.toString()] || [];

      const activePlans = plans.filter(
        (plan) => !plan.isWithdrawn && new Date(plan.endDate) > new Date() && plan.status === "active"
      );

      totalActivePlansCount += activePlans.length;

      return {
        ...user,
        planCount: plans.length, // includes pending
        activePlanCount: activePlans.length, // only active
        plans, // includes pending and active
      };
    });

    res.json({
      totalUsers,
      totalActivePlansCount,
      page,
      limit,
      users: usersWithPlans,
    });
  } catch (err) {
    console.error("Admin Get Users Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


  

// GET: /api/admin/summary
// router.get("/summary", adminAuth, async (req, res) => {
//     try {
//       const userCount = await User.countDocuments();
//       const planCount = await Subscription.countDocuments();
  
//       const totalDepositsAgg = await Subscription.aggregate([
//         { $group: { _id: null, total: { $sum: "$amount" } } },
//       ]);
//       const totalDeposits = totalDepositsAgg[0]?.total || 0;
  
//       const totalWithdrawalsAgg = await Subscription.aggregate([
//         { $match: { isWithdrawn: true } },
//         { $group: { _id: null, total: { $sum: "$reward" } } },
//       ]);
//       const totalWithdrawals = totalWithdrawalsAgg[0]?.total || 0;
  
//       const referralUsers = await User.find({
//         referralBonus: { $exists: true, $gt: 0 },
//       });
  
//       let totalReferralBonus = 0;
//       let totalReferralWithdrawn = 0;
  
//       referralUsers.forEach((user) => {
//         totalReferralBonus += user.referralBonus || 0;
//         totalReferralWithdrawn += user.referralWithdrawn || 0;
//       });
  
//       res.json({
//         users: userCount,
//         plans: planCount,
//         totalDeposits,
//         totalWithdrawals,
//         totalReferralBonus,
//         totalReferralWithdrawn,
//       });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ message: "Server error" });
//     }
//   });

router.get("/summary", adminAuth, async (req, res) => {
  try {
    // Count only users
    const userCount = await User.countDocuments();

    // Count only subscriptions that are NOT pending or rejected
    const planCount = await Subscription.countDocuments({
      status: { $nin: ["pending", "rejected"] },
    });

    // Sum deposits excluding pending and rejected
    const totalDepositsAgg = await Subscription.aggregate([
      { $match: { status: { $nin: ["pending", "rejected"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalDeposits = totalDepositsAgg[0]?.total || 0;

    // Sum withdrawals (withdrawn plans only, status already irrelevant here)
    const totalWithdrawalsAgg = await Subscription.aggregate([
      { $match: { isWithdrawn: true } },
      { $group: { _id: null, total: { $sum: "$reward" } } },
    ]);
    const totalWithdrawals = totalWithdrawalsAgg[0]?.total || 0;

    // Sum referral bonuses and withdrawals
    const referralUsers = await User.find({
      referralBonus: { $exists: true, $gt: 0 },
    });

    let totalReferralBonus = 0;
    let totalReferralWithdrawn = 0;

    referralUsers.forEach((user) => {
      totalReferralBonus += user.referralBonus || 0;
      totalReferralWithdrawn += user.referralWithdrawn || 0;
    });

    res.json({
      users: userCount,
      plans: planCount,
      totalDeposits,
      totalWithdrawals,
      totalReferralBonus,
      totalReferralWithdrawn,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// 🧾 Manually Approve Plan Purchase
router.post("/subscribe-manual", adminAuth, async (req, res) => {
  const { userId, planName } = req.body;
  const STATIC_PLANS = require("../constants/plans");
  const plan = STATIC_PLANS[planName];
  if (!plan) return res.status(400).json({ message: "Invalid plan" });

  const already = await Subscription.findOne({ user: userId, planName });
  if (already) return res.status(400).json({ message: "Already subscribed" });

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  const newSub = new Subscription({
    user: userId,
    planName,
    amount: plan.amount,
    reward: plan.reward,
    startDate,
    endDate,
  });

  await newSub.save();
  res.json({ message: "Plan manually activated" });
});

// ✅ Manually mark a subscription as withdrawn
router.post("/withdraw-reward", adminAuth, async (req, res) => {
  const { subscriptionId } = req.body;

  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return res.status(404).json({ message: "Subscription not found" });
  if (sub.isWithdrawn) return res.status(400).json({ message: "Already withdrawn" });

  sub.isWithdrawn = true;
  await sub.save();

  res.json({ message: "Reward marked as withdrawn" });
});



router.post("/approve-subscription/:id", adminAuth, async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id).populate("user");

    if (!sub || sub.status !== "pending") {
      return res.status(404).json({ message: "Subscription not found or already processed" });
    }

    const now = new Date();

    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000 * STATIC_PLANS[sub.planName].durationDays);

    sub.startDate = now;
    sub.endDate = end;
    sub.status = "active";
    await sub.save();

    // Referral logic only when activating
    const user = await User.findById(sub.user._id);
    if (user.referredBy && !user.hasClaimedReferral) {
      const referrer = await User.findOne({ referralCode: user.referredBy });
      if (referrer) {
        // const bonus = sub.amount * 0.1;
        const bonus = 5;
        referrer.referralBonus += bonus;
        await referrer.save();

        user.hasClaimedReferral = true;
        await user.save();
      }
    }

    res.json({ message: "Subscription approved & activated", sub });
  } catch (err) {
    console.error("Error approving subscription:", err);
    res.status(500).json({ message: "Server error" });
  }
});




router.post("/reject-subscription/:id", adminAuth, async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub || sub.status !== "pending") {
      return res.status(404).json({ message: "Subscription not found or already processed" });
    }

    sub.status = "rejected";
    await sub.save();

    res.json({ message: "Subscription rejected" });
  } catch (err) {
    console.error("Error rejecting subscription:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
