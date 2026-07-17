import type { Socket, Server as SocketIOServer } from "socket.io";

/**
 * Manages dynamic Socket.IO rooms.
 *
 * Room naming convention:
 *   - `user:{userId}`          — per-user room for targeted pushes
 *   - `conversation:{id}`      — messaging rooms
 *   - `department:{name}`      — department-wide broadcasts
 *   - `batch:{dept}:{year}`    — batch-specific rooms
 *   - `global`                 — system announcements
 */

const VALID_ROOM_PREFIXES = [
  "user:",
  "conversation:",
  "department:",
  "batch:",
  "global",
] as const;

function isValidRoom(room: string): boolean {
  return VALID_ROOM_PREFIXES.some((prefix) => room.startsWith(prefix));
}

class RoomManager {
  /**
   * Join a socket to a room after validating the room name.
   * Returns true if joined, false if the room name is invalid.
   */
  joinRoom(socket: Socket, room: string): boolean {
    if (!isValidRoom(room)) {
      console.warn(
        `[RoomManager] Rejected join to invalid room "${room}" from socket ${socket.id}`,
      );
      return false;
    }

    // Access validation for restricted room types
    const userId = socket.data.user?.id as string | undefined;

    if (room.startsWith("user:")) {
      const targetUserId = room.slice("user:".length);
      if (userId !== targetUserId) {
        console.warn(
          `[RoomManager] User ${userId} rejected from joining room ${room} (not their room)`,
        );
        return false;
      }
    }

    socket.join(room);
    return true;
  }

  /** Remove a socket from a room. */
  leaveRoom(socket: Socket, room: string): void {
    socket.leave(room);
  }

  /** Emit an event to all sockets in a room. */
  broadcastToRoom(
    io: SocketIOServer,
    room: string,
    event: string,
    data: unknown,
  ): void {
    io.to(room).emit(event, data);
  }

  /** Get the number of sockets in a room. */
  async getRoomSize(
    io: SocketIOServer,
    room: string,
  ): Promise<number> {
    const sockets = await io.in(room).fetchSockets();
    return sockets.length;
  }

  /** Get all socket IDs in a room. */
  async getRoomMembers(
    io: SocketIOServer,
    room: string,
  ): Promise<string[]> {
    const sockets = await io.in(room).fetchSockets();
    return sockets.map((s) => s.id);
  }
}

/** Singleton instance. */
export const roomManager = new RoomManager();
