const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Payslip = require("../models/Payslip");
const LeaveRequest = require("../models/leaveRequest");

const PAYROLL_DAYS_PER_MONTH = 30;

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

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");

  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDayName(date) {
  return DAYS_OF_WEEK[new Date(date).getDay()];
}

function isScheduledWorkingDay(employee, date) {
  const dayName = getDayName(date);

  return employee?.workSchedule?.workingDays?.includes(dayName) || false;
}

function isFutureDate(date) {
  const today = new Date();

  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const compareDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  return compareDate > todayOnly;
}

function isBeforeJoiningDate(employee, date) {
  if (!employee?.dateOfJoining) {
    return false;
  }

  const joiningDate = new Date(employee.dateOfJoining);

  const joiningDateOnly = new Date(
    joiningDate.getFullYear(),
    joiningDate.getMonth(),
    joiningDate.getDate(),
  );

  return date < joiningDateOnly;
}

function isAfterLeavingDate(employee, date) {
  if (!employee?.dateOfLeaving) {
    return false;
  }

  const leavingDate = new Date(employee.dateOfLeaving);

  const leavingDateOnly = new Date(
    leavingDate.getFullYear(),
    leavingDate.getMonth(),
    leavingDate.getDate(),
  );

  return date > leavingDateOnly;
}

// GET ATTENDANCE RECORDS

async function getAttendanceRecords(employeeId, month, year) {
  const startDate = getMonthStart(year, month);

  const nextMonthStart = getNextMonthStart(year, month);

  return Attendance.find({
    employee: employeeId,
    date: {
      $gte: startDate,
      $lt: nextMonthStart,
    },
  })
    .sort({ date: 1 })
    .lean();
}

