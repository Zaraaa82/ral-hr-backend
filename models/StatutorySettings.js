const mongoose = require('mongoose');


// ================= Reusable field definitions =================

const requiredNumber = {
  type: Number,
  required: true,
  min: 0
};

const requiredPercent = { 
    type: Number, 
    required: true,
    min:0
};

const requiredFils = {
    type: Number,
    required: true,
    min: 0,
    validate:{
        validator: function(value){ return Number.isInteger(value); },
        message: 'Value must be a whole number of fils'
    }
};

const optionalFils = {
    type: Number,
    default: null,
    min: 0,
    validate:{
        validator: function(value){ return value == null || Number.isInteger(value); },
        message: 'Value must be a whole number of fils'
    }
};

const requiredDayOfMonth = {
    type: Number,
    required: true,
    min: 1,
    max: 31,
    validate: {
        validator: function(value){return Number.isInteger(value)},
        message: 'Day must be a whole number'
    }
};

const requiredTime = {
    type: String, 
    required: true,
    match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must use HH:mm format']

};

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];



// ================= Embedded schemas =================

const legalFloorsSchema = new mongoose.Schema(
  {
    annual_leave_days_min: requiredNumber,
    sick_full_pay_days_min: requiredNumber,
    sick_half_pay_days_min: requiredNumber,
    sick_unpaid_days_min: requiredNumber,
    maternity_paid_days_min: requiredNumber,
    paternity_days_min: requiredNumber,
    bereavement_days_min: requiredNumber,
    hajj_days_min: requiredNumber,

    overtime_day_percent_min: requiredNumber,
    overtime_night_percent_min: requiredNumber,
    overtime_holiday_percent_min: requiredNumber,

    normal_daily_hours_max: requiredNumber,
    normal_weekly_hours_max: requiredNumber,
    overtime_weekly_hours_max: requiredNumber,
    weekly_rest_hours_min: requiredNumber,
    break_minutes_min: requiredNumber,
    continuous_hours_max: requiredNumber,

    probation_months_max: requiredNumber,
    probation_months_max_with_written_consent: requiredNumber,
    wage_payment_days_on_resignation_max: requiredNumber
  },
  { _id: false }
);

const socialInsuranceSchema = new mongoose.Schema({
    sio_bahraini_employee_percent: requiredPercent,
    sio_bahraini_employer_percent: requiredPercent,
    sio_expat_employee_percent: requiredPercent,
    sio_expat_employer_percent: requiredPercent,
    sio_ceiling_fils: optionalFils,
    social_allowance_fils: requiredFils,
}, {_id: false});

const endOfServiceSchema = new mongoose.Schema({
    eos_first_three_years_percent: requiredPercent,
    eos_thereafter_percent: requiredPercent,
    eos_scheme_start_date: { type: Date, required: true}
}, {_id: false});

const overtimeSchema = new mongoose.Schema({
    overtime_day_percent: requiredPercent,
    overtime_night_percent: requiredPercent,
    overtime_rest_day_percent: requiredPercent,
    overtime_holiday_percent: requiredPercent,
    overtime_weekly_cap_hours: requiredNumber
},{_id: false});

const workingHoursSchema = new mongoose.Schema(
  {
    start_time: requiredTime,
    end_time: requiredTime,
    break_start_time: requiredTime,
    break_end_time: requiredTime,

    normal_daily: requiredNumber,
    normal_weekly_max: requiredNumber,
    ramadan_daily: requiredNumber,
    ramadan_weekly: requiredNumber,
    min_break_minutes: requiredNumber,
    max_continuous_hours: requiredNumber,

    weekly_rest_day: {
      type: String,
      required: true,
      enum: daysOfWeek,
    },

    company_rest_days: {
      type: [String],
      required: true,
      validate: {
        validator: function (days) {
          return (
            days.length > 0 &&
            days.every((day) => daysOfWeek.includes(day)) &&
            new Set(days).size === days.length
          );
        },
        message: 'Company rest days must contain valid, unique weekdays'
      },
    },
  }, { _id: false });

const leaveSchema = new mongoose.Schema({
    annual_leave_days: requiredNumber,
    sick_full_days: requiredNumber,
    sick_half_days: requiredNumber,
    sick_unpaid_days: requiredNumber,
    maternity_paid_days: requiredNumber,
    maternity_unpaid_days: requiredNumber,
    paternity_days: requiredNumber,
    bereavement_days: requiredNumber,
    marriage_days: requiredNumber,
    hajj_days: requiredNumber,
},{_id: false});

