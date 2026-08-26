const User = require('../models/Holiday');
const holidayData = require('./Data/holidayData');


async function seedHolidays(){
    try{
        await User.deleteMany({});
        await User.insertMany(holidayData);

        console.log('Holiday seeds added successfully');
    }catch(error){
        console.error('Error seeding holidays:', error);
        throw error;
    }

}

module.exports = seedHolidays;