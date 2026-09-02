const Payslip = require("../models/Payslip");
const User = require("../models/User");

const getSettings = require("../services/settingsService");

const payslipData = require("./Data/payslipData");

async function seedPayslips() {
  try {
    await Payslip.deleteMany({});

    const settings = await getSettings();

    const users = await User.find({});

    const userMap = {};

    users.forEach((user) => {
      userMap[user.employeeCode] = user;
    });

    for (const data of payslipData) {
      const employee = userMap[data.employeeCode];

      if (!employee) {
        throw new Error(`Payslip employee not found: ${data.employeeCode}`);
      }

      // =====================================================
      // Basic salary
      // =====================================================

      const basicSalary = employee.basicSalaryFils;

      // =====================================================
      // Allowances
      //
      // Demo policy:
      // Bahraini employees receive the configured
      // social allowance.
      // =====================================================

      const allowances = employee.isBahraini
        ? settings.socialInsurance.social_allowance_fils
        : 0;

      // =====================================================
      // Employee social insurance deduction
      // =====================================================

      const deductionPercent = employee.isBahraini
        ? settings.socialInsurance.sio_bahraini_employee_percent
        : settings.socialInsurance.sio_expat_employee_percent;

      const socialInsurance = Math.round(basicSalary * (deductionPercent / 100));
      const absenceDeduction = data.absenceDeduction || 0;
      const leaveDeduction = data.leaveDeduction || 0;
      const deductions = socialInsurance + absenceDeduction + leaveDeduction;

      const hourlyRate = basicSalary / 30 / 8;
      const overtimeAmount = Math.round(
        hourlyRate * (data.overtimeMinutes || 0) / 60 *
        (settings.overtime.overtime_day_percent / 100),
      );

      // =====================================================
      // Create payslip
      // =====================================================

      const payslip = {
        employee: employee._id,

        month: data.month,
        year: data.year,

        basicSalary,

        allowances,

        overtimeAmount,

        deductions,

        attendanceSummary: data.attendanceSummary,

        deductionBreakdown: {
          absenceDeduction,
          leaveDeduction,
          socialInsurance,
          otherDeductions: 0,
          unrecoveredDeductions: 0,
        },

        status: data.status,
      };

      // Approved payslips require approval information.
      if (data.status === "approved") {
        const approvedBy = userMap[data.approvedByCode];

        if (!approvedBy) {
          throw new Error(`Payslip approver not found: ${data.approvedByCode}`);
        }

        payslip.approvedBy = approvedBy._id;

        payslip.approvedAt = data.approvedAt;

        payslip.locked = true;
      }

      // Use create() instead of insertMany()
      // so the model validation middleware calculates:
      //
      // grossSalary
      // netSalary
      await Payslip.create(payslip);
    }

    const count = await Payslip.countDocuments();

    console.log(`${count} payslip seeds added successfully`);
  } catch (error) {
    console.error("Error seeding payslips:", error);

    throw error;
  }
}

module.exports = seedPayslips;
