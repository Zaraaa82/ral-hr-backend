const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const User = require("../models/User");

const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");

const {
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
} = require("../utils/attendanceHelpers");

const {buildAttendanceOptions} = require("../services/attendanceOptionsService");

const {getConfirmedHoliday} = require('../services/attendanceService');

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

    // ================= Monthly date boundaries =================

    // Start at UTC midnight on the first day of the requested month:
    const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1));

    // Use the first day of the following month as an exclusive boundary:
    const nextMonthStart = new Date(Date.UTC(parsedYear, parsedMonth, 1));

    const query = {
      date: {
        $gte: startDate,
        $lt: nextMonthStart,
      },
    };

    if (employeeId) {
      query.employee = employeeId;
    }

    const logs = await Attendance.find(query)
      .populate(
        "employee",
        "fullName employeeCode workEmail department",
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

    const now = new Date();

    const confirmedHoliday = await getConfirmedHoliday(now, req.settings);

    if (confirmedHoliday) {
      return res.status(400).json({message: `Clock-in is unavailable on ${confirmedHoliday.name}.`});
    }

    if (!isWorkingDay(now, req.settings)) {
      return res.status(400).json({
        message: "Today is not a scheduled working day.",
      });
    }

    const today = getAttendanceDate(now, req.settings);

    let attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });

    // ================= Original attendance values =================

    // Remember whether the daily record was created automatically:
    const attendanceAlreadyExists = Boolean(attendance);

    // Store its values before adding the clock-in:
    const oldAttendanceValues = attendanceAlreadyExists
      ? {
          inTime: attendance.inTime,
          outTime: attendance.outTime,
          status: attendance.status,
          flags: [...(attendance.flags || [])],
          approvalStatus: attendance.approvalStatus
        }
      : null;

    if (attendance?.status === "On Leave") {
      return res.status(409).json({message: "You cannot clock in while you are on approved leave." });
    }

    if (!isClockInOpen(now, req.settings)) {
      return res.status(400).json({
        message: "The clock-in period has not opened yet.",
      });
    }

    if (isClockOutClosed(now, req.settings)) {
      return res.status(400).json({message: "The attendance period has closed for today."});
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

      const isLate = evaluateLate(now, req.settings);

      attendance.flags = isLate ? ["late"] : [];

      await attendance.save();

      // ================= Audit logging =================

      const auditLogData = {
        entityType: "Attendance",
        recordId: attendance._id,
        changedBy: req.user._id,
        action: attendanceAlreadyExists ? "update" : "create",

        new_value: {
          date: attendance.date,
          inTime: attendance.inTime,
          outTime: attendance.outTime,
          status: attendance.status,
          flags: attendance.flags,
          approvalStatus: attendance.approvalStatus
        }
      };

      // old_value is not required when creating a record:
      if (attendanceAlreadyExists) {
        auditLogData.old_value = oldAttendanceValues;
      }

      await AuditLog.create(auditLogData);

      // ================= Late-arrival notification =================

      if ((attendance.flags || []).includes("late")) {
        const employee = await User.findById(req.user._id).select("fullName manager");

        if (employee?.manager) {
          await Notification.create({
            recipient: employee.manager,
            type: "attendance_late",
            relatedType: "Attendance",
            relatedRecord: attendance._id,
            message: `${employee.fullName} clocked in late.`
          });
        }
      }

    } else {
      const isLate = evaluateLate(now, req.settings);

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

      await AuditLog.create({
        entityType: "Attendance",
        recordId: attendance._id,
        changedBy: req.user._id,
        action: "create",
        new_value: {
          date: attendance.date,
          inTime: attendance.inTime,
          outTime: attendance.outTime,
          status: attendance.status,
          flags: attendance.flags,
          approvalStatus: attendance.approvalStatus
        },
      });

      if (attendance.flags.includes("late") && user.manager) {
        await Notification.create({
          recipient: user.manager,
          type: "attendance_late",
          relatedType: "Attendance",
          relatedRecord: attendance._id,
          message: `${user.fullName} clocked in late.`
        });
      }
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

    if (isClockOutClosed(now, req.settings)) {
      return res.status(400).json({message: "The clock-out period has closed. Contact HR for correction."});
    }

    const today = getAttendanceDate(now, req.settings);

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });

    if (!attendance) {
      return res.status(400).json({
        message: "No attendance record found for today.",
      });
    }

    // ================= Original attendance values =================

    const oldAttendanceValues = {
      inTime: attendance.inTime,
      outTime: attendance.outTime,
      status: attendance.status,
      workedMinutes: attendance.workedMinutes,
      overtimeMinutes: attendance.overtimeMinutes,
      flags: [...(attendance.flags || [])],
      approvalStatus: attendance.approvalStatus
    };

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
      req.settings
    );

    // Calculate scheduled time
    const scheduledMinutes =  calculateScheduledMinutes(req.settings);

    attendance.overtimeMinutes = calculateOvertimeMinutes(
      attendance.workedMinutes,
      scheduledMinutes,
    );

    attendance.overtimeApproved = false;

    attendance.status = evaluateAttendanceStatus(
      attendance.workedMinutes,
      req.settings,
    );

    // Employee has successfully checked out
    const updatedFlags = new Set(attendance.flags);

    updatedFlags.delete("missingTimeOut");
    updatedFlags.delete("earlyExit");
    updatedFlags.delete("shortHours");

    if(evaluateEarlyExit(attendance.outTime, req.settings)){
      updatedFlags.add("earlyExit");
    }

    if (attendance.status === "Present" && attendance.workedMinutes < scheduledMinutes){
      updatedFlags.add("shortHours");
    }

    attendance.flags = [...updatedFlags];

    await attendance.save();


    // ================= Audit logging =================

    await AuditLog.create({
      entityType: "Attendance",
      recordId: attendance._id,
      changedBy: req.user._id,
      action: "update",

      old_value: oldAttendanceValues,

      new_value: {
        inTime: attendance.inTime,
        outTime: attendance.outTime,
        status: attendance.status,
        workedMinutes: attendance.workedMinutes,
        overtimeMinutes: attendance.overtimeMinutes,
        flags: attendance.flags,
        approvalStatus: attendance.approvalStatus
      }
    });

    // ================= Attendance exception notification =================

    // Only consider flags added during this clock-out:
    const newlyAddedFlags = (attendance.flags || []).filter((flag) => !oldAttendanceValues.flags.includes(flag));

    const managerReviewFlags = newlyAddedFlags.filter((flag) => flag === "earlyExit" || flag === "shortHours");

    if (managerReviewFlags.length > 0) {
      const employee = await User.findById(req.user._id).select("fullName manager");

      if (employee?.manager) {
        const readableFlags = managerReviewFlags.map((flag) => flag === "earlyExit" ? "early exit" : "short hours").join(" and ");

        await Notification.create({
          recipient: employee.manager,
          type: "attendance_exception",
          relatedType: "Attendance",
          relatedRecord: attendance._id,
          message: `${employee.fullName}'s attendance was flagged for ${readableFlags}.`
        });
      }
    }

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
        // Start at UTC midnight on the selected date:
        const start = new Date(`${startDate}T00:00:00.000Z`);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({ message: "Invalid start date." });
        }
        query.date.$gte = start;
      }

      if (endDate) {
        const nextDayStart = new Date(`${endDate}T00:00:00.000Z`);

        if (Number.isNaN(nextDayStart.getTime())) {
          return res.status(400).json({
            message: "Invalid end date.",
          });
        }
        nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);

        query.date.$lt = nextDayStart;
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
      inTime,
      outTime,
      status,
      overtimeMinutes,
      overtimeApproved,
      locked,
      flags,
      approvalStatus,
      reason
    } = req.body;

    if(typeof reason !== "string" || !reason.trim() || reason.trim().length > 500){
      return res.status(400).json({message: "A correction reason of no more than 500 characters is required."});
    }

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

    // ================= Original attendance values =================

    const oldAttendanceValues = {
      inTime: attendance.inTime,
      outTime: attendance.outTime,
      status: attendance.status,
      workedMinutes: attendance.workedMinutes,
      overtimeMinutes: attendance.overtimeMinutes,
      flags: [...(attendance.flags || [])],
      approvalStatus: attendance.approvalStatus,
    };

    const timesChanged = inTime !== undefined || outTime !== undefined;


    if (inTime !== undefined) {
      attendance.inTime = inTime || null;
    }

    if (outTime !== undefined) {
      attendance.outTime = outTime || null;
    }

    

    // Recalculate worked minutes
    if (attendance.inTime && attendance.outTime) {
      attendance.workedMinutes = calculateWorkedMinutes(
        attendance.inTime,
        attendance.outTime,
        req.settings
      );
    } else {
      attendance.workedMinutes = 0;
    }
    if (timesChanged) {
      const scheduledMinutes = calculateScheduledMinutes(req.settings);
      const updatedFlags = new Set(attendance.flags);

      updatedFlags.delete("missingTimeOut");
      updatedFlags.delete("earlyExit");
      updatedFlags.delete("shortHours");

      if(attendance.inTime && attendance.outTime){
        attendance.status = evaluateAttendanceStatus( attendance.workedMinutes, req.settings);

        attendance.overtimeMinutes = calculateOvertimeMinutes(attendance.workedMinutes, scheduledMinutes);

        attendance.overtimeApproved = false;

        if(evaluateEarlyExit(attendance.outTime, req.settings)){
          updatedFlags.add("earlyExit");
        }

        if(attendance.status === "Present" && attendance.workedMinutes < scheduledMinutes){
          updatedFlags.add("shortHours");
        }

      } else {

        attendance.overtimeMinutes = 0;
        attendance.overtimeApproved = false;

        if(attendance.inTime && !attendance.outTime){
          updatedFlags.add("missingTimeOut");
        }else{
          attendance.status = "Absent";
        }

      }

      attendance.flags = [...updatedFlags];
    }

    if(status !== undefined){
      attendance.status = status;
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
      if (typeof overtimeApproved !== "boolean") {
        return res.status(400).json({message: "Overtime approval must be true or false."});
      }

      attendance.overtimeApproved = overtimeApproved;
    }

    if (locked !== undefined) {
      if (typeof locked !== "boolean") {
        return res.status(400).json({message: "Locked must be true or false."});
      }

      attendance.locked = locked;
    }

    if (flags !== undefined) {
      attendance.flags = flags;
    }

    if (approvalStatus !== undefined) {
      attendance.approvalStatus = approvalStatus;
    }

    await attendance.save();


    // ================= Audit logging =================

    await AuditLog.create({
      entityType: "Attendance",
      recordId: attendance._id,
      changedBy: req.user._id,
      action: "correct",

      old_value: oldAttendanceValues,

      new_value: {
        inTime: attendance.inTime,
        outTime: attendance.outTime,
        status: attendance.status,
        workedMinutes: attendance.workedMinutes,
        overtimeMinutes: attendance.overtimeMinutes,
        flags: attendance.flags,
        approvalStatus: attendance.approvalStatus
      },

      reason: reason.trim()
    });

    // ================= Employee and manager notifications =================

    const employee = await User.findById(attendance.employee).select("_id fullName manager");

    const notifications = [
      {
        recipient: employee._id,
        type: "attendance_corrected",
        relatedType: "Attendance",
        relatedRecord: attendance._id,
        message: "Your attendance record was corrected by HR."
      },
    ];

    if (employee.manager) {
      notifications.push({
        recipient: employee.manager,
        type: "attendance_corrected",
        relatedType: "Attendance",
        relatedRecord: attendance._id,
        message: `${employee.fullName}'s attendance record was corrected by HR.`
      });
    }

    await Notification.insertMany(notifications);

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

