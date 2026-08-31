const Department = require("../models/Department");
const departmentData = require("./Data/departmentData");

async function seedDepartments() {
  try {
    await Department.deleteMany({});
    await Department.insertMany(departmentData);

    console.log("Department seeds added successfully");
  } catch (error) {
    console.error("Error seeding departments:", error);
    throw error;
  }
}

module.exports = seedDepartments;