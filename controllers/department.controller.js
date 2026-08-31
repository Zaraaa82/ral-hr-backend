const Department = require('../models/Department')
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const mongoose = require('mongoose')


async function createDepartment(req, res) {
    try {
        const { departmentName, manager } = req.body

        if (!departmentName) {
            return res.status(400).json({
                message: 'Department Name is required.',
            })
        }

        const createdDepartment = Department.create({
            departmentName,
            manager
        })

        await AuditLog.create({
            entityType: 'Department',
            recordId: createdDepartment._id,
            changedBy: new mongoose.Types.ObjectId(req.user._id),
            action: 'create',
            new_value: createdDepartment,
        })

        return res.status(201).json({
            message: 'Department created successfully.',
            createdDepartment
        })

    } catch (err) {
        console.error(err)

        if (err.name === 'ValidationError') {
            return res.status(400).json({
                message: err.message,
            })
        }

        return res.status(500).json({
            message: 'Internal Server Error',
        })
    }
}

async function getDepById(req, res) {
    try {

        const { depId } = req.params

        if (!depId) {
            return res.status(400).json({
                message: 'Department Id is required.',
            });
        }

        const foundDep = await Department.findById(depId).populate('manager')

        if (!foundDep) {
            return res.status(404).json({
                message: 'Department not found.',
            });
        }
        return res.status(200).json({ foundDep })

    } catch (err) {
        console.error(err);

        if (err.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid department ID.',
            });
        }

        return res.status(500).json({
            message: 'Internal Server Error',
        });
    }
}

async function getAllDepartments(req, res) {
    try {

        const allDepartments = await Department.find({}).populate('manager')

        if (!allDepartments) {
            return res.status(404).json({
                message: 'There is no Departments.',
            });
        }
        return res.status(200).json({ allDepartments })

    } catch (err) {
        console.error(err);

        if (err.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid department ID.',
            });
        }

        return res.status(500).json({
            message: 'Internal Server Error',
        });
    }
}

async function updateDepartment(req, res) {
    try {
        const { depId } = req.params;
        const { departmentName, manager } = req.body;

        if (!departmentName && !manager) {
            return res.status(400).json({
                message: 'Department name or manager ID is required.',
            });
        }

        const department = await Department.findById(depId);

        if (!department) {
            return res.status(404).json({
                message: 'Department not found.',
            });
        }
        const oldValue = department.toObject();
        if (departmentName) {
            department.departmentName = departmentName.trim();
        }

        if (manager) {
            const managerUser = await User.findById(manager);

            if (!managerUser) {
                return res.status(404).json({
                    message: 'Manager not found.',
                });
            }

            if (managerUser.role !== 'Manager') {
                return res.status(400).json({
                    message: 'Selected user must have the Manager role.',
                });
            }

            department.manager = managerUser._id;
        }

        await department.save();

        await department.populate(
            'manager',
            'fullName employeeCode workEmail'
        );

        await AuditLog.create({
            entityType: 'Department',
            recordId: depId,
            changedBy: new mongoose.Types.ObjectId(req.user._id),
            action: 'update',
            old_value: oldValue,
            new_value: department,
        })

        return res.status(200).json({
            message: 'Department updated successfully.',
            department: {
                _id: department._id,
                departmentName: department.departmentName,
                manager: department.manager
                    ? {
                        _id: department.manager._id,
                        fullName: department.manager.fullName,
                        employeeCode: department.manager.employeeCode,
                        workEmail: department.manager.workEmail,
                    }
                    : null,
            },
        });
    } catch (err) {
        console.error(err);

        if (err.name === 'ValidationError') {
            return res.status(400).json({
                message: err.message,
            });
        }

        if (err.code === 11000) {
            return res.status(409).json({
                message: 'Department name already exists.',
            });
        }

        return res.status(500).json({
            message: 'Internal Server Error',
        });
    }
}


module.exports = { createDepartment, updateDepartment, getDepById, getAllDepartments }