async function requestAttendanceCorrection(req, res){
  try {
    const { id } = req.params;

    const {requestedInTime, requestedOutTime, requestedStatus, reason} = req.body;

    // ================= Request validation =================

    const hasRequestedChange = requestedInTime !== undefined || requestedOutTime !== undefined || requestedStatus !== undefined;

    const allowedStatuses = ['Present', 'Absent', 'Half Day', 'On Leave', 'Holiday', 'Weekly Off'];

    if(requestedStatus !== undefined && !allowedStatuses.includes(requestedStatus)){
      return res.status(400).json({message: 'Invalid requested attendance status.'});
    }


    if(!hasRequestedChange){
      return res.status(400).json({ message: 'At least one attendance change is required.'});
    }

    if(typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500){
      return res.status(400).json({message: 'A reason of no more than 500 characters is required.'});
    }

    // ================= Attendance validation =================

    const attendance = await Attendance.findById(id);

    if(!attendance){
      return res.status(404).json({message: 'Attendance record not found.'});
    }

    if(attendance.locked){
      return res.status(403).json({message: 'A correction cannot be requested for a locked record.'});
    }

    // ================= Manager authorization =================

    const employee = await User.findById(attendance.employee).select('manager fullName employeeCode');

    if(!employee){
      return res.status(404).json({message: 'Employee not found.'});
    }

    const isEmployeeManager = employee.manager?.toString() ===  req.user._id.toString();

    if(!isEmployeeManager){
      return res.status(403).json({message: 'You can only request corrections for your employees.'});
    }

    // ================= Pending-request validation =================

    const hasPendingRequest = attendance.correctionRequests.some((request) => request.status === 'pending');

    if(hasPendingRequest){
      return res.status(409).json({message: 'This attendance record already has a pending correction request.'});
    }

    // ================= Requested-time validation =================

    let parsedInTime;
    let parsedOutTime;

    if(requestedInTime !== undefined){
      parsedInTime = requestedInTime === null ? null : new Date(requestedInTime);

      if(parsedInTime !== null && Number.isNaN(parsedInTime.getTime())){
        return res.status(400).json({message: 'Invalid requested clock-in time.'});
      }
    }

    if(requestedOutTime !== undefined){
      parsedOutTime = requestedOutTime === null ? null : new Date(requestedOutTime);

      if(parsedOutTime !== null && Number.isNaN(parsedOutTime.getTime())){
        return res.status(400).json({message: 'Invalid requested clock-out time.'});
      }
    }

    const proposedInTime = requestedInTime !== undefined ? parsedInTime : attendance.inTime;

    const proposedOutTime = requestedOutTime !== undefined ? parsedOutTime : attendance.outTime;

    if(!proposedInTime && proposedOutTime){
      return res.status(400).json({message: 'A clock-in time is required when requesting a clock-out time.'});
    }

    if(proposedInTime && proposedOutTime && proposedOutTime < proposedInTime){
      return res.status(400).json({ message: 'Requested clock-out cannot be earlier than clock-in.'});
    }

    // ================= Correction request creation =================

    attendance.correctionRequests.push({
      requestedBy: req.user._id,
      requestedInTime: parsedInTime,
      requestedOutTime: parsedOutTime,
      requestedStatus,
      reason: reason.trim(),
    });

    await attendance.save();

    const correctionRequest = attendance.correctionRequests[attendance.correctionRequests.length - 1];

    // ================= Audit logging =================

    // Record the manager's correction request:
    await AuditLog.create({
      entityType: "Attendance",
      recordId: attendance._id,
      changedBy: req.user._id,
      action: "request",

      old_value: {
        inTime: attendance.inTime,
        outTime: attendance.outTime,
        status: attendance.status,
      },

      new_value: {
        correctionRequestId: correctionRequest._id,
        requestedInTime: correctionRequest.requestedInTime,
        requestedOutTime: correctionRequest.requestedOutTime,
        requestedStatus: correctionRequest.requestedStatus,
        reason: correctionRequest.reason,
        status: correctionRequest.status,
      },
    });

    // ================= HR notifications =================

    // Notify every active HR Admin that a correction requires review:
    const hrAdmins = await User.find({role: "HR Admin", status: "active"}).select("_id");

    if (hrAdmins.length > 0) {
      const notifications = hrAdmins.map((hrAdmin) => ({
        recipient: hrAdmin._id,
        type: "attendance_correction_requested",
        relatedType: "Attendance",
        relatedRecord: attendance._id,
        message: `A correction was requested for ${employee.fullName}'s  attendance and requires HR review.`
      }));

      await Notification.insertMany(notifications);
    }

    return res.status(201).json({message: 'Attendance correction requested successfully.', correctionRequest});

  } catch (error){
    console.error('requestAttendanceCorrection:', error);

    return res.status(500).json({message: 'Error requesting attendance correction.', error: error.message});
  }
}


