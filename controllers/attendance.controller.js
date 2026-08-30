const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const User = require("../models/User");

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getDayName(date) {
  return DAYS_OF_WEEK[new Date(date).getDay()];
}

function timeStringToMinutes(timeString) {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

function getMinutesSinceMidnight(date) {
  const d = new Date(date);
  return d.getHours() * 60 + d.getMinutes();
}

function calculateWorkedMinutes(inTime, outTime) {
  if (!inTime || !outTime) return 0;
  const difference = new Date(outTime).getTime() - new Date(inTime).getTime();
  return Math.max(0, Math.floor(difference / 60000));
}

function calculateScheduledMinutes(user, settings) {
  const startTime = user?.workSchedule?.startTime;
  const endTime = user?.workSchedule?.endTime;

  if (startTime && endTime) {
    const start = timeStringToMinutes(startTime);
    const end = timeStringToMinutes(endTime);
    if (start !== null && end !== null && end > start) {
      return end - start;
    }
  }

  const dailyHours = Number(settings?.workingHours?.normal_daily) || 8;
  return Math.round(dailyHours * 60);
}

function calculateOvertimeMinutes(workedMinutes, scheduledMinutes) {
  if (!workedMinutes || !scheduledMinutes) return 0;
  return Math.max(0, workedMinutes - scheduledMinutes);
}

function isWorkingDay(user, date) {
  const dayName = getDayName(date);
  return user?.workSchedule?.workingDays?.includes(dayName);
}

function evaluateLate(inTime, user, settings) {
  if (!inTime || !user?.workSchedule?.startTime) return false;

  const scheduledStart = timeStringToMinutes(user.workSchedule.startTime);
  if (scheduledStart === null) return false;

  const actualStart = getMinutesSinceMidnight(inTime);
  const graceMinutes = Number(settings?.attendance?.late_grace_minutes) || 0;

  return actualStart > scheduledStart + graceMinutes;
}

function evaluateAttendanceStatus(workedMinutes, settings) {
  const attendanceSettings = settings?.attendance || {};
  const halfDayHours = Number(attendanceSettings.half_day_hours_threshold) || 0;
  const absentHours = Number(attendanceSettings.absent_hours_threshold) || 0;

  const halfDayThreshold = halfDayHours * 60;
  const absentThreshold = absentHours * 60;

  if (absentThreshold > 0 && workedMinutes < absentThreshold) {
    return "Absent";
  }
  if (halfDayThreshold > 0 && workedMinutes < halfDayThreshold) {
    return "Half Day";
  }
  return "Present";
}

async function getMonthlyAttendanceLogs(req, res) {
  try {
    const { year, month, employeeId, department } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        message: "Year and month query parameters are required.",
      });
    }

    const parsedYear = Number(year);
    const parsedMonth = Number(month);

    if (
      !Number.isInteger(parsedYear) ||
      !Number.isInteger(parsedMonth) ||
      parsedMonth < 1 ||
      parsedMonth > 12
    ) {
      return res.status(400).json({
        message: "Invalid year or month.",
      });
    }

    if (employeeId && !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid employee ID." });
    }

    if (department && !mongoose.Types.ObjectId.isValid(department)) {
      return res.status(400).json({ message: "Invalid department ID." });
    }

    const startDate = new Date(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999);

    const query = {
      date: { $gte: startDate, $lte: endDate },
    };

    if (employeeId) {
      query.employee = employeeId;
    }

    const logs = await Attendance.find(query)
      .populate(
        "employee",
        "fullName employeeCode workEmail department workSchedule",
      )
      .populate("employee.department", "name")
      .sort({ date: 1 });

    let filteredLogs = logs;
    if (department) {
      filteredLogs = logs.filter(
        (log) => log.employee?.department?._id?.toString() === department,
      );
    }

    return res.status(200).json(filteredLogs);
  } catch (error) {
    console.error("getMonthlyAttendanceLogs:", error);
    return res.status(500).json({
      message: "Error fetching monthly attendance logs.",
    });
  }
}

async function clockIn(req, res) {
  try {
    // 1. Initialize timestamp and standard midnight Date object first
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const employeeId = req.user._id;
    const io = req.app.get("io");

    const user = await User.findById(employeeId);

    if (!user) {
      return res.status(404).json({ message: "Employee not found." });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        message: "Only active employees can clock in.",
      });
    }

    if (!isWorkingDay(user, now)) {
      return res.status(400).json({
        message: "Today is not a scheduled working day.",
      });
    }

    let attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });

    if (attendance?.status === "On Leave") {
      return res.status(409).json({
        message: "You cannot clock in while you are on approved leave.",
      });
    }

    if (attendance) {
      if (attendance.locked) {
        return res.status(403).json({
          message: "Attendance record is locked.",
        });
      }

      if (attendance.inTime) {
        return res.status(400).json({
          message: "You have already clocked in today.",
        });
      }

      attendance.inTime = now;
      attendance.status = "Present";

      const isLate = evaluateLate(now, user, req.settings);
      attendance.flags = isLate ? ["late"] : [];

      await attendance.save();
    } else {
      const isLate = evaluateLate(now, user, req.settings);

      attendance = await Attendance.create({
        employee: employeeId,
        date: today,
        inTime: now,
        outTime: null,
        workedMinutes: 0,
        overtimeMinutes: 0,
        overtimeApproved: false,
        status: "Present",
        flags: isLate ? ["late"] : [],
        approvalStatus: "pending",
        locked: false,
      });
    }

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate("employee", "fullName employeeCode workEmail department")
      .populate("employee.department", "name");

    if (io) {
      io.emit("attendance:clockedIn", {
        employeeId,
        attendance: populatedAttendance,
      });
    }

    return res.status(200).json({
      message: "Clocked in successfully.",
      attendance: populatedAttendance,
    });
  } catch (error) {
    console.error("clockIn:", error);
    return res.status(500).json({
      message: "Error clocking in.",
      error: error.message,
    });
  }
}