const payrollCalendarSchema = new mongoose.Schema({
    payroll_cutoff_day: requiredDayOfMonth,
    payroll_cutoff_time: requiredTime, 
    payday: requiredDayOfMonth, 
    payslip_visible_hour: requiredTime, 
    timezone: {
      type: String,
      required: true,
      trim: true
    }
},{_id: false});

const attendanceSchema = new mongoose.Schema({
    checkin_allowed_minutes_before: requiredNumber,
    late_grace_minutes: requiredNumber,
    early_exit_grace_minutes: requiredNumber,
    checkout_allowed_minutes_after: requiredNumber,
    half_day_hours_threshold: requiredNumber, 
    absent_hours_threshold: requiredNumber,
    manager_may_edit_attendance:{
        type: Boolean,
        required: true
    }

}, {_id: false});

const documentsSchema = new mongoose.Schema({
    document_alert_days:{
        type: [Number],
        required: true,
        validate: {
            validator: function(docAlertDays){
                return (
                    docAlertDays.length > 0 && 
                    docAlertDays.every(day => Number.isInteger(day) && day >= 0) && 
                    new Set(docAlertDays).size == docAlertDays.length     
                )
            },
            message: 'Document alert days must be unique, non-negative whole numbers'
        }
    }, 
    employee_may_upload: {
        type: Boolean,
        required: true
    }
}, {_id: false});

const privacyTogglesSchema = new mongoose.Schema({
    allow_biometric_attendance:{
        type: Boolean,
        default: false
    },
    allow_data_outside_bahrain:{
        type: Boolean,
        default: false
    }
}, {_id: false});



// ================= Main schema =================

const statutorySettingsSchema = new mongoose.Schema({
    settingsKey: {
        type: String,
        default: 'ral',
        enum: ['ral'],
        unique: true,
    },
    legalFloors: {
        type: legalFloorsSchema,
        required: true
    },
    socialInsurance:{
        type: socialInsuranceSchema,
        required: true    
    },
    endOfService:{
        type: endOfServiceSchema,
        required: true
    },
    overtime:{
        type: overtimeSchema,
        required: true,
         validate: {
            validator: function (overtimeValues) {
                const floors = this.legalFloors;

                if (!floors) return false;
                
                return (
                    overtimeValues.overtime_day_percent >= floors.overtime_day_percent_min &&
                    overtimeValues.overtime_night_percent >= floors.overtime_night_percent_min &&
                    overtimeValues.overtime_holiday_percent >= floors.overtime_holiday_percent_min &&
                    overtimeValues.overtime_weekly_cap_hours <= floors.overtime_weekly_hours_max
                );
            },
            message: 'One or more overtime values violate the legal limits'
        }
    },
    workingHours:{
        type: workingHoursSchema,
        required: true,
         validate: {
            validator: function (workingHoursValues) {
            const floors = this.legalFloors;

            if (!floors) return false;

            return (
                workingHoursValues.normal_daily <= floors.normal_daily_hours_max &&
                workingHoursValues.normal_weekly_max <= floors.normal_weekly_hours_max &&
                workingHoursValues.min_break_minutes >= floors.break_minutes_min &&
                workingHoursValues.max_continuous_hours <= floors.continuous_hours_max
            );
            },
            message: 'One or more working-hour values violate the legal limits'
        }
    },
    leave:{
        type: leaveSchema,
        required: true,
        validate: {
            validator: function (leaveValues) {
                const floors = this.legalFloors;
                
                if (!floors) return false;

                return (
                    leaveValues.annual_leave_days >= floors.annual_leave_days_min &&
                    leaveValues.sick_full_days >= floors.sick_full_pay_days_min &&
                    leaveValues.sick_half_days >= floors.sick_half_pay_days_min &&
                    leaveValues.sick_unpaid_days >= floors.sick_unpaid_days_min &&
                    leaveValues.maternity_paid_days >= floors.maternity_paid_days_min &&
                    leaveValues.paternity_days >= floors.paternity_days_min &&
                    leaveValues.bereavement_days >= floors.bereavement_days_min &&
                    leaveValues.hajj_days >= floors.hajj_days_min
                );
            },
            message: 'One or more leave values are below the legal minimum'
        }
    },
    payrollCalendar:{
        type: payrollCalendarSchema,
        required: true
    },
    attendance:{
        type: attendanceSchema,
        required: true
    },
    documents:{
        type: documentsSchema,
        required: true
    },
    privacyToggles:{
        type: privacyTogglesSchema,
        required: true
    }

}, {timestamps: true});


const StatutorySettings = mongoose.model('StatutorySettings', statutorySettingsSchema);

module.exports = StatutorySettings;