async function applyAttendanceCorrection(req, res){
  try {
    const {attendanceId, correctionId} = req.params;
    const {actionNote} = req.body;

    // ================= ID validation =================

    if(
      !mongoose.Types.ObjectId.isValid(attendanceId) ||
      !mongoose.Types.ObjectId.isValid(correctionId)
    ){
      return res.status(400).json({message: 'Invalid attendance or correction request ID.'});
    }

    // ================= Attendance validation =================

    const attendance = await Attendance.findById(attendanceId);

    if(!attendance){
      return res.status(404).json({message: 'Attendance record not found.'});
    }

    if(attendance.locked){
      return res.status(403).json({message: 'A locked attendance record cannot be corrected.'});
    }

    // ================= Correction-request validation =================

    const correctionRequest = attendance.correctionRequests.id(correctionId);

    if(!correctionRequest){
      return res.status(404).json({message: 'Correction request not found.'});
    }

    if(correctionRequest.status !== 'pending'){
      return res.status(409).json({message: 'This correction request has already been actioned.'});
    }

    // ================= Original attendance values =================

    // Store the values before applying the requested correction:
    const oldAttendanceValues = {
      inTime: attendance.inTime,
      outTime: attendance.outTime,
      status: attendance.status,
      workedMinutes: attendance.workedMinutes,
      overtimeMinutes: attendance.overtimeMinutes,
      flags: [...(attendance.flags || [])],
      approvalStatus: attendance.approvalStatus
    };

    // ================= Apply requested values =================

    if(correctionRequest.requestedInTime !== undefined){
      attendance.inTime = correctionRequest.requestedInTime;
    }

    if(correctionRequest.requestedOutTime !== undefined){
      attendance.outTime = correctionRequest.requestedOutTime;
    }

    if(attendance.outTime && !attendance.inTime){
      return res.status(400).json({message: 'Clock-out cannot exist without a clock-in time.'});
    }

    if(attendance.inTime && attendance.outTime && attendance.outTime < attendance.inTime){
      return res.status(400).json({message: 'Clock-out cannot be earlier than clock-in.' });
    }

    // ================= Recalculate attendance =================

    const scheduledMinutes = calculateScheduledMinutes(req.settings);

    const updatedFlags = new Set(attendance.flags || []);

    updatedFlags.delete('late');
    updatedFlags.delete('missingTimeOut');
    updatedFlags.delete('earlyExit');
    updatedFlags.delete('shortHours');

    if(attendance.inTime && attendance.outTime){
      attendance.workedMinutes = calculateWorkedMinutes(attendance.inTime, attendance.outTime, req.settings);

      attendance.overtimeMinutes = calculateOvertimeMinutes(attendance.workedMinutes, scheduledMinutes);

      attendance.overtimeApproved = false;

      attendance.status = evaluateAttendanceStatus(attendance.workedMinutes, req.settings);

    } else {
      attendance.workedMinutes = 0;
      attendance.overtimeMinutes = 0;
      attendance.overtimeApproved = false;

      attendance.status = attendance.inTime ? 'Present' : 'Absent';
    }

    // Apply an explicitly requested status after calculations:
    if(correctionRequest.requestedStatus !== undefined){
      attendance.status = correctionRequest.requestedStatus;
    }

    // ================= Recalculate flags =================

    if(attendance.inTime && evaluateLate(attendance.inTime, req.settings)){
      updatedFlags.add('late');
    }

    if(attendance.inTime && !attendance.outTime){
      updatedFlags.add('missingTimeOut');
    }

    if(attendance.outTime && evaluateEarlyExit(attendance.outTime, req.settings)){
      updatedFlags.add('earlyExit');
    }

    if(attendance.inTime && attendance.outTime && attendance.status === 'Present' && attendance.workedMinutes < scheduledMinutes){
      updatedFlags.add('shortHours');
    }

    attendance.flags = [...updatedFlags];

    // ================= Complete correction request =================

    attendance.approvalStatus = 'approved';

    correctionRequest.status = 'applied';
    correctionRequest.actionedBy = req.user._id;
    correctionRequest.actionedAt = new Date();
    correctionRequest.actionNote = typeof actionNote === 'string' && actionNote.trim() ? actionNote.trim() : null;

    await attendance.save();

    // ================= Audit logging =================

    // Record the correction applied by the HR Admin:
    await AuditLog.create({
      entityType: "Attendance",
      recordId: attendance._id,
      changedBy: req.user._id,
      action: "correct",

      old_value: oldAttendanceValues,

      new_value: {
        inTime: attendance.inTime,
        outTime: attendance.outTime,
        status: attendance.status,
        workedMinutes: attendance.workedMinutes,
        overtimeMinutes: attendance.overtimeMinutes,
        flags: attendance.flags,
        approvalStatus: attendance.approvalStatus,
        correctionRequestId: correctionRequest._id,
        correctionStatus: correctionRequest.status
      },

      reason: correctionRequest.reason
    });

    // ================= Employee and manager notifications =================

    const employee = await User.findById(attendance.employee).select("_id fullName manager");

    const notificationRecipients = [
      {
        recipient: employee._id,
        type: "attendance_correction_applied",
        relatedType: "Attendance",
        relatedRecord: attendance._id,
        message: "Your attendance correction has been applied by HR."
      },
    ];

    // Notify the manager who submitted the request:
    if (correctionRequest.requestedBy) {
      notificationRecipients.push({
        recipient: correctionRequest.requestedBy,
        type: "attendance_correction_applied",
        relatedType: "Attendance",
        relatedRecord: attendance._id,
        message: `The attendance correction for ${employee.fullName} has been applied by HR.`
      });
    }

    await Notification.insertMany(notificationRecipients);

    return res.status(200).json({
      message: 'Attendance correction applied successfully.',
      attendance
    });

  } catch (error){
    console.error('applyAttendanceCorrection:', error);

    return res.status(500).json({message: 'Error applying attendance correction.', error: error.message});
  }
}


