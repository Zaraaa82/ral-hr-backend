const path = require("path");

const LeaveRequest = require("../models/leaveRequest");
const LeaveType = require("../models/leaveType");
const LeaveAllocation = require("../models/LeaveAllocation");
const User = require("../models/User");
const Document = require("../models/Document");

const {
  calculateLeaveAllocationBreakdown,
  useAllocationDays
} = require("../services/leaveAllocationService");

const leaveRequestData = require("./Data/leaveRequestData");


// =====================================================
// Create every UTC date between start and end
// =====================================================

function getDatesBetween(startDate, endDate) {
  const dates = [];

  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(new Date(current));

    current.setUTCDate(
      current.getUTCDate() + 1,
    );
  }

  return dates;
}


// =====================================================
// Determine dates that actually consume leave balance
// =====================================================

function getDeductedDates(
  startDate,
  endDate,
  leaveType,
) {
  const dates = getDatesBetween(
    startDate,
    endDate,
  );

  // Sick, maternity, Hajj etc. can count
  // holidays/rest days when configured.
  if (leaveType.includesHolidays) {
    return dates;
  }

  // RAL weekend:
  // Friday = 5
  // Saturday = 6
  return dates.filter((date) => {
    const day = date.getUTCDay();

    return day !== 5 && day !== 6;
  });
}


// =====================================================
// Seed leave requests
// =====================================================

async function seedLeaveRequests() {
  try {
    await LeaveRequest.deleteMany({});

    // Because this seed can be run repeatedly,
    // reset allocation usage first.
    await LeaveAllocation.updateMany(
      {},
      {
        $set: {
          daysTaken: 0,
        },
      },
    );

    const users = await User.find({});
    const leaveTypes = await LeaveType.find({});
    const documents = await Document.find({});

    // ================= User map =================

    const userMap = {};

    users.forEach((user) => {
      userMap[user.employeeCode] = user;
    });

    // ================= Leave type map =================

    const leaveTypeMap = {};

    leaveTypes.forEach((leaveType) => {
      leaveTypeMap[leaveType.type] =
        leaveType;
    });

    // ================= Document map =================

    const documentMap = {};

    documents.forEach((document) => {
      const fileName = path.basename(
        document.fileUrl,
      );

      documentMap[
        `${document.employee.toString()}-${fileName}`
      ] = document;
    });

    // Sort chronologically.
    //
    // This is important for Ahmed:
    // his first sick request must consume
    // 14 full-pay days before his second
    // request is calculated.
    const sortedRequests = [
      ...leaveRequestData,
    ].sort(
      (a, b) =>
        a.startDate.getTime() -
        b.startDate.getTime(),
    );

    let createdCount = 0;

    for (const data of sortedRequests) {
      const employee =
        userMap[data.employeeCode];

      if (!employee) {
        throw new Error(
          `Employee not found: ${data.employeeCode}`,
        );
      }

      const leaveType =
        leaveTypeMap[data.leaveType];

      if (!leaveType) {
        throw new Error(
          `Leave type not found: ${data.leaveType}`,
        );
      }

      // ================= Supporting document =================

      let supportingDocument = null;

      if (data.documentFileName) {
        const documentKey =
          `${employee._id.toString()}-${data.documentFileName}`;

        supportingDocument =
          documentMap[documentKey];

        if (!supportingDocument) {
          throw new Error(
            `Supporting document not found for ${data.employeeCode}: ${data.documentFileName}`,
          );
        }
      }

      // ================= Calculate leave days =================

      const deductedDates =
        getDeductedDates(
          data.startDate,
          data.endDate,
          leaveType,
        );

      if (deductedDates.length === 0) {
        throw new Error(
          `Leave request has no countable days: ${data.employeeCode}`,
        );
      }

      const request = {
        employee: employee._id,

        leaveType: leaveType._id,

        startDate: data.startDate,

        endDate: data.endDate,

        totalDays: deductedDates.length,

        note: data.note,

        status: data.status,

        allocationBreakdown: [],
      };

      if (supportingDocument) {
        request.document =
          supportingDocument._id;
      }

      // ================= Action information =================

      if (data.actionedByCode) {
        const actionedBy =
          userMap[data.actionedByCode];

        if (!actionedBy) {
          throw new Error(
            `Actioned user not found: ${data.actionedByCode}`,
          );
        }

        request.actionedBy =
          actionedBy._id;

        request.actionedAt =
          data.actionedAt;
      }

      // =====================================================
      // Approved requests
      //
      // Calculate the same allocation breakdown that
      // the real controller calculates during approval.
      // =====================================================

      if (data.status === "approved") {
        const allocationBreakdown =
          await calculateLeaveAllocationBreakdown(
            employee._id,
            leaveType._id,
            deductedDates,
          );

        request.allocationBreakdown =
          allocationBreakdown;

        // Actually consume the employee's balances.
        for (
          const allocationPart
          of allocationBreakdown
        ) {
          await useAllocationDays(
            allocationPart.leaveAllocation,
            allocationPart.days,
          );
        }
      }

      await LeaveRequest.create(request);

      createdCount++;
    }

    console.log(
      `${createdCount} leave request seeds added successfully`,
    );
  } catch (error) {
    console.error(
      "Error seeding leave requests:",
      error,
    );

    throw error;
  }
}

module.exports = seedLeaveRequests;