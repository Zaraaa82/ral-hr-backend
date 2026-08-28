const LeaveRequest = require('../models/leaveRequest');

async function hasOverlappingLeaveRequest(employeeId, startDate, endDate, statuses, excludeRequestId){

    const query = {
        employee: employeeId,
        status: {$in: statuses},
        startDate: {$lte: endDate},
        endDate: {$gte: startDate},
    }

    if(excludeRequestId){
        query._id = {$ne: excludeRequestId};
    }

    const overlappingRequest = await LeaveRequest.findOne(query).select('_id');

    return Boolean(overlappingRequest);

}

module.exports = hasOverlappingLeaveRequest;