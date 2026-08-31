const router = require("express").Router();
const departmentController = require('../controllers/department.controller')
const verifyToken = require("../middleware/verifyToken");
const isAdmin = require("../middleware/isAdmin");

router.post("/", verifyToken, isAdmin, departmentController.createDepartment);
router.get("/", verifyToken, departmentController.getAllDepartments);
router.get("/:depId", verifyToken, isAdmin, departmentController.getDepById);
router.put("/edit/:depId", verifyToken, isAdmin, departmentController.updateDepartment);

module.exports = router;
