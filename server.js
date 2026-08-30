const http = require("http");
const { Server } = require("socket.io");
const app = require("./app.js");
const connectToDB = require("./config/db.js");

async function startServer() {
  try {
    const PORT = process.env.PORT || 3000;

    await connectToDB();

    const server = http.createServer(app);

    // Create Socket.IO server
    const io = new Server(server, {
      cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      },
    });

    // Make Socket.IO available inside controllers
    app.set("io", io);

    // Socket.IO connection
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
