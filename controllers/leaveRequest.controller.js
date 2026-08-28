const mongoose = require('mongoose');
const LeaveRequest = require('../models/leaveRequest');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const Document = require('../models/Document');
const LeaveType = require('../models/leaveType');

const hasOverlappingLeaveRequest = require('../services/hasOverlappingLeaveRequest');
const getConfirmedHolidaysInRange = require('../services/holidayService');

const {
    startOfUTCDay,
    formatDateRange,
} = require('../utils/dateHelpers');

const {
    findLeaveBalance,
    calculateLeaveDetails,
    hasAvailableLeaveBalance,
    getAvailableLeaveYears,
    buildLeaveRequestFilter
} = require('../utils/leaveHelpers');



async function createLeaveRequest(req, res){
    try{
        const {leaveType, startDate, endDate, note, document} = req.body;

        if(!leaveType || !startDate || !endDate){
            return res.status(400).json({message: 'Leave type, start date, and end date are required.'})
        }

        const employee = await User.findById(req.user._id);

        
        if (!employee) {
            return res.status(404).json({message: 'Employee not found.'});
        }

        if(employee.status !== 'active'){
            return res.status(400).json('Only active employees can request leave.');
        }
        if(!employee.manager){
            return res.status(400).json('You must have an assigned manager to request leave.');
        }

        const employeeId = req.user._id;
        const managerId = employee.manager;
        
        const requestStartDate = startOfUTCDay(startDate);
        const requestEndDate = startOfUTCDay(endDate);
        
        const currentDate = startOfUTCDay(new Date());

        if (!requestStartDate || !requestEndDate){
            return res.status(400).json('Invalid start or end date.');
        }
        
        if(requestStartDate < currentDate){
            return res.status(400).json('The leave start date cannot be in the past.');
        }
        if(requestEndDate < requestStartDate){
            return res.status(400).json('The leave end date cannot be before the start date.');
        }
        if(requestStartDate.getUTCFullYear() !== requestEndDate.getUTCFullYear()){
            return res.status(400).json('A leave request cannot span multiple years.');
        }

        const requestedLeaveType = await LeaveType.findById(leaveType);

        if(!requestedLeaveType){
            return res.status(404).json('Leave type not found.');
        } 

        if(!['all', employee.gender].includes(requestedLeaveType.applicableGender)){
            return res.status(400).json({message: 'This leave type is not available for your gender.'});
        }
        
        if(requestedLeaveType.requiresDocument && !document){
            return res.status(400).json({message: 'A supporting document is required for this leave type.'});
        }

        if(document){
            const foundDocument = await Document.findOne({
                _id: document,
                employee: employeeId,
                status: { $in: ['pending', 'verified'] }
            });

            if(!foundDocument){
                return res.status(404).json({message: 'Supporting document not found or does not belong to you.'});
            }
        }

        const hasOverlap = await hasOverlappingLeaveRequest(employeeId, requestStartDate, requestEndDate, ['pending', 'approved']);

        if(hasOverlap){
            return res.status(409).json({message: 'You already have a pending or approved leave request that overlaps these dates.'});
        }
        
        const requestYear = requestStartDate.getUTCFullYear();
        const leaveBalance = findLeaveBalance(employee, requestedLeaveType._id, requestYear);

        if(!leaveBalance){
            return res.status(404).json('Leave balance not found for this type and year.');
        }

        const holidays = await getConfirmedHolidaysInRange(requestStartDate, requestEndDate);

        const leaveDetails = calculateLeaveDetails(
            requestStartDate,
            requestEndDate,
            requestedLeaveType,
            leaveBalance.remainingDays,
            req.settings.workingHours.company_rest_days,
            holidays
        );

        if (!leaveDetails.hasCountedDays) {
            return res.status(400).json('The selected dates do not contain any countable leave days.');
        }

        if (!leaveDetails.isWithinTypeMaximum) {
            return res.status(400).json(`This leave type allows a maximum of ${leaveDetails.maxDaysPerYear} days.`);
        }

        if (!leaveDetails.hasEnoughBalance) {
            return res.status(400).json('Insufficient leave balance.');
        }
        
        let leaveRequest;

        const dateRange = formatDateRange(requestStartDate, requestEndDate);

        /**
         * Apply all leave-request creation changes as one transaction
         * If any operation fails, MongoDB rolls back every change.
         */
        await mongoose.connection.transaction(async(session) => {

            const [createdLeaveRequest] = await LeaveRequest.create([{
                employee: employee._id,
                leaveType,
                startDate: requestStartDate,
                endDate: requestEndDate,
                totalDays: leaveDetails.totalDays,
                note: note || null,
                document: document || null,
                status: 'pending'
            }], {session});

            leaveRequest = createdLeaveRequest;
    
            // Record the newly created leave request:
            await AuditLog.create([{
                entityType: 'LeaveRequest',
                recordId: leaveRequest._id,
                changedBy: employeeId,
                action: 'create',
                old_value: null,
                new_value: {
                    status: 'pending',
                    leaveType: requestedLeaveType._id,
                    startDate: requestStartDate,
                    endDate: requestEndDate,
                    totalDays: leaveDetails.totalDays
                }
            }], {session});
    
    
            // Notify the employee's manager about the new request:
            await Notification.create([{
                recipient: managerId,
                type: 'leave_request_submitted',
                relatedType: 'LeaveRequest',
                relatedRecord: leaveRequest._id,
                message: `${employee.fullName}'s ${requestedLeaveType.type} leave request ${dateRange} is awaiting your review.`
            }], {session});
        });

        return res.status(201).json(leaveRequest);
        
    }catch(error){
        return res.status(500).json('Internal Server Error.');
    }
}

