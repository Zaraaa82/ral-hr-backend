const StatutorySettings = require('../models/StatutorySettings');

async function getSettings(){
    const settings = await StatutorySettings.findOne();
    if(!settings){
        throw new Error('Statutory settings not found.');
    }
    return settings;
}

module.exports = getSettings;