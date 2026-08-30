// imports
const express = require("express"); //importing express package
const app = express(); // creates a express application
const dotenv = require("dotenv").config(); //this allows me to use my .env values in this file
const morgan = require("morgan");
const cors = require("cors");

// Routes Import
const authRoutes = require("./routes/auth.routes");
const departmentRoutes = require("./routes/department.routes");
const userRoutes = require("./routes/user.routes");
const payslipRouter = require("./routes/payslip.routes");
const leaveRequestRoutes = require("./routes/leaveRequest.routes");
const attendanceRouter = require("./routes/attendance.routes");

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  }),
);
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/auth", authRoutes);
app.use("/dep", departmentRoutes);
app.use("/user", userRoutes);
app.use("/attendance", attendanceRouter);
app.use("/payslips", payslipRouter);
app.use("/leave-requests", leaveRequestRoutes);

module.exports = app;
