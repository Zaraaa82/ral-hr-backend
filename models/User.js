const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 100,
    },
    cprNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^\d{9}$/,
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },
    isBahraini: {
      type: Boolean,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value < new Date();
        },
        message: "Date of birth cannot be in the future.",
      },
    },
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    nationality: {
      type: String,
      required: true,
      trim: true,
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    dateOfJoining: {
      type: Date,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    dateOfLeaving: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Active", "onLeave", "Suspended", "Left"],
      required: true,
      default: "Active",
    },
    role: {
      type: String,
      enum: ["Admin", "Employee", "Manager"],
      required: true,
      default: "Employee",
    },
    leaveBalance: {
      type: Number,
      default: 0,
    },
    personalEmail: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    workEmail: {
      type: String,
      // required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    hashedPassword: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

module.exports = User;
