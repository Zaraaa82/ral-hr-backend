const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const leaveSchema = new mongoose.Schema({
    employee: {
        type: ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['sick', 'annual', 'emergency', 'other'],
        required: true
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
        validate: {
            validator: function (endDate){
                return endDate >= this.startDate
            },
            message: 'End date cannot be before the start date'
        }
    },
    note: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    reviewedBy: {
        type: ObjectId,
        ref: 'User',
        default: null,
        validate: {
            validator: function (reviewedBy){
                return !reviewedBy || !reviewedBy.equals(this.employee)
            },
            message: 'An employee cannot approve their own leave request'
        }
    }
}, {timestamps: true});

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;