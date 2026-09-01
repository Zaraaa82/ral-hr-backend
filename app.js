const express = require("express");
const app = express();
const dotenv = require("dotenv");
const morgan = require("morgan");
const cors = require("cors");
const dns = require("dns");

// =====================================================
// Load environment variables
// =====================================================

dotenv.config();

// =====================================================
// DNS configuration
// =====================================================

dns.setServers(["8.8.8.8", "1.1.1.1"]);

// =====================================================
// Routes Import
// =====================================================

const authRoutes = require("./routes/auth.routes");
const departmentRoutes = require("./routes/department.routes");
const userRoutes = require("./routes/user.routes");
const payslipRouter = require("./routes/payslip.routes");
const leaveRequestRoutes = require("./routes/leaveRequest.routes");
const attendanceRouter = require("./routes/attendance.routes");
const documentRoutes = require("./routes/document.routes");
const notificationRoutes = require("./routes/notification.routes");
const auditLogRoutes = require("./routes/auditLog.routes");
const leaveTypeRoutes = require("./routes/leaveType.routes");

// =====================================================
// CORS
// =====================================================

const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests without an Origin header
    // e.g. Postman / server-to-server
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("Blocked by CORS:", origin);

    return callback(new Error(`CORS policy does not allow origin: ${origin}`));
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: ["Content-Type", "Authorization"],

  optionsSuccessStatus: 204,
};

// =====================================================
// Apply CORS
// =====================================================

app.use(cors(corsOptions));

// =====================================================
// Body Parser
// =====================================================

app.use(express.json());

// =====================================================
// Logging
// =====================================================

app.use(morgan("dev"));

// =====================================================
// Health Check
// =====================================================

app.get("/", (req, res) => {
  res.status(200).json({
    message: "HR System API is running.",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is healthy.",
  });
});

// =====================================================
// ROUTES
// =====================================================

app.use("/auth", authRoutes);

app.use("/dep", departmentRoutes);

app.use("/user", userRoutes);

app.use("/attendance", attendanceRouter);

app.use("/payslips", payslipRouter);

app.use("/leave-requests", leaveRequestRoutes);

app.use("/docs", documentRoutes);

app.use("/notifications", notificationRoutes);

app.use("/audit-logs", auditLogRoutes);

app.use("/leave-types", leaveTypeRoutes);

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    message: `Route ${req.originalUrl} not found.`,
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);

  if (err.message?.startsWith("CORS policy")) {
    return res.status(403).json({
      message: err.message,
    });
  }

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
