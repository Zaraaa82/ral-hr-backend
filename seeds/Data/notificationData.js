const notificationData = [
  {
    recipientCode: "EMP-0004", type: "leave_request_submitted",
    relatedType: "LeaveRequest",
    related: { employeeCode: "EMP-0008", leaveType: "Annual", startDate: "2026-09-13" },
    message: "Hussain submitted an Annual leave request for your review.", isRead: false,
  },
  {
    recipientCode: "EMP-0004", type: "leave_request_submitted",
    relatedType: "LeaveRequest",
    related: { employeeCode: "EMP-0025", leaveType: "Annual", startDate: "2026-09-27" },
    message: "Sara submitted an Annual leave request for your review.", isRead: false,
  },
  {
    recipientCode: "EMP-0009", type: "leave_request_approved",
    relatedType: "LeaveRequest",
    related: { employeeCode: "EMP-0009", leaveType: "Annual", startDate: "2026-09-20" },
    message: "Your Annual leave request has been approved.", isRead: false,
  },
  {
    recipientCode: "EMP-0002", type: "leave_request_rejected",
    relatedType: "LeaveRequest",
    related: { employeeCode: "EMP-0013", leaveType: "Annual", startDate: "2026-09-06" },
    message: "Maria's rejected leave request is available for HR review and override.", isRead: false,
  },
  {
    recipientCode: "EMP-0002", type: "attendance_correction_requested",
    relatedType: "Attendance", related: { employeeCode: "EMP-0009", date: "2026-08-24" },
    message: "Khalid requested an attendance correction for Wadha.", isRead: false,
  },
  {
    recipientCode: "EMP-0003", type: "attendance_correction_applied",
    relatedType: "Attendance", related: { employeeCode: "EMP-0006", date: "2026-08-27" },
    message: "HR applied Jassim's correction; manager approval is still required.", isRead: false,
  },
  {
    recipientCode: "EMP-0014", type: "attendance_exception",
    relatedType: "Attendance", related: { employeeCode: "EMP-0017", date: "2026-08-26" },
    message: "Imran's attendance has a missing clock-out.", isRead: false,
  },
  {
    recipientCode: "EMP-0009", type: "attendance_needs_correction",
    relatedType: "Attendance", related: { employeeCode: "EMP-0009", date: "2026-08-27" },
    message: "Your 27 August attendance is missing a clock-out.", isRead: false,
  },
  {
    recipientCode: "EMP-0002", type: "document_uploaded",
    relatedType: "Document",
    related: { employeeCode: "EMP-0017", fileName: "imran_work_permit_pending.pdf" },
    message: "Imran uploaded a Work Permit for verification.", isRead: false,
  },
  {
    recipientCode: "EMP-0027", type: "document_expiring",
    relatedType: "Document",
    related: { employeeCode: "EMP-0027", fileName: "priya_work_permit_current_verified.pdf" },
    message: "Your Work Permit is approaching its expiry date.", isRead: false,
  },
  ...["EMP-0009", "EMP-0004", "EMP-0002"].map((employeeCode) => ({
    recipientCode: employeeCode,
    type: "payroll_available",
    relatedType: "Payslip",
    related: { employeeCode, month: 8, year: 2026 },
    message: "Your August 2026 payslip is available.",
    isRead: employeeCode !== "EMP-0009",
  })),
];

module.exports = notificationData;
