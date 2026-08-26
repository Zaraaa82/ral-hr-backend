const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
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
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
    },
    actionedAt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actionedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Draft", "Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
    },

  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