async function clockOut(req, res) {
  try {
    const employeeId = req.user._id;
    const io = req.app.get("io");

    const user = await User.findById(employeeId);

    if (!user) {
      return res.status(404).json({ message: "Employee not found." });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        message: "Only active employees can clock out.",
      });
    }

    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });

    if (!attendance) {
      return res.status(400).json({
        message: "No attendance record found for today.",
      });
    }

    if (attendance.locked) {
      return res.status(403).json({
        message: "Attendance record is locked.",
      });
    }

    if (!attendance.inTime) {
      return res.status(400).json({
        message: "You have not clocked in yet.",
      });
    }

    if (attendance.outTime) {
      return res.status(400).json({
        message: "You have already clocked out today.",
      });
    }

    attendance.outTime = now;

    attendance.workedMinutes = calculateWorkedMinutes(
      attendance.inTime,
      attendance.outTime,
    );

    const scheduledMinutes = calculateScheduledMinutes(user, req.settings);

    attendance.overtimeMinutes = calculateOvertimeMinutes(
      attendance.workedMinutes,
      scheduledMinutes,
    );

    attendance.overtimeApproved = false;

    attendance.status = evaluateAttendanceStatus(
      attendance.workedMinutes,
      req.settings,
    );

    attendance.flags = attendance.flags.filter(
      (flag) => flag !== "missingTimeOut",
    );

    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate("employee", "fullName employeeCode workEmail department")
      .populate("employee.department", "name");

    if (io) {
      io.emit("attendance:clockedOut", {
        employeeId,
        attendance: populatedAttendance,
      });
    }

    return res.status(200).json({
      message: "Clocked out successfully.",
      attendance: populatedAttendance,
    });
  } catch (error) {
    console.error("clockOut:", error);
    return res.status(500).json({
      message: "Error clocking out.",
      error: error.message,
    });
  }
}

async function getAttendanceLogs(req, res) {
  try {
    const { startDate, endDate, employeeId } = req.query;
    const query = {};

    if (req.user.role === "HR Admin") {
      if (employeeId) {
        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
          return res.status(400).json({ message: "Invalid employee ID." });
        }
        query.employee = employeeId;
      }
    } else {
      query.employee = req.user._id;
    }

    if (startDate || endDate) {
      query.date = {};

      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`);
        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({ message: "Invalid start date." });
        }
        query.date.$gte = start;
      }

      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999`);
        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({ message: "Invalid end date." });
        }
        query.date.$lte = end;
      }
    }

    const logs = await Attendance.find(query)
      .populate("employee", "fullName employeeCode workEmail department")
      .populate("employee.department", "name")
      .sort({ date: -1 });

    return res.status(200).json(logs);
  } catch (error) {
    console.error("getAttendanceLogs:", error);
    return res.status(500).json({
      message: "Error fetching attendance logs.",
    });
  }
}

async function updateAttendanceStatus(req, res) {
  try {
    const { id } = req.params;
    const {
      status,
      inTime,
      outTime,
      overtimeMinutes,
      overtimeApproved,
      locked,
      flags,
      approvalStatus,
    } = req.body;

    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({
        message: "Attendance record not found.",
      });
    }

    if (attendance.locked) {
      return res.status(403).json({
        message: "This attendance record is locked.",
      });
    }

    if (status !== undefined) {
      attendance.status = status;
    }

    if (inTime !== undefined) {
      attendance.inTime = inTime || null;
    }

    if (outTime !== undefined) {
      attendance.outTime = outTime || null;
    }

    if (attendance.inTime && attendance.outTime) {
      attendance.workedMinutes = calculateWorkedMinutes(
        attendance.inTime,
        attendance.outTime,
      );
    } else {
      attendance.workedMinutes = 0;
    }

    if (overtimeMinutes !== undefined) {
      const parsedOvertime = Number(overtimeMinutes);
      if (!Number.isFinite(parsedOvertime) || parsedOvertime < 0) {
        return res.status(400).json({
          message: "Overtime minutes must be a non-negative number.",
        });
      }
      attendance.overtimeMinutes = parsedOvertime;
    }

    if (overtimeApproved !== undefined) {
      attendance.overtimeApproved = Boolean(overtimeApproved);
    }

    if (locked !== undefined) {
      attendance.locked = Boolean(locked);
    }

    if (flags !== undefined) {
      attendance.flags = flags;
    }

    if (approvalStatus !== undefined) {
      attendance.approvalStatus = approvalStatus;
    }

    await attendance.save();

    const updatedAttendance = await Attendance.findById(attendance._id)
      .populate("employee", "fullName employeeCode workEmail department")
      .populate("employee.department", "name");

    return res.status(200).json({
      message: "Attendance updated successfully.",
      attendance: updatedAttendance,
    });
  } catch (error) {
    console.error("updateAttendanceStatus:", error);
    return res.status(500).json({
      message: "Error updating attendance.",
      error: error.message,
    });
  }
}

module.exports = {
  clockIn,
  clockOut,
  getAttendanceLogs,
  getMonthlyAttendanceLogs,
  updateAttendanceStatus,
  calculateWorkedMinutes,
  calculateOvertimeMinutes,
};
