const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
      validate: {
        validator: function(value){ return Number.isInteger(value); },
        message: 'Year must be a whole number'
      }
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
    type: {
      type: String,
      required: true,
      enum: ['fixed', 'moon-dependent']
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
  },
  {
    timestamps: true,
  },
);

const Holiday = mongoose.model("Holiday", holidaySchema);

module.exports = Holiday;