async function getMyLeaveRequests(req, res){
    try{
        const { status, year } = req.query;
        const employee = await User.findById(req.user._id);

        if (!employee) {
            return res.status(404).json({message: 'Employee not found.'});
        }

        let {filter, error} =  buildLeaveRequestFilter(status, year);

        if(error){
            return res.status(400).json({message: error});
        }

        filter = {
            employee: req.user._id,
            ...filter
        }
        
        const leaveRequests = await LeaveRequest.find(filter).populate('leaveType');

        const availableYears = getAvailableLeaveYears(employee);
        const canRequestLeave = employee.status === 'active' && Boolean(employee.manager) && availableYears.length > 0 ;

        return res.status(200).json({leaveRequests, canRequestLeave});

    }catch(error){
       return res.status(500).json('Internal Server Error.');
    }
}

async function getAllLeaveRequests(req, res){
    try{
        const { status, year, department } = req.query;

        if(req.user.role !== 'HR Admin'){
            return res.status(403).json({message:'Only HR Admins can view all leave requests.'});
        }

        const {filter, error} =  buildLeaveRequestFilter(status, year);

        if(error){
            return res.status(400).json({message: error});
        }

        if(department){
            if (!mongoose.Types.ObjectId.isValid(department)) {
                return res.status(400).json({message: 'Invalid department ID.'});
            }
            const employeeIds = await User.find({department}).distinct('_id');

            filter.employee = {$in: employeeIds};
        }

        const leaveRequests = await LeaveRequest.find(filter).populate(
            'employee', 'fullName employeeCode manager department'
        ).populate('leaveType');

        return res.status(200).json(leaveRequests);

    }catch(error){
       return res.status(500).json('Internal Server Error.');
    }
}

async function getTeamLeaveRequests(req, res){
    try{
        const { status, year } = req.query;

        const manager = await User.findOne({_id: req.user._id, role: 'Manager'});
        if(!manager){
            return res.status(403).json({message: 'Only managers can view team leave requests.'})
        }
        
        const {filter, error} =  buildLeaveRequestFilter(status, year);

        if(error){
            return res.status(400).json({message: error});
        }

        const leaveRequests = await LeaveRequest.find(filter).populate(
            'employee', 'fullName employeeCode manager'
        ).populate('leaveType');
        
        const teamLeaveRequests = leaveRequests.filter(leaveRequest => (
            leaveRequest.employee?.manager?.equals(req.user._id)
        ));

        return res.status(200).json(teamLeaveRequests);
    }catch(error){
        return res.status(500).json('Internal Server Error.');
    }
}

