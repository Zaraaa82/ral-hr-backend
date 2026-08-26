const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "CPR",
        "Passport",
        "Work Permit",
        "Visa",
        "Contract",
        "Qualification",
        "Health",
      ],
      trim: true,
      required: true,
    },
    expiryDate: {
      type: Date
    },
    issueDate: {
      type: Date,
      default: Date.now,
      validate: {
        validator: function (value) {
          return !this.expiryDate || value <= this.expiryDate;
        },
        message: "Issue date cannot be after expiry date.",
      }
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, F
    },
    status: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Pending",
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    verifiedOn: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Document", documentSchema);
