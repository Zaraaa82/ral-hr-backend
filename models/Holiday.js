const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    isConfirmed: {
      type: Boolean,
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
