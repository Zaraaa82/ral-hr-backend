const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization header missing or invalid format.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded.payload || decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token.",
      error: err.message,
    });
  }
}

module.exports = verifyToken;
