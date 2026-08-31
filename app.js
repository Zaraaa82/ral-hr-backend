const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const morgan = require("morgan");
const cors = require("cors");
const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

// Routes Import
const authRoutes = require("./routes/auth.routes");
const departmentRoutes = require("./routes/department.routes");
const userRoutes = require("./routes/user.routes");
const payslipRouter = require("./routes/payslip.routes");
const leaveRequestRoutes = require("./routes/leaveRequest.routes");
const attendanceRouter = require("./routes/attendance.routes");
const documentRoutes = require("./routes/document.routes");
const notificationRoutes = require("./routes/notification.routes");
const auditLogRoutes = require("./routes/auditLog.routes");

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
app.use("/docs", documentRoutes);
app.use("/notifications", notificationRoutes);
app.use("/audit-logs", auditLogRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found.` });
});

app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
