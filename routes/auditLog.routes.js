const router = require('express').Router();

const verifyToken = require('../middleware/verifyToken');
const authorizeRoles = require('../middleware/authorizeRoles');

const auditLogController = require('../controllers/auditLog.controller');

router.use(verifyToken);

// Audit logs contain sensitive information.
// HR Admin only.
router.use(authorizeRoles('HR Admin'));


// All logs + filters
router.get('/', auditLogController.getAuditLogs);


// History of one record
router.get('/record/:entityType/:recordId', auditLogController.getRecordAuditHistory);


// One audit log
router.get('/:id', auditLogController.getAuditLogById);


module.exports = router;