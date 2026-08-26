const mongoose = require("mongoose");

const leaveTypeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
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
    },
    payFraction: {
      type: Number,
      required: true,
      enum: [1, 0.5, 0],
    },
    leaveDocument: {
      type: String,
    },
    includesHolidays: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LeaveType", leaveTypeSchema);
