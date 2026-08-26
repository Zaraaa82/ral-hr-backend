const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
            min: 2000,
      max: 2100,
    },
    date: {
      type: Date,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,

    },
    description: {
      type: String,
            trim: true,
      maxlength: 500,
    },
    isConfirmed: {
      type: Boolean,
            default: false,
    },
    weeklyOffDays: {
      type: String,
      enum: ["Friday", "Saturday"],
    },
  },
  {
    timestamps: true,
  },
);

const Holiday = mongoose.model("Holiday", holidaySchema);

module.exports = Holiday;
