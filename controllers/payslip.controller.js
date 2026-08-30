const mongoose = require("mongoose");
const Payslip = require("../models/Payslip");
const AuditLog = require("../models/AuditLog");
const payslipService = require("../services/payrollService");

async function getOrganizationSettings() {
  return {
    workingHours: { normal_daily: 8 },
    overtime: { overtime_day_percent: 25 },
    socialInsurance: {
      sio_bahraini_employee_percent: 7,
      sio_expat_employee_percent: 1,
      sio_ceiling_fils: 4000000,
    },
  };
}

async function createPayslip(req, res) {
  try {
    const { employee, month, year } = req.body;

    if (!mongoose.Types.ObjectId.isValid(employee)) {
      return res.status(400).json({ message: "Invalid employee ID." });
    }

    const numMonth = Number(month);
    const numYear = Number(year);

    if (!Number.isInteger(numMonth) || numMonth < 1 || numMonth > 12) {
      return res
        .status(400)
        .json({ message: "Month must be a whole number between 1 and 12." });
    }

    if (!Number.isInteger(numYear) || numYear < 2000 || numYear > 2100) {
      return res
        .status(400)
        .json({
          message: "Year must be a whole number between 2000 and 2100.",
        });
    }

    const settings = req.settings || (await getOrganizationSettings());
    const { payslip } = await payslipService.generatePayslip({
      employeeId: employee,
      month: numMonth,
      year: numYear,
      settings,
    });

    await AuditLog.create({
      entityType: "Payslip",
      recordId: payslip._id,
      changedBy: req.user._id,
      action: "create",
      new_value: {
        employee: payslip.employee,
        month: payslip.month,
        year: payslip.year,
        basicSalary: payslip.basicSalary,
        netSalary: payslip.netSalary,
        status: payslip.status,
      },
    });

    await payslip.populate([
      {
        path: "employee",
        select: "fullName employeeCode personalEmail workEmail department",
        populate: { path: "department", select: "name" },
      },
    ]);

    return res
      .status(201)
      .json({ message: "Payslip generated successfully.", payslip });
  } catch (error) {
    console.error("createPayslip Error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Error generating payslip." });
  }
}

async function getAllPayslips(req, res) {
  try {
    const query = {};

    if (req.user.role !== "HR Admin") {
      const today = new Date();
      query.employee = req.user._id;
      query.status = "approved";

      if (today.getDate() < 25) {
        query.$or = [
          { year: { $lt: today.getFullYear() } },
          { year: today.getFullYear(), month: { $lt: today.getMonth() + 1 } },
        ];
      }
    }

    const payslips = await Payslip.find(query)
      .populate({
        path: "employee",
        select: "fullName employeeCode personalEmail workEmail department",
        populate: { path: "department", select: "name" },
      })
      .populate("approvedBy", "fullName employeeCode workEmail")
      .sort({ year: -1, month: -1 });

    return res.status(200).json(payslips);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching payslips.", error: error.message });
  }
}

async function getPayslipById(req, res) {
  try {
    const payslip = await Payslip.findById(req.params.id)
      .populate({
        path: "employee",
        select: "fullName employeeCode personalEmail workEmail department",
        populate: { path: "department", select: "name" },
      })
      .populate("approvedBy", "fullName employeeCode workEmail");

    if (!payslip) {
      return res.status(404).json({ message: "Payslip not found." });
    }

    if (req.user.role !== "HR Admin") {
      const recordOwnerId = payslip.employee._id
        ? payslip.employee._id.toString()
        : payslip.employee.toString();

      if (recordOwnerId !== req.user._id.toString()) {
        return res.status(403).json({ message: "Access denied." });
      }

      if (payslip.status !== "approved") {
        return res
          .status(403)
          .json({ message: "Payslip is pending approval." });
      }

      const today = new Date();
      if (
        payslip.year === today.getFullYear() &&
        payslip.month === today.getMonth() + 1 &&
        today.getDate() < 25
      ) {
        return res.status(403).json({
          message: "Payslips for the current month are available on the 25th.",
        });
      }
    }

    return res.status(200).json(payslip);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching payslip.", error: error.message });
  }
}