// ATTENDANCE SUMMARY

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

  let workedMinutes = 0;
  let overtimeMinutes = 0;

  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let leaveDays = 0;
  let holidayDays = 0;
  let weeklyOffDays = 0;

  const dailyBreakdown = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day, 0, 0, 0, 0);

    const dateKey = getDateKey(currentDate);

    const attendance = attendanceMap.get(dateKey);

    // Do not calculate dates before joining.
    if (isBeforeJoiningDate(employee, currentDate)) {
      continue;
    }

    // Do not calculate dates after leaving.
    if (isAfterLeavingDate(employee, currentDate)) {
      continue;
    }

    // Do not mark future dates absent.
    if (isFutureDate(currentDate)) {
      continue;
    }

    // EXISTING ATTENDANCE

    if (attendance) {
      const status = attendance.status;

      const recordWorkedMinutes = Number(attendance.workedMinutes) || 0;

      const recordOvertimeMinutes = Number(attendance.overtimeMinutes) || 0;

      workedMinutes += recordWorkedMinutes;

      // Only approved OT is payable.
      if (attendance.overtimeApproved === true) {
        overtimeMinutes += recordOvertimeMinutes;
      }

      switch (status) {
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

      dailyBreakdown.push({
        date: currentDate,
        status,
        workedMinutes: recordWorkedMinutes,
        overtimeMinutes: recordOvertimeMinutes,
        overtimeApproved: Boolean(attendance.overtimeApproved),
      });

      continue;
    }

    // NO ATTENDANCE RECORD

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

    // Only approved overtime.
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

// OVERTIME AMOUNT

function calculateOvertimeAmount(basicSalaryFils, overtimeMinutes, settings) {
  if (basicSalaryFils <= 0 || overtimeMinutes <= 0) {
    return 0;
  }

  const overtimeSettings = settings?.overtime;

  if (!overtimeSettings) {
    return 0;
  }

  const normalDailyHours = Number(settings?.workingHours?.normal_daily) || 8;

  const monthlyWorkingHours = PAYROLL_DAYS_PER_MONTH * normalDailyHours;

  if (monthlyWorkingHours <= 0) {
    return 0;
  }

  const hourlyRate = basicSalaryFils / monthlyWorkingHours;

  const overtimePercent = Number(overtimeSettings.overtime_day_percent) || 0;

  const overtimeMultiplier = 1 + overtimePercent / 100;

  const overtimeHours = overtimeMinutes / 60;

  const overtimeAmount = hourlyRate * overtimeHours * overtimeMultiplier;

  return Math.round(overtimeAmount);
}

// ABSENCE DEDUCTION

function calculateAbsenceDeduction(basicSalaryFils, absentDays, halfDays) {
  if (basicSalaryFils <= 0) {
    return 0;
  }

  const dailyRate = basicSalaryFils / PAYROLL_DAYS_PER_MONTH;

  const deduction = absentDays * dailyRate + halfDays * dailyRate * 0.5;

  return Math.round(deduction);
}

// LEAVE DEDUCTION

async function calculateLeaveDeduction(
  employeeId,
  month,
  year,
  basicSalaryFils,
) {
  if (basicSalaryFils <= 0) {
    return {
      totalLeaveDeduction: 0,
      deductionBreakdown: [],
    };
  }

  const dailyRate = basicSalaryFils / PAYROLL_DAYS_PER_MONTH;

  const monthStart = getMonthStart(year, month);

  const nextMonthStart = getNextMonthStart(year, month);

  const leaveRequests = await LeaveRequest.find({
    employee: employeeId,
    status: "approved",
    startDate: {
      $lt: nextMonthStart,
    },
    endDate: {
      $gte: monthStart,
    },
  })
    .populate("leaveType", "type")
    .lean();

  let totalLeaveDeduction = 0;

  const deductionBreakdown = [];

  for (const leaveRequest of leaveRequests) {
    if (!Array.isArray(leaveRequest.allocationBreakdown)) {
      continue;
    }

    for (const allocationPart of leaveRequest.allocationBreakdown) {
      if (!Array.isArray(allocationPart.dates)) {
        continue;
      }

      const datesInMonth = allocationPart.dates.filter((date) => {
        const leaveDate = new Date(date);

        return leaveDate >= monthStart && leaveDate < nextMonthStart;
      });

      if (datesInMonth.length === 0) {
        continue;
      }

      const days = datesInMonth.length;

      const payFraction = Number(allocationPart.payFraction);

      const validPayFraction = Number.isFinite(payFraction)
        ? Math.min(1, Math.max(0, payFraction))
        : 0;

      const deductionAmount = Math.round(
        dailyRate * days * (1 - validPayFraction),
      );

      if (deductionAmount <= 0) {
        continue;
      }

      totalLeaveDeduction += deductionAmount;

      deductionBreakdown.push({
        leaveRequest: leaveRequest._id,

        leaveType: leaveRequest.leaveType?._id,

        type: leaveRequest.leaveType?.type,

        days,

        dates: datesInMonth,

        payFraction: validPayFraction,

        deductionAmount,
      });
    }
  }

  return {
    totalLeaveDeduction,

    deductionBreakdown,
  };
}

// SOCIAL INSURANCE

function calculateSocialInsurance(user, basicSalaryFils, settings) {
  if (!user || basicSalaryFils <= 0) {
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

  return Math.round(contributionBase * (employeePercent / 100));
}

// FULL PAYROLL CALCULATION

async function calculatePayroll({ employeeId, month, year, settings }) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Month must be between 1 and 12.");
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid payroll year.");
  }

  const employee = await User.findById(employeeId);

  if (!employee) {
    throw new Error("Employee not found.");
  }

  if (
    employee.basicSalaryFils === undefined ||
    employee.basicSalaryFils === null
  ) {
    throw new Error("Employee does not have a basic salary.");
  }

  const basicSalary = Number(employee.basicSalaryFils);

  if (!Number.isInteger(basicSalary) || basicSalary < 0) {
    throw new Error("Employee basic salary is invalid.");
  }

  // ATTENDANCE

  const attendance = await getAttendanceSummary(employee, month, year);

  // OVERTIME

  const overtimeAmount = calculateOvertimeAmount(
    basicSalary,
    attendance.overtimeMinutes,
    settings,
  );

  // ABSENCE

  const absenceDeduction = calculateAbsenceDeduction(
    basicSalary,
    attendance.absentDays,
    attendance.halfDays,
  );

  // LEAVE

  const leaveDeductionCalculation = await calculateLeaveDeduction(
    employeeId,
    month,
    year,
    basicSalary,
  );

  const leaveDeduction = leaveDeductionCalculation.totalLeaveDeduction;

  // SOCIAL INSURANCE

  const socialInsurance = calculateSocialInsurance(
    employee,
    basicSalary,
    settings,
  );

  // ALLOWANCES

  const allowances = 0;

  // TOTAL DEDUCTIONS

  const deductions = absenceDeduction + leaveDeduction + socialInsurance;

  // GROSS

  const grossSalary = basicSalary + allowances + overtimeAmount;

  // NET

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

      leaveDeduction,

      socialInsurance,
    },

    leaveDeductionDetails: leaveDeductionCalculation.deductionBreakdown,

    dailyAttendance: attendance.dailyBreakdown,
  };
}

// GENERATE PAYSLIP

async function generatePayslip({ employeeId, month, year, settings }) {
  const existingPayslip = await Payslip.findOne({
    employee: employeeId,
    month,
    year,
  });

  if (existingPayslip) {
    throw new Error("Payslip already exists for this employee and month.");
  }

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

    attendanceSummary: {
      workedMinutes: calculation.attendance.workedMinutes,

      overtimeMinutes: calculation.attendance.overtimeMinutes,

      approvedOvertimeMinutes: calculation.attendance.approvedOvertimeMinutes,

      presentDays: calculation.attendance.presentDays,

      absentDays: calculation.attendance.absentDays,

      halfDays: calculation.attendance.halfDays,

      leaveDays: calculation.attendance.leaveDays,

      holidayDays: calculation.attendance.holidayDays,

      weeklyOffDays: calculation.attendance.weeklyOffDays,
    },

    deductionBreakdown: {
      absenceDeduction: calculation.deductionsBreakdown.absenceDeduction,

      leaveDeduction: calculation.deductionsBreakdown.leaveDeduction,

      socialInsurance: calculation.deductionsBreakdown.socialInsurance,

      otherDeductions: 0,
    },

    leaveDeductionDetails: calculation.leaveDeductionDetails,

    status: "pending",

    approvedBy: null,

    approvedAt: null,

    locked: false,
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
  calculateLeaveDeduction,
  calculateSocialInsurance,
  calculatePayroll,
  generatePayslip,
};
