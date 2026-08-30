const mongoose = require("mongoose");

const femaleOnlyTypes = ['Maternity', 'Maternity (Unpaid)', 'Childcare','Iddah'];

const ObjectId = mongoose.Schema.Types.ObjectId;

const leaveTypeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      enum: [
        "Annual",
        "Sick (Full Pay)",
        "Sick (Half Pay)",
        "Sick (Unpaid)",
        "Maternity",
        "Maternity (Unpaid)",
        "Paternity",
        "Childcare",
        "Bereavement",
        "Marriage",
        "Hajj",
        "Iddah",
        "Unpaid"
      ]
    },
    maxDaysPerYear: {
      type: Number,
      required: true,
      min: 0
    },
    payFraction: {
      type: Number,
      required: true,
      min: 0, 
      max: 1
    },
    requiresDocument: {
      type: Boolean,
      default: false,
    },
    includesHolidays: {
      type: Boolean,
      default: false,
    },
    requiresServiceMonths: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Required service months must be a whole number.'
      },
    },
    carryForward: {
      type: Boolean,
      default: false,
      validate: {
        validator: function (value) {return this.type === 'Annual' || value === false;},
        message: 'Carry forward is only available for Annual leave.'
      },
    },

    maxCarryForward: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: function (value) {
          if (this.type !== 'Annual') {
            return value === 0;
          }

          return this.carryForward ? value > 0 : value === 0;
        },
        message: 'A carry-forward limit is only allowed when Annual leave carry-forward is enabled.'
      },
    },
    encashable:{
      type: Boolean,
      default: false,
      validate: {
        validator: function (value) {return this.type === "Annual" || value === false;},
        message: 'Only Annual leave can be encashable.',
      },
    },
    countsTowardService: {
      type: Boolean,
      default: true,
    },
    oncePerLifetime: {
      type: Boolean,
      immutable: true,
      default: function (){return ['Hajj', 'Marriage'].includes(this.type)}
    },
    nextLeaveType: {
      type: ObjectId,
      ref: 'LeaveType',
      default: null,
    },
    applicableGender: {
      type: String,
      enum: ['all','male', 'female'],
      trim: true,
      default: 'all',
      required: true,
      validate: {
        validator: function(value){ 
          if(femaleOnlyTypes.includes(this.type)){
            return value === 'female'; 
          }
          if(this.type === 'Paternity'){
            return value === 'male';
          }

          return value === 'all';
        },
        message: 'Gender does not match the selected leave type'
      }
    }
  },
  { timestamps: true },
);

module.exports = mongoose.model("LeaveType", leaveTypeSchema);
