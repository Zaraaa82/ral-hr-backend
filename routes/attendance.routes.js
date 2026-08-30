const router = require("express").Router();

const verifyToken = require("../middleware/verifyToken");
const validateObjectId = require("../middleware/validateObjectId");
const loadSettings = require("../middleware/loadSettings");
const rateLimiters = require("../middleware/rateLimiters");
const authorizeRoles = require("../middleware/authorizeRoles");
const attendanceController = require("../controllers/attendance.controller");

router.use(verifyToken);
router.use(loadSettings);

// Employee clock in
// router.post(
//   "/clock-in",
//   rateLimiters.clockAction,
//   attendanceController.clockIn,
// );

// Employee clock out
// router.post(
//   "/clock-out",
//   rateLimiters.clockAction,
//   attendanceController.clockOut,
// );

// Employee attendance history
router.get("/logs", attendanceController.getAttendanceLogs);

// HR Admin update attendance
router.patch(
  "/:id",
  authorizeRoles("HR Admin"),
  validateObjectId,
  attendanceController.updateAttendanceStatus,
);

// HR Admin attendance calendar
router.get(
  "/admin/calendar",
  authorizeRoles("HR Admin"),
  attendanceController.getMonthlyAttendanceLogs,
);

module.exports = router;
