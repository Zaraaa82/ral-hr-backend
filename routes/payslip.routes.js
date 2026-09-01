const express = require("express");

const router = express.Router();

const {
  createPayslip,
  getAllPayslips,
  getPayslipById,
  updatePayslip,
  approvePayslip,
  deletePayslip,
  getPayslipsByEmployeeId,
  getMyPayslips,
} = require("../controllers/payslip.controller");

const verifyToken = require("../middleware/verifyToken");
const isActiveUser = require("../middleware/isActiveUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const validateObjectId = require("../middleware/validateObjectId");
const rateLimiters = require("../middleware/rateLimiters");

const payrollActionLimiter =
  rateLimiters?.payrollActionLimiter || ((req, res, next) => next());

router.use(verifyToken, isActiveUser);

router.get("/my-payslips", getMyPayslips);
router.get("/my", getMyPayslips);

router.get("/", authorizeRoles("HR Admin", "Admin", "HR"), getAllPayslips);

router.get(
  "/employee/:employeeId",
  validateObjectId("employeeId"),
  authorizeRoles("HR Admin", "Admin", "HR"),
  getPayslipsByEmployeeId,
);

// 2. Action routes
router.post(
  "/",
  authorizeRoles("HR Admin", "Admin", "HR"),
  payrollActionLimiter,
  createPayslip,
);

router.put(
  "/:id",
  validateObjectId("id"),
  authorizeRoles("HR Admin", "Admin", "HR"),
  updatePayslip,
);

router.patch(
  "/:id/approve",
  validateObjectId("id"),
  authorizeRoles("HR Admin", "Admin", "HR"),
  payrollActionLimiter,
  approvePayslip,
);

router.delete(
  "/:id",
  validateObjectId("id"),
  authorizeRoles("HR Admin", "Admin", "HR"),
  deletePayslip,
);

router.get("/:id", validateObjectId("id"), getPayslipById);

module.exports = router;
