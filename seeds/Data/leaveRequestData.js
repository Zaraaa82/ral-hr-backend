const leaveRequestData = [
  // =====================================================
  // Hajj history
  // Used to test once-per-lifetime restriction
  // =====================================================
  {
    employeeCode: "EMP-0022",
    leaveType: "Hajj",
    startDate: new Date("2026-05-17"),
    endDate: new Date("2026-05-30"),
    note: "Hajj leave.",
    status: "approved",
    actionedByCode: "EMP-0001",
    actionedAt: new Date("2026-05-10"),
  },

  // =====================================================
  // Ahmed - first sick leave
  // Uses 14 of his 15 full-pay sick days
  // =====================================================
  {
    employeeCode: "EMP-0011",
    leaveType: "Sick (Full Pay)",
    startDate: new Date("2026-08-01"),
    endDate: new Date("2026-08-14"),
    note: "Medical leave.",
    documentFileName: "ahmed_health_verified.pdf",
    status: "approved",
    actionedByCode: "EMP-0003",
    actionedAt: new Date("2026-08-01"),
  },

  // =====================================================
  // Ahmed - second sick leave
  //
  // After the previous request:
  // Full Pay has only 1 day remaining.
  //
  // This request is 3 days:
  // 1 day -> Full Pay
  // 2 days -> Half Pay
  // =====================================================
  {
    employeeCode: "EMP-0011",
    leaveType: "Sick (Full Pay)",
    startDate: new Date("2026-08-15"),
    endDate: new Date("2026-08-17"),
    note: "Continued medical leave.",
    documentFileName: "ahmed_health_verified.pdf",
    status: "approved",
    actionedByCode: "EMP-0003",
    actionedAt: new Date("2026-08-15"),
  },

  // =====================================================
  // Maternity leave
  // =====================================================
  {
    employeeCode: "EMP-0023",
    leaveType: "Maternity",
    startDate: new Date("2026-08-20"),
    endDate: new Date("2026-08-24"),
    note: "Maternity leave.",
    documentFileName: "maryam_health_verified.pdf",
    status: "approved",
    actionedByCode: "EMP-0005",
    actionedAt: new Date("2026-08-18"),
  },

  // =====================================================
  // Rejected request
  // No leave allocation should be deducted
  // =====================================================
  {
    employeeCode: "EMP-0013",
    leaveType: "Annual",
    startDate: new Date("2026-08-09"),
    endDate: new Date("2026-08-11"),
    note: "Personal travel.",
    status: "rejected",
    actionedByCode: "EMP-0005",
    actionedAt: new Date("2026-08-05"),
  },

  // =====================================================
  // Cancelled request
  // No current balance deduction
  // =====================================================
  {
    employeeCode: "EMP-0006",
    leaveType: "Annual",
    startDate: new Date("2026-07-05"),
    endDate: new Date("2026-07-07"),
    note: "Personal leave.",
    status: "cancelled",
    actionedByCode: "EMP-0006",
    actionedAt: new Date("2026-07-02"),
  },

  // =====================================================
  // Future pending request
  // Shows on manager approval screen
  // Also becomes a reserved date range
  // =====================================================
  {
    employeeCode: "EMP-0008",
    leaveType: "Annual",
    startDate: new Date("2026-09-13"),
    endDate: new Date("2026-09-15"),
    note: "Family trip.",
    status: "pending",
  },

  // =====================================================
  // Future approved annual leave
  // Useful for employee upcoming leave
  // =====================================================
  {
    employeeCode: "EMP-0009",
    leaveType: "Annual",
    startDate: new Date("2026-09-20"),
    endDate: new Date("2026-09-22"),
    note: "Family leave.",
    status: "approved",
    actionedByCode: "EMP-0004",
    actionedAt: new Date("2026-08-28"),
  },
];

module.exports = leaveRequestData;