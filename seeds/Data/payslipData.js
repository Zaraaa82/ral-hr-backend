const ACTIVE_EMPLOYEES = [
  "EMP-0001", "EMP-0002", "EMP-0003", "EMP-0004", "EMP-0005", "EMP-0006",
  "EMP-0007", "EMP-0008", "EMP-0009", "EMP-0011", "EMP-0012", "EMP-0013",
  "EMP-0014", "EMP-0015", "EMP-0016", "EMP-0017", "EMP-0018", "EMP-0019",
  "EMP-0020", "EMP-0021", "EMP-0022", "EMP-0023", "EMP-0024", "EMP-0025",
  "EMP-0026", "EMP-0027",
];

const monthProfiles = {
  6: { presentDays: 22, workedMinutes: 10560, overtimeMinutes: 120 },
  7: { presentDays: 23, workedMinutes: 11040, overtimeMinutes: 180 },
  8: { presentDays: 20, workedMinutes: 9600, overtimeMinutes: 240 },
};

const approvalDates = {
  6: new Date("2026-06-27T08:30:00+03:00"),
  7: new Date("2026-07-27T08:35:00+03:00"),
  8: new Date("2026-08-27T08:40:00+03:00"),
};

const payslipData = [];

for (const employeeCode of ACTIVE_EMPLOYEES) {
  for (const month of [6, 7, 8]) {
    // Priya's August payslip is deliberately absent so HR can generate it live.
    if (employeeCode === "EMP-0027" && month === 8) continue;

    const index = Number(employeeCode.slice(-2));
    const base = monthProfiles[month];
    const overtimeMinutes = index % 4 === 0 ? base.overtimeMinutes : 0;
    const status = employeeCode === "EMP-0025" && month === 8 ? "pending" : "approved";

    const attendanceSummary = {
      workedMinutes: base.workedMinutes - ((index % 3) * 30),
      overtimeMinutes,
      approvedOvertimeMinutes: status === "approved" ? overtimeMinutes : 0,
      presentDays: base.presentDays,
      absentDays: 0,
      halfDays: 0,
      leaveDays: 0,
      holidayDays: month === 6 ? 2 : month === 8 ? 1 : 0,
      weeklyOffDays: 8,
    };

    // Wadha's August summary mirrors her seeded attendance/leave exceptions.
    if (employeeCode === "EMP-0009" && month === 8) {
      Object.assign(attendanceSummary, {
        presentDays: 15,
        absentDays: 1,
        halfDays: 1,
        leaveDays: 2,
        workedMinutes: 7680,
        overtimeMinutes: 0,
        approvedOvertimeMinutes: 0,
      });
    }

    // Ahmed's approved sick leave is visible in the August payroll summary.
    if (employeeCode === "EMP-0011" && month === 8) {
      Object.assign(attendanceSummary, {
        presentDays: 9,
        leaveDays: 12,
        workedMinutes: 4440,
      });
    }

    payslipData.push({
      employeeCode,
      month,
      year: 2026,
      overtimeMinutes,
      absenceDeduction:
        employeeCode === "EMP-0009" && month === 8 ? 8333 : 0,
      leaveDeduction:
        employeeCode === "EMP-0011" && month === 8 ? 11667 : 0,
      attendanceSummary,
      status,
      approvedByCode: status === "approved" ? "EMP-0002" : null,
      approvedAt: status === "approved" ? approvalDates[month] : null,
    });
  }
}

module.exports = payslipData;
