const express = require("express");
const router = express.Router();

const {
  createPayslip,
  getAllPayslips,
  getPayslipById,
  updatePayslip,
  approvePayslip,
  deletePayslip,
} = require("../controllers/payslip.controller");

const verifyToken = require("../middleware/verifyToken");
const isActiveUser = require("../middleware/isActiveUser");
const authorizeRoles = require("../middleware/authorizeRoles");
const validateObjectId = require("../middleware/validateObjectId");
const rateLimiters = require("../middleware/rateLimiters");
const payrollActionLimiter =
  rateLimiters.payrollActionLimiter || ((req, res, next) => next());

router.use(verifyToken, isActiveUser);

router.get("/", getAllPayslips);
router.get("/:id", validateObjectId("id"), getPayslipById);

router.post(
  "/",
  authorizeRoles("HR Admin"),
  payrollActionLimiter,
  createPayslip,
);

router.put(
  "/:id",
  validateObjectId("id"),
  authorizeRoles("HR Admin"),
  updatePayslip,
);

router.patch(
  "/:id/approve",
  validateObjectId("id"),
  authorizeRoles("HR Admin"),
  approvePayslip,
);

router.delete(
  "/:id",
  validateObjectId("id"),
  authorizeRoles("HR Admin"),
  deletePayslip,
);

module.exports = router;
