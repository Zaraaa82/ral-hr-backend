const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Payslip = require("../models/Payslip");

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// GET ATTENDANCE SUMMARY

async function getAttendanceSummary(employeeId, month, year) {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);

  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const attendanceRecords = await Attendance.find({
    employee: employeeId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ date: 1 });

  let workedMinutes = 0;
  let overtimeMinutes = 0;

  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let leaveDays = 0;
  let holidayDays = 0;
  let weeklyOffDays = 0;

  for (const attendance of attendanceRecords) {
    workedMinutes += Number(attendance.workedMinutes) || 0;

    // Only approved overtime is paid
    if (attendance.overtimeApproved) {
      overtimeMinutes += Number(attendance.overtimeMinutes) || 0;
    }

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

      default:
        break;
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
  };
}

// CALCULATE OVERTIME AMOUNT

function calculateOvertimeAmount(basicSalaryFils, overtimeMinutes, settings) {
  if (!basicSalaryFils || !overtimeMinutes) {
    return 0;
  }

  const overtimeSettings = settings?.overtime;

  if (!overtimeSettings) {
    return 0;
  }

  const normalDailyHours = Number(settings?.workingHours?.normal_daily) || 8;

  const monthlyWorkingDays = 26;

  const monthlyWorkingMinutes = normalDailyHours * 60 * monthlyWorkingDays;

  if (monthlyWorkingMinutes <= 0) {
    return 0;
  }

  const hourlyRate = basicSalaryFils / (monthlyWorkingMinutes / 60);

  const overtimePercent = Number(overtimeSettings.overtime_day_percent) || 0;

  const overtimeRate = 1 + overtimePercent / 100;

  const overtimeHours = overtimeMinutes / 60;

  const overtimeAmount = hourlyRate * overtimeHours * overtimeRate;

  return Math.round(overtimeAmount);
}

// CALCULATE ABSENCE DEDUCTION

function calculateAbsenceDeduction(basicSalaryFils, absentDays, halfDays) {
  if (!basicSalaryFils) {
    return 0;
  }

  const workingDaysPerMonth = 26;

  const dailyRate = basicSalaryFils / workingDaysPerMonth;

  const absenceDeduction = absentDays * dailyRate + halfDays * dailyRate * 0.5;

  return Math.round(absenceDeduction);
}

// CALCULATE SOCIAL INSURANCE

function calculateSocialInsurance(user, basicSalaryFils, settings) {
  if (!user || !basicSalaryFils) {
    return 0;
  }

  const socialInsurance = settings?.socialInsurance;

  if (!socialInsurance) {
    return 0;
  }

  let employeePercent = 0;

  if (user.isBahraini) {
    employeePercent =
      Number(socialInsurance.sio_bahraini_employee_percent) || 0;
  } else {
    employeePercent = Number(socialInsurance.sio_expat_employee_percent) || 0;
  }

  let contributionBase = basicSalaryFils;

  const ceiling = socialInsurance.sio_ceiling_fils;

  if (ceiling !== null && ceiling !== undefined && contributionBase > ceiling) {
    contributionBase = ceiling;
  }

  const contribution = contributionBase * (employeePercent / 100);

  return Math.round(contribution);
}

// GENERATE PAYROLL CALCULATION

async function calculatePayroll({ employeeId, month, year, settings }) {
  const employee = await User.findById(employeeId);

  if (!employee) {
    throw new Error("Employee not found.");
  }

  if (!employee.basicSalaryFils) {
    throw new Error("Employee does not have a basic salary.");
  }

  const basicSalary = Number(employee.basicSalaryFils);

  const attendance = await getAttendanceSummary(employeeId, month, year);

  const overtimeAmount = calculateOvertimeAmount(
    basicSalary,
    attendance.overtimeMinutes,
    settings,
  );

  const absenceDeduction = calculateAbsenceDeduction(
    basicSalary,
    attendance.absentDays,
    attendance.halfDays,
  );

  const socialInsurance = calculateSocialInsurance(
    employee,
    basicSalary,
    settings,
  );

  const deductions = absenceDeduction + socialInsurance;

  const allowances = 0;

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
      socialInsurance,
    },
  };
}

async function generatePayslip({ employeeId, month, year, settings }) {
  // Check duplicate
  const existingPayslip = await Payslip.findOne({
    employee: employeeId,
    month,
    year,
  });

  if (existingPayslip) {
    throw new Error("Payslip already exists for this month and year.");
  }

  // Calculate payroll
  const calculation = await calculatePayroll({
    employeeId,
    month,
    year,
    settings,
  });

  // Create payslip
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

    status: "pending",

    approvedBy: null,

    approvedAt: null,
  });

  return {
    payslip,
    calculation,
  };
}

module.exports = {
  getAttendanceSummary,
  calculateOvertimeAmount,
  calculateAbsenceDeduction,
  calculateSocialInsurance,
  calculatePayroll,
  generatePayslip,
};