async function getLeaveRequestById(req, res){
    try{
        const leaveRequest = await LeaveRequest.findById(req.params.id).populate(
            'employee', 'fullName employeeCode manager jobTitle workEmail'
        ).populate('leaveType');

        if (!leaveRequest) {
            return res.status(404).json('Leave request not found.');
        }

        const isAssignedManager = leaveRequest.employee.manager?.equals(req.user._id) || false;
        const isHRAdmin = req.user.role === 'HR Admin';
        const isOwner = leaveRequest.employee._id.equals(req.user._id);

        if(!isOwner && !isAssignedManager && !isHRAdmin){
            return res.status(403).json({message: 'You are not authorized to view this leave request.'})
        }

        return res.status(200).json(leaveRequest);

    }catch(error){
        return res.status(500).json('Internal Server Error.');
    }
}

async function approveLeaveRequest(req, res){
    try{
        const leaveRequest = await LeaveRequest.findById(req.params.id)
        .populate('employee', 'manager').populate('leaveType');
        
        if (!leaveRequest) {
            return res.status(404).json('Leave request not found.');
        }

        const {startDate, endDate} = leaveRequest;

        const requestStartDate = startOfUTCDay(startDate);
        const requestEndDate = startOfUTCDay(endDate);
        const requestedYear = requestStartDate.getUTCFullYear();

        const employeeId = leaveRequest.employee._id;
        const manager = leaveRequest.employee.manager;
        const leaveTypeId = leaveRequest.leaveType._id;
        
        // Allow only the employee's assigned manager or an HR Admin to approve the request:
        const isAssignedManager = manager?.equals(req.user._id) || false;
        const isHRAdmin = req.user.role === 'HR Admin';

        if(!isAssignedManager && !isHRAdmin){
            return res.status(403).json({message: 'You are not authorized to approve this leave request.'})
        }
        
        if(leaveRequest.status !== 'pending'){
            return res.status(400).json({message: 'Only pending leave requests can be approved.'})
        }

        const hasOverlap = await hasOverlappingLeaveRequest(
            employeeId,
            requestStartDate,
            requestEndDate,
            ['approved'],
            leaveRequest._id
        );
        
        // Prevent approval when another approved request overlaps these dates:
        if(hasOverlap){
            return res.status(409).json({message: 'This employee already has an approved leave request that overlaps these dates.'});
        }

        const employee = await User.findById(employeeId);

        if (!employee) {
            return res.status(404).json({message: 'Employee not found.'});
        }

        const leaveBalance = findLeaveBalance(employee, leaveTypeId, requestedYear);

        if(!leaveBalance){
            return res.status(404).json('Leave balance not found for this type and year.');
        }

        const holidays = await getConfirmedHolidaysInRange(requestStartDate, requestEndDate);

        const leaveDetails = calculateLeaveDetails(
            requestStartDate,
            requestEndDate,
            leaveRequest.leaveType,
            leaveBalance.remainingDays,
            req.settings.workingHours.company_rest_days,
            holidays
        );

        if (!leaveDetails.hasCountedDays) {
            return res.status(400).json('The selected dates do not contain any countable leave days.');
        }

        if (!leaveDetails.isWithinTypeMaximum) {
            return res.status(400).json(`This leave type allows a maximum of ${leaveDetails.maxDaysPerYear} days.`);
        }

        if (!leaveDetails.hasEnoughBalance) {
            return res.status(400).json('Insufficient leave balance.');
        }

        let createdAttendanceIds = [];
        
        /**
         * Apply all approval-related database changes as one transaction.
         * If any operation fails, MongoDB rolls back every change.
         */
        await mongoose.connection.transaction(async(session) => {

            // Reset the array if MongoDB retries the transaction:
            createdAttendanceIds = [];

            /**
             * Recheck the request status inside the transaction.
             * Another manager or HR Admin may have approved or rejected it
             * after the earlier validation but before this transaction started.
             * If it is no longer pending, stop the transaction.
             */
            const currentRequest = await LeaveRequest.findOne({
                _id: leaveRequest._id,
                status: 'pending'
            }).session(session);

            if (!currentRequest) {
                const error =  new Error('This leave request has already been processed and is no longer pending.');
                error.statusCode = 409;
                throw error;
            }

            // Deduct the approved days from the employee's leave balance:
            leaveBalance.remainingDays -= leaveDetails.totalDays;
            await employee.save({session});

            // Mark the leave request as approved and record who approved it:
            leaveRequest.totalDays = leaveDetails.totalDays;
            leaveRequest.status = 'approved';
            leaveRequest.actionedBy = req.user._id;
            leaveRequest.actionedAt = new Date();
            await leaveRequest.save({session});

            
            // Create an On Leave attendance record for each working leave date:
            for(const attendanceDate of leaveDetails.attendanceDates){
                const [attendance] =  await Attendance.create([{
                    date: attendanceDate,
                    employee: employeeId,
                    leaveRequest: leaveRequest._id,
                    status: 'On Leave'
                }], {session});
        
                createdAttendanceIds.push(attendance._id);
            }

            // Record the approval and related changes in the audit log:
            await AuditLog.create([{
                entityType: 'LeaveRequest',
                recordId: leaveRequest._id,
                changedBy: req.user._id,
                action: 'approve',
                old_value: {status: 'pending'},
                new_value: {
                    status: 'approved',
                    deductedDays: leaveDetails.totalDays,
                    createdAttendanceIds
                },
            }], {session});

            const dateRange = formatDateRange(startDate, endDate);
    
            // Notify the employee that the request was approved:
            await Notification.create([{
                recipient: leaveRequest.employee._id,
                type: 'leave_request_approved',
                message: `Your ${leaveRequest.leaveType.type} leave request ${dateRange} has been approved.`
            }], {session});

        });
        
        return res.status(200).json(leaveRequest);

    }catch(error){

        if (error.statusCode) {
            return res.status(error.statusCode).json({message: error.message});
        }

        return res.status(500).json('Internal Server Error.');
    }
}

