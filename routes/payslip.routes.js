const router = require("express").Router();

const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const payslipController = require("../controllers/payslip.controller");

router.use(verifyToken);

// Employee + HR Admin
router.get("/", payslipController.getAllPayslips);

router.get("/:id", payslipController.getPayslipById);

// HR Admin only
router.post(
  "/generate",
  authorizeRoles("HR Admin"),
  payslipController.createPayslip,
);

router.put("/:id", authorizeRoles("HR Admin"), payslipController.updatePayslip);

router.patch(
  "/:id/approve",
  authorizeRoles("HR Admin"),
  payslipController.approvePayslip,
);

router.delete(
  "/:id",
  authorizeRoles("HR Admin"),
  payslipController.deletePayslip,
);

module.exports = router;
