const getSettings = require('../services/settingsService');

async function loadSettings(req, res, next){
    try{
        req.settings = await getSettings();
        next();
    }catch(error){
        next(error);
    }
}

module.exports = loadSettings;