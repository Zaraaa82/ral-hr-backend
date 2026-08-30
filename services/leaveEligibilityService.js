const LeaveType = require('../models/leaveType');
const LeaveAllocation = require('../models/LeaveAllocation');
const LeaveRequest = require('../models/leaveRequest');

const {calculateCompletedServiceMonths} = require('../utils/leaveHelpers');

async function getRequestableLeaveTypes(employee, year){

    // Return no options if the employee cannot request leave:
    if(employee.status !== 'active' || !employee.manager){
        return [];
    }

    const periodStart = new Date(Date.UTC(year, 0, 1));
    const periodEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    
    
    // Get leave types available for the employee's gender:
    const leaveTypes = await LeaveType.find({applicableGender: {$in: ['all', employee.gender]}});

    // Get the employee's leave balances for the selected year:
    const allocations = await LeaveAllocation.find({
        employee: employee._id,
        periodStart,
        periodEnd
    });

    // Get the employee's pending and approved leave requests:
    const previousRequests = await LeaveRequest.find({
        employee: employee._id, 
        status: {$in: ['pending', 'approved']}
    }).select('leaveType');

    // Keep only their leave type IDs:
    const previouslyRequestedTypeIds = previousRequests.map(request => request.leaveType.toString());

    // Calculate the employee's completed service as of today:
    const today = new Date();
    const completedServiceMonths = calculateCompletedServiceMonths(employee.dateOfJoining, today);

    // Get the types that should not be selected directly:
    const rolloverLeaveTypeIds = leaveTypes.filter(leaveType => (
        leaveType.nextLeaveType
    )).map(leaveType => leaveType.nextLeaveType.toString());



    const requestableLeaveTypes = [];

    for(const leaveType of leaveTypes){

        const leaveTypeId = leaveType._id.toString();

        // Skip types that are reached through rollover:
        if(rolloverLeaveTypeIds.includes(leaveTypeId)){
            continue;
        }
        // Skip types that require more completed service:
        if(completedServiceMonths < leaveType.requiresServiceMonths){
            continue;
        }

        // Skip once only types already pending or approved:
        if(leaveType.oncePerLifetime && previouslyRequestedTypeIds.includes(leaveTypeId)){
            continue;
        }

        let currentLeaveType = leaveType;
        let totalRemainingDays = 0;
        const balanceBreakdown = [];

        // Follow the leave type until there is no next type:
        while(currentLeaveType){

            const allocation = allocations.find(allocation => (allocation.leaveType.equals(currentLeaveType._id)));

            const remainingDays = allocation?.remainingDays ?? 0;

            totalRemainingDays += remainingDays;

            balanceBreakdown.push({
                leaveType: currentLeaveType._id,
                type: currentLeaveType.type,
                remainingDays,
                payFraction: currentLeaveType.payFraction
            });

            if(!currentLeaveType.nextLeaveType){
                break;
            }

            currentLeaveType = leaveTypes.find(nextType => nextType._id.equals(currentLeaveType.nextLeaveType));
        }

        // Skip the option if none of its balances have days left:
        if(totalRemainingDays < 0.5){
            continue;
        }

        const displayName =  leaveType.type === 'Sick (Full Pay)' ? 'Sick' : leaveType.type;

        // Add the leave type to the frontend options:
        requestableLeaveTypes.push({
            _id: leaveType._id,
            type: leaveType.type,
            displayName,
            totalRemainingDays,
            restrictions: {
                requiresDocument: leaveType.requiresDocument,
                includesHolidays: leaveType.includesHolidays,
                requiresServiceMonths: leaveType.requiresServiceMonths,
                oncePerLifetime: leaveType.oncePerLifetime
            },
            balanceBreakdown
        });
    }

    return requestableLeaveTypes;

}

module.exports = {
    getRequestableLeaveTypes
};