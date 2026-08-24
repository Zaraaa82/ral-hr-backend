const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    timeIn: {
      type: Date,
    },
    timeOut: {
      type: Date,
    },
    Employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    overtime: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["On Leave", "Present", "Absent", "Late"],
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

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;
