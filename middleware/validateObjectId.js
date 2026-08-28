const mongoose = require('mongoose')
function validateObjectId(req,res,next){
if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "The provided ID is invalid." });
    }
next()
}

module.exports = validateObjectId