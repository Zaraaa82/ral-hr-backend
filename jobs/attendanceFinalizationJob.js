const cron = require('node-cron');

const getSettings = require('../services/settingsService');

const {finalizeDailyAttendance} = require('../services/attendanceService');

/**
 * Starts the automatic daily attendance finalization job.
 *
 * The execution time is calculated using:
 * - The configured shift end time.
 * - The allowed checkout minutes after the shift.
 * - One additional minute to avoid running at the exact cutoff.
 *
 * The job reloads settings before finalizing attendance so that it
 * uses the latest company policy values.
 *
 * params: 
 *  - settings: The company settings loaded at startup.
 *  
 * returns: 
 *  - The scheduled task.
 */
function startAttendanceFinalizationJob(settings){

    // ================= Scheduling settings =================

    const endTime = settings?.workingHours?.end_time;
    const timezone = settings?.payrollCalendar?.timezone;
    const allowedMinutesAfter = Number(settings?.attendance?.checkout_allowed_minutes_after) || 0;

    if(!endTime || !timezone){
        throw new  Error('Attendance end time and timezone are required.');
    }

    // ================= Finalization time =================

    const [endHour, endMinute] = endTime.split(':').map(num=> Number(num));


    // Run one minute after the checkout period closes:
    const finalizationTotalMinutes = endHour * 60 + endMinute + allowedMinutesAfter + 1;

    const finalizationHour = Math.floor(finalizationTotalMinutes / 60) % 24;

    const finalizationMinute = finalizationTotalMinutes % 60;



    // ================= Cron expression =================

    // Format: minute hour dayOfMonth month dayOfWeek
    const cronExpression = `${finalizationMinute} ${finalizationHour} * * *`;



    // ================= Scheduled execution =================
    const scheduledTask = cron.schedule(cronExpression, async () => {

            try {
        
                // Reload settings so finalization uses current policies:
                const currentSettings = await getSettings();

                const result = await finalizeDailyAttendance(currentSettings);

                // Log one summary after successful finalization:
                console.log("Attendance finalization completed:", {executedAt: new Date().toISOString(), ...result});

            } catch (error){
                 // Log the execution time and failure details:
                console.error("Attendance finalization failed:", {
                    executedAt: new Date().toISOString(),
                    message: error.message,
                    stack: error.stack
                });
            }
        },
        {
            name: 'daily-attendance-finalization',
            timezone,
            noOverlap: true,
        },
    );

    return scheduledTask;
}

module.exports = {
    startAttendanceFinalizationJob,
};