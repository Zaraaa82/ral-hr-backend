const mongoose = require("mongoose");
const Payslip = require("../models/Payslip");
const AuditLog = require("../models/AuditLog");
const payslipService = require("../services/payrollService");
const HR_ROLES = ["HR Admin", "Admin", "HR"];
const User = require("../models/User");
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

async function getOrganizationSettings() {
  return {
    workingHours: {
      normal_daily: 8,
    },

    overtime: {
      overtime_day_percent: 25,
    },

    socialInsurance: {
      sio_bahraini_employee_percent: 7,
      sio_expat_employee_percent: 1,
      sio_ceiling_fils: 4000000,
    },
  };
}

function isHRAdmin(req) {
  return HR_ROLES.includes(req.user?.role);
}

function getLoggedInUserId(req) {
  return req.user?._id || req.user?.id || req.user?.userId || null;
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function validateMonthYear(month, year) {
  const numMonth = Number(month);
  const numYear = Number(year);

  if (!Number.isInteger(numMonth) || numMonth < 1 || numMonth > 12) {
    return {
      valid: false,
      message: "Month must be a whole number between 1 and 12.",
    };
  }

  if (!Number.isInteger(numYear) || numYear < MIN_YEAR || numYear > MAX_YEAR) {
    return {
      valid: false,
      message: `Year must be a whole number between ${MIN_YEAR} and ${MAX_YEAR}.`,
    };
  }

  return {
    valid: true,
    month: numMonth,
    year: numYear,
  };
}

function getEmployeePopulate() {
  return {
    path: "employee",
    select:
      "fullName name employeeCode personalEmail workEmail email employeeId department",
    populate: {
      path: "department",
      select: "name departmentName",
    },
  };
}

function getApprovedByPopulate() {
  return {
    path: "approvedBy",
    select: "fullName name employeeCode personalEmail workEmail email",
  };
}

function isPayslipReleased(year, month) {
  const today = new Date();

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  const payrollYear = Number(year);
  const payrollMonth = Number(month);

  if (payrollYear < currentYear) {
    return true;
  }

  if (payrollYear > currentYear) {
    return false;
  }

  if (payrollMonth < currentMonth) {
    return true;
  }

  if (payrollMonth > currentMonth) {
    return false;
  }

  return currentDay >= 25;
}

// CREATE PAYSLIP

async function createPayslip(req, res) {
  try {
    const { employee, month, year } = req.body;

    if (!employee || !isValidObjectId(employee)) {
      return res.status(400).json({
        message: "Invalid employee ID.",
      });
    }

    const employeeUser = await User.findById(employee).select(
      "_id fullName employeeCode isActive status",
    );

    if (!employeeUser) {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    const isUserActive =
      employeeUser.isActive === true ||
      (employeeUser.status && employeeUser.status.toLowerCase() === "active");

    if (!isUserActive) {
      return res.status(400).json({
        message: "Payslip can only be created for an active employee.",
      });
    }

    const validation = validateMonthYear(month, year);

    if (!validation.valid) {
      return res.status(400).json({
        message: validation.message,
      });
    }

    const { month: numMonth, year: numYear } = validation;

    const existingPayslip = await Payslip.findOne({
      employee,
      month: numMonth,
      year: numYear,
    });

    if (existingPayslip) {
      return res.status(409).json({
        message:
          "A payslip already exists for this employee and payroll period.",
        payslipId: existingPayslip._id,
      });
    }

    const settings = req.settings || (await getOrganizationSettings());

    const result = await payslipService.generatePayslip({
      employeeId: employee,
      month: numMonth,
      year: numYear,
      settings,
    });

    const payslip = result?.payslip || result;

    if (!payslip) {
      throw new Error("Payroll service did not return a payslip.");
    }

    if (!payslip.status) {
      payslip.status = "draft";
    }

    if (payslip.status !== "approved") {
      payslip.locked = false;
    }

    await payslip.save();

    await AuditLog.create({
      entityType: "Payslip",
      recordId: payslip._id,
      changedBy: getLoggedInUserId(req),
      action: "create",

      new_value: {
        employee: payslip.employee,
        month: payslip.month,
        year: payslip.year,
        basicSalary: payslip.basicSalary,
        allowances: payslip.allowances,
        overtimeAmount: payslip.overtimeAmount,
        deductions: payslip.deductions,
        grossSalary: payslip.grossSalary,
        netSalary: payslip.netSalary,
        status: payslip.status,
        locked: payslip.locked,
      },
    });

    await payslip.populate([getEmployeePopulate(), getApprovedByPopulate()]);

    return res.status(201).json({
      message: "Payslip generated successfully.",
      payslip,
    });
  } catch (error) {
    console.error("createPayslip Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "A payslip already exists for this employee and payroll period.",
      });
    }

    if (error.name === "ValidationError") {
      const errors = {};

      for (const [key, value] of Object.entries(error.errors)) {
        errors[key] = value.message;
      }

      return res.status(400).json({
        message: "Payslip validation failed.",
        errors,
      });
    }

    return res.status(500).json({
      message: error.message || "Error generating payslip.",
    });
  }
}
// GET ALL PAYSLIPS

