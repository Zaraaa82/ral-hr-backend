const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv').config();

const seedStatutorySettings = require('./StatutorySettings');
const seedHolidays = require('./Holiday');
const seedLeaveTypes = require('./LeaveType');
const seedDepartments = require("./Department");
const seedUsers = require('./User');
const seedLeaveAllocations = require("./LeaveAllocation");
const seedDocuments = require("./Document");
const seedLeaveRequests = require("./LeaveRequest");
const seedAttendance = require("./Attendance");
const seedPayslips = require("./payslip");
const seedNotifications = require("./Notification");
const seedAuditLogs = require("./AuditLog");


const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function main(){
    await connectToDB();
    await addSeeds();
    await mongoose.connection.close();
}

main();

async function connectToDB() {
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to Database");
    }catch(error){
    console.error("MongoDB connection failed:", error);
    process.exit(1);    }
    
}

async function addSeeds() {
    try{
        await seedStatutorySettings();
        await seedHolidays();
        await seedLeaveTypes();

        await seedDepartments();
        await seedUsers();
        await seedLeaveAllocations();

        await seedDocuments();
        await seedLeaveRequests();
        await seedAttendance();
        await seedPayslips();

        await seedNotifications();
        await seedAuditLogs();

        console.log('All seeds added successfully');
    }catch(error){
        console.error('Error adding seeds:', error);
    }
    
}
