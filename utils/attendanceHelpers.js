// ================= Time string conversion =================

function timeStringToMinutes(timeString){
  if(!timeString){
    return null;
  }

  const [hours, minutes] = timeString.split(':').map(Number);

  const mins = hours * 60 + minutes;

  return mins;
}

// ================= Attendance date normalization =================

function getAttendanceDate(date, settings) {
  // Get the calendar date in the configured company timezone:
  const timeZone = getTimezone(settings);
  const dateToBeFormatted = new Date(date);

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, 
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(dateToBeFormatted);

  const year = Number(parts.find((part) => part.type === 'year').value);

  const month = Number(parts.find((part) => part.type === 'month').value);

  const day = Number(parts.find((part) => part.type === 'day').value);

  // Store the attendance day as UTC midnight:
  const attendanceDate = new Date(Date.UTC(year, month - 1, day));
  return attendanceDate;
}

// ================= Timezone handling =================

function getTimezone(settings){
  const timezone = settings?.payrollCalendar?.timezone;

  if(!timezone){
    throw new Error('Attendance timezone is required.');
  }

  return timezone;
}

// ================= Day classification =================

function getDayName(date, settings){

  // Get the weekday using the configured company timezone:
  const timeZone = getTimezone(settings);
  const dateToBeFormatted = new Date(date);
  const dayName = new Intl.DateTimeFormat('en-US', {timeZone, weekday: 'long'}).format(dateToBeFormatted);

  return dayName;
}

// ================= Time conversion =================

function getMinutesSinceMidnight(date, settings){

  // Convert the date to hours and minutes in the company timezone:
  const timeZone = getTimezone(settings);
  const dateToBeFormatted = new Date(date);

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(dateToBeFormatted);

  const hour = Number(parts.find((part) => part.type === 'hour').value);
  const minute = Number(parts.find((part) => part.type === 'minute').value);


  const minutesSinceMidnight = hour * 60 + minute;

  return minutesSinceMidnight;
}

// ================= Worked-time calculation =================

function calculateWorkedMinutes(inTime, outTime, settings){

  if(!inTime || !outTime){
    return 0;
  }
  
  // Calculate the total duration between clock-in and clock-out:
  const difference = new Date(outTime).getTime() - new Date(inTime).getTime();
  
  const totalMinutes = Math.max(0, Math.floor(difference / 60000));
  
  // Get the configured company break period:
  const breakStartTime = settings?.workingHours?.break_start_time;
  const breakEndTime = settings?.workingHours?.break_end_time;

  const breakStart = timeStringToMinutes(breakStartTime);
  const breakEnd = timeStringToMinutes(breakEndTime);


  if(breakStart === null || breakEnd === null){
    return totalMinutes;
  }

  const clockInMinutes = getMinutesSinceMidnight(inTime, settings);
  const clockOutMinutes = getMinutesSinceMidnight(outTime, settings);

  // Calculate how much of the break overlaps the employee's work period:
  const breakOverlap = Math.max(0, Math.min(clockOutMinutes, breakEnd) - Math.max(clockInMinutes, breakStart));

  return Math.max(0, totalMinutes - breakOverlap);
}

// ================= Scheduled-hours calculation =================

function calculateScheduledMinutes(settings){
  const dailyHours =  Number(settings?.workingHours?.normal_daily) || 8;
  const scheduledMinutes = Math.round(dailyHours * 60);

  return scheduledMinutes;
}

// ================= Overtime calculation =================

function calculateOvertimeMinutes(workedMinutes, scheduledMinutes){
  if(!workedMinutes || !scheduledMinutes){
    return 0;
  }
  const overtimeMinutes = Math.max(0, workedMinutes - scheduledMinutes);

  return overtimeMinutes;
}

// ================= Working-day validation =================

function isWorkingDay(date, settings){
  const dayName = getDayName(date, settings);

  const restDays = settings?.workingHours?.company_rest_days || [];

  return !restDays.includes(dayName);
}

// ================= Late-arrival evaluation =================

function evaluateLate(inTime, settings){
  const startTime = settings?.workingHours?.start_time;

  if(!inTime || !startTime){
    return false;
  }

  const scheduledStart = timeStringToMinutes(startTime);
  const actualStart = getMinutesSinceMidnight(inTime, settings);

  const graceMinutes = Number(settings?.attendance?.late_grace_minutes) || 0;

  const isLate = actualStart > scheduledStart + graceMinutes;

  return isLate;
}

// ================= Clock-in availability =================

function isClockInOpen(date, settings){
  const startTime = settings?.workingHours?.start_time;

  if(!startTime){
    return false;
  }

  const scheduledStart = timeStringToMinutes(startTime);

  const allowedMinutesBefore = Number(settings?.attendance?.checkin_allowed_minutes_before) || 0;

  const clockInOpeningTime = scheduledStart - allowedMinutesBefore;

  const minutesSinceMidnight = getMinutesSinceMidnight(date, settings);
  const isOpen = minutesSinceMidnight >= clockInOpeningTime;

  return isOpen;
}

// ================= Attendance status evaluation =================

function evaluateAttendanceStatus(workedMinutes, settings){
  const attendanceSettings = settings?.attendance || {};

  const halfDayHours = Number(attendanceSettings.half_day_hours_threshold) || 0;

  const absentHours = Number(attendanceSettings.absent_hours_threshold) || 0;

  const halfDayThreshold = halfDayHours * 60;
  const absentThreshold = absentHours * 60;

  if(absentThreshold > 0 && workedMinutes < absentThreshold){
    return 'Absent';
  }

  if(halfDayThreshold > 0 && workedMinutes < halfDayThreshold){
    return 'Half Day';
  }

  return 'Present';
}

// ================= Early-exit evaluation =================

function evaluateEarlyExit(outTime, settings){
  const endTime = settings?.workingHours?.end_time;

  if(!outTime || !endTime){
    return false;
  }

  const scheduledEnd = timeStringToMinutes(endTime);
  const actualEnd = getMinutesSinceMidnight(outTime, settings);

  const graceMinutes = Number(settings?.attendance?.early_exit_grace_minutes) || 0;
  const isEarlyExit = actualEnd < scheduledEnd - graceMinutes;

  return isEarlyExit;
}

// ================= Clock-out availability =================

function isClockOutClosed(date, settings){
  const endTime = settings?.workingHours?.end_time;

  if(!endTime){
    return true;
  }

  const scheduledEnd = timeStringToMinutes(endTime);

  const allowedMinutesAfter = Number(settings?.attendance?.checkout_allowed_minutes_after) || 0;

  const isClosed = (getMinutesSinceMidnight(date, settings) > scheduledEnd + allowedMinutesAfter);

  return isClosed;
}

module.exports = {
  calculateWorkedMinutes,
  calculateScheduledMinutes,
  calculateOvertimeMinutes,
  isWorkingDay,
  evaluateLate,
  isClockInOpen,
  evaluateAttendanceStatus,
  evaluateEarlyExit,
  isClockOutClosed,
  getAttendanceDate
};