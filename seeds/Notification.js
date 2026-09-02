const path = require("path");

const Notification =
  require("../models/Notification");

const User =
  require("../models/User");

const LeaveType =
  require("../models/leaveType");

const LeaveRequest =
  require("../models/leaveRequest");

const Attendance =
  require("../models/Attendance");

const Document =
  require("../models/Document");

const Payslip =
  require("../models/Payslip");

const notificationData =
  require("./Data/notificationData");


function startOfUTCDay(date) {
  return new Date(
    `${date}T00:00:00.000Z`,
  );
}


async function seedNotifications() {
  try {
    await Notification.deleteMany({});

    // =====================================================
    // Users
    // =====================================================

    const users = await User.find({});

    const userMap = {};

    users.forEach((user) => {
      userMap[user.employeeCode] = user;
    });


    // =====================================================
    // Leave types
    // =====================================================

    const leaveTypes =
      await LeaveType.find({});

    const leaveTypeMap = {};

    leaveTypes.forEach((leaveType) => {
      leaveTypeMap[leaveType.type] =
        leaveType;
    });


    // =====================================================
    // Seed notifications
    // =====================================================

    for (const data of notificationData) {
      const recipient =
        userMap[data.recipientCode];

      if (!recipient) {
        throw new Error(
          `Notification recipient not found: ${data.recipientCode}`,
        );
      }


      let relatedRecord = null;


      // ===================================================
      // LeaveRequest
      // ===================================================

      if (data.relatedType === "LeaveRequest") {
        const employee =
          userMap[data.related.employeeCode];

        const leaveType =
          leaveTypeMap[
            data.related.leaveType
          ];

        if (!employee || !leaveType) {
          throw new Error(
            "Leave notification reference could not be resolved.",
          );
        }

        relatedRecord =
          await LeaveRequest.findOne({
            employee: employee._id,
            leaveType: leaveType._id,
            startDate: startOfUTCDay(
              data.related.startDate,
            ),
          });
      }


      // ===================================================
      // Attendance
      // ===================================================

      if (data.relatedType === "Attendance") {
        const employee =
          userMap[data.related.employeeCode];

        if (!employee) {
          throw new Error(
            `Attendance employee not found: ${data.related.employeeCode}`,
          );
        }

        relatedRecord =
          await Attendance.findOne({
            employee: employee._id,
            date: startOfUTCDay(
              data.related.date,
            ),
          });
      }


      // ===================================================
      // Document
      // ===================================================

      if (data.relatedType === "Document") {
        const employee =
          userMap[data.related.employeeCode];

        if (!employee) {
          throw new Error(
            `Document employee not found: ${data.related.employeeCode}`,
          );
        }

        const documents =
          await Document.find({
            employee: employee._id,
          });

        relatedRecord =
          documents.find(
            (document) =>
              path.basename(
                document.fileUrl,
              ) ===
              data.related.fileName,
          );
      }

      if (data.relatedType === "Payslip") {
        const employee = userMap[data.related.employeeCode];

        if (!employee) {
          throw new Error(
            `Payslip employee not found: ${data.related.employeeCode}`,
          );
        }

        relatedRecord = await Payslip.findOne({
          employee: employee._id,
          month: data.related.month,
          year: data.related.year,
        });
      }


      if (!relatedRecord) {
        throw new Error(
          `Related ${data.relatedType} record not found.`,
        );
      }


      await Notification.create({
        recipient: recipient._id,

        type: data.type,

        message: data.message,

        relatedType:
          data.relatedType,

        relatedRecord:
          relatedRecord._id,

        isRead:
          data.isRead ?? false,
      });
    }


    const count =
      await Notification.countDocuments();

    console.log(
      `${count} notification seeds added successfully`,
    );

  } catch (error) {
    console.error(
      "Error seeding notifications:",
      error,
    );

    throw error;
  }
}


module.exports = seedNotifications;
