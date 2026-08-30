const Attendance = require("../models/Attendance");
const User = require("../models/User");

const {
  isWorkingDay,
  isClockInOpen,
  isClockOutClosed,
  getAttendanceDate
} = require("../utils/attendanceHelpers");

const {getConfirmedHoliday} = require("./attendanceService");

/**
 * Builds the attendance policies and currently available actions
 * for one employee.
 *
 * The returned data allows the frontend to display attendance rules
 * and control the clock-in and clock-out buttons.
 *
 */
async function buildAttendanceOptions(employeeId, settings, currentTime = new Date()){
  // ================= Employee validation =================

  const employee = await User.findById(employeeId).select("_id status");

  if (!employee) {
    const error = new Error("Employee not found.");
    error.statusCode = 404;
    throw error;
  }

  // ================= Current attendance date =================

  // Convert the current time to the company's attendance date:
  const attendanceDate = getAttendanceDate(currentTime, settings);

  // ================= Day classification =================

  const confirmedHoliday = await getConfirmedHoliday(currentTime, settings);

  const workingDay = isWorkingDay(currentTime, settings);

  const dayType = confirmedHoliday ? "Holiday" : workingDay ? "Working Day" : "Weekly Off";

  // ================= Today's attendance =================

  const attendance = await Attendance.findOne({
    employee: employeeId,
    date: attendanceDate,
  }).select("date inTime outTime status flags approvalStatus locked");

  // ================= Attendance windows =================

  const clockInWindowOpen = isClockInOpen(currentTime, settings);

  const clockOutWindowClosed = isClockOutClosed(currentTime, settings);

  // ================= Clock-in availability =================

  let canClockIn = true;
  let clockInUnavailableReason = null;

  if (employee.status !== "active") {
    canClockIn = false;
    clockInUnavailableReason = "Only active employees can clock in.";
  } else if (confirmedHoliday) {
    canClockIn = false;
    clockInUnavailableReason = `Clock-in is unavailable on ${confirmedHoliday.name}.`;
  } else if (!workingDay) {
    canClockIn = false;
    clockInUnavailableReason = "Today is not a scheduled working day.";
  } else if (attendance?.status === "On Leave") {
    canClockIn = false;
    clockInUnavailableReason = "You cannot clock in while on approved leave.";
  } else if (attendance?.locked) {
    canClockIn = false;
    clockInUnavailableReason = "Your attendance record is locked.";
  } else if (attendance?.inTime) {
    canClockIn = false;
    clockInUnavailableReason = "You have already clocked in today.";
  } else if (!clockInWindowOpen) {
    canClockIn = false;
    clockInUnavailableReason = "The clock-in period has not opened yet.";
  } else if (clockOutWindowClosed) {
    canClockIn = false;
    clockInUnavailableReason =  "The attendance period has closed for today.";
  }

  // ================= Clock-out availability =================

  let canClockOut = true;
  let clockOutUnavailableReason = null;

  if (employee.status !== "active") {
    canClockOut = false;
    clockOutUnavailableReason = "Only active employees can clock out.";
  } else if (!attendance) {
    canClockOut = false;
    clockOutUnavailableReason = "No attendance record was found for today.";
  } else if (attendance.locked) {
    canClockOut = false;
    clockOutUnavailableReason = "Your attendance record is locked.";
  } else if (!attendance.inTime) {
    canClockOut = false;
    clockOutUnavailableReason = "You must clock in before clocking out.";
  } else if (attendance.outTime) {
    canClockOut = false;
    clockOutUnavailableReason = "You have already clocked out today.";
  } else if (clockOutWindowClosed) {
    canClockOut = false;
    clockOutUnavailableReason = "The clock-out period has closed. Contact HR for correction.";
  }

  // ================= Finalization time =================

  const endTime = settings?.workingHours?.end_time;

  const allowedMinutesAfter = Number(settings?.attendance?.checkout_allowed_minutes_after) || 0;

  let finalizationTime = null;

  if (endTime) {
    const [endHour, endMinute] = endTime.split(":").map(Number);

    // Run one minute after the allowed checkout period:
    const finalizationTotalMinutes =   endHour * 60 +  endMinute + allowedMinutesAfter +  1;

    const finalizationHour =   Math.floor(finalizationTotalMinutes / 60) % 24;

    const finalizationMinute =   finalizationTotalMinutes % 60;

    finalizationTime =   `${String(finalizationHour).padStart(2, "0")}:${String(finalizationMinute).padStart(2, "0")}`;
  }

  // ================= Frontend options =================

  const frontendOptions = {
    current: {
      currentTime,
      attendanceDate,
      timezone: settings?.payrollCalendar?.timezone,
      dayType,
      holiday: confirmedHoliday ? {id: confirmedHoliday._id, name: confirmedHoliday.name} : null
    },

    schedule: {
      startTime: settings?.workingHours?.start_time,
      endTime: settings?.workingHours?.end_time,
      breakStartTime: settings?.workingHours?.break_start_time,
      breakEndTime: settings?.workingHours?.break_end_time,
      companyRestDays: settings?.workingHours?.company_rest_days || [],
      finalizationTime
    },

    restrictions: {
      checkinAllowedMinutesBefore: settings?.attendance?.checkin_allowed_minutes_before,
      checkoutAllowedMinutesAfter: settings?.attendance?.checkout_allowed_minutes_after,
      lateGraceMinutes: settings?.attendance?.late_grace_minutes,
      earlyExitGraceMinutes: settings?.attendance?.early_exit_grace_minutes,
      halfDayHoursThreshold: settings?.attendance?.half_day_hours_threshold,
      absentHoursThreshold: settings?.attendance?.absent_hours_threshold
    },

    attendance,

    actions: {
      clockIn: {
        allowed: canClockIn,
        reason: clockInUnavailableReason
      },

      clockOut: {
        allowed: canClockOut,
        reason: clockOutUnavailableReason
      },
    },
  };

  return frontendOptions;
}


module.exports = {
  buildAttendanceOptions,
};