const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },

    inTime: {
      type: Date,
      default: null,
    },

    outTime: {
      type: Date,
      default: null,
      validate: {
        validator: function (value) {
          return !value || !this.inTime || value >= this.inTime;
        },
        message: "Out time cannot be earlier than in time.",
      },
    },

    // Total time employee worked, stored in minutes.
    workedMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Overtime, stored in minutes for accurate payroll calculation.
    overtimeMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },

    overtimeApproved: {
      type: Boolean,
      default: false,
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    leaveRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
      default: null,
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
      type: [
        {
          type: String,
          enum: ["late", "missingTimeOut"],
        },
      ],
      default: [],
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
