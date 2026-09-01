const http = require("http");
const { Server } = require("socket.io");
const app = require("./app.js");
const connectToDB = require("./config/db.js");
const getSettings = require("./services/settingsService");
const {
  startAttendanceFinalizationJob,
} = require("./jobs/attendanceFinalizationJob");

async function startServer() {
  try {
    const PORT = process.env.PORT || 3000;

    await connectToDB();

    // ================= Scheduled jobs =================

    const settings = await getSettings();

    startAttendanceFinalizationJob(settings);

    console.log("Attendance finalization job started.");

    // ================= HTTP Server =================

    const server = http.createServer(app);

    // ================= Socket.IO =================

    const io = new Server(server, {
      cors: {
        origin: "http://localhost:5173",
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      },
    });

    // Make Socket.IO available inside controllers
    app.set("io", io);

    // ================= Socket Connection =================

    io.on("connection", (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Employee joins their attendance room
      socket.on("join_attendance", (employeeId) => {
        if (!employeeId) {
          return;
        }

        const roomName = `attendance_${employeeId}`;

        socket.join(roomName);

        console.log(`Socket ${socket.id} joined attendance room: ${roomName}`);
      });

      // Socket disconnected
      socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });

    // ================= Start Server =================

    server.listen(PORT, () => {
      console.log(`App is running on port ${PORT}`);
      console.log(`Socket.IO is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
