import { createServer } from "node:http";
import app from "./app";
import ENVVARS from "./config/env";
import { initSocketServer } from "./app/lib/socket";
import { prisma } from "./app/lib/prisma";

const isDev = ENVVARS.NODE_ENV === "development";

const bootstrap = () => {
  try {
    const httpServer = createServer(app);

    // Initialize Socket.IO
    const io = initSocketServer(httpServer);

    const server = httpServer.listen(ENVVARS.PORT, () => {
      if (isDev) {
        console.log(
          `Server is running on http://localhost:${ENVVARS.PORT}`,
        );
        console.log(
          `[Socket.IO] Listening on path /socket.io/`,
        );
      }
    });

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        console.log("HTTP server closed.");

        // Close Socket.IO connections
        io.close(() => {
          console.log("Socket.IO server closed.");
        });

        // Close database connection
        try {
          await prisma.$disconnect();
          console.log("Database connection closed.");
        } catch (error) {
          console.error("Error closing database connection:", error);
        }

        console.log("Graceful shutdown complete.");
        process.exit(0);
      });

      // Force shutdown after 30 seconds if graceful shutdown hangs
      setTimeout(() => {
        console.error("Forced shutdown after timeout.");
        process.exit(1);
      }, 30_000);
    };

    // Handle shutdown signals
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Handle uncaught errors
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      shutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason) => {
      console.error("Unhandled Rejection:", reason);
      shutdown("unhandledRejection");
    });
  } catch (error) {
    console.error("Error starting the server:", error);
    process.exit(1);
  }
};

bootstrap();
