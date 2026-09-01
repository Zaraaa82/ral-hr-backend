// const jwt = require("jsonwebtoken");

// function verifyToken(req, res, next) {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({
//         message: "Authorization header missing or invalid format.",
//       });
//     }

//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     req.user = decoded.payload || decoded;

//     next();
//   } catch (err) {
//     return res.status(401).json({
//       message: "Invalid or expired token.",
//       error: err.message,
//     });
//   }
// }

// module.exports = verifyToken;
const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  // ===============================
  // Allow CORS preflight requests
  // ===============================
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization header missing or invalid format.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from environment variables.");

      return res.status(500).json({
        message: "Server authentication configuration error.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Standardize user payload extraction
    req.user = decoded.payload || decoded.user || decoded;

    next();
  } catch (err) {
    const isExpired = err.name === "TokenExpiredError";

    return res.status(401).json({
      message: isExpired ? "Token has expired." : "Invalid or expired token.",
      error: err.message,
    });
  }
}

module.exports = verifyToken;
