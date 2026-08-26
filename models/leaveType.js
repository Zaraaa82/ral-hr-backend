const mongoose = require("mongoose");

const leaveTypeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      enum: [
        "Annual",
        "Sick",
        "Maternity",
        "Nursing Childcare",
        "Bereavement",
        "Marriage",
        "Hajj",
        "Iddah",
      ],
    },
    maxDaysPerYear: {
      type: Number,
      required: true,
      min: 0.5
    },
    payFraction: {
      type: Number,
      required: true,
      enum: [1, 0.5, 0],
    },
    requiresDocument: {
      type: Boolean,
      default: false,
    },
    includesHolidays: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LeaveType", leaveTypeSchema);
