const User = require('../models/User');
const LeaveType = require('../models/leaveType');
const LeaveAllocation = require('../models/LeaveAllocation');

// Create the employee's leave allocations for the selected year:
async function initializeLeaveAllocations(employeeId, year, session = null){

    if(!Number.isInteger(year) || year < 2000 || year > 2100){
        const error = new Error(
            'Year must be a whole number between 2000 and 2100.',
        );

        error.statusCode = 400;
        throw error;
    }

    const employee = await User.findById(employeeId).session(session);

    if(!employee){
        const error = new Error('Employee not found.');
        error.statusCode = 404;
        throw error;
    }

    if(employee.status !== 'active'){
        const error = new Error('Leave allocations can only be created for active employees.');
        error.statusCode = 400;
        throw error;
    }


    const periodStart = new Date(Date.UTC(year, 0, 1));
    const periodEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const leaveTypes = await LeaveType.find({applicableGender: {$in: ['all', employee.gender]}}).session(session);

    for(const leaveType of leaveTypes){
        let daysCarriedForward = 0;

        // Carry unused annual days from last year:
        if(leaveType.carryForward && leaveType.maxCarryForward > 0){

            const previousPeriodStart = new Date(Date.UTC(year-1, 0, 1));

            const previousAllocation = await LeaveAllocation.findOne({
                employee: employeeId,
                leaveType: leaveType._id,
                periodStart: previousPeriodStart
            }).session(session);

    
            if(previousAllocation){
                daysCarriedForward = Math.min(previousAllocation.remainingDays, leaveType.maxCarryForward);
            }
        }

        const filter = {
            employee: employeeId,
            leaveType: leaveType._id,
            periodStart,
            periodEnd
        };

        const existingAllocation = await LeaveAllocation.findOne(filter).session(session);

        // Create the balance if it does not exist:
        if(!existingAllocation){
            await LeaveAllocation.create([{
                ...filter,
                daysAllocated: leaveType.maxDaysPerYear,
                daysCarriedForward,
                daysTaken: 0,
            }], {session});
        }
    }

    const allocations = await LeaveAllocation.find({
        employee: employeeId,
        periodStart,
        periodEnd,
    }).populate('leaveType').session(session);

    return allocations;
}

async function useAllocationDays(allocationId, days, session = null){

    const allocation = await LeaveAllocation.findById(allocationId).session(session);

    if(!allocation){
        const error = new Error('Leave allocation not found.');
        error.statusCode = 404;
        throw error;
    }
    
    if(allocation.remainingDays < days){
        const error = new Error('Insufficient leave balance.');
        error.statusCode = 400;
        throw error;
    }
    
    allocation.daysTaken += days;
    
    await allocation.save({session});

    return allocation;
}



async function restoreAllocationDays(allocationId, days, session = null){
    
    const allocation = await LeaveAllocation.findById(allocationId).session(session);
    
    if(!allocation){
        const error = new Error('Leave allocation not found.');
        error.statusCode = 404;
        throw error;
    }
    
    if(allocation.daysTaken < days){
        const error = new Error('Cannot restore more days than were taken.');
        error.statusCode = 400;
        throw error;
    }
    
    allocation.daysTaken -= days;
    
    await allocation.save({session});
    
    return allocation;

}

async function calculateLeaveAllocationBreakdown(employeeId, startingLeaveTypeId, dates, session = null){

    if(!Array.isArray(dates) || dates.length === 0){
        const error = new Error('Leave dates are required.');
        error.statusCode = 400;
        throw error;
    }

    // Get the leave year from the first date:
    const requestYear = new Date(dates[0]).getUTCFullYear();

    // Do not allow the request to cross into another year:
    const crossesLeaveYear = dates.some((date) => requestYear !== new Date(date).getUTCFullYear());

    if(crossesLeaveYear){
        const error = new Error('A leave request cannot cross leave years.');
        error.statusCode = 400;
        throw error;
    }

    // Start with the selected leave type:
    let currentLeaveType = await LeaveType.findById(startingLeaveTypeId).session(session);

    if(!currentLeaveType){
        const error = new Error('Leave type not found.');
        error.statusCode = 404;
        throw error;
    }

    const remainingDates = [...dates];
    const allocationBreakdown = [];


    while(remainingDates.length > 0){
        const requestDate = remainingDates[0];

        const allocation = await LeaveAllocation.findOne({
            employee: employeeId, 
            leaveType: currentLeaveType._id,
            periodStart: {$lte: requestDate},
            periodEnd: {$gte: requestDate}
        }).session(session);


        if(!allocation){
            const error = new Error(`Leave allocation not found for ${currentLeaveType.type}.`);
            error.statusCode = 404;
            throw error;
        }

        // Use only the days that this balance can cover:
        const daysToUse = Math.min(allocation.remainingDays, remainingDates.length);

        if(daysToUse > 0){

            // Take the covered dates out of the remaining dates:
            const allocatedDates = remainingDates.splice(0, daysToUse);

            allocationBreakdown.push({
                leaveAllocation: allocation._id,
                days: daysToUse,
                dates: allocatedDates,
                payFraction: currentLeaveType.payFraction,
            });
        }

        if(remainingDates.length === 0){
            break;
        }

        // The current balance is not enough, so another linked type is needed:
        if(!currentLeaveType.nextLeaveType){
            const error = new Error('Insufficient leave balance.');
            error.statusCode = 400;
            throw error;
        }
        
        // Move to the next leave type:
        currentLeaveType = await LeaveType.findById(currentLeaveType.nextLeaveType).session(session);

        if(!currentLeaveType){
            const error = new Error('The next linked leave type was not found.');
            error.statusCode = 404;
            throw error;
        }

    }

    
    return allocationBreakdown;

}


// Get the years where the employee still has leave available:
async function getAvailableAllocationYears(employeeId, session = null){

    const currentYear = new Date().getUTCFullYear();
    const currentPeriodStart = new Date(Date.UTC(currentYear, 0, 1));

    // Do not include allocations from previous years:
    const allocations = await LeaveAllocation.find({
        employee: employeeId,
        periodStart: {$gte: currentPeriodStart}
    }).session(session);

    // Keep years with at least half a day remaining:
    let years = allocations.filter(allocation =>( 
        allocation.remainingDays >= 0.5
    )).map(allocation => (
        allocation.periodStart.getUTCFullYear()
    ));

    // Remove repeated years and sort them:
    years = [...new Set(years)].sort((a, b) => a - b);

    return years;
}

module.exports = {
  initializeLeaveAllocations,
  useAllocationDays,
  restoreAllocationDays,
  calculateLeaveAllocationBreakdown,
  getAvailableAllocationYears
};
