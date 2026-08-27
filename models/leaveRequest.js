const mongoose = require("mongoose");
const ObjectId =  mongoose.Schema.Types.ObjectId;

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
    },
    actionedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },

  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
