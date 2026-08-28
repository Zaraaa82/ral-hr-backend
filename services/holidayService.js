const Holiday = require('../models/Holiday');

async function getConfirmedHolidaysInRange(startDate, endDate) {
    
    const dayAfterEndDate = new Date(endDate);
    dayAfterEndDate.setUTCDate(dayAfterEndDate.getUTCDate()+1);

    const holidays = await Holiday.find({
        isConfirmed: true,
        date: {$gte: startDate, $lt: dayAfterEndDate}
    });

    return holidays;
}

module.exports = getConfirmedHolidaysInRange;