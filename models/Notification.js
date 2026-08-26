const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "leave_request_submitted",
        "leave_request_approved",
        "leave_request_rejected",
        "attendance_submitted",
        "attendance_needs_correction",
        "attendance_approved",
        "document_uploaded",
        "document_expiring",
        "payroll_available",
        "system",
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    relatedType: {
      type: String,
      enum: [
        "User",
        "Attendance",
        "Document",
        "LeaveRequest",
        "Payslip",
      ],
    },

    relatedRecord: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedType",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    balance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
