const mongoose = require("mongoose");

// ATTENDANCE SNAPSHOT

const attendanceSummarySchema = new mongoose.Schema(
  {
    workedMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },

    overtimeMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },

    approvedOvertimeMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },

    presentDays: {
      type: Number,
      min: 0,
      default: 0,
    },

    absentDays: {
      type: Number,
      min: 0,
      default: 0,
    },

    halfDays: {
      type: Number,
      min: 0,
      default: 0,
    },

    leaveDays: {
      type: Number,
      min: 0,
      default: 0,
    },

    holidayDays: {
      type: Number,
      min: 0,
      default: 0,
    },

    weeklyOffDays: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  },
);

// DEDUCTION BREAKDOWN

const deductionBreakdownSchema = new mongoose.Schema(
  {
    absenceDeduction: {
      type: Number,
      min: 0,
      default: 0,
    },

    leaveDeduction: {
      type: Number,
      min: 0,
      default: 0,
    },

    socialInsurance: {
      type: Number,
      min: 0,
      default: 0,
    },

    otherDeductions: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  },
);

// LEAVE DEDUCTION DETAIL

const leaveDeductionDetailSchema = new mongoose.Schema(
  {
    leaveRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
      required: true,
    },

    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      default: null,
    },

    type: {
      type: String,
      default: null,
    },

    days: {
      type: Number,
      min: 0,
      default: 0,
    },

    dates: {
      type: [Date],
      default: [],
    },

    payFraction: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },

    deductionAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  },
);

// PAYSLIP SCHEMA

const payslipSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      validate: {
        validator: function (value) {
          return Number.isInteger(value);
        },
        message: "Month must be a whole number.",
      },
    },

    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
      validate: {
        validator: function (value) {
          return Number.isInteger(value);
        },
        message: "Year must be a whole number.",
      },
    },

    // SALARY

    basicSalary: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (value) {
          return Number.isInteger(value);
        },
        message: "Basic salary must be a whole number of fils.",
      },
    },

    allowances: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: function (value) {
          return Number.isInteger(value);
        },
        message: "Allowances must be a whole number of fils.",
      },
    },

    overtimeAmount: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: function (value) {
          return Number.isInteger(value);
        },
        message: "Overtime amount must be a whole number of fils.",
      },
    },

    deductions: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: function (value) {
          return Number.isInteger(value);
        },
        message: "Deductions must be a whole number of fils.",
      },
    },

    grossSalary: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (value) {
          return Number.isInteger(value);
        },
        message: "Gross salary must be a whole number of fils.",
      },
    },

    netSalary: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (value) {
          return Number.isInteger(value);
        },
        message: "Net salary must be a whole number of fils.",
      },
    },

    // PAYROLL SNAPSHOT

    attendanceSummary: {
      type: attendanceSummarySchema,
      default: () => ({}),
    },

    deductionBreakdown: {
      type: deductionBreakdownSchema,
      default: () => ({}),
    },

    leaveDeductionDetails: {
      type: [leaveDeductionDetailSchema],
      default: [],
    },

    // STATUS

    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
      index: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      required: function () {
        return this.status === "approved";
      },
    },

    approvedAt: {
      type: Date,
      default: null,
      required: function () {
        return this.status === "approved";
      },
    },

    // LOCKING

    locked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// CALCULATE GROSS / NET

payslipSchema.pre("validate", function (next) {
  const basicSalary = this.basicSalary || 0;
  const allowances = this.allowances || 0;
  const overtimeAmount = this.overtimeAmount || 0;
  const deductions = this.deductions || 0;

  this.grossSalary = basicSalary + allowances + overtimeAmount;

  this.netSalary = Math.max(0, this.grossSalary - deductions);

  next();
});

// UNIQUE PAYSLIP PER EMPLOYEE / MONTH / YEAR

payslipSchema.index(
  {
    employee: 1,
    month: 1,
    year: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model("Payslip", payslipSchema);
