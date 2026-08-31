const mongoose = require('mongoose');
const LeaveType = require('../models/leaveType');


// Get all leave types
async function getLeaveTypes(req, res) {
    try {
        const leaveTypes = await LeaveType.find().sort({type: 1});

        return res.status(200).json(leaveTypes);

    } catch (error) {
        console.error('getLeaveTypes:', error);

        return res.status(500).json({message: 'Error retrieving leave types.'});
    }
}


// Get one leave type
async function getLeaveTypeById(req, res) {
    try {
        const {id} = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({message: 'Invalid leave type ID.'});
        }

        const leaveType = await LeaveType.findById(id);

        if (!leaveType) {
            return res.status(404).json({message: 'Leave type not found.'});
        }

        return res.status(200).json(leaveType);

    } catch (error) {
        console.error('getLeaveTypeById:', error);

        return res.status(500).json({message: 'Error retrieving leave type.'});
    }
}


module.exports = {
    getLeaveTypes,
    getLeaveTypeById
};