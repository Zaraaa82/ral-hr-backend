const auditLogData = [
  {
    entityType: "User", employeeCode: "EMP-0010", changedByCode: "EMP-0002",
    action: "deactivate", old_value: { status: "active" },
    new_value: { status: "deactivated" },
    changedAt: new Date("2026-07-01T09:00:00+03:00"),
  },
  {
    entityType: "Document", employeeCode: "EMP-0017",
    fileName: "imran_work_permit_pending.pdf", changedByCode: "EMP-0017",
    action: "upload", new_value: { type: "Work Permit", status: "pending" },
    changedAt: new Date("2026-08-30T10:20:00+03:00"),
  },
  {
    entityType: "Document", employeeCode: "EMP-0008",
    fileName: "hussain_qualification_rejected.pdf", changedByCode: "EMP-0002",
    action: "reject", old_value: { status: "pending" },
    new_value: { status: "rejected" },
    changedAt: new Date("2026-08-20T11:05:00+03:00"),
  },
  {
    entityType: "LeaveRequest", employeeCode: "EMP-0009", leaveType: "Annual",
    startDate: "2026-08-05", changedByCode: "EMP-0004", action: "approve",
    old_value: { status: "pending" }, new_value: { status: "approved" },
    changedAt: new Date("2026-08-02T10:20:00+03:00"),
  },
  {
    entityType: "LeaveRequest", employeeCode: "EMP-0009", leaveType: "Annual",
    startDate: "2026-07-12", changedByCode: "EMP-0004", action: "reject",
    old_value: { status: "pending" }, new_value: { status: "rejected" },
    changedAt: new Date("2026-07-08T11:00:00+03:00"),
  },
  {
    entityType: "LeaveRequest", employeeCode: "EMP-0009", leaveType: "Annual",
    startDate: "2026-06-21", changedByCode: "EMP-0009", action: "cancel",
    old_value: { status: "pending" }, new_value: { status: "cancelled" },
    changedAt: new Date("2026-06-18T09:30:00+03:00"),
  },
  {
    entityType: "LeaveRequest", employeeCode: "EMP-0013", leaveType: "Annual",
    startDate: "2026-09-06", changedByCode: "EMP-0005", action: "reject",
    old_value: { status: "pending" }, new_value: { status: "rejected" },
    changedAt: new Date("2026-09-01T14:00:00+03:00"),
  },
  {
    entityType: "Attendance", employeeCode: "EMP-0009", date: "2026-08-24",
    changedByCode: "EMP-0004", action: "request",
    old_value: { approvalStatus: "pending", correctionRequests: [] },
    new_value: { correctionStatus: "pending", requestedInTime: "08:05" },
    changedAt: new Date("2026-08-24T18:00:00+03:00"),
  },
  {
    entityType: "Attendance", employeeCode: "EMP-0006", date: "2026-08-27",
    changedByCode: "EMP-0002", action: "correct",
    old_value: { outTime: null, approvalStatus: "pending" },
    new_value: { outTime: "17:00", correctionStatus: "applied" },
    reason: "The original clock-out was recorded incorrectly.",
    changedAt: new Date("2026-08-30T09:00:00+03:00"),
  },
  {
    entityType: "Attendance", employeeCode: "EMP-0013", date: "2026-08-26",
    changedByCode: "EMP-0007", action: "reject",
    old_value: { correctionStatus: "pending" },
    new_value: { correctionStatus: "rejected" },
    changedAt: new Date("2026-08-27T09:15:00+03:00"),
  },
  ...[6, 7, 8].flatMap((month) =>
    ["EMP-0009", "EMP-0004", "EMP-0002"].map((employeeCode) => ({
      entityType: "Payslip", employeeCode, month, year: 2026,
      changedByCode: "EMP-0002", action: "approve",
      old_value: { status: "pending" },
      new_value: { status: "approved", locked: true },
      changedAt: new Date(`2026-${String(month).padStart(2, "0")}-27T08:40:00+03:00`),
    })),
  ),
];

module.exports = auditLogData;