async function updatePayslip(req, res) {
  try {
    const payslip = await Payslip.findById(req.params.id);

    if (!payslip) {
      return res.status(404).json({ message: "Payslip not found." });
    }
    if (payslip.status === "approved" || payslip.locked) {
      return res
        .status(400)
        .json({ message: "Cannot update an approved or locked payslip." });
    }

    const { basicSalary, allowances, overtimeAmount, deductions } = req.body;

    const oldValue = {
      basicSalary: payslip.basicSalary,
      allowances: payslip.allowances,
      overtimeAmount: payslip.overtimeAmount,
      deductions: payslip.deductions,
      grossSalary: payslip.grossSalary,
      netSalary: payslip.netSalary,
    };

    const fields = { basicSalary, allowances, overtimeAmount, deductions };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        const numValue = Number(value);
        if (!Number.isInteger(numValue) || numValue < 0) {
          return res
            .status(400)
            .json({
              message: `${key} must be a non-negative integer in fils.`,
            });
        }
        payslip[key] = numValue;
      }
    }

    const updatedPayslip = await payslip.save();

    await AuditLog.create({
      entityType: "Payslip",
      recordId: updatedPayslip._id,
      changedBy: req.user._id,
      action: "update",
      old_value: oldValue,
      new_value: {
        basicSalary: updatedPayslip.basicSalary,
        allowances: updatedPayslip.allowances,
        overtimeAmount: updatedPayslip.overtimeAmount,
        deductions: updatedPayslip.deductions,
        grossSalary: updatedPayslip.grossSalary,
        netSalary: updatedPayslip.netSalary,
      },
    });

    await updatedPayslip.populate([
      {
        path: "employee",
        select: "fullName employeeCode personalEmail workEmail department",
        populate: { path: "department", select: "name" },
      },
    ]);

    return res.status(200).json({
      message: "Payslip updated successfully.",
      payslip: updatedPayslip,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error updating payslip.", error: error.message });
  }
}

async function approvePayslip(req, res) {
  try {
    const payslip = await Payslip.findById(req.params.id);

    if (!payslip) {
      return res.status(404).json({ message: "Payslip not found." });
    }
    if (payslip.status === "approved") {
      return res.status(400).json({ message: "Payslip is already approved." });
    }

    payslip.status = "approved";
    payslip.approvedBy = req.user._id;
    payslip.approvedAt = new Date();
    payslip.locked = true;

    const approvedPayslip = await payslip.save();

    await AuditLog.create({
      entityType: "Payslip",
      recordId: approvedPayslip._id,
      changedBy: req.user._id,
      action: "approve",
      old_value: { status: "pending", locked: false },
      new_value: {
        status: "approved",
        locked: true,
        approvedBy: req.user._id,
        approvedAt: payslip.approvedAt,
      },
    });

    await approvedPayslip.populate([
      {
        path: "employee",
        select: "fullName employeeCode personalEmail workEmail department",
        populate: { path: "department", select: "name" },
      },
      { path: "approvedBy", select: "fullName employeeCode workEmail" },
    ]);

    return res.status(200).json({
      message: "Payslip approved successfully.",
      payslip: approvedPayslip,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error approving payslip.", error: error.message });
  }
}

async function deletePayslip(req, res) {
  try {
    const payslip = await Payslip.findById(req.params.id);

    if (!payslip) {
      return res.status(404).json({ message: "Payslip not found." });
    }
    if (payslip.status === "approved" || payslip.locked) {
      return res
        .status(400)
        .json({ message: "Cannot delete an approved or locked payslip." });
    }

    await Payslip.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      entityType: "Payslip",
      recordId: payslip._id,
      changedBy: req.user._id,
      action: "delete",
      old_value: {
        employee: payslip.employee,
        month: payslip.month,
        year: payslip.year,
        netSalary: payslip.netSalary,
      },
    });

    return res.status(200).json({ message: "Payslip deleted successfully." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error deleting payslip.", error: error.message });
  }
}

module.exports = {
  createPayslip,
  getAllPayslips,
  getPayslipById,
  updatePayslip,
  approvePayslip,
  deletePayslip,
};
