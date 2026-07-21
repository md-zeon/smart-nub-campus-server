/**
 * Manages online/offline presence for all connected users.
 *
 * - Tracks last heartbeat timestamp per user.
 * - Marks users offline after a configurable timeout (default 30s) with no heartbeat.
 * - Broadcasts presence changes to relevant rooms.
 */

const PRESENCE_TIMEOUT_MS = 30_000;

export type PresenceStatus = "online" | "offline";

interface UserPresence {
  status: PresenceStatus;
  lastSeen: Date;
  lastHeartbeat: Date;
}

class PresenceManager {
  /** userId → UserPresence */
  private presence = new Map<string, UserPresence>();

  /** Active heartbeat check interval ID. */
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  /** Check if a user is online. */
  isOnline(userId: string): boolean {
    const entry = this.presence.get(userId);
    return entry?.status === "online";
  }

  /** Get the last seen timestamp for a user, or null if never seen. */
  getLastSeen(userId: string): Date | null {
    const entry = this.presence.get(userId);
    return entry?.lastSeen ?? null;
  }

  /**
   * Update a user's presence status.
   * Broadcasts the change via the provided io instance.
   */
  setStatus(
    userId: string,
    status: PresenceStatus,
    io?: import("socket.io").Server,
  ): void {
    const now = new Date();
    const previous = this.presence.get(userId);

    // Skip if status hasn't changed
    if (previous?.status === status) {
      // But still update lastSeen for online pings
      if (status === "online") {
        this.presence.set(userId, {
          ...previous,
          lastSeen: now,
          lastHeartbeat: now,
        });
      }
      return;
    }

    this.presence.set(userId, {
      status,
      lastSeen: now,
      lastHeartbeat: now,
    });

    // Broadcast presence change
    if (io) {
      io.emit("presence:update", {
        userId,
        status,
        lastSeen: now.toISOString(),
      });
    }
  }

  /** Touch the heartbeat timestamp for a user (called on each heartbeat event). */
  touchHeartbeat(userId: string): void {
    const now = new Date();
    const existing = this.presence.get(userId);

    if (existing) {
      existing.lastHeartbeat = now;
      existing.lastSeen = now;
    } else {
      this.presence.set(userId, {
        status: "online",
        lastSeen: now,
        lastHeartbeat: now,
      });
    }
  }

  /**
   * Start the periodic heartbeat check.
   * Users who haven't sent a heartbeat within the timeout are marked offline.
   */
  startHeartbeatCheck(
    io: import("socket.io").Server,
  ): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      for (const [userId, entry] of this.presence) {
        if (
          entry.status === "online" &&
          now - entry.lastHeartbeat.getTime() > PRESENCE_TIMEOUT_MS
        ) {
          this.setStatus(userId, "offline", io);
          console.log(`[Presence] User ${userId} marked offline (heartbeat timeout)`);
        }
      }
    }, PRESENCE_TIMEOUT_MS / 2);

    console.log("[Presence] Heartbeat check started");
  }

  /** Stop the periodic heartbeat check. */
  stopHeartbeatCheck(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /** Remove presence data for a user (e.g., on full disconnect). */
  removePresence(userId: string): void {
    this.presence.delete(userId);
  }

  /** Get the number of currently online users. */
  getOnlineCount(): number {
    let count = 0;
    for (const entry of this.presence.values()) {
      if (entry.status === "online") count++;
    }
    return count;
  }
}

/** Singleton instance. */
export const presenceManager = new PresenceManager();
