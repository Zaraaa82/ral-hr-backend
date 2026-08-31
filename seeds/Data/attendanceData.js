const attendanceData = [
  // Normal day
  {
    employeeCode: "EMP-0008", // Hussain
    date: new Date("2026-08-23T00:00:00.000Z"),
    inTime: new Date("2026-08-23T08:00:00+03:00"),
    outTime: new Date("2026-08-23T17:00:00+03:00"),
    approvalStatus: "approved",
  },

  // Late arrival + pending correction request
  {
    employeeCode: "EMP-0009", // Wadha
    date: new Date("2026-08-24T00:00:00.000Z"),
    inTime: new Date("2026-08-24T08:25:00+03:00"),
    outTime: new Date("2026-08-24T17:25:00+03:00"),
    approvalStatus: "pending",

    correctionRequests: [
      {
        requestedByCode: "EMP-0004", // Khalid - manager
        requestedAt: new Date("2026-08-24T18:00:00+03:00"),

        requestedInTime:
          new Date("2026-08-24T08:05:00+03:00"),

        requestedOutTime:
          new Date("2026-08-24T17:05:00+03:00"),

        requestedStatus: "Present",

        reason:
          "Employee reported a delay in the attendance device recording the clock-in time.",

        status: "pending",
      },
    ],
  },

  // Early exit + short hours
  {
    employeeCode: "EMP-0012", // Karim
    date: new Date("2026-08-23T00:00:00.000Z"),
    inTime: new Date("2026-08-23T08:00:00+03:00"),
    outTime: new Date("2026-08-23T16:30:00+03:00"),
    approvalStatus: "pending",
  },

  // Half day
  {
    employeeCode: "EMP-0020", // Grace
    date: new Date("2026-08-24T00:00:00.000Z"),
    inTime: new Date("2026-08-24T08:00:00+03:00"),
    outTime: new Date("2026-08-24T11:30:00+03:00"),
    approvalStatus: "pending",
  },

  // Missing clock-out
  {
    employeeCode: "EMP-0017", // Imran
    date: new Date("2026-08-26T00:00:00.000Z"),
    inTime: new Date("2026-08-26T08:05:00+03:00"),
    outTime: null,
    status: "Present",
    approvalStatus: "pending",
    forceMissingTimeOut: true,
  },

  // Absent
  {
    employeeCode: "EMP-0016", // Ali
    date: new Date("2026-08-26T00:00:00.000Z"),
    status: "Absent",
    approvalStatus: "pending",
  },

  // Overtime waiting for approval
  {
    employeeCode: "EMP-0013", // Maria
    date: new Date("2026-08-23T00:00:00.000Z"),
    inTime: new Date("2026-08-23T07:45:00+03:00"),
    outTime: new Date("2026-08-23T18:15:00+03:00"),
    overtimeApproved: false,
    approvalStatus: "pending",
  },

  // Approved overtime
  {
    employeeCode: "EMP-0011", // Ahmed
    date: new Date("2026-08-24T00:00:00.000Z"),
    inTime: new Date("2026-08-24T08:00:00+03:00"),
    outTime: new Date("2026-08-24T18:00:00+03:00"),
    overtimeApproved: true,
    approvalStatus: "approved",
  },

  // Locked record
  {
    employeeCode: "EMP-0015", // Rajesh
    date: new Date("2026-08-25T00:00:00.000Z"),
    inTime: new Date("2026-08-25T08:00:00+03:00"),
    outTime: new Date("2026-08-25T17:00:00+03:00"),
    approvalStatus: "approved",
    locked: true,
  },

  // Correction was applied by HR
  {
    employeeCode: "EMP-0006", // Jassim
    date: new Date("2026-08-25T00:00:00.000Z"),

    // Final corrected values
    inTime: new Date("2026-08-25T08:00:00+03:00"),
    outTime: new Date("2026-08-25T17:00:00+03:00"),

    approvalStatus: "approved",

    correctionRequests: [
      {
        requestedByCode: "EMP-0003", // Abdulla
        requestedAt: new Date("2026-08-25T17:30:00+03:00"),

        requestedInTime:
          new Date("2026-08-25T08:00:00+03:00"),

        requestedOutTime:
          new Date("2026-08-25T17:00:00+03:00"),

        requestedStatus: "Present",

        reason:
          "The original clock-out time was recorded incorrectly.",

        status: "applied",

        actionedByCode: "EMP-0002", // Fatima HR

        actionedAt:
          new Date("2026-08-26T09:00:00+03:00"),

        actionNote:
          "Verified with the employee's manager and corrected.",
      },
    ],
  },

  // Rejected correction
  {
    employeeCode: "EMP-0013", // Maria
    date: new Date("2026-08-26T00:00:00.000Z"),

    inTime: new Date("2026-08-26T08:30:00+03:00"),
    outTime: new Date("2026-08-26T17:30:00+03:00"),

    approvalStatus: "rejected",

    correctionRequests: [
      {
        requestedByCode: "EMP-0005", // Mohammed

        requestedAt:
          new Date("2026-08-26T18:00:00+03:00"),

        requestedInTime:
          new Date("2026-08-26T08:00:00+03:00"),

        requestedOutTime:
          new Date("2026-08-26T17:00:00+03:00"),

        requestedStatus: "Present",

        reason:
          "Requested correction to the employee's arrival time.",

        status: "rejected",

        actionedByCode: "EMP-0007", // Noora HR

        actionedAt:
          new Date("2026-08-27T09:15:00+03:00"),

        actionNote:
          "Correction rejected because no supporting evidence was provided.",
      },
    ],
  },

  // Weekly off
  {
    employeeCode: "EMP-0026", // Faisal
    date: new Date("2026-08-28T00:00:00.000Z"),
    status: "Weekly Off",
    approvalStatus: "approved",
  },

  // Confirmed public holiday example
  {
    employeeCode: "EMP-0007", // Noora
    date: new Date("2026-05-01T00:00:00.000Z"),
    status: "Holiday",
    approvalStatus: "approved",
  },

  // HR attendance
  {
    employeeCode: "EMP-0002", // Fatima
    date: new Date("2026-08-23T00:00:00.000Z"),
    inTime: new Date("2026-08-23T07:55:00+03:00"),
    outTime: new Date("2026-08-23T17:00:00+03:00"),
    approvalStatus: "approved",
  },

  // Manager attendance
  {
    employeeCode: "EMP-0003", // Abdulla
    date: new Date("2026-08-23T00:00:00.000Z"),
    inTime: new Date("2026-08-23T08:05:00+03:00"),
    outTime: new Date("2026-08-23T17:05:00+03:00"),
    approvalStatus: "approved",
  },
];

module.exports = attendanceData;