//
const mongoose = require("mongoose");

function validateObjectId(paramName = "id") {
  return (req, res, next) => {
    const targetId = req.params[paramName];

    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ message: "The provided ID is invalid." });
    }

    next();
  };
}

module.exports = validateObjectId;