async function rejectLeaveRequest(req, res){
    try{
        
        const leaveRequest = await LeaveRequest.findById(req.params.id).populate('employee', 'manager').populate('leaveType');

        if (!leaveRequest) {
            return res.status(404).json('Leave request not found.');
        }

        // Allow only the employee's assigned manager or an HR Admin to reject the request:
        const isAssignedManager = leaveRequest.employee.manager?.equals(req.user._id) || false;
        const isHRAdmin = req.user.role === 'HR Admin';
        if(!isAssignedManager && !isHRAdmin){
            return res.status(403).json({message: 'You are not authorized to reject this leave request.'})
        }

        if(leaveRequest.status !== 'pending'){
            return res.status(400).json({message: 'Only pending leave requests can be rejected.'})
        }
        
        const dateRange = formatDateRange(leaveRequest.startDate, leaveRequest.endDate);
        /**
         * Apply all leave-request rejection changes as one transaction.
         * If any operation fails, MongoDB rolls back every change.
         */
        await mongoose.connection.transaction(async (session) => {

            // Mark the request as rejected and record who rejected it:
            leaveRequest.status = 'rejected';
            leaveRequest.actionedBy = req.user._id;
            leaveRequest.actionedAt = new Date();
            await leaveRequest.save({session});


            // Record the rejection in the audit log:
            await AuditLog.create([{
                entityType: 'LeaveRequest',
                recordId: leaveRequest._id,
                changedBy: req.user._id,
                action: 'reject',
                old_value: {status: 'pending'},
                new_value: {status: 'rejected'},
            }], {session});
            
            // Notify the employee that the request was rejected:
            await Notification.create([{
                recipient: leaveRequest.employee._id,
                type: 'leave_request_rejected',
                relatedType: "LeaveRequest",
                relatedRecord: leaveRequest._id,
                message: `Your ${leaveRequest.leaveType.type} leave request ${dateRange} has been rejected.`
            }], {session});
        });

        return res.status(200).json(leaveRequest);

    }catch(error){
        return res.status(500).json('Internal Server Error.');
    }
}