async function rejectAttendanceCorrection(req, res) {
  try {
    const {attendanceId, correctionId} = req.params;
    const {actionNote} = req.body;

    // ================= ID validation =================

    if(
      !mongoose.Types.ObjectId.isValid(attendanceId) ||
      !mongoose.Types.ObjectId.isValid(correctionId)
    ) {
      return res.status(400).json({message: "Invalid attendance or correction request ID."});
    }

    // ================= Rejection-reason validation =================

    if (typeof actionNote !== "string" || !actionNote.trim() || actionNote.trim().length > 500) {
      return res.status(400).json({ message: "A rejection reason of no more than 500 characters is required."});
    }

    // ================= Correction-request validation =================

    const attendance = await Attendance.findById(attendanceId);

    if (!attendance) {
      return res.status(404).json({message: "Attendance record not found."});
    }

    const correctionRequest = attendance.correctionRequests.id(correctionId);

    if (!correctionRequest) {
      return res.status(404).json({message: "Correction request not found."});
    }

    if (correctionRequest.status !== "pending") {
      return res.status(409).json({message: "This correction request has already been actioned."});
    }

    // ================= Original correction values =================

    const oldCorrectionValues = {
      correctionRequestId: correctionRequest._id,
      status: correctionRequest.status,
      actionedBy: correctionRequest.actionedBy,
      actionedAt: correctionRequest.actionedAt,
      actionNote: correctionRequest.actionNote
    };

    // ================= Reject correction request =================

    correctionRequest.status = "rejected";
    correctionRequest.actionedBy = req.user._id;
    correctionRequest.actionedAt = new Date();
    correctionRequest.actionNote = actionNote.trim();

    await attendance.save();

    // ================= Audit logging =================

    await AuditLog.create({
      entityType: "Attendance",
      recordId: attendance._id,
      changedBy: req.user._id,
      action: "reject",

      old_value: oldCorrectionValues,

      new_value: {
        correctionRequestId: correctionRequest._id,
        status: correctionRequest.status,
        actionedBy: correctionRequest.actionedBy,
        actionedAt: correctionRequest.actionedAt,
        actionNote: correctionRequest.actionNote
      }
    });

    // ================= Manager notification =================
    const reason = correctionRequest.actionNote  ? ` Reason: ${correctionRequest.actionNote}`  : "";

    // Notify the manager who submitted the correction request:
    await Notification.create({
      recipient: correctionRequest.requestedBy,
      type: "attendance_correction_rejected",
      relatedType: "Attendance",
      relatedRecord: attendance._id,
      message: `Your attendance correction request was rejected by HR. ${reason}`
    });

    return res.status(200).json({message: "Attendance correction request rejected.", correctionRequest});

  } catch (error) {
    console.error("rejectAttendanceCorrection:", error);

    return res.status(500).json({
      message: "Error rejecting attendance correction.", error: error.message});
    }
}

