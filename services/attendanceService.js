const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Holiday = require('../models/Holiday');

const {
  isWorkingDay,
  getAttendanceDate,
} = require('../utils/attendanceHelpers');




async function getConfirmedHoliday(date, settings){
    // Normalize the date using the configured company timezone:
    const dayStart = getAttendanceDate(date, settings);

    const nextDayStart = new Date(dayStart);

    nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);

    const holiday = await Holiday.findOne({
        date: {$gte: dayStart, $lt: nextDayStart},
        isConfirmed: true,
    }).select('_id name');

    return holiday;
}



/**
 * Finalizes employee attendance for one calendar day.
 *
 * For every active employee, the service:
 * - Creates Holiday attendance on confirmed public holidays.
 * - Creates Weekly Off attendance on company rest days.
 * - Creates Absent attendance on working days without clock-in.
 * - Adds missingTimeOut when the employee did not clock out.
 * - Preserves existing On Leave, Holiday, and Weekly Off records.
 *
 * params:
 *  - settings: The current company settings.
 *  - Date: The day to finalize.
 *
 * returns:
 *  - Promise: A summary of the finalization results.
 */

async function finalizeDailyAttendance(settings, date = new Date()){
    
    // ================= Date boundaries =================
    const dayStart = getAttendanceDate(date, settings);
    
    const nextDayStart = new Date(dayStart);
    
    nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);



    // ================= Day classification =================

    // Check whether the selected date is a confirmed public holiday:
    const confirmedHoliday = await getConfirmedHoliday(date, settings);
    const isCompanyRestDay = !isWorkingDay(date, settings);

    // Public holidays take priority over company rest days:
    const automaticStatus = confirmedHoliday ? 'Holiday': isCompanyRestDay ? 'Weekly Off' : 'Absent';

    const automaticApprovalStatus = automaticStatus === 'Absent' ? 'pending' : 'approved';



    // ================= Active employees =================

    const activeEmployees = await User.find({status: 'active'}).select('_id');


    // ================= Attendance finalization =================
    
    let absentRecordsCreated = 0;
    let missingClockOutsFlagged = 0;
    let holidayRecordsCreated = 0;
    let weeklyOffRecordsCreated = 0;


    for (const employee of activeEmployees){

        
        const attendance = await Attendance.findOne({
            employee: employee._id,
            date: {$gte: dayStart, $lt: nextDayStart}
        });

        // ---------- Missing attendance ----------

        
        if(!attendance){

            await Attendance.create({
                employee: employee._id,
                date: dayStart,
                status: automaticStatus,
                approvalStatus: automaticApprovalStatus
            });

            if(automaticStatus === 'Holiday'){
                holidayRecordsCreated += 1;
            } else if(automaticStatus === 'Weekly Off'){
                weeklyOffRecordsCreated += 1;
            } else {
                absentRecordsCreated += 1;
            }

            continue;
        }

        /*
        * Existing On Leave, Holiday, and Weekly Off records
        * are preserved because they normally have no inTime.
        */

        // ---------- Missing clock-out ----------

        // Clocked in but did not clock out:
        if(attendance.inTime && !attendance.outTime && !(attendance.flags || []).includes('missingTimeOut')){
            const updatedFlags = new Set(attendance.flags || []);

            // Prevent duplicate missingTimeOut flags:
            updatedFlags.add('missingTimeOut');

            attendance.flags = [...updatedFlags];

            // The record requires HR review or correction:
            attendance.approvalStatus = 'pending';

            await attendance.save();

            missingClockOutsFlagged += 1;
        }
    }

    // ================= Finalization summary =================
    return {
        absentRecordsCreated,
        holidayRecordsCreated,
        weeklyOffRecordsCreated,
        missingClockOutsFlagged
    };
}

module.exports = {
    getConfirmedHoliday,
    finalizeDailyAttendance
};