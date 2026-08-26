const StatutorySettings = require('../models/StatutorySettings');

const settingsData = require('./Data/statutorySettingsData');


async function seedStatutorySettings(){
    try{
        await StatutorySettings.deleteMany({});
        await StatutorySettings.create(settingsData);
        console.log('Statutory settings seeded successfully');
    }catch(error){
        console.error('Error seeding statutory settings:', error);
        throw error;
    }

}

module.exports = seedStatutorySettings;