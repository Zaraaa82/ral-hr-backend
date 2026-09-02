const leaveRequestData = [
  // Wadha (employee demo): all historical statuses plus cancellable future leave.
  {
    employeeCode: "EMP-0009", leaveType: "Annual",
    startDate: new Date("2026-08-05"), endDate: new Date("2026-08-06"),
    note: "Family commitment.", status: "approved",
    actionedByCode: "EMP-0004", actionedAt: new Date("2026-08-02T10:20:00+03:00"),
  },
  {
    employeeCode: "EMP-0009", leaveType: "Annual",
    startDate: new Date("2026-07-12"), endDate: new Date("2026-07-13"),
    note: "Personal appointment.", status: "rejected",
    actionedByCode: "EMP-0004", actionedAt: new Date("2026-07-08T11:00:00+03:00"),
  },
  {
    employeeCode: "EMP-0009", leaveType: "Annual",
    startDate: new Date("2026-06-21"), endDate: new Date("2026-06-22"),
    note: "Plans changed before the leave date.", status: "cancelled",
    actionedByCode: "EMP-0009", actionedAt: new Date("2026-06-18T09:30:00+03:00"),
  },
  {
    employeeCode: "EMP-0009", leaveType: "Annual",
    startDate: new Date("2026-09-20"), endDate: new Date("2026-09-22"),
    note: "Family leave.", status: "approved",
    actionedByCode: "EMP-0004", actionedAt: new Date("2026-08-28T12:10:00+03:00"),
  },

  // Khalid (manager) and Fatima (HR Admin) also have employee leave histories.
  {
    employeeCode: "EMP-0004", leaveType: "Annual",
    startDate: new Date("2026-07-26"), endDate: new Date("2026-07-27"),
    note: "Personal leave.", status: "approved",
    actionedByCode: "EMP-0001", actionedAt: new Date("2026-07-20T09:15:00+03:00"),
  },
  {
    employeeCode: "EMP-0002", leaveType: "Annual",
    startDate: new Date("2026-06-07"), endDate: new Date("2026-06-08"),
    note: "Family commitment.", status: "approved",
    actionedByCode: "EMP-0001", actionedAt: new Date("2026-06-01T10:00:00+03:00"),
  },
  {
    employeeCode: "EMP-0002", leaveType: "Annual",
    startDate: new Date("2026-10-04"), endDate: new Date("2026-10-05"),
    note: "Planned personal leave.", status: "pending",
  },

  // Sales team: two live manager decisions.
  {
    employeeCode: "EMP-0008", leaveType: "Annual",
    startDate: new Date("2026-09-13"), endDate: new Date("2026-09-15"),
    note: "Family trip.", status: "pending",
  },
  {
    employeeCode: "EMP-0025", leaveType: "Annual",
    startDate: new Date("2026-09-27"), endDate: new Date("2026-09-28"),
    note: "Personal appointment.", status: "pending",
  },

  // Chained sick-pay allocation with a verified document.
  {
    employeeCode: "EMP-0011", leaveType: "Sick (Full Pay)",
    startDate: new Date("2026-08-01"), endDate: new Date("2026-08-14"),
    note: "Medical leave.", documentFileName: "ahmed_health_verified.pdf",
    status: "approved", actionedByCode: "EMP-0003",
    actionedAt: new Date("2026-08-01T10:00:00+03:00"),
  },
  {
    employeeCode: "EMP-0011", leaveType: "Sick (Full Pay)",
    startDate: new Date("2026-08-15"), endDate: new Date("2026-08-17"),
    note: "Continued medical leave.", documentFileName: "ahmed_health_verified.pdf",
    status: "approved", actionedByCode: "EMP-0003",
    actionedAt: new Date("2026-08-15T09:15:00+03:00"),
  },

  // Gender-specific and once-per-lifetime restrictions.
  {
    employeeCode: "EMP-0023", leaveType: "Maternity",
    startDate: new Date("2026-08-20"), endDate: new Date("2026-08-24"),
    note: "Maternity leave.", documentFileName: "maryam_health_verified.pdf",
    status: "approved", actionedByCode: "EMP-0005",
    actionedAt: new Date("2026-08-18T11:30:00+03:00"),
  },
  {
    employeeCode: "EMP-0022", leaveType: "Hajj",
    startDate: new Date("2026-05-17"), endDate: new Date("2026-05-30"),
    note: "Hajj leave.", status: "approved",
    actionedByCode: "EMP-0001", actionedAt: new Date("2026-05-10T10:00:00+03:00"),
  },

  // HR override candidate: manager rejected; HR can override during the demo.
  {
    employeeCode: "EMP-0013", leaveType: "Annual",
    startDate: new Date("2026-09-06"), endDate: new Date("2026-09-08"),
    note: "Urgent family travel.", status: "rejected",
    actionedByCode: "EMP-0005", actionedAt: new Date("2026-09-01T14:00:00+03:00"),
  },
];

module.exports = leaveRequestData;
