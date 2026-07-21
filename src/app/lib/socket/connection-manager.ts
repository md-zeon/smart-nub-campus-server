/**
 * Tracks all active Socket.IO connections.
 * Maps user IDs to sets of socket IDs (supports multiple connections per user).
 */

class ConnectionManager {
  /** userId → Set<socketId> */
  private connections = new Map<string, Set<string>>();

  /** socketId → userId (reverse index for fast cleanup) */
  private socketToUser = new Map<string, string>();

  /** Register a new socket connection for a user. */
  addConnection(userId: string, socketId: string): void {
    let sockets = this.connections.get(userId);
    if (!sockets) {
      sockets = new Set();
      this.connections.set(userId, sockets);
    }
    sockets.add(socketId);
    this.socketToUser.set(socketId, userId);
  }

  /** Remove a socket connection. Returns the userId if found. */
  removeConnection(userId: string, socketId: string): string | undefined {
    const sockets = this.connections.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.connections.delete(userId);
      }
    }
    this.socketToUser.delete(socketId);
    return userId;
  }

  /** Get all active socket IDs for a user. */
  getConnections(userId: string): string[] {
    const sockets = this.connections.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  /** Check if a user has at least one active connection. */
  isConnected(userId: string): boolean {
    const sockets = this.connections.get(userId);
    return !!sockets && sockets.size > 0;
  }

  /** Send an event to all of a user's active connections. */
  broadcastToUser(
    io: import("socket.io").Server,
    userId: string,
    event: string,
    data: unknown,
  ): void {
    const socketIds = this.getConnections(userId);
    for (const socketId of socketIds) {
      io.to(socketId).emit(event, data);
    }
  }

  /** Get the userId for a given socketId. */
  getUserBySocketId(socketId: string): string | undefined {
    return this.socketToUser.get(socketId);
  }

  /** Get total number of connected users. */
  getConnectedUserCount(): number {
    return this.connections.size;
  }

  /** Get total number of active sockets. */
  getTotalSocketCount(): number {
    return this.socketToUser.size;
  }
}

/** Singleton instance. */
export const connectionManager = new ConnectionManager();
