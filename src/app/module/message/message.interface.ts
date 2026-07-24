export interface CreateConversationInput {
  participantId: string;
}

export interface SendMessageInput {
  content: string;
  type?: "TEXT" | "IMAGE" | "FILE";
  replyToId?: string;
  fileUrl?: string;
  filePublicId?: string;
  fileName?: string;
  fileSize?: number;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  participantIds: string[];
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  groupImage?: string;
}

export interface AddMemberInput {
  participantIds: string[];
}

export interface GetConversationsQuery {
  page?: number;
  limit?: number;
}

export interface GetMessagesQuery {
  page?: number;
  limit?: number;
}

export interface ConversationParticipantInfo {
  id: string;
  userId: string;
  isAdmin: boolean;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
}

export interface ConversationWithDetails {
  id: string;
  type: string;
  name: string | null;
  description: string | null;
  groupImage: string | null;
  creatorId: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  otherUser?: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  conversationParticipants: ConversationParticipantInfo[];
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
  } | null;
  unreadCount: number;
}

export interface MessageWithSender {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  fileUrl: string | null;
  filePublicId: string | null;
  fileName: string | null;
  fileSize: number | null;
  replyToId: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender: {
    id: string;
    name: string;
    image: string | null;
  };
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
    sender: {
      id: string;
      name: string;
    };
  } | null;
}
