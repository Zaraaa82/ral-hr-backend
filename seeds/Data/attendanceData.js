const ACTIVE_EMPLOYEES = [
  "EMP-0001", "EMP-0002", "EMP-0003", "EMP-0004", "EMP-0005", "EMP-0006",
  "EMP-0007", "EMP-0008", "EMP-0009", "EMP-0011", "EMP-0012", "EMP-0013",
  "EMP-0014", "EMP-0015", "EMP-0016", "EMP-0017", "EMP-0018", "EMP-0019",
  "EMP-0020", "EMP-0021", "EMP-0022", "EMP-0023", "EMP-0024", "EMP-0025",
  "EMP-0026", "EMP-0027",
];

const DEMO_END_DATE = "2026-09-02";
const HOLIDAYS = new Set(["2026-08-25"]);

// Approved leave dates are created by seeds/Attendance.js.
const APPROVED_LEAVE_DATES = new Set([
  "EMP-0009|2026-08-05", "EMP-0009|2026-08-06",
  "EMP-0011|2026-08-02", "EMP-0011|2026-08-03", "EMP-0011|2026-08-04",
  "EMP-0011|2026-08-05", "EMP-0011|2026-08-06", "EMP-0011|2026-08-09",
  "EMP-0011|2026-08-10", "EMP-0011|2026-08-11", "EMP-0011|2026-08-12",
  "EMP-0011|2026-08-13", "EMP-0011|2026-08-16", "EMP-0011|2026-08-17",
  "EMP-0023|2026-08-20", "EMP-0023|2026-08-23", "EMP-0023|2026-08-24",
]);

const isoDay = (date) => date.toISOString().slice(0, 10);
const bahrainTime = (day, time) => new Date(`${day}T${time}:00+03:00`);

function normalRecord(employeeCode, day, index) {
  return {
    employeeCode,
    date: new Date(`${day}T00:00:00.000Z`),
    inTime: bahrainTime(day, `07:${String(52 + (index % 8)).padStart(2, "0")}`),
    outTime: bahrainTime(day, `17:${String((index * 3) % 11).padStart(2, "0")}`),
    approvalStatus: day < "2026-08-26" ? "approved" : "pending",
  };
}

const overrides = {
  // Wadha (primary employee): late, early exit, half day, absent, correction, missing out.
  "EMP-0009|2026-08-10": { inTime: "08:25", outTime: "17:25" },
  "EMP-0009|2026-08-13": { inTime: "08:00", outTime: "16:25" },
  "EMP-0009|2026-08-18": { inTime: "08:00", outTime: "11:30" },
  "EMP-0009|2026-08-19": { status: "Absent", noTimes: true },
  "EMP-0009|2026-08-24": {
    inTime: "08:25", outTime: "17:25", approvalStatus: "pending",
    correctionRequests: [{
      requestedByCode: "EMP-0004",
      requestedAt: new Date("2026-08-24T18:00:00+03:00"),
      requestedInTime: bahrainTime("2026-08-24", "08:05"),
      requestedOutTime: bahrainTime("2026-08-24", "17:05"),
      requestedStatus: "Present",
      reason: "The attendance device recorded the employee's clock-in late.",
      status: "pending",
    }],
  },
  "EMP-0009|2026-08-27": {
    inTime: "08:04", noOutTime: true, status: "Present",
    approvalStatus: "pending", forceMissingTimeOut: true,
  },

  // Manager and HR Admin are employees too.
  "EMP-0004|2026-08-17": { inTime: "08:18", outTime: "17:18" },
  "EMP-0002|2026-08-31": { inTime: "08:00", outTime: "16:35" },

  // Company-wide presentation cases.
  "EMP-0012|2026-08-23": { inTime: "08:00", outTime: "16:30" },
  "EMP-0020|2026-08-24": { inTime: "08:00", outTime: "11:30" },
  "EMP-0017|2026-08-26": {
    inTime: "08:05", noOutTime: true, status: "Present",
    approvalStatus: "pending", forceMissingTimeOut: true,
  },
  "EMP-0016|2026-08-26": { status: "Absent", noTimes: true },
  "EMP-0013|2026-08-23": {
    inTime: "07:45", outTime: "18:15", overtimeApproved: false,
  },
  "EMP-0011|2026-08-24": {
    inTime: "08:00", outTime: "18:00", overtimeApproved: true,
    approvalStatus: "approved",
  },
  "EMP-0015|2026-08-24": {
    inTime: "08:00", outTime: "17:00", approvalStatus: "approved", locked: true,
  },
  "EMP-0006|2026-08-27": {
    inTime: "08:00", outTime: "17:00", approvalStatus: "pending",
    correctionRequests: [{
      requestedByCode: "EMP-0003",
      requestedAt: new Date("2026-08-27T17:30:00+03:00"),
      requestedInTime: bahrainTime("2026-08-27", "08:00"),
      requestedOutTime: bahrainTime("2026-08-27", "17:00"),
      requestedStatus: "Present",
      reason: "The original clock-out was recorded incorrectly.",
      status: "applied",
      actionedByCode: "EMP-0002",
      actionedAt: new Date("2026-08-30T09:00:00+03:00"),
      actionNote: "Verified against the site attendance register and corrected.",
    }],
  },
  "EMP-0013|2026-08-26": {
    inTime: "08:30", outTime: "17:30", approvalStatus: "rejected",
    correctionRequests: [{
      requestedByCode: "EMP-0005",
      requestedAt: new Date("2026-08-26T18:00:00+03:00"),
      requestedInTime: bahrainTime("2026-08-26", "08:00"),
      requestedOutTime: bahrainTime("2026-08-26", "17:00"),
      requestedStatus: "Present",
      reason: "Requested correction to the employee's arrival time.",
      status: "rejected",
      actionedByCode: "EMP-0007",
      actionedAt: new Date("2026-08-27T09:15:00+03:00"),
      actionNote: "Rejected because no supporting evidence was provided.",
    }],
  },
};

const attendanceData = [];
const cursor = new Date("2026-08-02T00:00:00.000Z");
const end = new Date(`${DEMO_END_DATE}T00:00:00.000Z`);

while (cursor <= end) {
  const day = isoDay(cursor);
  const weekday = cursor.getUTCDay();

  if (weekday !== 5 && weekday !== 6 && !HOLIDAYS.has(day)) {
    ACTIVE_EMPLOYEES.forEach((employeeCode, index) => {
      const key = `${employeeCode}|${day}`;
      if (APPROVED_LEAVE_DATES.has(key)) return;

      const record = normalRecord(employeeCode, day, index);
      const override = overrides[key];

      if (override) {
        if (override.noTimes) {
          record.inTime = null;
          record.outTime = null;
        } else {
          if (override.inTime) record.inTime = bahrainTime(day, override.inTime);
          if (override.outTime) record.outTime = bahrainTime(day, override.outTime);
          if (override.noOutTime) record.outTime = null;
        }
        Object.assign(record, override);
        delete record.noTimes;
        delete record.noOutTime;
        if (typeof record.inTime === "string") record.inTime = bahrainTime(day, record.inTime);
        if (typeof record.outTime === "string") record.outTime = bahrainTime(day, record.outTime);
      }

      attendanceData.push(record);
    });
  }
  cursor.setUTCDate(cursor.getUTCDate() + 1);
}

module.exports = attendanceData;
