const LeaveType = require('../models/leaveType');
const leaveTypeData = require('./Data/leavetypeData');

async function seedLeaveTypes(){
    try{
        await LeaveType.deleteMany({});
        await LeaveType.insertMany(leaveTypeData);

        console.log('Leave type seeds added successfully');
    }catch(error){
        console.error('Error seeding leave types:', error);
        
        throw error;
    }

}

module.exports = seedLeaveTypes;