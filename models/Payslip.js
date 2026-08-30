const mongoose = require("mongoose");

const payslipSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    allowances: {
      type: Number,
      default: 0,
      min: 0,
    },

    overtimeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    deductions: {
      type: Number,
      default: 0,
      min: 0,
    },

    grossSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    netSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.status === "approved";
      },
      default: null,
    },

    approvedAt: {
      type: Date,
      required: function () {
        return this.status === "approved";
      },
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

payslipSchema.pre("validate", function (next) {
  this.grossSalary =
    (this.basicSalary ?? 0) +
    (this.allowances ?? 0) +
    (this.overtimeAmount ?? 0);
  this.netSalary = this.grossSalary - (this.deductions ?? 0);

  next();
});

payslipSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("Payslip", payslipSchema);
