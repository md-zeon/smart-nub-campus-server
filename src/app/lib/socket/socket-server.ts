import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "node:http";
import ENVVARS from "../../../config/env";
import { socketAuthMiddleware } from "./middleware/auth.middleware";
import { connectionManager } from "./connection-manager";
import { presenceManager } from "./presence-manager";
import { roomManager } from "./room-manager";
import { DiscussionVisibility, UserRole } from "../../../generated/prisma/enums";

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
    socket.on("conversation:join", async (data) => {
      const { prisma } = await import("../prisma");
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: data.conversationId,
            userId,
          },
        },
        select: { id: true },
      });

      if (!participant) {
        console.warn(
          `[Socket] User ${userId} rejected from joining conversation ${data.conversationId} (not a participant)`,
        );
        socket.emit("error:message", {
          message: "You are not a participant of this conversation.",
        });
        return;
      }

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
            fileUrl: data.fileUrl,
            filePublicId: data.filePublicId,
            fileName: data.fileName,
            fileSize: data.fileSize,
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
          fileUrl: message.fileUrl ?? undefined,
          filePublicId: message.filePublicId ?? undefined,
          fileName: message.fileName ?? undefined,
          fileSize: message.fileSize ?? undefined,
          isEdited: message.isEdited,
          isForwarded: message.isForwarded,
          replyToId: message.replyToId ?? undefined,
          replyTo: message.replyTo ?? undefined,
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

        // Persist per-message read receipts and broadcast one receipt per
        // affected message so the sender's UI shows ✓✓ (and survives reload
        // because isRead/readAt are now stored on the message row).
        const { messageIds, readAt } = await messageService.markMessagesRead(
          data.conversationId,
          userId,
        );

        for (const messageId of messageIds) {
          roomManager.broadcastToRoom(io!, `conversation:${data.conversationId}`, "messaging:read-receipt", {
            messageId,
            readBy: userId,
            readAt: readAt.toISOString(),
          });
        }
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

    // ── Team room join/leave ──────────────────────────────────────────────
    socket.on("team:join", async (data) => {
      try {
        const { prisma } = await import("../prisma");

        const teamRequest = await prisma.teamRequest.findUnique({
          where: { id: data.teamRequestId },
          include: {
            teamMembers: { select: { userId: true } },
            creator: { select: { id: true } },
          },
        });

        if (!teamRequest) {
          console.warn(
            `[Socket] User ${userId} rejected from joining team ${data.teamRequestId} (team request not found)`,
          );
          socket.emit("error:message", {
            message: "Team request not found.",
          });
          return;
        }

        const viewer = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });

        const isCreator = teamRequest.creatorId === userId;
        const isMember = teamRequest.teamMembers.some((m) => m.userId === userId);
        const isAdmin = viewer?.role === UserRole.ADMIN;

        if (!isCreator && !isMember && !isAdmin) {
          console.warn(
            `[Socket] User ${userId} rejected from joining team ${data.teamRequestId} (not a member or creator)`,
          );
          socket.emit("error:message", {
            message: "You are not authorized to join this team room.",
          });
          return;
        }

        roomManager.joinRoom(socket, `team:${data.teamRequestId}`);
      } catch {
        socket.emit("error:message", { message: "Failed to join team room." });
      }
    });

    socket.on("team:leave", (data) => {
      roomManager.leaveRoom(socket, `team:${data.teamRequestId}`);
    });

    // ── Discussion room join/leave ─────────────────────────────────────────
    socket.on("discussion:join", async (data) => {
      try {
        const { prisma } = await import("../prisma");

        const discussion = await prisma.discussion.findUnique({
          where: { id: data.discussionId },
          include: { author: { include: { student: true, profile: true } } },
        });

        if (!discussion) {
          console.warn(
            `[Socket] User ${userId} rejected from joining discussion ${data.discussionId} (discussion not found)`,
          );
          socket.emit("error:message", {
            message: "Discussion not found.",
          });
          return;
        }

        const viewer = await prisma.user.findUnique({
          where: { id: userId },
          include: { student: true, profile: true },
        });

        if (discussion.visibility === DiscussionVisibility.DEPARTMENT) {
          if (
            !viewer?.student?.department ||
            viewer.student.department !== discussion.author.student?.department
          ) {
            console.warn(
              `[Socket] User ${userId} rejected from joining discussion ${data.discussionId} (not in author's department)`,
            );
            socket.emit("error:message", {
              message: "This discussion is only visible to your department.",
            });
            return;
          }
        } else if (discussion.visibility === DiscussionVisibility.BATCH) {
          if (
            !viewer?.profile?.batchYear ||
            viewer.profile.batchYear !== discussion.author.profile?.batchYear
          ) {
            console.warn(
              `[Socket] User ${userId} rejected from joining discussion ${data.discussionId} (not in author's batch)`,
            );
            socket.emit("error:message", {
              message: "This discussion is only visible to your batch.",
            });
            return;
          }
        }

        roomManager.joinRoom(socket, `discussion:${data.discussionId}`);
      } catch {
        socket.emit("error:message", { message: "Failed to join discussion room." });
      }
    });

    socket.on("discussion:leave", (data) => {
      roomManager.leaveRoom(socket, `discussion:${data.discussionId}`);
    });

    // ── Discussion typing indicators ───────────────────────────────────────
    socket.on("discussion:typing:start", (data) => {
      socket.to(`discussion:${data.discussionId}`).emit("typing:update", {
        conversationId: data.discussionId,
        userId,
        isTyping: true,
      });
    });

    socket.on("discussion:typing:stop", (data) => {
      socket.to(`discussion:${data.discussionId}`).emit("typing:update", {
        conversationId: data.discussionId,
        userId,
        isTyping: false,
      });
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      connectionManager.removeConnection(userId, socket.id);

      // Only mark offline when all connections for this user are gone
      if (!connectionManager.isConnected(userId)) {
        presenceManager.setStatus(userId, "offline", io!);
        presenceManager.removePresence(userId);
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
    console.error("[Socket.IO Engine] Connection error:", err.message, err);
  });

  // Log namespace registration for diagnostics
  console.log(
    `[Socket.IO] Registered namespaces: [${[...io._nsps.keys()].join(", ")}]`,
  );

  // Start heartbeat check to mark stale users offline
  presenceManager.startHeartbeatCheck(io);

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