async function cancelLeaveRequest(req, res){
    try{
        const leaveRequest = await LeaveRequest.findById(req.params.id)
        .populate('employee', 'fullName manager')
        .populate('leaveType');

        if (!leaveRequest) {
            return res.status(404).json('Leave request not found.');
        }
        
        const employeeId = leaveRequest.employee._id;
        const managerId = leaveRequest.employee.manager;

        const isOwner = employeeId.equals(req.user._id);
        const isHRAdmin = req.user.role === 'HR Admin';
        
        if(!isOwner && !isHRAdmin){
            return res.status(403).json({message: 'You are not authorized to cancel this leave request.'});
        }

        const previousStatus = leaveRequest.status;
        const previousActionedBy = leaveRequest.actionedBy;
        const previousActionedAt = leaveRequest.actionedAt;

        if (!['pending', 'approved'].includes(previousStatus)) {
            return res.status(400).json({message: 'Only pending or approved leave requests can be cancelled.'});
        }

        const currentDate = startOfUTCDay(new Date());
        const leaveStartDate = startOfUTCDay(leaveRequest.startDate);

        if(currentDate >= leaveStartDate){
            return res.status(400).json({message: 'A leave request cannot be cancelled after the leave has started.'});
        }

        let restoredDays = 0;
        let deletedAttendanceIds = [];
        
        let employee;
        let leaveBalance;
        let originalRemainingDays;

        // Validate that the employee and balance exist before starting:
        if(previousStatus === 'approved'){
            employee = await User.findById(employeeId);
    
            if (!employee) {
                return res.status(404).json({message: 'Employee not found.'});
            }
            
            const requestedYear = leaveRequest.startDate.getUTCFullYear();
    
            leaveBalance = findLeaveBalance(employee, leaveRequest.leaveType._id, requestedYear);
            
            if (!leaveBalance) {
                return res.status(404).json('Leave balance not found for this type and year.');
            }

            originalRemainingDays = leaveBalance.remainingDays;
        }
        
        const dateRange = formatDateRange(leaveRequest.startDate, leaveRequest.endDate);

        await mongoose.connection.transaction(async (session) => {
            restoredDays = 0;
            deletedAttendanceIds = [];

            // Restore the balance and remove generated attendance when cancelling an approved request.
            if(previousStatus === 'approved'){
                const attendanceRecords = await Attendance.find({
                    leaveRequest: leaveRequest._id,
                    employee: employeeId,
                    status: 'On Leave'
                }).select('_id').session(session);
    
                deletedAttendanceIds = attendanceRecords.map(record => record._id);
        
                await Attendance.deleteMany({
                    leaveRequest: leaveRequest._id,
                    employee: employeeId,
                    status: 'On Leave'
                }).session(session);
        
                leaveBalance.remainingDays = originalRemainingDays + leaveRequest.totalDays;
                restoredDays = leaveRequest.totalDays;
                await employee.save({session});
            }

            leaveRequest.status = 'cancelled';
            leaveRequest.actionedBy = req.user._id;
            leaveRequest.actionedAt = new Date();
            await leaveRequest.save({session});
            
            // Record the cancellation and its related changes:
            await AuditLog.create([{
                entityType: 'LeaveRequest',
                recordId: leaveRequest._id,
                action: 'cancel',
                changedBy: req.user._id,
                old_value: {
                    status: previousStatus,
                    actionedBy: previousActionedBy,
                    actionedAt: previousActionedAt
                },
                new_value:{
                    status: 'cancelled',
                    actionedBy: leaveRequest.actionedBy,
                    actionedAt: leaveRequest.actionedAt,
                    restoredDays,
                    deletedAttendanceIds
                }
            }], {session});

            const notification = {
                type: 'leave_request_cancelled',
                relatedType:'LeaveRequest',
                relatedRecord: leaveRequest._id,
            };

            if(isOwner){
                // Employee cancellation notifies the assigned manager:
                await Notification.create([{
                    ...notification,
                    recipient: managerId,
                    message: `${leaveRequest.employee.fullName}'s ${leaveRequest.leaveType.type} leave request ${dateRange} has been cancelled.`
                }], {session});
    
            }else{
                // HR cancellation notifies both the employee and assigned manager:

                await Notification.create([
                    {
                        ...notification,
                        recipient: employeeId,
                        message: `Your ${leaveRequest.leaveType.type} leave request ${dateRange} has been cancelled by HR.`
                    },
                    {
                        ...notification,
                        recipient: managerId,
                        message: `${leaveRequest.employee.fullName}'s ${leaveRequest.leaveType.type} leave request ${dateRange} has been cancelled by HR.`
                    }

                ], {session});  

            }

        });

        return res.status(200).json(leaveRequest);

    }catch(error){
        return res.status(500).json('Internal Server Error.');
    }
}