async function getTeamAttendanceLogs(req, res) {
  try {
    const { year, month, employeeId } = req.query;

    // ================= Query validation =================

    if (!year || !month) {
      return res.status(400).json({message: 'Year and month query parameters are required.'});
    }

    const parsedYear = Number(year);
    const parsedMonth = Number(month);

    if (
      !Number.isInteger(parsedYear) ||
      !Number.isInteger(parsedMonth) ||
      parsedYear < 2000 ||
      parsedYear > 2100 ||
      parsedMonth < 1 ||
      parsedMonth > 12
    ) {
      return res.status(400).json({message: "Invalid year or month."});
    }

    if (employeeId && !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({message: "Invalid employee ID."});
    }

    // ================= Manager's employees =================

    let teamEmployeeIds;

    if (employeeId) {
      const isTeamEmployee = await User.exists({_id: employeeId, manager: req.user._id});

      if (!isTeamEmployee) {
        return res.status(403).json({message: "You can only view attendance for your employees."});
      }

      teamEmployeeIds = [employeeId];

    } else {
      const teamEmployees = await User.find({manager: req.user._id}).select("_id");

      teamEmployeeIds = teamEmployees.map((employee) => employee._id);
    }

    // ================= Monthly date boundaries =================

    const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1));
    const nextMonthStart = new Date(Date.UTC(parsedYear, parsedMonth, 1));


    // ================= Team attendance records =================

    const logs = await Attendance.find({
      employee: {
        $in: teamEmployeeIds,
      },
      date: {
        $gte: startDate,
        $lt: nextMonthStart,
      },
    })
      .populate(
        "employee",
        "fullName employeeCode workEmail department manager",
      )
      .populate("employee.department", "name")
      .populate(
        "correctionRequests.requestedBy",
        "fullName employeeCode",
      )
      .populate(
        "correctionRequests.actionedBy",
        "fullName employeeCode",
      )
      .sort({ date: -1 });

    return res.status(200).json(logs);
  } catch (error) {
    console.error("getTeamAttendanceLogs:", error);

    return res.status(500).json({
      message: "Error fetching team attendance logs.", error: error.message});
  }
}

