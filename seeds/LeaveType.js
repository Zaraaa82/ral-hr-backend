const LeaveType = require('../models/leaveType');
const leaveTypeData = require('./Data/leavetypeData');

async function seedLeaveTypes(){
    try{
        await LeaveType.deleteMany({});
        const leaveTypes = await LeaveType.insertMany(leaveTypeData);

        const sickFullPay = findType('Sick (Full Pay)', leaveTypes);
        const sickHalfPay = findType('Sick (Half Pay)', leaveTypes);
        const sickUnpaid = findType('Sick (Unpaid)', leaveTypes);

        const maternityPaid = findType('Maternity', leaveTypes);
        const maternityUnpaid = findType('Maternity (Unpaid)', leaveTypes);


        sickFullPay.nextLeaveType = sickHalfPay._id;
        sickHalfPay.nextLeaveType = sickUnpaid._id;
        sickUnpaid.nextLeaveType = null;

        maternityPaid.nextLeaveType = maternityUnpaid._id;
        maternityUnpaid.nextLeaveType = null;

        await sickFullPay.save();
        await sickHalfPay.save();
        await sickUnpaid.save();
        await maternityPaid.save();
        await maternityUnpaid.save();

        console.log('Leave type seeds added successfully');

    }catch(error){
        console.error('Error seeding leave types:', error);
        
        throw error;
    }

}

function findType(type, leaveTypes){
    const leaveType = leaveTypes.find(leaveType => leaveType.type === type);

    if(!leaveType){
        throw new Error(`Leave type seed not found: ${type}`);
    }

    return leaveType;
}

module.exports = seedLeaveTypes;