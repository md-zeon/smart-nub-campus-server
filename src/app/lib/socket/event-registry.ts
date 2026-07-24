/**
 * Centralized registry of all Socket.IO events.
 *
 * This file acts as the single source of truth for what events exist.
 * Server-to-client events are registered here for documentation purposes.
 * Client-to-server handlers are implemented inline in socket-server.ts.
 */

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

interface EventDefinition<K extends string = string> {
  name: K;
  direction: "client-to-server" | "server-to-client";
  description: string;
}

class EventRegistry {
  private events = new Map<string, EventDefinition>();

  /** Register an event definition. */
  register<K extends string>(definition: EventDefinition<K>): void {
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
}

// ---------------------------------------------------------------------------
// Singleton & built-in event registrations
// ---------------------------------------------------------------------------

export const eventRegistry = new EventRegistry();

// ── Client → Server events ────────────────────────────────────────────────

eventRegistry.register({
  name: "messaging:send",
  direction: "client-to-server",
  description: "Send a message in a conversation",
});

eventRegistry.register({
  name: "messaging:read",
  direction: "client-to-server",
  description: "Mark messages as read",
});

eventRegistry.register({
  name: "typing:start",
  direction: "client-to-server",
  description: "User started typing",
});

eventRegistry.register({
  name: "typing:stop",
  direction: "client-to-server",
  description: "User stopped typing",
});

eventRegistry.register({
  name: "presence:heartbeat",
  direction: "client-to-server",
  description: "Keep-alive heartbeat from client",
});

eventRegistry.register({
  name: "conversation:join",
  direction: "client-to-server",
  description: "Join a conversation room",
});

eventRegistry.register({
  name: "conversation:leave",
  direction: "client-to-server",
  description: "Leave a conversation room",
});

// ── Server → Client events ────────────────────────────────────────────────

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
  name: "qa:newQuestion",
  direction: "server-to-client",
  description: "New question posted in Q&A",
});

eventRegistry.register({
  name: "qa:newAnswer",
  direction: "server-to-client",
  description: "New answer posted on a question",
});

eventRegistry.register({
  name: "qa:voteUpdate",
  direction: "server-to-client",
  description: "Vote updated on a question or answer",
});

eventRegistry.register({
  name: "event:new",
  direction: "server-to-client",
  description: "New event created",
});

eventRegistry.register({
  name: "event:rsvpUpdate",
  direction: "server-to-client",
  description: "RSVP status changed for an event",
});

eventRegistry.register({
  name: "connection:request",
  direction: "server-to-client",
  description: "New connection request sent",
});

eventRegistry.register({
  name: "connection:accepted",
  direction: "server-to-client",
  description: "Connection request accepted",
});

eventRegistry.register({
  name: "connection:removed",
  direction: "server-to-client",
  description: "Connection removed",
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
