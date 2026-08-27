const mongoose = require("mongoose")

const attendanceSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true
    },
    inTime: {
      type: Date,
    },
    outTime: {
      type: Date,
      validate: {
        validator: function (value) {
          return !value || !this.inTime || value >= this.inTime
        },
        message: "Out time cannot be earlier than in time.",
      },
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    overtimeHours: {
      type: Number,
      min: 0,
      max: 24,
      default: 0,
      validate: {
        validator: function(value){ return Number.isInteger(value); },
        message: 'Overtime hours must be a whole number.'
      }
    },
    overtimeApproved: {
      type: Boolean,
      default: false,
    },
    leaveRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
    },
    locked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: [
        "Present",
        "Absent",
        "Half Day",
        "On Leave",
        "Holiday",
        "Weekly Off",
      ],
      required: true,
    },
    flags: {
      type: [String],
      enum: ["late", "missingTimeOut"],
      default: [],
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
)
attendanceSchema.index(
  { employee: 1, date: 1 },
  { unique: true }
)

module.exports = mongoose.model("Attendance", attendanceSchema)
