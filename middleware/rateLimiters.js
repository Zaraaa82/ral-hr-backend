const rateLimit = require("express-rate-limit");

const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes

  max: 100, // Limit each IP to 100 requests per window

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    message: "Too many requests. Please try again later.",
  },
});
 
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many Login attempts. Please try again later.",
  },
});



module.exports = {
  authLimiter,
  standardLimiter
}