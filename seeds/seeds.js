const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv').config();

const seedStatutorySettings = require('./StatutorySettings');
const seedHolidays = require('./Holiday');
const seedLeaveTypes = require('./LeaveType');

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
        console.log(error);
    }
    
}

async function addSeeds() {
    try{
        await seedStatutorySettings();
        await seedHolidays();
        await seedLeaveTypes();
        console.log('All seeds added successfully');
    }catch(error){
        console.error('Error adding seeds:', error);
    }
    
}