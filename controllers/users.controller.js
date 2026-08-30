const User = require("../models/User")
const Department = require('../models/Department')
const AuditLog = require("../models/AuditLog");
const mongoose = require('mongoose')

const bcrypt = require('bcrypt')

const { initializeLeaveAllocations } = require('../services/leaveAllocationService');


async function generateEmployeeCode() {
    const lastUser = await User.findOne({
        employeeCode: /^EMP-\d+$/,
    })
        .sort({ employeeCode: -1 })
        .select("employeeCode")

    let nextNumber = 1

    if (lastUser) {
        nextNumber =
            parseInt(lastUser.employeeCode.replace("EMP-", ""), 10) + 1
    }

    return `EMP-${String(nextNumber).padStart(4, "0")}`
}

async function createUser(req, res) {
    try {
        const {
            fullName,
            cprNumber,
            gender,
            isBahraini,
            dateOfBirth,
            nationality,
            jobTitle,
            department,
            manager,
            dateOfJoining,
            phoneNumber,
            role,
            personalEmail,
            workEmail,
            password,
            basicSalaryFils,
            workSchedule
        } = req.body

        const employeeCode = await generateEmployeeCode()

        if (!password) {
            return res.status(400).json({
                message: 'Password is required.',
            })
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters.',
            })
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const user = await User.create({
            fullName,
            cprNumber,
            gender,
            isBahraini,
            dateOfBirth,
            employeeCode,
            nationality,
            jobTitle,
            department,
            manager,
            dateOfJoining,
            phoneNumber,
            role,
            personalEmail,
            workEmail,
            hashedPassword,
            basicSalaryFils,
            workSchedule
        })

        const currentYear = new Date().getUTCFullYear();
        // await initializeLeaveAllocations(employee._id, currentYear);
        await initializeLeaveAllocations(user._id, currentYear);

        await AuditLog.create({
            entityType: 'User',
            recordId: user._id,
            changedBy: new mongoose.Types.ObjectId(req.user._id),
            action: 'create',
            new_value: user,
        })

        return res.status(201).json({
            message: 'User created successfully.',
            user: {
                _id: user._id,
                fullName: user.fullName,
                workEmail: user.workEmail,
                role: user.role,
            },
        })
    } catch (err) {
        console.error(err)

        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message })
        }

        if (err.name === 'ValidationError') {
            return res.status(400).json({
                message: err.message,
            })
        }

        if (err.code === 11000) {
            return res.status(409).json({
                message: 'A user with this email, CPR, employee code, or phone number already exists.',
            })
        }

        return res.status(500).json({
            message: 'Internal Server Error',
        })
    }
}

async function getUserById(req, res) {
    try {

        const { userId } = req.params

        if (!userId) {
            return res.status(400).json({
                message: 'User Id is required.',
            })
        }

        const foundUser = await User.findById(userId)
            .select('-hashedPassword')
            .populate({
                path: 'department',
                select: 'departmentName manager',
                populate: {
                    path: 'manager',
                    select: 'fullName employeeCode workEmail',
                },
            })

        if (!foundUser) {
            return res.status(404).json({
                message: 'User not found.',
            })
        }
        return res.status(200).json({ foundUser })

    } catch (err) {
        console.error(err)

        if (err.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid user ID.',
            })
        }

        return res.status(500).json({
            message: 'Internal Server Error',
        })
    }
}

async function getLoggedInInfo(req, res) {
    try {

        const user = await User.findById(req.user._id)
            .select('-hashedPassword')
            .populate({
                path: 'department',
                select: 'departmentName manager',
                populate: {
                    path: 'manager',
                    select: 'fullName employeeCode workEmail',
                },
            })

        if (!user) {
            return res.status(404).json({
                message: 'User not found.',
            })
        }

        return res.status(200).json({
            user: {
                _id: user._id,
                fullName: user.fullName,
                cprNumber: user.cprNumber,
                gender: user.gender,
                isBahraini: user.isBahraini,
                dateOfBirth: user.dateOfBirth,
                employeeCode: user.employeeCode,
                nationality: user.nationality,
                jobTitle: user.jobTitle,

                department: user.department
                    ? {
                        departmentName: user.department.departmentName,
                        manager: user.department.manager
                            ? {
                                fullName: user.department.manager.fullName,
                                employeeCode: user.department.manager.employeeCode,
                                workEmail: user.department.manager.workEmail,
                            }
                            : null,
                    }
                    : null,

                dateOfJoining: user.dateOfJoining,
                phoneNumber: user.phoneNumber,
                dateOfLeaving: user.dateOfLeaving,
                status: user.status,
                role: user.role,
                personalEmail: user.personalEmail,
                workEmail: user.workEmail,
                basicSalaryFils: user.basicSalaryFils,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        })

    } catch (err) {
        console.error(err)

        if (err.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid user ID.',
            })
        }

        return res.status(500).json({
            message: 'Internal Server Error',
        })
    }
}

