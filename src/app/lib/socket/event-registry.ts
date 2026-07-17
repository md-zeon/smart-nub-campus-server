/**
 * Centralized registry of all Socket.IO events.
 *
 * Each entry describes an event's name, direction, and the handler
 * that should be invoked when the event is received. Modules register
 * their handlers at startup.
 *
 * This file acts as the single source of truth for what events exist
 * and who handles them.
 */

import type { Socket, Server as SocketIOServer } from "socket.io";
import { roomManager } from "./room-manager";
import { presenceManager } from "./presence-manager";

// ---------------------------------------------------------------------------
// Handler type
// ---------------------------------------------------------------------------

type EventHandler<T = unknown> = (
  io: SocketIOServer,
  socket: Socket,
  data: T,
) => void | Promise<void>;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

interface EventDefinition<T = unknown> {
  name: string;
  direction: "client-to-server" | "server-to-client";
  handler?: EventHandler<T>;
  description: string;
}

class EventRegistry {
  private events = new Map<string, EventDefinition>();

  /** Register an event with its handler. */
  register<T>(definition: EventDefinition<T>): void {
    this.events.set(definition.name, definition as EventDefinition);
  }

  /** Get a registered event definition. */
  get(name: string): EventDefinition | undefined {
    return this.events.get(name);
  }

  /** Get all registered event names. */
  getEventNames(): string[] {
    return Array.from(this.events.keys());
  }

  /** Attach all registered client-to-server handlers to a socket. */
  attachHandlers(io: SocketIOServer, socket: Socket): void {
    for (const definition of this.events.values()) {
      if (definition.direction !== "client-to-server" || !definition.handler) {
        continue;
      }

      // Rate limiting: 100 events/sec/socket
      let eventCount = 0;
      const windowStart = Date.now();

      socket.on(definition.name, async (data: unknown) => {
        // Simple rate limiter
        const now = Date.now();
        if (now - windowStart > 1000) {
          // Reset window
          eventCount = 0;
        }
        eventCount++;

        if (eventCount > 100) {
          socket.emit("error:message", {
            message: "Rate limit exceeded. Please slow down.",
          });
          return;
        }

        try {
          await definition.handler!(io, socket, data);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Event handler error";
          console.error(
            `[EventRegistry] Error handling "${definition.name}":`,
            message,
          );
          socket.emit("error:message", { message });
        }
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton & built-in event registrations
// ---------------------------------------------------------------------------

export const eventRegistry = new EventRegistry();

// ── Messaging events ──────────────────────────────────────────────────────

eventRegistry.register({
  name: "messaging:send",
  direction: "client-to-server",
  description: "Send a message in a conversation",
  handler: (_io, socket, data: { conversationId: string }) => {
    // Phase 6 will implement the full handler.
    // For now, broadcast to the conversation room.
    roomManager.broadcastToRoom(
      _io,
      `conversation:${data.conversationId}`,
      "messaging:new",
      { senderId: socket.data.user.id, ...data },
    );
  },
});

eventRegistry.register({
  name: "messaging:read",
  direction: "client-to-server",
  description: "Mark a message as read",
  handler: (_io, _socket, _data) => {
    // Phase 6 stub — full implementation will handle read receipts
    void _io;
    void _socket;
    void _data;
  },
});

eventRegistry.register({
  name: "typing:start",
  direction: "client-to-server",
  description: "User started typing",
  handler: (_io, socket, data: { conversationId: string }) => {
    roomManager.broadcastToRoom(
      _io,
      `conversation:${data.conversationId}`,
      "typing:update",
      {
        conversationId: data.conversationId,
        userId: socket.data.user.id,
        isTyping: true,
      },
    );
  },
});

eventRegistry.register({
  name: "typing:stop",
  direction: "client-to-server",
  description: "User stopped typing",
  handler: (_io, socket, data: { conversationId: string }) => {
    roomManager.broadcastToRoom(
      _io,
      `conversation:${data.conversationId}`,
      "typing:update",
      {
        conversationId: data.conversationId,
        userId: socket.data.user.id,
        isTyping: false,
      },
    );
  },
});

eventRegistry.register({
  name: "presence:heartbeat",
  direction: "client-to-server",
  description: "Keep-alive heartbeat from client",
  handler: (_io, socket, _data) => {
    void _io;
    void _data;
    const userId = socket.data.user?.id as string;
    if (userId) {
      presenceManager.touchHeartbeat(userId);
    }
  },
});

// ── Server → Client events (no handlers — these are emitted by the server) ─

eventRegistry.register({
  name: "messaging:new",
  direction: "server-to-client",
  description: "New message in a conversation",
});

eventRegistry.register({
  name: "messaging:read-receipt",
  direction: "server-to-client",
  description: "Read receipt for a message",
});

eventRegistry.register({
  name: "typing:update",
  direction: "server-to-client",
  description: "Typing indicator update",
});

eventRegistry.register({
  name: "presence:update",
  direction: "server-to-client",
  description: "Presence change for a user",
});

eventRegistry.register({
  name: "notification:new",
  direction: "server-to-client",
  description: "New notification for the connected user",
});

eventRegistry.register({
  name: "discussion:reply",
  direction: "server-to-client",
  description: "New reply in a discussion",
});

eventRegistry.register({
  name: "resource:new",
  direction: "server-to-client",
  description: "New resource uploaded",
});

eventRegistry.register({
  name: "team:application",
  direction: "server-to-client",
  description: "New team application submitted",
});

eventRegistry.register({
  name: "admin:review-update",
  direction: "server-to-client",
  description: "Admin review status updated",
});

eventRegistry.register({
  name: "system:announcement",
  direction: "server-to-client",
  description: "System-wide announcement",
});

eventRegistry.register({
  name: "error:message",
  direction: "server-to-client",
  description: "Server-side error pushed to the client",
});
