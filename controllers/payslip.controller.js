const mongoose = require("mongoose");
const Payslip = require("../models/Payslip");

// CREATE PAYSLIP = HR Admin only

const createPayslip = async (req, res) => {
  try {
    const {
      employee,
      month,
      year,
      basicSalary,
      allowances,
      overtimeAmount,
      deductions,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(employee)) {
      return res.status(400).json({
        message: "Invalid employee ID.",
      });
    }

    if (
      !Number.isInteger(Number(month)) ||
      Number(month) < 1 ||
      Number(month) > 12
    ) {
      return res.status(400).json({
        message: "Month must be a whole number between 1 and 12.",
      });
    }

    if (
      !Number.isInteger(Number(year)) ||
      Number(year) < 2000 ||
      Number(year) > 2100
    ) {
      return res.status(400).json({
        message: "Year must be a whole number between 2000 and 2100.",
      });
    }

    const existingPayslip = await Payslip.findOne({
      employee,
      month: Number(month),
      year: Number(year),
    });

    if (existingPayslip) {
      return res.status(400).json({
        message: "Payslip already exists for this month and year.",
      });
    }

    const payslip = await Payslip.create({
      employee,
      month: Number(month),
      year: Number(year),
      basicSalary: Number(basicSalary) || 0,
      allowances: Number(allowances) || 0,
      overtimeAmount: Number(overtimeAmount) || 0,
      deductions: Number(deductions) || 0,
    });

    const populatedPayslip = await Payslip.findById(payslip._id)
      .populate(
        "employee",
        "fullName employeeCode personalEmail workEmail department",
      )
      .populate("employee.department", "name");

    return res.status(201).json({
      message: "Payslip created successfully.",
      payslip: populatedPayslip,
    });
  } catch (error) {
    console.error("createPayslip:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Payslip already exists for this employee and month.",
      });
    }

    return res.status(500).json({
      message: "Error creating payslip.",
      error: error.message,
    });
  }
};

// GET ALL PAYSLIPS. == HR Admin -> all payslips || Employee -> own payslips

const getAllPayslips = async (req, res) => {
  try {
    const query = {};

    if (req.user.role !== "HR Admin") {
      query.employee = req.user._id;
    }

    const payslips = await Payslip.find(query)
      .populate(
        "employee",
        "fullName employeeCode personalEmail workEmail department",
      )
      .populate("employee.department", "name")
      .populate("approvedBy", "fullName employeeCode workEmail")
      .sort({
        year: -1,
        month: -1,
      });

    return res.status(200).json(payslips);
  } catch (error) {
    console.error("getAllPayslips:", error);

    return res.status(500).json({
      message: "Error fetching payslips.",
      error: error.message,
    });
  }
};

const getPayslipById = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id)
      .populate(
        "employee",
        "fullName employeeCode personalEmail workEmail department",
      )
      .populate("employee.department", "name")
      .populate("approvedBy", "fullName employeeCode workEmail");

    if (!payslip) {
      return res.status(404).json({
        message: "Payslip not found.",
      });
    }

    if (
      req.user.role !== "HR Admin" &&
      payslip.employee._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "You are not authorized to view this payslip.",
      });
    }

    return res.status(200).json(payslip);
  } catch (error) {
    console.error("getPayslipById:", error);

    return res.status(500).json({
      message: "Error fetching payslip.",
      error: error.message,
    });
  }
};

// UPDATE PAYSLIP == HR Admin only

const updatePayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id);

    if (!payslip) {
      return res.status(404).json({
        message: "Payslip not found.",
      });
    }

    if (payslip.status === "approved") {
      return res.status(400).json({
        message: "Cannot update an approved payslip.",
      });
    }

    const { basicSalary, allowances, overtimeAmount, deductions } = req.body;

    if (basicSalary !== undefined) {
      const value = Number(basicSalary);

      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          message: "Basic salary must be a non-negative number.",
        });
      }

      payslip.basicSalary = value;
    }

    if (allowances !== undefined) {
      const value = Number(allowances);

      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          message: "Allowances must be a non-negative number.",
        });
      }

      payslip.allowances = value;
    }

    if (overtimeAmount !== undefined) {
      const value = Number(overtimeAmount);

      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          message: "Overtime amount must be a non-negative number.",
        });
      }

      payslip.overtimeAmount = value;
    }

    if (deductions !== undefined) {
      const value = Number(deductions);

      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          message: "Deductions must be a non-negative number.",
        });
      }

      payslip.deductions = value;
    }

    const updatedPayslip = await payslip.save();

    const populatedPayslip = await Payslip.findById(updatedPayslip._id)
      .populate(
        "employee",
        "fullName employeeCode personalEmail workEmail department",
      )
      .populate("employee.department", "name");

    return res.status(200).json({
      message: "Payslip updated successfully.",
      payslip: populatedPayslip,
    });
  } catch (error) {
    console.error("updatePayslip:", error);

    return res.status(500).json({
      message: "Error updating payslip.",
      error: error.message,
    });
  }
};

// APPROVE PAYSLIP == HR Admin only

const approvePayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id);

    if (!payslip) {
      return res.status(404).json({
        message: "Payslip not found.",
      });
    }

    if (payslip.status === "approved") {
      return res.status(400).json({
        message: "Payslip is already approved.",
      });
    }

    payslip.status = "approved";
    payslip.approvedBy = req.user._id;
    payslip.approvedAt = new Date();

    const approvedPayslip = await payslip.save();

    const populatedPayslip = await Payslip.findById(approvedPayslip._id)
      .populate(
        "employee",
        "fullName employeeCode personalEmail workEmail department",
      )
      .populate("employee.department", "name")
      .populate("approvedBy", "fullName employeeCode workEmail");

    return res.status(200).json({
      message: "Payslip approved successfully.",
      payslip: populatedPayslip,
    });
  } catch (error) {
    console.error("approvePayslip:", error);

    return res.status(500).json({
      message: "Error approving payslip.",
      error: error.message,
    });
  }
};

// DELETE PAYSLIP == HR Admin only

const deletePayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id);

    if (!payslip) {
      return res.status(404).json({
        message: "Payslip not found.",
      });
    }

    if (payslip.status === "approved") {
      return res.status(400).json({
        message: "Cannot delete an approved payslip.",
      });
    }

    await Payslip.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "Payslip deleted successfully.",
    });
  } catch (error) {
    console.error("deletePayslip:", error);

    return res.status(500).json({
      message: "Error deleting payslip.",
      error: error.message,
    });
  }
};

module.exports = {
  createPayslip,
  getAllPayslips,
  getPayslipById,
  updatePayslip,
  approvePayslip,
  deletePayslip,
};
