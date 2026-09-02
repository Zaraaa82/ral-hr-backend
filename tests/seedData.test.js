const attendanceData = require("../seeds/Data/attendanceData");
const leaveRequestData = require("../seeds/Data/leaveRequestData");
const notificationData = require("../seeds/Data/notificationData");
const payslipData = require("../seeds/Data/payslipData");
const userData = require("../seeds/Data/userData");

const userCodes = new Set(userData.map((user) => user.employeeCode));
const dayKey = (value) => new Date(value).toISOString().slice(0, 10);

describe("realistic demo seed data", () => {
  test("all cross-file employee codes resolve", () => {
    const referencedCodes = [
      ...attendanceData.flatMap((row) => [
        row.employeeCode,
        ...(row.correctionRequests || []).flatMap((request) =>
          [request.requestedByCode, request.actionedByCode].filter(Boolean)),
      ]),
      ...leaveRequestData.flatMap((row) =>
        [row.employeeCode, row.actionedByCode].filter(Boolean)),
      ...payslipData.flatMap((row) =>
        [row.employeeCode, row.approvedByCode].filter(Boolean)),
      ...notificationData.map((row) => row.recipientCode),
    ];

    expect(referencedCodes.filter((code) => !userCodes.has(code))).toEqual([]);
  });

  test("attendance has no duplicates or future rows", () => {
    const keys = attendanceData.map(
      (row) => `${row.employeeCode}|${dayKey(row.date)}`,
    );

    expect(new Set(keys).size).toBe(keys.length);
    expect(attendanceData.every((row) => dayKey(row.date) <= "2026-09-02")).toBe(true);
  });

  test("primary employee includes every presentation attendance case", () => {
    const wadha = attendanceData.filter((row) => row.employeeCode === "EMP-0009");

    expect(wadha.some((row) => row.status === "Absent")).toBe(true);
    expect(wadha.some((row) => row.forceMissingTimeOut)).toBe(true);
    expect(wadha.some((row) => row.inTime && row.outTime)).toBe(true);
    expect(wadha.some((row) => row.correctionRequests?.some(
      (request) => request.status === "pending",
    ))).toBe(true);
  });

  test("employee, manager and HR Admin have June-August approved payslips", () => {
    for (const employeeCode of ["EMP-0009", "EMP-0004", "EMP-0002"]) {
      const rows = payslipData.filter(
        (row) => row.employeeCode === employeeCode && row.status === "approved",
      );
      expect(rows.map((row) => row.month).sort()).toEqual([6, 7, 8]);
    }
  });

  test("live payroll actions remain available", () => {
    expect(payslipData.some(
      (row) => row.employeeCode === "EMP-0025" && row.month === 8 && row.status === "pending",
    )).toBe(true);
    expect(payslipData.some(
      (row) => row.employeeCode === "EMP-0027" && row.month === 8,
    )).toBe(false);
  });

  test("leave data covers statuses, manager decisions and HR override", () => {
    const statuses = new Set(leaveRequestData.map((row) => row.status));
    expect(statuses).toEqual(new Set(["approved", "rejected", "cancelled", "pending"]));

    expect(leaveRequestData.filter(
      (row) => ["EMP-0008", "EMP-0025"].includes(row.employeeCode) && row.status === "pending",
    )).toHaveLength(2);

    expect(leaveRequestData.some(
      (row) => row.employeeCode === "EMP-0013" && row.status === "rejected",
    )).toBe(true);
  });

  test("no payslip is dated beyond August 2026", () => {
    expect(payslipData.every(
      (row) => row.year < 2026 || (row.year === 2026 && row.month <= 8),
    )).toBe(true);
  });
});
