const router = require("express").Router()
const documentController = require('../controllers/document.controller')
const verifyToken = require("../middleware/verifyToken")
const isAdmin = require("../middleware/isAdmin")
const upload = require("../middleware/multer");


router.post("/", verifyToken, upload.single("document"), documentController.createDocument)
router.get("/:docId", verifyToken, documentController.getOneDoc)
router.put("/edit/:docId", verifyToken, upload.single('document'), documentController.updateDocument)
router.put("/verify/:docId", verifyToken, isAdmin, documentController.verifyDocument)
router.put("/reject/:docId", verifyToken, isAdmin, documentController.rejectDocument)

module.exports = router