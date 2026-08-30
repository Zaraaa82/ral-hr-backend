const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

// ================= Attendance correction requests =================

const correctionRequestSchema = new mongoose.Schema({
  requestedBy: {
    type: ObjectId,
    ref: "User",
    required: true
  },

  requestedAt: {
    type: Date,
    default: Date.now,
    required: true
  },

  requestedInTime: {
    type: Date
  },

  requestedOutTime: {
    type: Date
  },

  requestedStatus: {
    type: String,
    enum: [
      "Present",
      "Absent",
      "Half Day",
      "On Leave",
      "Holiday",
      "Weekly Off",
    ]
  },

  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },

  status: {
    type: String,
    enum: ["pending", "applied", "rejected"],
    default: "pending",
    required: true
  },

  actionedBy: {
    type: ObjectId,
    ref: "User",
    default: null
  },

  actionedAt: {
    type: Date,
    default: null
  },

  actionNote: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null
  },
});

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
      type: ObjectId,
      ref: "User",
      required: true,
    },

    leaveRequest: {
      type: ObjectId,
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
      type: [String],
      enum: ["late", "missingTimeOut", "earlyExit", "shortHours"],
      default: [],
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // Correction requests submitted by the employee's manager:
    correctionRequests: {
      type: [correctionRequestSchema],
      default: []
    }
  },
  {
    timestamps: true,
  },
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
