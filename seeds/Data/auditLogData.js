const auditLogData = [
  // User deactivated
  {
    entityType: "User",
    employeeCode: "EMP-0010",
    changedByCode: "EMP-0002",
    action: "deactivate",

    old_value: {
      status: "active",
    },

    new_value: {
      status: "deactivated",
    },
  },

  // Document uploaded
  {
    entityType: "Document",
    employeeCode: "EMP-0017",
    fileName: "imran_work_permit_pending.pdf",

    changedByCode: "EMP-0017",
    action: "upload",

    new_value: {
      type: "Work Permit",
      status: "pending",
    },
  },

  // Document rejected
  {
    entityType: "Document",
    employeeCode: "EMP-0008",
    fileName: "hussain_qualification_rejected.pdf",

    changedByCode: "EMP-0002",
    action: "reject",

    old_value: {
      status: "pending",
    },

    new_value: {
      status: "rejected",
      rejectionReason:
        "Uploaded certificate is unclear. Please upload a clearer copy.",
    },
  },

  // Leave approved
  {
    entityType: "LeaveRequest",
    employeeCode: "EMP-0009",
    leaveType: "Annual",
    startDate: "2026-09-20",

    changedByCode: "EMP-0004",
    action: "approve",

    old_value: {
      status: "pending",
    },

    new_value: {
      status: "approved",
    },
  },

  // Leave rejected
  {
    entityType: "LeaveRequest",
    employeeCode: "EMP-0013",
    leaveType: "Annual",
    startDate: "2026-08-09",

    changedByCode: "EMP-0005",
    action: "reject",

    old_value: {
      status: "pending",
    },

    new_value: {
      status: "rejected",
    },
  },

  // Leave cancelled
  {
    entityType: "LeaveRequest",
    employeeCode: "EMP-0006",
    leaveType: "Annual",
    startDate: "2026-07-05",

    changedByCode: "EMP-0006",
    action: "cancel",

    old_value: {
      status: "pending",
    },

    new_value: {
      status: "cancelled",
    },
  },

  // Attendance correction applied by HR
  {
    entityType: "Attendance",
    employeeCode: "EMP-0006",
    date: "2026-08-25",

    changedByCode: "EMP-0002",
    action: "correct",

    old_value: {
      status: "Present",
      approvalStatus: "pending",
    },

    new_value: {
      status: "Present",
      approvalStatus: "approved",
    },

    reason:
      "The original clock-out time was recorded incorrectly.",
  },

  // Late attendance update
  {
    entityType: "Attendance",
    employeeCode: "EMP-0009",
    date: "2026-08-24",

    changedByCode: "EMP-0009",
    action: "update",

    old_value: {
      inTime: null,
      flags: [],
    },

    new_value: {
      flags: ["late"],
      approvalStatus: "pending",
    },
  },
];

module.exports = auditLogData;