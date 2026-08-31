const User = require("../models/User");
const LeaveAllocation = require("../models/LeaveAllocation");

const {
  initializeLeaveAllocations,
} = require("../services/leaveAllocationService");

async function seedLeaveAllocations() {
  try {
    await LeaveAllocation.deleteMany({});

    const activeUsers = await User.find({
      status: "active",
    });

    // ================= 2026 =================

    console.log('Loading Leave Allocations 2026 ...');
    for (const user of activeUsers) {

      await initializeLeaveAllocations(user._id, 2026);
    }

    // ================= 2027 =================
    // We also seed next year so the frontend year selector
    // and carry-forward functionality can be tested.

    console.log('Loading Leave Allocations 2027 ...');
    for (const user of activeUsers) {
      await initializeLeaveAllocations(user._id, 2027);
    }

    console.log("Leave allocation seeds added successfully");
  } catch (error) {
    console.error("Error seeding leave allocations:", error);
    throw error;
  }
}

module.exports = seedLeaveAllocations;