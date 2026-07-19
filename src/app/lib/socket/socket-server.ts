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
    presenceManager.setStatus(userId, "online", io!);

    // Sync the current online state of OTHER users to this freshly connected
    // socket, so it shows peers that were already online before it joined.
    for (const otherId of presenceManager.getOnlineUsers()) {
      if (otherId === userId) continue;
      socket.emit("presence:update", {
        userId: otherId,
        status: "online",
        lastSeen: new Date().toISOString(),
      });
    }

    // Auto-join the user's personal room
    roomManager.joinRoom(socket, `user:${userId}`);

    console.log(
      `[Socket] User connected: ${userId} (socket: ${socket.id})`,
    );

    // ── Conversation room join/leave ────────────────────────────────────
    socket.on("conversation:join", (data) => {
      roomManager.joinRoom(socket, `conversation:${data.conversationId}`);
    });

    socket.on("conversation:leave", (data) => {
      roomManager.leaveRoom(socket, `conversation:${data.conversationId}`);
    });

    // ── Messaging: Send message ──────────────────────────────────────────
    socket.on("messaging:send", async (data) => {
      try {
        const { messageService } = await import("../../module/message/message.service");
        const message = await messageService.sendMessage(
          data.conversationId,
          {
            content: data.content,
            type: data.type?.toUpperCase() as "TEXT" | "IMAGE" | "FILE" | undefined,
            replyToId: data.replyToId,
          },
          userId,
        );

        // Broadcast to the conversation room (io is guaranteed non-null inside connection handler)
        roomManager.broadcastToRoom(io!, `conversation:${data.conversationId}`, "messaging:new", {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          content: message.content,
          type: message.type.toLowerCase(),
          replyToId: message.replyToId ?? undefined,
          createdAt: message.createdAt.toISOString(),
        });
      } catch {
        socket.emit("error:message", { message: "Failed to send message." });
      }
    });

    // ── Messaging: Mark as read ─────────────────────────────────────────
    socket.on("messaging:read", async (data) => {
      try {
        const { messageService } = await import("../../module/message/message.service");
        await messageService.markAsRead(data.conversationId, userId);

        // Broadcast read receipt to the conversation room (io is guaranteed non-null inside connection handler)
        roomManager.broadcastToRoom(io!, `conversation:${data.conversationId}`, "messaging:read-receipt", {
          messageId: data.messageId,
          readBy: userId,
          readAt: new Date().toISOString(),
        });
      } catch {
        socket.emit("error:message", { message: "Failed to mark as read." });
      }
    });

    // ── Typing: Start typing ────────────────────────────────────────────
    socket.on("typing:start", (data) => {
      // Broadcast typing indicator to the conversation room (excluding sender)
      socket.to(`conversation:${data.conversationId}`).emit("typing:update", {
        conversationId: data.conversationId,
        userId,
        isTyping: true,
      });
    });

    // ── Typing: Stop typing ─────────────────────────────────────────────
    socket.on("typing:stop", (data) => {
      // Broadcast typing indicator to the conversation room (excluding sender)
      socket.to(`conversation:${data.conversationId}`).emit("typing:update", {
        conversationId: data.conversationId,
        userId,
        isTyping: false,
      });
    });

    // ── Heartbeat ─────────────────────────────────────────────────────────
    socket.on("presence:heartbeat", () => {
      presenceManager.touchHeartbeat(userId);
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      connectionManager.removeConnection(userId, socket.id);

      // Only mark offline when all connections for this user are gone
      if (!connectionManager.isConnected(userId)) {
        presenceManager.setStatus(userId, "offline", io!);
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
