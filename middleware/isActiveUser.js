// function isActiveUser(req, res, next) {
//     if (req.user.status !== 'active') {
//         return res.status(403).json({
//             message: 'Access denied. active users only.',
//         })
//     }

//     next()
// }

// module.exports = isActiveUser

const User = require("../models/User");

async function isActiveUser(req, res, next) {
  try {
    // Make sure verifyToken ran first
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        message: "User authentication information is missing.",
      });
    }

    // Get the latest user information from MongoDB
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        message: "Access denied. Active users only.",
      });
    }

    // Keep the fresh user information available
    req.user = user;

    next();
  } catch (error) {
    console.error("isActiveUser error:", error);

    return res.status(500).json({
      message: "Error checking user status.",
    });
  }
}

module.exports = isActiveUser;
