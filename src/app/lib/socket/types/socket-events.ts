/**
 * Shared Socket.IO event type definitions.
 * Both server and client import from this file.
 *
 * Any new realtime event MUST be added here first.
 */

// ---------------------------------------------------------------------------
// Placeholder types — these will be replaced as real models land in later phases.
// Keeping them here lets us compile without pulling in Prisma or DB types.
// ---------------------------------------------------------------------------

/** Minimal message shape used in messaging events. */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  replyToId?: string;
  createdAt: string;
}

/** Message content type. */
export type MessageType = "text" | "image" | "file" | "system";

/** Minimal notification shape. */
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

/** Minimal discussion reply shape. */
export interface DiscussionReply {
  id: string;
  discussionId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

/** Minimal resource shape. */
export interface Resource {
  id: string;
  title: string;
  uploaderId: string;
  createdAt: string;
}

/** Minimal team application shape. */
export interface TeamApplication {
  id: string;
  teamId: string;
  applicantId: string;
  status: string;
  createdAt: string;
}

/** Minimal question shape for Q&A events. */
export interface QaQuestion {
  id: string;
  title: string;
  categoryId: string;
  authorId: string;
  createdAt: string;
}

/** Minimal answer shape for Q&A events. */
export interface QaAnswer {
  id: string;
  questionId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

/** Minimal connection shape for connection events. */
export interface ConnectionEvent {
  id: string;
  requesterId: string;
  receiverId: string;
  status: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Event map
// ---------------------------------------------------------------------------

/**
 * Canonical map of every Socket.IO event in the system.
 *
 * - Keys prefixed with nothing are bidirectional concepts; the direction is
 *   documented in the comment above each entry.
 * - Client → Server events are emitted by the client and listened to by the server.
 * - Server → Client events are emitted by the server and listened to by the client.
 */
export interface SocketEvents {
  // ── Client → Server ──────────────────────────────────────────────────────

  /** Send a message in a conversation. */
  "messaging:send": {
    conversationId: string;
    content: string;
    type: MessageType;
    replyToId?: string;
  };

  /** Mark a message as read. */
  "messaging:read": {
    conversationId: string;
    messageId: string;
  };

  /** User started typing in a conversation. */
  "typing:start": { conversationId: string };

  /** User stopped typing in a conversation. */
  "typing:stop": { conversationId: string };

  /** Join a conversation room for realtime updates. */
  "conversation:join": { conversationId: string };

  /** Leave a conversation room. */
  "conversation:leave": { conversationId: string };

  /** Heartbeat to keep presence alive. */
  "presence:heartbeat": Record<string, never>;

  // ── Server → Client ──────────────────────────────────────────────────────

  /** New message in a conversation. */
  "messaging:new": Message;

  /** Read receipt for a message. */
  "messaging:read-receipt": {
    messageId: string;
    readBy: string;
    readAt: string;
  };

  /** Typing indicator update. */
  "typing:update": {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  };

  /** Presence change for a user. */
  "presence:update": {
    userId: string;
    status: "online" | "offline";
    lastSeen?: string;
  };

  /** New notification for the connected user. */
  "notification:new": Notification;

  /** New reply in a discussion. */
  "discussion:reply": {
    discussionId: string;
    reply: DiscussionReply;
  };

  /** New resource uploaded. */
  "resource:new": { resource: Resource };

  /** New team application submitted. */
  "team:application": {
    teamRequestId: string;
    application: TeamApplication;
  };

  /** New question posted in Q&A. */
  "qa:newQuestion": QaQuestion;

  /** New answer posted on a question. */
  "qa:newAnswer": QaAnswer;

  /** Vote updated on a question or answer. */
  "qa:voteUpdate": {
    entityType: "question" | "answer";
    entityId: string;
    upvoteCount: number;
  };

  /** New connection request sent. */
  "connection:request": ConnectionEvent;

  /** Connection request accepted. */
  "connection:accepted": ConnectionEvent;

  /** Connection removed. */
  "connection:removed": { connectionId: string; removedBy: string };

  /** Admin review status updated. */
  "admin:review-update": {
    type: string;
    entityId: string;
    status: string;
  };

  /** System-wide announcement. */
  "system:announcement": {
    title: string;
    message: string;
  };

  // ── Error events ─────────────────────────────────────────────────────────

  /** Server-side error pushed to the client. */
  "error:message": { message: string };
}

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

/** Extract only client → server event names. */
export type ClientEvents = keyof Pick<
  SocketEvents,
  | "messaging:send"
  | "messaging:read"
  | "typing:start"
  | "typing:stop"
  | "conversation:join"
  | "conversation:leave"
  | "presence:heartbeat"
>;

/** Extract only server → client event names. */
export type ServerEvents = keyof Pick<
  SocketEvents,
  | "messaging:new"
  | "messaging:read-receipt"
  | "typing:update"
  | "presence:update"
  | "notification:new"
  | "discussion:reply"
  | "resource:new"
  | "team:application"
  | "qa:newQuestion"
  | "qa:newAnswer"
  | "qa:voteUpdate"
  | "connection:request"
  | "connection:accepted"
  | "connection:removed"
  | "admin:review-update"
  | "system:announcement"
  | "error:message"
>;
