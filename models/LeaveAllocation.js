const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const leaveAllocationSchema = new mongoose.Schema(
  {
    employee: {
      type: ObjectId,
      ref: 'User',
      required: true,
    },
    leaveType: {
      type: ObjectId,
      ref: 'LeaveType',
      required: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {return value >= this.periodStart},
        message: 'Period end must be on or after period start.'
      },
    },
    daysAllocated: {
      type: Number,
      required: true,
      min: 0,
    },
    daysCarriedForward: {
      type: Number,
      default: 0,
      min: 0,
    },
    daysTaken: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: function (value) {return value <= this.daysAllocated + this.daysCarriedForward;},
        message: 'Taken days cannot exceed the available allocation.'
      },
    },
  }, {timestamps: true, toJSON: {virtuals: true}, toObject: {virtuals: true}});

leaveAllocationSchema.virtual('remainingDays').get(function () {
  return this.daysAllocated + this.daysCarriedForward - this.daysTaken;
});

leaveAllocationSchema.index({employee: 1, leaveType: 1, periodStart: 1, periodEnd: 1}, { unique: true });

module.exports = mongoose.model('LeaveAllocation', leaveAllocationSchema);