const router = require('express').Router();

const verifyToken = require('../middleware/verifyToken');
const {
    getLeaveTypes,
    getLeaveTypeById
} = require('../controllers/leaveType.controller');

router.use(verifyToken);

// Get all leave types
router.get('/', getLeaveTypes);

// Get one leave type
router.get('/:id', getLeaveTypeById);

module.exports = router;