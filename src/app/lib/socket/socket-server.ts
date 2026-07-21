import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "node:http";
import ENVVARS from "../../../config/env";
import { socketAuthMiddleware } from "./middleware/auth.middleware";
import { connectionManager } from "./connection-manager";
import { presenceManager } from "./presence-manager";
import { roomManager } from "./room-manager";

const SOCKET_PATH = "/socket.io/";
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 35_000;

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server attached to the given HTTP server.
 * Returns the Socket.IO server instance.
 */
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: ENVVARS.CORS_ORIGINS,
      credentials: true,
      methods: ["GET", "POST"],
    },
    path: SOCKET_PATH,
    transports: ["websocket", "polling"],
    pingInterval: HEARTBEAT_INTERVAL_MS,
    pingTimeout: HEARTBEAT_TIMEOUT_MS,
  });

  // ── Auth middleware ────────────────────────────────────────────────────
  io.use(socketAuthMiddleware);

  // ── Connection handling ────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const userId = socket.data.user.id as string;

    // Register connection
    connectionManager.addConnection(userId, socket.id);

    // Set presence to online
    presenceManager.setStatus(userId, "online");

    // Auto-join the user's personal room
    roomManager.joinRoom(socket, `user:${userId}`);

    console.log(
      `[Socket] User connected: ${userId} (socket: ${socket.id})`,
    );

    // ── Heartbeat ─────────────────────────────────────────────────────────
    socket.on("presence:heartbeat", () => {
      presenceManager.touchHeartbeat(userId);
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      connectionManager.removeConnection(userId, socket.id);

      // Only mark offline when all connections for this user are gone
      if (!connectionManager.isConnected(userId)) {
        presenceManager.setStatus(userId, "offline");
        console.log(`[Socket] User offline: ${userId} (reason: ${reason})`);
      } else {
        console.log(
          `[Socket] Socket disconnected for user ${userId}: ${socket.id} (reason: ${reason})`,
        );
      }
    });

    // ── Error handling ────────────────────────────────────────────────────
    socket.on("error", (err) => {
      console.error(`[Socket] Error on socket ${socket.id}:`, err);
    });
  });

  // ── Global error handler ───────────────────────────────────────────────
  io.engine.on("connection_error", (err) => {
    console.error("[Socket.IO Engine] Connection error:", err.message);
  });

  console.log("[Socket.IO] Server initialized");

  return io;
}

/**
 * Get the Socket.IO server instance.
 * Throws if called before `initSocketServer`.
 */
export function getSocketServer(): SocketIOServer {
  if (!io) {
    throw new Error(
      "Socket.IO server not initialized. Call initSocketServer first.",
    );
  }
  return io;
}
