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
    },
    relatedRecord: {
      type: String,
      enum: ["Employee", "Attendance", "Documents", "Leave", "Payroll"],
      required: true,
    },
    isRead: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
