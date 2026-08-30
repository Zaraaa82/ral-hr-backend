const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");
const validateObjectId = require("../middleware/validateObjectId");
const payslipController = require("../controllers/payslip.controller");

router.use(verifyToken);

// Employee + HR Admin can view payslips
router.get("/", payslipController.getAllPayslips);

router.get("/:id", validateObjectId, payslipController.getPayslipById);

// HR Admin only
router.post(
  "/generate",
  authorizeRoles("HR Admin"),
  payslipController.createPayslip,
);

router.put(
  "/:id",
  authorizeRoles("HR Admin"),
  validateObjectId,
  payslipController.updatePayslip,
);

router.patch(
  "/:id/approve",
  authorizeRoles("HR Admin"),
  validateObjectId,
  payslipController.approvePayslip,
);

router.delete(
  "/:id",
  authorizeRoles("HR Admin"),
  validateObjectId,
  payslipController.deletePayslip,
);

module.exports = router;