async function getLeaveRequestOptions(req, res){
    
    try{
        const employee = await User.findById(req.user._id);
        const currentYear = (new Date()).getUTCFullYear();
        const requestedYear = req.query.year === undefined ? currentYear : Number(req.query.year);

        if(!Number.isInteger(requestedYear) || requestedYear < currentYear || requestedYear > 2100){
            return res.status(400).json({message: `Year must be a whole number between ${currentYear} and 2100.`});
        }

        if(!employee){
            return res.status(404).json({message: 'Employee not found.'});
        }
    
        const applicableLeaveTypes = await LeaveType.find({applicableGender: {$in: ['all', employee.gender]}})
        .select('_id type maxDaysPerYear payFraction requiresDocument includesHolidays');
    
        const leaveTypes = applicableLeaveTypes.map(leaveType => {
            const leaveBalance = findLeaveBalance(
                employee,
                leaveType._id,
                requestedYear
            );

            return {
                ...leaveType.toObject(),
                remainingDays: leaveBalance?.remainingDays ?? 0,
                hasBalance: Boolean(leaveBalance)
            };
        });

        const yearStart = new Date(Date.UTC(requestedYear, 0, 1));
        const nextYearStart = new Date(Date.UTC(requestedYear + 1, 0, 1));
        
        const reservedDateRanges = await LeaveRequest.find({
            employee: employee._id,
            status: {$in: ['pending', 'approved']},
            startDate: {$lt: nextYearStart},
            endDate: {$gte: yearStart}
        }).select('-_id startDate endDate').lean();// Returns plain objects

        
        let message = null;
        
        if (employee.status !== 'active') {
            message = 'Only active employees can request leave.';
        } else if (!employee.manager) {
            message = 'You must have an assigned manager to request leave.';
        } else if (!hasAvailableLeaveBalance(employee, requestedYear)) {
            message = `You do not have an available leave balance for ${requestedYear}.`;
        }
        const canRequestForYear = message === null;

        const availableYears = getAvailableLeaveYears(employee);

        
        return res.status(200).json({
            requestedYear,
            availableYears,
            canRequestForYear,
            message,
            leaveTypes,
            reservedDateRanges
        });
       
    }catch(error){
        return res.status(500).json('Internal Server Error.');
    }

}


module.exports = {
    getLeaveRequestOptions,
    createLeaveRequest,
    getMyLeaveRequests,
    getAllLeaveRequests,
    getTeamLeaveRequests,
    getLeaveRequestById,
    approveLeaveRequest,
    rejectLeaveRequest,
    cancelLeaveRequest
}