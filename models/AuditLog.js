const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const auditLog = new mongoose.Schema({
    entityType:{
        type: String,
        trim: true,
        enum: ['User', 'Attendance', 'Department', 'Document', 'Holiday', 'Notification', 'Payslip', 'leaveRequest', 'leaveType'], 
        required: true
    },
    recordId:{
        type: ObjectId,
        refPath: 'table_name',
        required: true
    },
    changedBy: {
        type: ObjectId,
        ref: 'User', 
        required: true
    },
    action: {
        type: String,
        enum: ['create', 'update','approve','cancel','correct', 'deactivate', 'reject', 'upload', 'delete'],
        required: true
    },
    old_value:{
        type: Object,
        trim: true,
        required: function(){
            return !['create', 'upload'].includes(this.action)
        },
        minLength: 1
    },
    new_value:{
        type: Object,
        trim: true,
        required: function(){
            return this.action !== 'delete'
        },
        minLength: 1
    },
    reason:{
        type: String,
        trim: true,
        required: function(){ 
            return (this.table_name === 'Payroll' && this.action === 'update')  || this.action === 'correct'
        }
    },

    
}, {timestamps: {createdAt: 'changedAt', updatedAt: false}});

const AuditLog = mongoose.model('AuditLog', auditLog);

module.exports = AuditLog;