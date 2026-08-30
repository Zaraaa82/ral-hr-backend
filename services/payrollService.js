const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Payslip = require("../models/Payslip");
const LeaveRequest = require("../models/leaveRequest");

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getMonthStart(year, month) {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function getNextMonthStart(year, month) {
  return new Date(year, month, 1, 0, 0, 0, 0);
}

function getDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isScheduledWorkingDay(employee, date) {
  const dayName = DAYS_OF_WEEK[new Date(date).getDay()];
  return employee?.workSchedule?.workingDays?.includes(dayName) || false;
}

function isFutureDate(date) {
  const today = new Date();
  return (
    new Date(date.getFullYear(), date.getMonth(), date.getDate()) >
    new Date(today.getFullYear(), today.getMonth(), today.getDate())
  );
}

function isBeforeJoiningDate(employee, date) {
  if (!employee?.dateOfJoining) return false;
  const joining = new Date(employee.dateOfJoining);
  return (
    date <
    new Date(joining.getFullYear(), joining.getMonth(), joining.getDate())
  );
}

function isAfterLeavingDate(employee, date) {
  if (!employee?.dateOfLeaving) return false;
  const leaving = new Date(employee.dateOfLeaving);
  return (
    date >
    new Date(leaving.getFullYear(), leaving.getMonth(), leaving.getDate())
  );
}

async function getAttendanceRecords(employeeId, month, year) {
  return Attendance.find({
    employee: employeeId,
    date: {
      $gte: getMonthStart(year, month),
      $lt: getNextMonthStart(year, month),
    },
  })
    .sort({ date: 1 })
    .lean();
}

async function getAttendanceSummary(employee, month, year) {
  const attendanceRecords = await getAttendanceRecords(
    employee._id,
    month,
    year,
  );
  const attendanceMap = new Map();
  for (const record of attendanceRecords) {
    attendanceMap.set(getDateKey(record.date), record);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  let workedMinutes = 0,
    overtimeMinutes = 0;
  let presentDays = 0,
    absentDays = 0,
    halfDays = 0,
    leaveDays = 0,
    holidayDays = 0,
    weeklyOffDays = 0;
  const dailyBreakdown = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dateKey = getDateKey(currentDate);
    const attendance = attendanceMap.get(dateKey);

    if (
      isBeforeJoiningDate(employee, currentDate) ||
      isAfterLeavingDate(employee, currentDate) ||
      isFutureDate(currentDate)
    ) {
      continue;
    }

    if (attendance) {
      const recordWorked = Number(attendance.workedMinutes) || 0;
      const recordOvertime = Number(attendance.overtimeMinutes) || 0;
      workedMinutes += recordWorked;

      if (attendance.overtimeApproved) overtimeMinutes += recordOvertime;

      switch (attendance.status) {
        case "Present":
          presentDays++;
          break;
        case "Absent":
          absentDays++;
          break;
        case "Half Day":
          halfDays++;
          break;
        case "On Leave":
          leaveDays++;
          break;
        case "Holiday":
          holidayDays++;
          break;
        case "Weekly Off":
          weeklyOffDays++;
          break;
      }

      dailyBreakdown.push({
        date: currentDate,
        status: attendance.status,
        workedMinutes: recordWorked,
        overtimeMinutes: recordOvertime,
        overtimeApproved: Boolean(attendance.overtimeApproved),
      });
      continue;
    }

    if (isScheduledWorkingDay(employee, currentDate)) {
      absentDays++;
      dailyBreakdown.push({
        date: currentDate,
        status: "Absent",
        workedMinutes: 0,
        overtimeMinutes: 0,
        overtimeApproved: false,
        virtual: true,
      });
    } else {
      weeklyOffDays++;
      dailyBreakdown.push({
        date: currentDate,
        status: "Weekly Off",
        workedMinutes: 0,
        overtimeMinutes: 0,
        overtimeApproved: false,
        virtual: true,
      });
    }
  }

  return {
    attendanceRecords,
    workedMinutes,
    overtimeMinutes,
    presentDays,
    absentDays,
    halfDays,
    leaveDays,
    holidayDays,
    weeklyOffDays,
    dailyBreakdown,
  };
}

function calculateOvertimeAmount(
  basicSalaryFils,
  overtimeMinutes,
  settings,
  month,
  year,
) {
  if (basicSalaryFils <= 0 || overtimeMinutes <= 0) return 0;
  const overtimeSettings = settings?.overtime;
  if (!overtimeSettings) return 0;

  const normalDailyHours = Number(settings?.workingHours?.normal_daily) || 8;
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthlyWorkingHours = daysInMonth * normalDailyHours;

  const hourlyRate = basicSalaryFils / monthlyWorkingHours;
  const overtimeMultiplier =
    1 + (Number(overtimeSettings.overtime_day_percent) || 0) / 100;
  return Math.round(hourlyRate * (overtimeMinutes / 60) * overtimeMultiplier);
}

function calculateAbsenceDeduction(
  basicSalaryFils,
  absentDays,
  halfDays,
  month,
  year,
) {
  if (basicSalaryFils <= 0) return 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyRate = basicSalaryFils / daysInMonth;
  return Math.round(absentDays * dailyRate + halfDays * dailyRate * 0.5);
}

async function calculateLeaveDeduction(
  employeeId,
  month,
  year,
  basicSalaryFils,
) {
  if (basicSalaryFils <= 0)
    return { totalLeaveDeduction: 0, deductionBreakdown: [] };

  const dailyRate = basicSalaryFils / new Date(year, month, 0).getDate();
  const monthStart = getMonthStart(year, month);
  const nextMonthStart = getNextMonthStart(year, month);

  const leaveRequests = await LeaveRequest.find({
    employee: employeeId,
    status: "approved",
    startDate: { $lt: nextMonthStart },
    endDate: { $gte: monthStart },
  })
    .populate("leaveType", "type")
    .lean();

  let totalLeaveDeduction = 0;
  const deductionBreakdown = [];

  for (const req of leaveRequests) {
    if (!Array.isArray(req.allocationBreakdown)) continue;

    for (const part of req.allocationBreakdown) {
      if (!Array.isArray(part.dates)) continue;

      const datesInMonth = part.dates.filter(
        (d) => new Date(d) >= monthStart && new Date(d) < nextMonthStart,
      );
      if (!datesInMonth.length) continue;

      const payFraction = Number.isFinite(Number(part.payFraction))
        ? Math.min(1, Math.max(0, Number(part.payFraction)))
        : 0;
      const deductionAmount = Math.round(
        dailyRate * datesInMonth.length * (1 - payFraction),
      );

      if (deductionAmount <= 0) continue;

      totalLeaveDeduction += deductionAmount;
      deductionBreakdown.push({
        leaveRequest: req._id,
        leaveType: req.leaveType?._id,
        type: req.leaveType?.type,
        days: datesInMonth.length,
        dates: datesInMonth,
        payFraction,
        deductionAmount,
      });
    }
  }

  return { totalLeaveDeduction, deductionBreakdown };
}

function calculateSocialInsurance(user, basicSalaryFils, settings) {
  if (!user || basicSalaryFils <= 0 || !settings?.socialInsurance) return 0;

  const socialInsurance = settings.socialInsurance;
  const employeePercent = user.isBahraini
    ? Number(socialInsurance.sio_bahraini_employee_percent) || 0
    : Number(socialInsurance.sio_expat_employee_percent) || 0;

  const ceiling = socialInsurance.sio_ceiling_fils || 4000000;
  const contributionBase = Math.min(basicSalaryFils, ceiling);

  return Math.round(contributionBase * (employeePercent / 100));
}

async function calculatePayroll({ employeeId, month, year, settings }) {
  const employee = await User.findById(employeeId);
  if (!employee) throw new Error("Employee not found.");

  const basicSalary = Number(employee.basicSalaryFils);
  if (!Number.isInteger(basicSalary) || basicSalary < 0)
    throw new Error("Employee basic salary is invalid.");

  const attendance = await getAttendanceSummary(employee, month, year);
  const overtimeAmount = calculateOvertimeAmount(
    basicSalary,
    attendance.overtimeMinutes,
    settings,
    month,
    year,
  );
  const absenceDeduction = calculateAbsenceDeduction(
    basicSalary,
    attendance.absentDays,
    attendance.halfDays,
    month,
    year,
  );
  const leaveDeductionCalc = await calculateLeaveDeduction(
    employeeId,
    month,
    year,
    basicSalary,
  );
  const socialInsurance = calculateSocialInsurance(
    employee,
    basicSalary,
    settings,
  );

  const allowances = 0;
  const deductions =
    absenceDeduction + leaveDeductionCalc.totalLeaveDeduction + socialInsurance;
  const grossSalary = basicSalary + allowances + overtimeAmount;
  const netSalary = Math.max(0, grossSalary - deductions);

  return {
    employee: employee._id,
    month,
    year,
    basicSalary,
    allowances,
    overtimeAmount,
    deductions,
    grossSalary,
    netSalary,
    attendance: {
      workedMinutes: attendance.workedMinutes,
      overtimeMinutes: attendance.overtimeMinutes,
      approvedOvertimeMinutes: attendance.overtimeMinutes,
      presentDays: attendance.presentDays,
      absentDays: attendance.absentDays,
      halfDays: attendance.halfDays,
      leaveDays: attendance.leaveDays,
      holidayDays: attendance.holidayDays,
      weeklyOffDays: attendance.weeklyOffDays,
    },
    deductionsBreakdown: {
      absenceDeduction,
      leaveDeduction: leaveDeductionCalc.totalLeaveDeduction,
      socialInsurance,
      unrecoveredDeductions:
        deductions > grossSalary ? deductions - grossSalary : 0,
    },
    leaveDeductionDetails: leaveDeductionCalc.deductionBreakdown,
  };
}

async function generatePayslip({ employeeId, month, year, settings }) {
  try {
    const calculation = await calculatePayroll({
      employeeId,
      month,
      year,
      settings,
    });

    const payslip = await Payslip.create({
      employee: employeeId,
      month,
      year,
      basicSalary: calculation.basicSalary,
      allowances: calculation.allowances,
      overtimeAmount: calculation.overtimeAmount,
      deductions: calculation.deductions,
      grossSalary: calculation.grossSalary,
      netSalary: calculation.netSalary,
      attendanceSummary: calculation.attendance,
      deductionBreakdown: calculation.deductionsBreakdown,
      leaveDeductionDetails: calculation.leaveDeductionDetails,
      status: "pending",
      approvedBy: null,
      approvedAt: null,
      locked: false,
    });

    return { payslip, calculation };
  } catch (error) {
    if (error.code === 11000) {
      throw new Error("Payslip already exists for this employee and month.");
    }
    throw error;
  }
}

module.exports = {
  getAttendanceSummary,
  calculateOvertimeAmount,
  calculateAbsenceDeduction,
  calculateLeaveDeduction,
  calculateSocialInsurance,
  calculatePayroll,
  generatePayslip,
};
