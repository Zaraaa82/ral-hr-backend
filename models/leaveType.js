const mongoose = require("mongoose");

const femaleOnlyTypes = ['Maternity', 'Maternity (Unpaid)', 'Childcare (Unpaid)','Iddah'];


const leaveTypeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      enum: [
        "Annual",
        "Sick (Full Pay)",
        "Sick (Half Pay)",
        "Sick (Unpaid)",
        "Maternity",
        "Maternity (Unpaid)",
        "Paternity",
        "Childcare (Unpaid)",
        "Bereavement",
        "Marriage",
        "Hajj",
        "Iddah",
        "Unpaid"
      ]
    },
    maxDaysPerYear: {
      type: Number,
      required: true,
      min: 0
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
    gender: {
      type: String,
      enum: ['male', 'female'],
      trim: true,
      required: function(){ return femaleOnlyTypes.includes(this.type) || this.type === 'Paternity'; },
      validate: {
        validator: function(value){ 
          if(femaleOnlyTypes.includes(this.type)){
            return value === 'female'; 
          }
          if(this.type === 'Paternity'){
            return value === 'male';
          }

          return value == null;
        },
        message: 'Gender does not match the selected leave type'
      }
    }
  },
  { timestamps: true },
);

module.exports = mongoose.model("LeaveType", leaveTypeSchema);
