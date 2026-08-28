const {startOfUTCDay} = require('./dateHelpers');

function findLeaveBalance(employee, leaveTypeId, year){

    const leaveBalance = employee.leaveBalances.find(balance => (
        balance.leaveType.equals(leaveTypeId) &&
        balance.year === year
    ));

    return leaveBalance;
}

const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday','thursday', 'friday', 'saturday'];

function calculateLeaveDetails(startDate, endDate, leaveType, remainingDays, companyRestDays, holidays){

    const currentDate = startOfUTCDay(startDate);
    const lastDate = startOfUTCDay(endDate);


    companyRestDays = companyRestDays.map(day => day.toLowerCase());

    let calendarDays = 0;
    let restDayCount= 0;
    let publicHolidayCount= 0;
    let excludedDayCount= 0;
    let totalDays = 0;


    const deductedDates = [];
    const attendanceDates = [];
    const excludedDates = [];

    while(currentDate <= lastDate){

        const dayName = daysOfWeek[currentDate.getUTCDay()];
        
        const matchedConfirmedHoliday = holidays.find(holiday => (
            startOfUTCDay(holiday.date).getTime() === currentDate.getTime()
        ));

        const isRestDay = companyRestDays.includes(dayName);
        const isConfirmedHoliday = Boolean(matchedConfirmedHoliday);
        const isNonWorkingDay = isRestDay || isConfirmedHoliday;

        if(isRestDay){
            restDayCount += 1;
        }

        if(isConfirmedHoliday){
            publicHolidayCount += 1 ;
        }

        // Only working days should receive On Leave attendance.
        if (!isNonWorkingDay) {
            attendanceDates.push(new Date(currentDate));
        }
        
        // Count non-working days only when this leave type includes holidays.
        if(leaveType.includesHolidays || !isNonWorkingDay){
            deductedDates.push(new Date(currentDate));
        }else{
            excludedDayCount += 1; 
            excludedDates.push(new Date(currentDate));
        }


        calendarDays += 1;

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    totalDays = deductedDates.length;

    const isWithinTypeMaximum = totalDays <= leaveType.maxDaysPerYear;
    const hasEnoughBalance = totalDays <= remainingDays;
    const hasCountedDays = totalDays > 0;
    const canRequest = isWithinTypeMaximum && hasEnoughBalance && hasCountedDays;

    return {
        calendarDays,
        restDayCount,
        publicHolidayCount,
        excludedDayCount,
        totalDays,
        maxDaysPerYear: leaveType.maxDaysPerYear,
        remainingDays,
        isWithinTypeMaximum,
        hasEnoughBalance,
        hasCountedDays,
        canRequest,
        deductedDates,
        attendanceDates,
        excludedDates
    };

}

function hasAvailableLeaveBalance(employee, year){
    return employee.leaveBalances.some(balance => (
        balance.year === year &&
        balance.remainingDays >= 0.5
    ))
}

function getAvailableLeaveYears(employee) {
    const currentYear = new Date().getUTCFullYear();

    const leaveBalances = employee.leaveBalances.filter(balance => (
        balance.year >= currentYear &&
        balance.remainingDays >= 0.5
    ));

    let leaveBalanceYears = leaveBalances.map(balance => balance.year);
    leaveBalanceYears = [... new Set(leaveBalanceYears)].sort((a,b)=> a-b);

    return leaveBalanceYears;
}


function buildLeaveRequestFilter(status, year) {
    const filter = {};

    if (status) {
        const allowedStatuses = ['draft', 'pending', 'approved', 'rejected', 'cancelled'];

        if (!allowedStatuses.includes(status)) {
            return {error: 'Invalid leave request status.'};
        }

        filter.status = status;
    }

    if (year) {
        const requestedYear = Number(year);

        if (!Number.isInteger(requestedYear) || requestedYear < 2000 || requestedYear > 2100) {
            return {error: 'Year must be a whole number between 2000 and 2100.'};
        }

        const yearStart = new Date(Date.UTC(requestedYear, 0, 1));

        const nextYearStart = new Date(Date.UTC(requestedYear + 1, 0, 1));

        filter.startDate = {$gte: yearStart, $lt: nextYearStart
        };
    }

    return {
        filter,
        error: null
    };
}



module.exports = {
    findLeaveBalance,
    calculateLeaveDetails,
    hasAvailableLeaveBalance,
    getAvailableLeaveYears,
    buildLeaveRequestFilter
};