const mongoose = require("mongoose");

const ObjectId = mongoose.Schema.Types.ObjectId;

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "leave_request_submitted",
        "leave_request_approved",
        "leave_request_rejected",
        "leave_request_cancelled",
        "attendance_submitted",
        "attendance_needs_correction",
        "attendance_approved",
        "attendance_correction_requested",
        "attendance_correction_applied",
        "attendance_correction_rejected",
        "attendance_exception",
        "attendance_corrected",
        "attendance_late",
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
      required: true
    },
    relatedRecord: {
      type: ObjectId,
      refPath: "relatedType",
      required: true
    },
    isRead: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
