const router = require('express').Router();
const loadSettings = require('../middleware/loadSettings');
const validateObjectId = require('../middleware/validateObjectId');
const verifyToken = require('../middleware/verifyToken');

const {
    getLeaveRequestOptions,
    createLeaveRequest,
    getMyLeaveRequests,
    getAllLeaveRequests,
    getTeamLeaveRequests,
    getLeaveRequestById,
    approveLeaveRequest,
    rejectLeaveRequest,
    cancelLeaveRequest
} = require('../controllers/leaveRequest.controller');


router.use(verifyToken);

router.get('/options',  getLeaveRequestOptions);
router.get('/my',  getMyLeaveRequests);
router.get('/team',  getTeamLeaveRequests);
router.get('/all',  getAllLeaveRequests);
router.get('/:id',  validateObjectId, getLeaveRequestById);

router.post('/', loadSettings, createLeaveRequest);

router.put('/:id/approve', validateObjectId, loadSettings, approveLeaveRequest);
router.put('/:id/reject', validateObjectId, rejectLeaveRequest);
router.put('/:id/cancel', validateObjectId, cancelLeaveRequest);

module.exports = router;