async function getAllUsers(req, res) {
    try {

        const allUsers = await User.find({}).select('-hashedPassword')
            .populate({
                path: 'department',
                select: 'departmentName manager',
                populate: {
                    path: 'manager',
                    select: 'fullName employeeCode workEmail',
                },
            })

        if (!allUsers) {
            return res.status(404).json({
                message: 'No Users found.',
            })
        }

        return res.status(200).json({ allUsers })

    } catch (err) {

        return res.status(500).json({
            message: 'Internal Server Error',
        })
    }

}

async function deactivateUser(req, res) {
    try {

        const { userId } = req.params

        if (!userId) {
            return res.status(404).json({
                message: 'User not found.',
            })
        }

        const deactivatedUser = await User.findByIdAndUpdate(userId, { status: 'deactivated' }, { new: true })

        await AuditLog.create({
            entityType: 'User',
            recordId: userId,
            changedBy: new mongoose.Types.ObjectId(req.user._id),
            action: 'deactivate',
            new_value: deactivatedUser,
        })

        return res.status(200).json({ deactivatedUser })

    } catch (err) {
        console.error(err)

        if (err.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid user ID.',
            })
        }

        return res.status(500).json({
            message: 'Internal Server Error',
        })
    }
}

async function reactivateUser(req, res) {
    try {

        const { userId } = req.params

        if (!userId) {
            return res.status(404).json({
                message: 'User not found.',
            })
        }

        const reactivatedUser = await User.findByIdAndUpdate(userId, { status: 'active' }, { new: true })

        await AuditLog.create({
            entityType: 'User',
            recordId: userId,
            changedBy: new mongoose.Types.ObjectId(req.user._id),
            action: 'reactivate',
            new_value: reactivatedUser,
        })
        return res.status(200).json({ reactivatedUser })

    } catch (err) {
        console.error(err)

        if (err.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid user ID.',
            })
        }

        return res.status(500).json({
            message: 'Internal Server Error',
        })
    }
}

async function managersTeam(req, res) {
    try {
        const loggedInManager = req.user._id

        if (!loggedInManager) {
            return res.status(404).json({
                message: 'User not found.',
            })
        }

        const foundManager = await User.findById(loggedInManager)

        if (foundManager.role !== 'Manager') {
            return res.status(404).json({
                message: 'Only Managers can view their team',
            })
        }

        const managerDepartment = await Department.findOne({ manager: loggedInManager })

        const departmentEmployees = await User.find({ department: managerDepartment._id }).select('-hashedPassword')

        return res.status(200).json({ departmentEmployees })

    } catch (err) {
        return res.status(500).json({
            message: 'Internal Server Error',
        })
    }
}

async function updateEmployee(req, res) {
    try {
        const { userId } = req.params

        if (!userId) {
            return res.status(404).json({
                message: 'User not found.',
            })
        }

        const {
            fullName,
            cprNumber,
            gender,
            isBahraini,
            dateOfBirth,
            nationality,
            jobTitle,
            department,
            manager,
            dateOfJoining,
            phoneNumber,
            role,
            personalEmail,
            workEmail,
            password,
            basicSalaryFils,
        } = req.body

        const updatedUser = await User.findByIdAndUpdate(userId, {
            fullName,
            cprNumber,
            gender,
            isBahraini,
            dateOfBirth,
            nationality,
            jobTitle,
            department,
            manager,
            dateOfJoining,
            phoneNumber,
            role,
            personalEmail,
            workEmail,
            password,
            basicSalaryFils,
        }, { new: true })

        await AuditLog.create({
            entityType: 'User',
            recordId: userId,
            changedBy: new mongoose.Types.ObjectId(req.user._id),
            action: 'update',
            new_value: updatedUser,
        })

        return res.status(200).json({ updatedUser })

    } catch (err) {
        return res.status(500).json({
            message: 'Internal Server Error',
        })
    }

}
module.exports = { createUser, getUserById, getLoggedInInfo, reactivateUser, deactivateUser, getAllUsers, managersTeam, updateEmployee }