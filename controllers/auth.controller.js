const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// async function signUp(req, res) {
//   try {
//     const { workEmail, password } = req.body;

//     // Validation
//     if (!workEmail || !password) return res.status(400).json({message: "Work Email and password are required.",});
//     if (password.length < 6) return res.status(400).json({message: "Password must be more than 6 characters",});

//     const user = await User.create({
//       workEmail,
//       hashedPassword: await bcrypt.hash(password, 12),
//     });

//     const { _id, createdAt, updatedAt } = user;

//     res
//       .status(201)
//       .json({ workEmail: user.workEmail, _id, createdAt, updatedAt });
//   } catch (err) {
//     console.log(err);
//     if (err.name === "ValidationError") {
//       return res.status(400).json({
//         message: err.message,
//       });
//     }
//     if (err.code === 11000) {
//       return res.status(409).json({
//         message: "Work Email already exists",
//       });
//     }

//     console.log(err);
//     return res.status(500).json({
//       message: "Internal Server Error",
//     });
//   }
// }

async function signIn(req, res) {
  try {
    const { workEmail, password } = req.body;

    if (!workEmail || !password) {
      return res.status(400).json({
        message: "Work Email and password are required.",
      });
    }
    const user = await User.findOne({ workEmail: workEmail.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.hashedPassword,
    );
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Construct the payload
    const payload = { workEmail: user.workEmail, _id: user._id, role: user.role, gender: user.gender };


    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    return res.status(200).json({
      accessToken,
      user: {
        _id: user._id,
        workEmail: user.workEmail,
        role: user.role,
        gender: user.gender
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

async function verifyUser(req, res) {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      _id: user._id,
      workEmail: user.workEmail,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

module.exports = {
  // signUp,
  signIn,
  verifyUser,
};
