const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const existingAdmin = await User.findOne({
      role: "HR Admin",
    });

    if (existingAdmin) {
      console.log("HR Admin already exists.");
      return;
    }

    const hashedPassword = await bcrypt.hash("Admin123", 12);

    const admin = await User.create({
      fullName: "Yousif Al Mahmood",

      cprNumber: "790000000",

      gender: "male",

      isBahraini: true,

      dateOfBirth: new Date("1980-01-01"),

      employeeCode: "EMP-0001",

      nationality: "Bahraini",

      jobTitle: "System Administrator",

      manager: null,

      dateOfJoining: new Date("2026-01-01"),

      phoneNumber: "36224007",

      status: "active",

      role: "HR Admin",

      personalEmail: "yousif.almahmood@gmail.com",

      workEmail: "admin@ral.com",

      hashedPassword,

      basicSalaryFils: 2400000,

      leaveBalances: [],
    });

    console.log("HR Admin created successfully.");
  } catch (err) {
    console.error("Failed to create HR Admin:", err);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
