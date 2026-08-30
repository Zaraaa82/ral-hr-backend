const router = require("express").Router();

const verifyToken = require("../middleware/verifyToken");
const validateObjectId = require("../middleware/validateObjectId");
const loadSettings = require("../middleware/loadSettings");
const {clockAction} = require("../middleware/rateLimiters");
const authorizeRoles = require("../middleware/authorizeRoles");

const {
  clockIn,
  clockOut,
  getAttendanceOptions,
  getAttendanceLogs,
  getMonthlyAttendanceLogs,
  getPendingAttendanceCorrections,
  getTeamAttendanceLogs,
  updateAttendanceStatus,
  requestAttendanceCorrection,
  applyAttendanceCorrection,
  rejectAttendanceCorrection
} = require("../controllers/attendance.controller");

router.use(verifyToken);

// ================= Employee attendance =================

// Employee attendance rules and available actions:
router.get(
  "/options",
  loadSettings,
  getAttendanceOptions,
);

// Employee clock-in:
router.post(
  "/clock-in",
  clockAction,
  loadSettings,
  clockIn,
);

// Employee clock-out:
router.post(
  "/clock-out",
  clockAction,
  loadSettings,
  clockOut,
);

// Employee attendance history:
router.get(
  "/logs",
  getAttendanceLogs,
);

// ================= Manager attendance =================

// Manager views team attendance:
router.get(
  "/team/calendar",
  authorizeRoles("Manager"),
  getTeamAttendanceLogs,
);

// ================= HR Admin attendance =================

// HR Admin attendance calendar:
router.get(
  "/admin/calendar",
  authorizeRoles("HR Admin"),
  getMonthlyAttendanceLogs,
);

// HR Admin views pending correction requests:
router.get(
  "/correction-requests/pending",
  authorizeRoles("HR Admin"),
  getPendingAttendanceCorrections,
);

// ================= Attendance corrections =================

// Manager requests an attendance correction:
router.post(
  "/:id/correction-requests",
  authorizeRoles("Manager"),
  validateObjectId,
  requestAttendanceCorrection,
);

// HR Admin applies a correction request:
router.patch(
  "/:attendanceId/correction-requests/:correctionId/apply",
  authorizeRoles("HR Admin"),
  loadSettings,
  applyAttendanceCorrection,
);

// HR Admin rejects a correction request:
router.patch(
  "/:attendanceId/correction-requests/:correctionId/reject",
  authorizeRoles("HR Admin"),
  rejectAttendanceCorrection,
);

// ================= Direct attendance update =================

// Keep the general parameterized route last:
router.patch(
  "/:id",
  authorizeRoles("HR Admin"),
  validateObjectId,
  loadSettings,
  updateAttendanceStatus,
);

module.exports = router;