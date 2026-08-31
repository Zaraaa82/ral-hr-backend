const bcrypt = require("bcrypt");

const User = require("../models/User");
const Department = require("../models/Department");

const userData = require("./Data/userData");

async function seedUsers() {
  try {
    await User.deleteMany({});

    const departments = await Department.find({});

    const departmentMap = {};

    departments.forEach((department) => {
      departmentMap[department.departmentName] = department._id;
    });

    const hashedPassword = await bcrypt.hash("Password123!", 12);

    const usersToInsert = userData.map((user) => {
      const department = departmentMap[user.departmentName];

      if (!department) {
        throw new Error(
          `Department not found for seed user: ${user.departmentName}`,
        );
      }

      return {
        fullName: user.fullName,
        cprNumber: user.cprNumber,
        gender: user.gender,
        isBahraini: user.isBahraini,
        dateOfBirth: user.dateOfBirth,
        employeeCode: user.employeeCode,
        nationality: user.nationality,
        jobTitle: user.jobTitle,
        department,
        manager: null,
        dateOfJoining: user.dateOfJoining,
        dateOfLeaving: user.dateOfLeaving,
        phoneNumber: user.phoneNumber,
        status: user.status,
        role: user.role,
        personalEmail: user.personalEmail,
        workEmail: user.workEmail,
        hashedPassword,
        basicSalaryFils: user.basicSalaryFils,
      };
    });

    const createdUsers = await User.insertMany(usersToInsert);

    // Map employee codes to actual MongoDB IDs.
    const userMap = {};

    createdUsers.forEach((user) => {
      userMap[user.employeeCode] = user._id;
    });

    // ================= Assign employee managers =================

    const managerUpdates = userData
      .filter((user) => user.managerEmployeeCode)
      .map((user) => ({
        updateOne: {
          filter: {
            employeeCode: user.employeeCode,
          },
          update: {
            manager: userMap[user.managerEmployeeCode],
          },
        },
      }));

    if (managerUpdates.length > 0) {
      await User.bulkWrite(managerUpdates);
    }

    // ================= Assign department managers =================

    const departmentManagers = {
      Management: "EMP-0001",
      "Human Resources": "EMP-0002",
      Operations: "EMP-0003",
      Sales: "EMP-0004",
      Finance: "EMP-0005",
      Warehouse: "EMP-0014",
    };

    const departmentUpdates = Object.entries(departmentManagers).map(
      ([departmentName, managerEmployeeCode]) => ({
        updateOne: {
          filter: {
            departmentName,
          },
          update: {
            manager: userMap[managerEmployeeCode],
          },
        },
      }),
    );

    await Department.bulkWrite(departmentUpdates);

    console.log("User seeds added successfully");

    return createdUsers;
  } catch (error) {
    console.error("Error seeding users:", error);
    throw error;
  }
}

module.exports = seedUsers;