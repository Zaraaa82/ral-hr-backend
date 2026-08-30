const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 100,
      trim: true,
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
      enum: ["male", "female"],
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
      type: ObjectId,
      ref: "Department",
      required: true,
    },
    workSchedule: {
      startTime: {
        type: String,
        required: true,
        match: [
          /^([01]\d|2[0-3]):[0-5]\d$/,
          "Start time must use HH:mm format",
        ],
      },

      endTime: {
        type: String,
        required: true,
        match: [/^([01]\d|2[0-3]):[0-5]\d$/, "End time must use HH:mm format"],
      },

      workingDays: {
        type: [String],
        required: true,
        validate: {
          validator: function (days) {
            const validDays = [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ];

            return (
              days.length > 0 &&
              days.every((day) => validDays.includes(day)) &&
              new Set(days).size === days.length
            );
          },
          message: "Working days must be valid and unique.",
        },
      },
    },
    manager: {
      type: ObjectId,
      ref: "User",
      default: null,
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
      enum: ["active", "on_leave", "deactivated", "left"],
      required: true,
      default: "active",
    },
    role: {
      type: String,
      enum: ["Employee", "Manager", "HR Admin"],
      required: true,
      default: "Employee",
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
      unique: true,
      trim: true,
      lowercase: true,
      required: true,
    },
    hashedPassword: {
      type: String,
      required: true,
    },
    basicSalaryFils: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (value) {
          return Number.isInteger(value);
        },
        message: "Basic salary must be a whole number of fils",
      },
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

module.exports = User;
