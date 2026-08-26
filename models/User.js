const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    cprNumber: {
      type: Number,
      required: true,
      unique: true,
      min: 9,
      max: 9,
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
    },
    employeeCode: {
      type: String,
      required: true,
      unique: true,
    },
    nationality: {
      type: String,
      required: true,
    },
    jobTitle: {
      type: String,
      required: true,
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
    },
    dateOfLeaving: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Active", "onLeave", "Suspended", "Left"],
      required: true,
    },
    role: {
      type: String,
      enum: ["Admin", "Employee", "Manager"],
      required: true,
    },
    leaveBalance: {
      type: Number,
      default: 0,
    },
    personalEmail: {
      type: String,
      required: true,
      unique: true,
    },
    workEmail: {
      type: String,
      // required: true,
      unique: true,
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
