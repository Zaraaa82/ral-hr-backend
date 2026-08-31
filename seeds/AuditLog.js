const path = require("path");

const AuditLog = require("../models/AuditLog");
const User = require("../models/User");
const Document = require("../models/Document");
const LeaveRequest = require("../models/leaveRequest");
const LeaveType = require("../models/leaveType");
const Attendance = require("../models/Attendance");

const auditLogData =
  require("./Data/auditLogData");


function startOfUTCDay(date) {
  return new Date(
    `${date}T00:00:00.000Z`
  );
}


async function seedAuditLogs() {
  try {
    await AuditLog.deleteMany({});

    const users = await User.find({});
    const leaveTypes = await LeaveType.find({});

    const userMap = {};
    const leaveTypeMap = {};

    users.forEach((user) => {
      userMap[user.employeeCode] = user;
    });

    leaveTypes.forEach((leaveType) => {
      leaveTypeMap[leaveType.type] =
        leaveType;
    });


    for (const data of auditLogData) {
      const changedBy =
        userMap[data.changedByCode];

      if (!changedBy) {
        throw new Error(
          `Audit user not found: ${data.changedByCode}`
        );
      }


      let record = null;


      // =====================================================
      // User
      // =====================================================

      if (data.entityType === "User") {
        record =
          userMap[data.employeeCode];
      }


      // =====================================================
      // Document
      // =====================================================

      if (data.entityType === "Document") {
        const employee =
          userMap[data.employeeCode];

        if (!employee) {
          throw new Error(
            `Document employee not found: ${data.employeeCode}`
          );
        }

        const documents =
          await Document.find({
            employee: employee._id,
          });

        record = documents.find(
          (document) =>
            path.basename(
              document.fileUrl
            ) === data.fileName
        );
      }


      // =====================================================
      // Leave Request
      // =====================================================

      if (
        data.entityType ===
        "LeaveRequest"
      ) {
        const employee =
          userMap[data.employeeCode];

        const leaveType =
          leaveTypeMap[data.leaveType];

        if (!employee || !leaveType) {
          throw new Error(
            "Leave request audit reference could not be resolved."
          );
        }

        record =
          await LeaveRequest.findOne({
            employee: employee._id,
            leaveType: leaveType._id,
            startDate: startOfUTCDay(
              data.startDate
            ),
          });
      }


      // =====================================================
      // Attendance
      // =====================================================

      if (
        data.entityType ===
        "Attendance"
      ) {
        const employee =
          userMap[data.employeeCode];

        if (!employee) {
          throw new Error(
            `Attendance employee not found: ${data.employeeCode}`
          );
        }

        record =
          await Attendance.findOne({
            employee: employee._id,
            date: startOfUTCDay(
              data.date
            ),
          });
      }


      if (!record) {
        throw new Error(
          `Audit record not found for ${data.entityType}`
        );
      }


      const auditLog = {
        entityType:
          data.entityType,

        recordId:
          record._id,

        changedBy:
          changedBy._id,

        action:
          data.action,
      };


      if (data.old_value) {
        auditLog.old_value =
          data.old_value;
      }


      if (data.new_value) {
        auditLog.new_value =
          data.new_value;
      }


      if (data.reason) {
        auditLog.reason =
          data.reason;
      }


      await AuditLog.create(
        auditLog
      );
    }


    const count =
      await AuditLog.countDocuments();

    console.log(
      `${count} audit log seeds added successfully`
    );

  } catch (error) {
    console.error(
      "Error seeding audit logs:",
      error
    );

    throw error;
  }
}


module.exports = seedAuditLogs;