async function getAllPayslips(req, res) {
  try {
    if (!isHRAdmin(req)) {
      return res.status(403).json({
        message: "Access denied. HR or Admin privileges are required.",
      });
    }

    const payslips = await Payslip.find({})
      .populate(getEmployeePopulate())
      .populate(getApprovedByPopulate())
      .sort({
        year: -1,
        month: -1,
        createdAt: -1,
      });

    return res.status(200).json(payslips);
  } catch (error) {
    console.error("getAllPayslips error:", error);

    return res.status(500).json({
      message: "Error fetching payslips.",
      error: error.message,
    });
  }
}

// GET SINGLE PAYSLIP

async function getPayslipById(req, res) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid payslip ID.",
      });
    }

    const payslip = await Payslip.findById(id)
      .populate(getEmployeePopulate())
      .populate(getApprovedByPopulate());

    if (!payslip) {
      return res.status(404).json({
        message: "Payslip not found.",
      });
    }

    if (isHRAdmin(req)) {
      return res.status(200).json(payslip);
    }

    const loggedInUserId = getLoggedInUserId(req);

    if (!loggedInUserId) {
      return res.status(401).json({
        message: "User ID not found.",
      });
    }

    if (!payslip.employee) {
      return res.status(404).json({
        message: "Payslip not found.",
      });
    }

    if (payslip.employee._id.toString() !== loggedInUserId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to view this payslip.",
      });
    }

    if (payslip.status !== "approved") {
      return res.status(404).json({
        message: "Payslip not found.",
      });
    }

    if (!isPayslipReleased(payslip.year, payslip.month)) {
      return res.status(404).json({
        message: "Payslip has not been released yet.",
      });
    }

    return res.status(200).json(payslip);
  } catch (error) {
    console.error("getPayslipById error:", error);

    return res.status(500).json({
      message: "Failed to fetch payslip.",
      error: error.message,
    });
  }
}

// UPDATE PAYSLIP

