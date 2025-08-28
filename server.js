// server.js

require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("./middleware/cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const planRoutes = require("./routes/plans");
const adminRoutes = require("./routes/admin");

const app = express();

app.set("view engine", "ejs");
app.set("views", "views");

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors);

// Routes
app.use("/auth", authRoutes);
app.use("/plans", planRoutes);
app.use("/secure", adminRoutes);
// app.use("/api", adminRoutes);

// Start
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
