const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    inTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    outTime: {
      type: Date,
    },
    Employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    overtimeHours: {
      type: Number,
    },
    overtimeApproved: {
      type: Boolean,
    },
    leaveRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
    },
    locked: {
      type: Boolean,
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
    flagged: {
      type: String,
      enum: ["Late", "MissingTimeOut"],
    },
    isApproved: {
      type: Boolean,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Attendance", attendanceSchema);
