const router = require("express").Router()
const usersController = require('../controllers/users.controller')
const verifyToken = require("../middleware/verifyToken")
const isAdmin = require("../middleware/isAdmin")

router.post("/", verifyToken, isAdmin, usersController.createUser)
router.get("/profile", verifyToken, usersController.getLoggedInInfo)
router.get("/allUsers", verifyToken, usersController.getAllUsers)
router.get("/manager", verifyToken, usersController.managersTeam)
router.get("/:userId", verifyToken, usersController.getUserById)
router.put("/reactivate/:userId", verifyToken, isAdmin, usersController.reactivateUser)
router.put("/deactivate/:userId", verifyToken, isAdmin, usersController.deactivateUser)

module.exports = router;
