const notificationData = [
  // Pending leave request -> manager
  {
    recipientCode: "EMP-0004",
    type: "leave_request_submitted",
    relatedType: "LeaveRequest",
    related: {
      employeeCode: "EMP-0008",
      leaveType: "Annual",
      startDate: "2026-09-13",
    },
    message:
      "Hussain submitted an Annual leave request for your review.",
    isRead: false,
  },

  // Approved leave -> employee
  {
    recipientCode: "EMP-0009",
    type: "leave_request_approved",
    relatedType: "LeaveRequest",
    related: {
      employeeCode: "EMP-0009",
      leaveType: "Annual",
      startDate: "2026-09-20",
    },
    message:
      "Your Annual leave request has been approved.",
    isRead: false,
  },

  // Rejected leave -> employee
  {
    recipientCode: "EMP-0013",
    type: "leave_request_rejected",
    relatedType: "LeaveRequest",
    related: {
      employeeCode: "EMP-0013",
      leaveType: "Annual",
      startDate: "2026-08-09",
    },
    message:
      "Your Annual leave request has been rejected.",
    isRead: true,
  },

  // Sick leave approval
  {
    recipientCode: "EMP-0011",
    type: "leave_request_approved",
    relatedType: "LeaveRequest",
    related: {
      employeeCode: "EMP-0011",
      leaveType: "Sick (Full Pay)",
      startDate: "2026-08-15",
    },
    message:
      "Your Sick (Full Pay) leave request has been approved.",
    isRead: true,
  },

  // Late employee -> manager
  {
    recipientCode: "EMP-0004",
    type: "attendance_late",
    relatedType: "Attendance",
    related: {
      employeeCode: "EMP-0009",
      date: "2026-08-24",
    },
    message:
      "Wadha clocked in late.",
    isRead: false,
  },

  // Pending correction -> HR
  {
    recipientCode: "EMP-0002",
    type: "attendance_correction_requested",
    relatedType: "Attendance",
    related: {
      employeeCode: "EMP-0009",
      date: "2026-08-24",
    },
    message:
      "An attendance correction for Wadha requires HR review.",
    isRead: false,
  },

  // Applied correction -> employee
  {
    recipientCode: "EMP-0006",
    type: "attendance_correction_applied",
    relatedType: "Attendance",
    related: {
      employeeCode: "EMP-0006",
      date: "2026-08-25",
    },
    message:
      "Your attendance correction has been applied by HR.",
    isRead: false,
  },

  // Missing clock-out / attendance exception -> manager
  {
    recipientCode: "EMP-0014",
    type: "attendance_exception",
    relatedType: "Attendance",
    related: {
      employeeCode: "EMP-0017",
      date: "2026-08-26",
    },
    message:
      "Imran's attendance has a missing clock-out.",
    isRead: false,
  },

  // Employee uploaded document -> HR
  {
    recipientCode: "EMP-0002",
    type: "document_uploaded",
    relatedType: "Document",
    related: {
      employeeCode: "EMP-0017",
      fileName: "imran_work_permit_pending.pdf",
    },
    message:
      "Imran uploaded a Work Permit for verification.",
    isRead: false,
  },

  // Expiring document -> employee
  {
    recipientCode: "EMP-0027",
    type: "document_expiring",
    relatedType: "Document",
    related: {
      employeeCode: "EMP-0027",
      fileName: "priya_work_permit_current_verified.pdf",
    },
    message:
      "Your Work Permit is approaching its expiry date.",
    isRead: false,
  },
];

module.exports = notificationData;