const settingsData = {
  settingsKey: "ral",

  legalFloors: {
    annual_leave_days_min: 30,
    sick_full_pay_days_min: 15,
    sick_half_pay_days_min: 20,
    sick_unpaid_days_min: 20,
    maternity_paid_days_min: 60,
    paternity_days_min: 1,
    bereavement_days_min: 3,
    hajj_days_min: 14,

    overtime_day_percent_min: 125,
    overtime_night_percent_min: 150,
    overtime_holiday_percent_min: 150,

    normal_daily_hours_max: 8,
    normal_weekly_hours_max: 48,
    overtime_weekly_hours_max: 12,
    weekly_rest_hours_min: 24,
    break_minutes_min: 30,
    continuous_hours_max: 6,

    probation_months_max: 3,
    probation_months_max_with_written_consent: 6,
    wage_payment_days_on_resignation_max: 7,
  },

  socialInsurance: {
    sio_bahraini_employee_percent: 8,
    sio_bahraini_employer_percent: 18,
    sio_expat_employee_percent: 1,
    sio_expat_employer_percent: 3,

    // The source value is null:
    sio_ceiling_fils: null,

    // 50 BHD × 1000 = 50,000 fils:
    social_allowance_fils: 50000,
  },

  endOfService: {
    eos_first_three_years_percent: 4.2,
    eos_thereafter_percent: 8.4,
    eos_scheme_start_date: new Date("2024-03-01"),
  },

  overtime: {
    overtime_day_percent: 125,
    overtime_night_percent: 150,
    overtime_rest_day_percent: 150,
    overtime_holiday_percent: 150,
    overtime_weekly_cap_hours: 12,
  },

  workingHours: {
    start_time: "08:00",
    end_time: "17:00",
    break_start_time: "12:00",
    break_end_time: "13:00",

    normal_daily: 8,
    normal_weekly_max: 40,
    ramadan_daily: 6,
    ramadan_weekly: 30,
    min_break_minutes: 60,
    max_continuous_hours: 6,

    weekly_rest_day: "Friday",
    company_rest_days: ["Friday", "Saturday"],
  },

  leave: {
    annual_leave_days: 30,
    sick_full_days: 15,
    sick_half_days: 20,
    sick_unpaid_days: 20,
    maternity_paid_days: 60,
    maternity_unpaid_days: 15,
    paternity_days: 1,
    bereavement_days: 3,
    marriage_days: 3,
    hajj_days: 14,
  },

  payrollCalendar: {
    payroll_cutoff_day: 25,
    payroll_cutoff_time: "17:00",
    payday: 27,
    payslip_visible_hour: "09:00",
    timezone: "Asia/Bahrain",
  },

  attendance: {
    checkin_allowed_minutes_before: 60,
    late_grace_minutes: 15,
    early_exit_grace_minutes: 15,
    checkout_allowed_minutes_after: 60,
    half_day_hours_threshold: 4,
    absent_hours_threshold: 2,
    manager_may_edit_attendance: false,
  },

  documents: {
    document_alert_days: [90, 30, 7],
    employee_may_upload: true,
  },

  privacyToggles: {
    allow_biometric_attendance: false,
    allow_data_outside_bahrain: false,
  },
};

module.exports = settingsData;