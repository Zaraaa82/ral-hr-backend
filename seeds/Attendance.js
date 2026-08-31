const Attendance = require("../models/Attendance");
const User = require("../models/User");
const LeaveRequest = require("../models/leaveRequest");
const Holiday = require("../models/Holiday");

const getSettings =
  require("../services/settingsService");

const attendanceData =
  require("./Data/attendanceData");

const {
  calculateWorkedMinutes,
  calculateScheduledMinutes,
  calculateOvertimeMinutes,
  evaluateAttendanceStatus,
  evaluateLate,
  evaluateEarlyExit,
  isWorkingDay,
} = require("../utils/attendanceHelpers");


function dateKey(date) {
  return new Date(date)
    .toISOString()
    .slice(0, 10);
}


async function seedAttendance() {
  try {
    await Attendance.deleteMany({});

    const settings = await getSettings();

    const users = await User.find({});

    const userMap = {};

    users.forEach((user) => {
      userMap[user.employeeCode] = user;
    });


    // =====================================================
    // 1. Create On Leave attendance from approved requests
    // =====================================================

    const approvedLeaveRequests =
      await LeaveRequest.find({
        status: "approved",
      });

    const confirmedHolidays =
      await Holiday.find({
        isConfirmed: true,
      });

    const confirmedHolidayDates =
      new Set(
        confirmedHolidays.map((holiday) =>
          dateKey(holiday.date),
        ),
      );


    for (const leaveRequest of approvedLeaveRequests) {
      const currentDate =
        new Date(leaveRequest.startDate);

      currentDate.setUTCHours(0, 0, 0, 0);

      const endDate =
        new Date(leaveRequest.endDate);

      endDate.setUTCHours(0, 0, 0, 0);


      while (currentDate <= endDate) {
        const attendanceDate =
          new Date(currentDate);

        const isRestDay =
          !isWorkingDay(
            attendanceDate,
            settings,
          );

        const isHoliday =
          confirmedHolidayDates.has(
            dateKey(attendanceDate),
          );


        // Same behavior as leave approval:
        // only working days get On Leave records.
        if (!isRestDay && !isHoliday) {
          await Attendance.create({
            employee:
              leaveRequest.employee,

            date: attendanceDate,

            leaveRequest:
              leaveRequest._id,

            status: "On Leave",
          });
        }


        currentDate.setUTCDate(
          currentDate.getUTCDate() + 1,
        );
      }
    }


    // =====================================================
    // 2. Create normal attendance scenarios
    // =====================================================

    for (const data of attendanceData) {
      const employee =
        userMap[data.employeeCode];

      if (!employee) {
        throw new Error(
          `Attendance employee not found: ${data.employeeCode}`,
        );
      }


      const attendance = {
        employee: employee._id,

        date: data.date,

        inTime: data.inTime || null,

        outTime: data.outTime || null,

        overtimeApproved:
          data.overtimeApproved || false,

        locked:
          data.locked || false,

        approvalStatus:
          data.approvalStatus || "pending",

        correctionRequests: [],
      };


      // =====================================================
      // Calculate worked time/status/flags
      // =====================================================

      if (data.inTime && data.outTime) {
        attendance.workedMinutes =
          calculateWorkedMinutes(
            data.inTime,
            data.outTime,
            settings,
          );

        const scheduledMinutes =
          calculateScheduledMinutes(
            settings,
          );

        attendance.overtimeMinutes =
          calculateOvertimeMinutes(
            attendance.workedMinutes,
            scheduledMinutes,
          );

        attendance.status =
          data.status ||
          evaluateAttendanceStatus(
            attendance.workedMinutes,
            settings,
          );


        const flags = [];


        if (
          evaluateLate(
            data.inTime,
            settings,
          )
        ) {
          flags.push("late");
        }


        if (
          evaluateEarlyExit(
            data.outTime,
            settings,
          )
        ) {
          flags.push("earlyExit");
        }


        if (
          attendance.status === "Present" &&
          attendance.workedMinutes <
            scheduledMinutes
        ) {
          flags.push("shortHours");
        }


        attendance.flags = flags;
      } else {
        attendance.workedMinutes = 0;
        attendance.overtimeMinutes = 0;

        attendance.status =
          data.status || "Present";

        attendance.flags = [];


        if (data.forceMissingTimeOut) {
          attendance.flags.push(
            "missingTimeOut",
          );
        }
      }


      // =====================================================
      // Embedded correction requests
      // =====================================================

      if (data.correctionRequests) {
        attendance.correctionRequests =
          data.correctionRequests.map(
            (correction) => {
              const requestedBy =
                userMap[
                  correction.requestedByCode
                ];

              if (!requestedBy) {
                throw new Error(
                  `Correction requester not found: ${correction.requestedByCode}`,
                );
              }


              const correctionRecord = {
                requestedBy:
                  requestedBy._id,

                requestedAt:
                  correction.requestedAt,

                requestedInTime:
                  correction.requestedInTime,

                requestedOutTime:
                  correction.requestedOutTime,

                requestedStatus:
                  correction.requestedStatus,

                reason:
                  correction.reason,

                status:
                  correction.status,
              };


              if (
                correction.actionedByCode
              ) {
                const actionedBy =
                  userMap[
                    correction.actionedByCode
                  ];

                if (!actionedBy) {
                  throw new Error(
                    `Correction action user not found: ${correction.actionedByCode}`,
                  );
                }

                correctionRecord.actionedBy =
                  actionedBy._id;
              }


              if (correction.actionedAt) {
                correctionRecord.actionedAt =
                  correction.actionedAt;
              }


              if (correction.actionNote) {
                correctionRecord.actionNote =
                  correction.actionNote;
              }


              return correctionRecord;
            },
          );
      }


      await Attendance.create(
        attendance,
      );
    }


    const count =
      await Attendance.countDocuments();

    console.log(
      `${count} attendance seeds added successfully`,
    );

  } catch (error) {
    console.error(
      "Error seeding attendance:",
      error,
    );

    throw error;
  }
}


module.exports = seedAttendance;