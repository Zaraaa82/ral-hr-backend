const {startOfUTCDay} = require('./dateHelpers');


const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday','thursday', 'friday', 'saturday'];

function calculateLeaveDetails(startDate, endDate, leaveType, companyRestDays, holidays){

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

    const hasCountedDays = totalDays > 0;

    return {
        calendarDays,
        restDayCount,
        publicHolidayCount,
        excludedDayCount,
        totalDays,
        hasCountedDays,
        deductedDates,
        attendanceDates,
        excludedDates
    };

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


function calculateCompletedServiceMonths(dateOfJoining, requestStartDate){

    const joiningDate = startOfUTCDay(dateOfJoining);
    const leaveStartDate = startOfUTCDay(requestStartDate);

    const joiningYear = joiningDate.getUTCFullYear();
    const joiningMonth = joiningDate.getUTCMonth();
    const joiningDay = joiningDate.getUTCDate();

    const leaveStartYear = leaveStartDate.getUTCFullYear();
    const leaveStartMonth = leaveStartDate.getUTCMonth();
    const leaveStartDay = leaveStartDate.getUTCDate();

    let completedMonths = (leaveStartYear - joiningYear) * 12 + (leaveStartMonth - joiningMonth);

    // The current month is not complete until the joining day is reached:
    if(leaveStartDay < joiningDay){
        completedMonths -= 1;
    }

    return Math.max(completedMonths, 0);
}

module.exports = {
    calculateLeaveDetails,
    buildLeaveRequestFilter,
    calculateCompletedServiceMonths
};