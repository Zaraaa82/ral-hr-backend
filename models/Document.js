const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: [
        "Leave Request",
        "CPR",
        "passport",
        "work permit",
        "professional licence",
        "other",
      ],
    },
    expiryDate: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["Expired", "Valid", "Replaced", "Expired Soon"],
    },
    file: {
      type: String,
    },
  },
  { timestamps: true },
);

const Document = mongoose.model("Document", documentSchema);

module.exports = Document;
