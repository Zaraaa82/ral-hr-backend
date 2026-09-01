const mongoose = require("mongoose");

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
  { _id: false },
);

const deductionBreakdownSchema = new mongoose.Schema(
  {
    absenceDeduction: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Absence deduction must be an integer (fils).",
      },
    },

    leaveDeduction: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Leave deduction must be an integer (fils).",
      },
    },

    socialInsurance: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Social insurance must be an integer (fils).",
      },
    },

    otherDeductions: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Other deductions must be an integer (fils).",
      },
    },

    unrecoveredDeductions: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Unrecovered deductions must be an integer (fils).",
      },
    },
  },
  { _id: false },
);

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
      validate: {
        validator: Number.isInteger,
        message: "Deduction amount must be an integer (fils).",
      },
    },
  },
  { _id: false },
);

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
        validator: Number.isInteger,
        message: "Month must be a whole number.",
      },
    },

    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
      validate: {
        validator: Number.isInteger,
        message: "Year must be a whole number.",
      },
    },

    basicSalary: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Basic salary must be a whole number of fils.",
      },
    },

    allowances: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Allowances must be a whole number of fils.",
      },
    },

    overtimeAmount: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Overtime amount must be a whole number of fils.",
      },
    },

    deductions: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Deductions must be a whole number of fils.",
      },
    },

    grossSalary: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Gross salary must be a whole number of fils.",
      },
    },

    netSalary: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Net salary must be a whole number of fils.",
      },
    },

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

    status: {
      type: String,
      enum: ["draft", "pending", "approved"],
      default: "draft",
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

    locked: {
      type: Boolean,
      default: false,
    },
  },

  {
    timestamps: true,
  },
);

payslipSchema.pre("validate", function () {
  const basicSalary = Number(this.basicSalary || 0);

  const allowances = Number(this.allowances || 0);

  const overtimeAmount = Number(this.overtimeAmount || 0);

  const deductions = Number(this.deductions || 0);

  this.grossSalary = basicSalary + allowances + overtimeAmount;

  if (deductions > this.grossSalary) {
    this.netSalary = 0;

    if (this.deductionBreakdown) {
      this.deductionBreakdown.unrecoveredDeductions =
        deductions - this.grossSalary;
    }
  } else {
    this.netSalary = this.grossSalary - deductions;

    if (this.deductionBreakdown) {
      this.deductionBreakdown.unrecoveredDeductions = 0;
    }
  }
});

payslipSchema.pre("save", function () {
  if (this.isNew) {
    return;
  }

  const isBeingApproved =
    this.isModified("status") && this.status === "approved";

  if (isBeingApproved) {
    return;
  }

  if (this.locked === true && this.isModified()) {
    throw new Error("Cannot modify a locked or approved payslip record.");
  }
});

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