async function updatePayslip(req, res) {
  try {
    if (!isHRAdmin(req)) {
      return res.status(403).json({
        message: "Access denied. HR or Admin privileges are required.",
      });
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid payslip ID.",
      });
    }

    const payslip = await Payslip.findById(id);

    if (!payslip) {
      return res.status(404).json({
        message: "Payslip not found.",
      });
    }

    if (payslip.status === "approved" || payslip.locked === true) {
      return res.status(400).json({
        message: "Cannot update an approved or locked payslip.",
      });
    }

    const oldValue = {
      basicSalary: payslip.basicSalary,
      allowances: payslip.allowances,
      overtimeAmount: payslip.overtimeAmount,
      deductions: payslip.deductions,
      grossSalary: payslip.grossSalary,
      netSalary: payslip.netSalary,
    };

    const { basicSalary, allowances, overtimeAmount, deductions } = req.body;

    const fields = {
      basicSalary,
      allowances,
      overtimeAmount,
      deductions,
    };

    for (const [key, value] of Object.entries(fields)) {
      // Do not change fields that were not sent.

      if (value === undefined || value === null || value === "") {
        continue;
      }

      const numericValue = Number(value);

      if (!Number.isFinite(numericValue)) {
        return res.status(400).json({
          message: `${key} must be a valid number.`,
        });
      }

      if (!Number.isInteger(numericValue)) {
        return res.status(400).json({
          message: `${key} must be a whole number in fils.`,
        });
      }

      if (numericValue < 0) {
        return res.status(400).json({
          message: `${key} cannot be negative.`,
        });
      }

      payslip[key] = numericValue;
    }

    await payslip.save();

    await AuditLog.create({
      entityType: "Payslip",
      recordId: payslip._id,
      changedBy: getLoggedInUserId(req),
      action: "update",
      reason: "change pay",

      old_value: oldValue,

      new_value: {
        basicSalary: payslip.basicSalary,
        allowances: payslip.allowances,
        overtimeAmount: payslip.overtimeAmount,
        deductions: payslip.deductions,
        grossSalary: payslip.grossSalary,
        netSalary: payslip.netSalary,
      },
    });

    await payslip.populate([getEmployeePopulate(), getApprovedByPopulate()]);

    return res.status(200).json({
      message: "Payslip updated successfully.",
      payslip,
    });
  } catch (error) {
    console.error("=================================");
    console.error("UPDATE PAYSLIP ERROR");
    console.error("Name:", error.name);
    console.error("Message:", error.message);
    console.error("Errors:", error.errors);
    console.error("=================================");

    if (error.name === "ValidationError") {
      const errors = {};

      for (const [key, value] of Object.entries(error.errors)) {
        errors[key] = value.message;
      }

      return res.status(400).json({
        message: "Payslip validation failed.",
        errors,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "A payslip already exists for this employee and payroll period.",
      });
    }

    return res.status(500).json({
      message: error.message || "Error updating payslip.",
    });
  }
}

// APPROVE PAYSLIP

async function approvePayslip(req, res) {
  try {
    if (!isHRAdmin(req)) {
      return res.status(403).json({
        message: "Access denied. HR or Admin privileges are required.",
      });
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid payslip ID.",
      });
    }

    const payslip = await Payslip.findById(id);

    if (!payslip) {
      return res.status(404).json({
        message: "Payslip not found.",
      });
    }

    if (payslip.status === "approved" || payslip.locked === true) {
      return res.status(400).json({
        message: "Payslip is already approved and locked.",
      });
    }

    const loggedInUserId = getLoggedInUserId(req);

    if (!loggedInUserId) {
      return res.status(401).json({
        message: "User ID not found.",
      });
    }

    const oldValue = {
      status: payslip.status,
      locked: payslip.locked,
      approvedBy: payslip.approvedBy,
      approvedAt: payslip.approvedAt,
    };

    payslip.status = "approved";
    payslip.approvedBy = loggedInUserId;
    payslip.approvedAt = new Date();
    payslip.locked = true;

    await payslip.save();

    await AuditLog.create({
      entityType: "Payslip",
      recordId: payslip._id,
      changedBy: loggedInUserId,
      action: "approve",

      old_value: oldValue,

      new_value: {
        status: payslip.status,
        approvedBy: payslip.approvedBy,
        approvedAt: payslip.approvedAt,
        locked: payslip.locked,
      },
    });

    await payslip.populate([getEmployeePopulate(), getApprovedByPopulate()]);

    return res.status(200).json({
      message: "Payslip approved successfully.",
      payslip,
    });
  } catch (error) {
    console.error("approvePayslip error:", error);

    if (error.name === "ValidationError") {
      const errors = {};

      for (const [key, value] of Object.entries(error.errors)) {
        errors[key] = value.message;
      }

      return res.status(400).json({
        message: "Payslip approval validation failed.",
        errors,
      });
    }

    return res.status(500).json({
      message: "Error approving payslip.",
      error: error.message,
    });
  }
}

// DELETE PAYSLIP

