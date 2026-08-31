const documentData = [
  {
    employeeCode: "EMP-0009",
    type: "CPR",
    expiryDate: new Date("2029-04-01"),
    uploadedByCode: "EMP-0009",
    status: "verified",
    verifiedByCode: "EMP-0002",
    verifiedOn: new Date("2026-08-10"),
    fileName: "wadha_cpr_verified.pdf",
  },

  {
    employeeCode: "EMP-0011",
    type: "Health",
    expiryDate: new Date("2026-12-31"),
    uploadedByCode: "EMP-0011",
    status: "verified",
    verifiedByCode: "EMP-0002",
    verifiedOn: new Date("2026-08-21"),
    fileName: "ahmed_health_verified.pdf",
  },

  {
    employeeCode: "EMP-0023",
    type: "Health",
    expiryDate: new Date("2027-02-15"),
    uploadedByCode: "EMP-0023",
    status: "verified",
    verifiedByCode: "EMP-0002",
    verifiedOn: new Date("2026-08-16"),
    fileName: "maryam_health_verified.pdf",
  },

  {
    employeeCode: "EMP-0027",
    type: "Passport",
    expiryDate: new Date("2028-02-01"),
    uploadedByCode: "EMP-0027",
    status: "verified",
    verifiedByCode: "EMP-0002",
    verifiedOn: new Date("2026-02-10"),
    fileName: "priya_passport_verified.pdf",
  },

  {
    employeeCode: "EMP-0027",
    type: "Work Permit",
    expiryDate: new Date("2026-06-30"),
    uploadedByCode: "EMP-0027",
    status: "replaced",
    verifiedByCode: "EMP-0002",
    verifiedOn: new Date("2024-01-05"),
    fileName: "priya_work_permit_old_replaced.pdf",
  },

  {
    employeeCode: "EMP-0027",
    type: "Work Permit",
    expiryDate: new Date("2026-11-29"),
    uploadedByCode: "EMP-0007",
    status: "verified",
    verifiedByCode: "EMP-0002",
    verifiedOn: new Date("2026-07-02"),
    fileName: "priya_work_permit_current_verified.pdf",
  },

  {
    employeeCode: "EMP-0017",
    type: "Work Permit",
    expiryDate: new Date("2027-08-25"),
    uploadedByCode: "EMP-0017",
    status: "pending",
    fileName: "imran_work_permit_pending.pdf",
  },

  {
    employeeCode: "EMP-0008",
    type: "Qualification",
    expiryDate: new Date("2030-06-01"),
    uploadedByCode: "EMP-0008",
    status: "rejected",
    verifiedByCode: "EMP-0002",
    rejectionReason:
      "Uploaded certificate is unclear. Please upload a clearer copy.",
    fileName: "hussain_qualification_rejected.pdf",
  },

  {
    employeeCode: "EMP-0013",
    type: "Passport",
    expiryDate: new Date("2026-07-15"),
    uploadedByCode: "EMP-0013",
    status: "verified",
    verifiedByCode: "EMP-0007",
    verifiedOn: new Date("2025-07-15"),
    fileName: "maria_passport_expired.pdf",
  },

  {
    employeeCode: "EMP-0007",
    type: "Contract",
    expiryDate: new Date("2030-12-31"),
    uploadedByCode: "EMP-0002",
    status: "verified",
    verifiedByCode: "EMP-0002",
    verifiedOn: new Date("2026-01-05"),
    fileName: "noora_contract_verified.pdf",
  },

  {
    employeeCode: "EMP-0020",
    type: "Health",
    expiryDate: new Date("2026-12-31"),
    uploadedByCode: "EMP-0007",
    status: "verified",
    verifiedByCode: "EMP-0002",
    verifiedOn: new Date("2026-01-03"),
    fileName: "grace_health_verified.pdf",
  },

  {
    employeeCode: "EMP-0008",
    type: "CPR",
    expiryDate: new Date("2031-08-28"),
    uploadedByCode: "EMP-0008",
    status: "pending",
    fileName: "hussain_cpr_pending.pdf",
  },
];

module.exports = documentData;