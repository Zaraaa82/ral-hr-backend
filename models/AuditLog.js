const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const auditLogSchema = new mongoose.Schema({
    entityType: {
        type: String,
        trim: true,
        enum: [
            "User",
            "Attendance",
            "Department",
            "Document",
            "Holiday",
            "Notification",
            "Payslip",
            "LeaveRequest",
            "LeaveType"
        ],
        required: true
    },
    recordId: {
        type: ObjectId,
        refPath: 'entityType',
        required: true
    },
    changedBy: {
        type: ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        enum: ['create', 'update', 'approve','request', 'cancel', 'correct', 'deactivate', 'reject', 'upload', 'delete'],
        required: true
    },
    old_value: {
        type: Object,
        required: function () {
            return !['create', 'upload'].includes(this.action)
        },
    },
    new_value: {
        type: Object,
        required: function () {
            return this.action !== 'delete'
        },
    },
    reason: {
        type: String,
        trim: true,
        required: function () {
            return  ((this.entityType === "Payslip" && this.action === "update") || this.action === "correct");
        }
    },


}, { timestamps: { createdAt: 'changedAt', updatedAt: false } });

auditLogSchema.index({ entityType: 1, recordId: 1 });
auditLogSchema.index({ changedBy: 1 });
auditLogSchema.index({ changedAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;