async function deletePayslip(req, res) {
  try {
    if (!isHRAdmin(req)) {
      return res.status(403).json({
        message: "Access denied. HR or Admin privileges are required.",
      });
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid payslip ID.",
      });
    }

    const payslip = await Payslip.findById(id);

    if (!payslip) {
      return res.status(404).json({
        message: "Payslip not found.",
      });
    }

    if (payslip.status === "approved" || payslip.locked === true) {
      return res.status(400).json({
        message: "Cannot delete an approved or locked payslip.",
      });
    }

    const oldValue = {
      employee: payslip.employee,
      month: payslip.month,
      year: payslip.year,
      basicSalary: payslip.basicSalary,
      allowances: payslip.allowances,
      overtimeAmount: payslip.overtimeAmount,
      deductions: payslip.deductions,
      grossSalary: payslip.grossSalary,
      netSalary: payslip.netSalary,
      status: payslip.status,
    };

    await Payslip.findByIdAndDelete(id);

    await AuditLog.create({
      entityType: "Payslip",
      recordId: payslip._id,
      changedBy: getLoggedInUserId(req),
      action: "delete",
      old_value: oldValue,
    });

    return res.status(200).json({
      message: "Payslip deleted successfully.",
    });
  } catch (error) {
    console.error("deletePayslip error:", error);

    return res.status(500).json({
      message: "Error deleting payslip.",
      error: error.message,
    });
  }
}

// GET PAYSLIPS BY EMPLOYEE ID

async function getPayslipsByEmployeeId(req, res) {
  try {
    const { employeeId } = req.params;

    if (!isValidObjectId(employeeId)) {
      return res.status(400).json({
        message: "Invalid employee ID.",
      });
    }

    const loggedInUserId = getLoggedInUserId(req);
    const admin = isHRAdmin(req);

    const isSelf =
      loggedInUserId && loggedInUserId.toString() === employeeId.toString();

    if (!admin && !isSelf) {
      return res.status(403).json({
        message: "Access denied. You can only view your own payslips.",
      });
    }

    const query = {
      employee: employeeId,
    };

    // HR / ADMIN

    if (admin) {
      const payslips = await Payslip.find(query)
        .populate(getEmployeePopulate())
        .populate(getApprovedByPopulate())
        .sort({
          year: -1,
          month: -1,
        });

      return res.status(200).json(payslips);
    }

    // EMPLOYEE

    query.status = "approved";

    const payslips = await Payslip.find(query)
      .populate(getEmployeePopulate())
      .populate(getApprovedByPopulate())
      .sort({
        year: -1,
        month: -1,
      });

    const releasedPayslips = payslips.filter((payslip) =>
      isPayslipReleased(payslip.year, payslip.month),
    );

    return res.status(200).json(releasedPayslips);
  } catch (error) {
    console.error("getPayslipsByEmployeeId error:", error);

    return res.status(500).json({
      message: "Error fetching employee payslips.",
      error: error.message,
    });
  }
}

// GET MY PAYSLIPS

async function getMyPayslips(req, res) {
  try {
    const employeeId = getLoggedInUserId(req);

    if (!employeeId) {
      return res.status(401).json({
        message: "User ID not found.",
      });
    }

    const payslips = await Payslip.find({
      employee: employeeId,
      status: "approved",
    })
      .populate(getEmployeePopulate())
      .populate(getApprovedByPopulate())
      .sort({
        year: -1,
        month: -1,
      });

    // 25TH RELEASE RULE

    const releasedPayslips = payslips.filter((payslip) =>
      isPayslipReleased(payslip.year, payslip.month),
    );

    return res.status(200).json(releasedPayslips);
  } catch (error) {
    console.error("getMyPayslips error:", error);

    return res.status(500).json({
      message: "Failed to fetch your payslips.",
      error: error.message,
    });
  }
}

module.exports = {
  createPayslip,
  getAllPayslips,
  getPayslipById,
  updatePayslip,
  approvePayslip,
  deletePayslip,
  getPayslipsByEmployeeId,
  getMyPayslips,
};