// ================= Pending attendance corrections =================

/**
 * Returns attendance correction requests awaiting HR review.
 *
 * Only pending correction requests are included in the response.
 */
const getPendingAttendanceCorrections = async (req, res) => {
  try {
    const attendanceRecords = await Attendance.find({correctionRequests: {$elemMatch: {status: 'pending'}}})
    .populate(
      'employee',
      'fullName employeeCode department',
    ).populate(
      'correctionRequests.requestedBy',
      'fullName employeeCode role',
    ).sort({ 'correctionRequests.requestedAt': 1 }).lean();

    // Remove applied and rejected requests from each attendance record:
    const pendingCorrections = attendanceRecords.map((attendance) => ({
      ...attendance,
      correctionRequests: attendance.correctionRequests.filter((request) => request.status === 'pending')
    }));

    const count = pendingCorrections.reduce((total, attendance) =>  total + attendance.correctionRequests.length, 0);



    return res.status(200).json({count, attendanceRecords: pendingCorrections});
  } catch (error) {
    console.error('Failed to get pending attendance corrections:', error);

    return res.status(500).json({message: 'Failed to get pending attendance corrections.'});
  }
};

// ================= Attendance options =================

async function getAttendanceOptions(req, res) {
  try {
    const options = await buildAttendanceOptions(req.user._id, req.settings);

    return res.status(200).json(options);
  } catch (error) {
    console.error("Failed to get attendance options:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({message: error.message});
    }

    return res.status(500).json({message: "Failed to get attendance options."});
  }
}


module.exports = {
  clockIn,
  clockOut,
  getAttendanceOptions,
  getAttendanceLogs,
  getMonthlyAttendanceLogs,
  getPendingAttendanceCorrections,
  getTeamAttendanceLogs,
  updateAttendanceStatus,
  requestAttendanceCorrection,
  applyAttendanceCorrection,
  rejectAttendanceCorrection
};
