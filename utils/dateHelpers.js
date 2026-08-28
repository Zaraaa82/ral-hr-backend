
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    day:'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
});

function formatDateRange(startDate, endDate){
    const formattedStartDate = dateFormatter.format(startDate);
    const formattedEndDate = dateFormatter.format(endDate);
    const dateRange = formattedStartDate === formattedEndDate ? 
    `for ${formattedStartDate}` : `from ${formattedStartDate} to ${formattedEndDate}`;

    return dateRange;
}


function startOfUTCDay(value){
    const date = new Date(value);

    if(Number.isNaN(date.getTime())){
        return null;
    }

    // Remove the time by setting it to 12:00 AM UTC. This lets us compare only the calendar dates.
    date.setUTCHours(0, 0, 0, 0);
    return date;
}


function calculateInclusiveDays(startDate, endDate){
    const msPerDay = 1000 * 60 * 60 * 24;

    const start = startDate.getTime();
    const end = endDate.getTime();

    // Add one to count both the start and end dates.
    return ( (end - start) / msPerDay ) + 1 ;
}


module.exports = {
    startOfUTCDay,
    calculateInclusiveDays,
    formatDateRange,
}