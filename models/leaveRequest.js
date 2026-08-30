const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const allocationBreakdownSchema = new mongoose.Schema(
  {
    leaveAllocation: {
      type: ObjectId,
      ref: 'LeaveAllocation',
      required: true,
    },
    days: {
      type: Number,
      required: true,
      min: 0.5,
    },
    dates: {
      type: [Date],
      required: true,
      validate: {
        validator: function (value) {
          return value.length > 0;
        },
        message: 'Allocation dates are required.'
      },
    },
    payFraction: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },{_id: false},
);


const leaveRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    leaveType: {
      type:ObjectId,
      ref: "LeaveType",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value >= this.startDate;
        },
        message: "End date must be on or after start date.",
      },
    },
    totalDays: {
      type: Number,
      min: 0.5,
      required: true
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    document: {
      type:ObjectId,
      ref: "Document",
    },
    actionedBy: {
      type:ObjectId,
      ref: "User",
      default: null
    },
    actionedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "cancelled"],
      default: "pending",
      required: true
    },
    allocationBreakdown: {
      type: [allocationBreakdownSchema],
      default: []
    }
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
