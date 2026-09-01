const express = require("express");

const router = express.Router();

// =====================================================
// CONTROLLERS
// =====================================================

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

// =====================================================
// MIDDLEWARE
// =====================================================

const verifyToken = require("../middleware/verifyToken");
const isActiveUser = require("../middleware/isActiveUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const validateObjectId = require("../middleware/validateObjectId");
const rateLimiters = require("../middleware/rateLimiters");

// =====================================================
// RATE LIMITER
// =====================================================

const payrollActionLimiter =
  rateLimiters?.payrollActionLimiter || ((req, res, next) => next());

// =====================================================
// GLOBAL PAYSLIP MIDDLEWARE
// =====================================================
// Every payslip route requires:
// 1. Valid authentication token
// 2. Active user account
// =====================================================

router.use(verifyToken, isActiveUser);

// =====================================================
// EMPLOYEE - MY PAYSLIPS
// =====================================================
// GET /payslips/my
//
// Returns only the logged-in employee's
// approved and released payslips.
// =====================================================

router.get("/my", getMyPayslips);

// =====================================================
// ADMIN / HR - ALL PAYSLIPS
// =====================================================
// GET /payslips
//
// HR/Admin can see all payslips,
// including draft/pending payslips.
// =====================================================

router.get("/", authorizeRoles("HR Admin", "Admin", "HR"), getAllPayslips);

// =====================================================
// ADMIN / HR - PAYSLIPS FOR SPECIFIC EMPLOYEE
// =====================================================
// GET /payslips/employee/:employeeId
//
// HR/Admin can view all payslips belonging
// to a specific employee.
// =====================================================

router.get(
  "/employee/:employeeId",
  validateObjectId("employeeId"),
  authorizeRoles("HR Admin", "Admin", "HR"),
  getPayslipsByEmployeeId,
);

// =====================================================
// SINGLE PAYSLIP
// =====================================================
// GET /payslips/:id
//
// HR/Admin:
//   Can view any payslip.
//
// Employee:
//   Can only view their own approved and released
//   payslips.
// =====================================================

router.get("/:id", validateObjectId("id"), getPayslipById);

// =====================================================
// CREATE PAYSLIP
// =====================================================
// POST /payslips
//
// HR/Admin only.
//
// Creates a new monthly payslip.
// =====================================================

router.post(
  "/",
  authorizeRoles("HR Admin", "Admin", "HR"),
  payrollActionLimiter,
  createPayslip,
);

// =====================================================
// UPDATE PAYSLIP
// =====================================================
// PUT /payslips/:id
//
// HR/Admin only.
//
// Draft payslips can be edited.
// Approved/locked payslips cannot be edited.
// =====================================================

router.put(
  "/:id",
  validateObjectId("id"),
  authorizeRoles("HR Admin", "Admin", "HR"),
  updatePayslip,
);

// =====================================================
// APPROVE PAYSLIP
// =====================================================
// PATCH /payslips/:id/approve
//
// HR/Admin only.
//
// Approval will:
// - Change status to approved
// - Set approvedBy
// - Set approvedAt
// - Lock the payslip
// =====================================================

router.patch(
  "/:id/approve",
  validateObjectId("id"),
  authorizeRoles("HR Admin", "Admin", "HR"),
  payrollActionLimiter,
  approvePayslip,
);

// =====================================================
// DELETE PAYSLIP
// =====================================================
// DELETE /payslips/:id
//
// HR/Admin only.
//
// Only draft/unlocked payslips can be deleted.
// =====================================================

router.delete(
  "/:id",
  validateObjectId("id"),
  authorizeRoles("HR Admin", "Admin", "HR"),
  deletePayslip,
);

module.exports = router;
