const mongoose = require("mongoose");

// =====================================================
// ATTENDANCE SNAPSHOT
// =====================================================

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

// =====================================================
// DEDUCTION BREAKDOWN SNAPSHOT
// =====================================================

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

// =====================================================
// LEAVE DEDUCTION DETAIL
// =====================================================

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

// =====================================================
// PAYSLIP SCHEMA
// =====================================================

const payslipSchema = new mongoose.Schema(
  {
    // ---------------------------------------------------
    // EMPLOYEE
    // ---------------------------------------------------

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ---------------------------------------------------
    // PAYROLL PERIOD
    // ---------------------------------------------------

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

    // ---------------------------------------------------
    // SALARY
    // ---------------------------------------------------

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

    // ---------------------------------------------------
    // TOTALS
    // ---------------------------------------------------

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

    // ---------------------------------------------------
    // ATTENDANCE SNAPSHOT
    // ---------------------------------------------------

    attendanceSummary: {
      type: attendanceSummarySchema,
      default: () => ({}),
    },

    // ---------------------------------------------------
    // DEDUCTION SNAPSHOT
    // ---------------------------------------------------

    deductionBreakdown: {
      type: deductionBreakdownSchema,
      default: () => ({}),
    },

    // ---------------------------------------------------
    // LEAVE DEDUCTION DETAILS
    // ---------------------------------------------------

    leaveDeductionDetails: {
      type: [leaveDeductionDetailSchema],
      default: [],
    },

    // ---------------------------------------------------
    // STATUS
    // ---------------------------------------------------

    status: {
      type: String,
      enum: ["draft", "pending", "approved"],
      default: "draft",
      index: true,
    },

    // ---------------------------------------------------
    // APPROVAL
    // ---------------------------------------------------

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

    // ---------------------------------------------------
    // LOCK
    // ---------------------------------------------------

    locked: {
      type: Boolean,
      default: false,
    },
  },

  {
    timestamps: true,
  },
);

// =====================================================
// PRE-VALIDATE HOOK
// =====================================================
//
// IMPORTANT:
//
// Do NOT use `next` here.
//
// Mongoose supports synchronous middleware here.
// This prevents:
//
// "next is not a function"
//
// Gross and net salary are calculated automatically.
// =====================================================

payslipSchema.pre("validate", function () {
  const basicSalary = Number(this.basicSalary || 0);

  const allowances = Number(this.allowances || 0);

  const overtimeAmount = Number(this.overtimeAmount || 0);

  const deductions = Number(this.deductions || 0);

  // ---------------------------------------------------
  // CALCULATE GROSS SALARY
  // ---------------------------------------------------

  this.grossSalary = basicSalary + allowances + overtimeAmount;

  // ---------------------------------------------------
  // CALCULATE NET SALARY
  // ---------------------------------------------------

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

// =====================================================
// IMMUTABILITY GUARD
// =====================================================
//
// Rules:
//
// NEW
//   ↓
// draft / pending
//   ↓
// approved
//   ↓
// locked
//
// Draft/pending payslips can be edited.
//
// Approval is allowed.
//
// Once locked, modifications are blocked.
// =====================================================

payslipSchema.pre("save", function () {
  // ---------------------------------------------------
  // NEW PAYSLIP
  // ---------------------------------------------------

  if (this.isNew) {
    return;
  }

  // ---------------------------------------------------
  // APPROVAL TRANSITION
  // ---------------------------------------------------
  //
  // Allows:
  //
  // pending → approved
  //
  // and:
  //
  // locked false → true
  //
  // ---------------------------------------------------

  const isBeingApproved =
    this.isModified("status") && this.status === "approved";

  if (isBeingApproved) {
    return;
  }

  // ---------------------------------------------------
  // BLOCK LOCKED PAYSLIPS
  // ---------------------------------------------------

  if (this.locked === true && this.isModified()) {
    throw new Error("Cannot modify a locked or approved payslip record.");
  }
});

// =====================================================
// UNIQUE CONSTRAINT
// =====================================================
//
// One payslip per:
//
// employee + month + year
//
// =====================================================

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

// =====================================================
// EXPORT
// =====================================================

module.exports = mongoose.model("Payslip", payslipSchema);
