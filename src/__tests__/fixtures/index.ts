export const mockUserId = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
export const mockUserId2 = "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e";
export const mockAdminId = "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f";
export const mockResourceId = "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80";
export const mockDiscussionId = "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091";
export const mockQuestionId = "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f809102";
export const mockAnswerId = "a7b8c9d0-e1f2-4a3b-4c5d-6e7f80910213";
export const mockConnectionId = "b8c9d0e1-f2a3-4b4c-5d6e-7f8091021324";
export const mockEventId = "c9d0e1f2-a3b4-4c5d-6e7f-809102132435";
export const mockMessageId = "d0e1f2a3-b4c5-4d6e-7f80-910213243546";
export const mockConversationId = "e1f2a3b4-c5d6-4e7f-8091-021324354657";
export const mockSessionId = "f2a3b4c5-d6e7-4f80-9102-132435465768";
export const mockCourseId = "11111111-1111-4111-8111-111111111111";
export const mockCategoryId = "22222222-2222-4222-8222-222222222222";
export const mockTagId = "33333333-3333-4333-8333-333333333333";

export const mockUser = {
  id: mockUserId,
  name: "Test User",
  email: "test@example.com",
  emailVerified: true,
  image: null,
  role: "STUDENT" as const,
  status: "ACTIVE" as const,
  isDeleted: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockUser2 = {
  id: mockUserId2,
  name: "Helper User",
  email: "helper@example.com",
  emailVerified: true,
  image: null,
  role: "STUDENT" as const,
  status: "ACTIVE" as const,
  isDeleted: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockAdminUser = {
  ...mockUser,
  id: mockAdminId,
  name: "Admin User",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

export const mockStudent = {
  id: "44444444-4444-4444-8444-444444444444",
  userId: mockUserId,
  studentId: "2311564030",
  department: "CSE",
  batch: 241,
  semester: 1,
  isVerified: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockAdmin = {
  id: "55555555-5555-4555-8555-555555555555",
  userId: mockAdminId,
  permissions: ["MANAGE_USERS"],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockSession = {
  id: mockSessionId,
  userId: mockUserId,
  expiresAt: new Date(Date.now() + 86400000),
  token: "mock-session-token",
  ipAddress: "127.0.0.1",
  userAgent: "test-agent",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockCourse = {
  id: mockCourseId,
  code: "CSE101",
  name: "Introduction to Programming",
  isDeleted: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockCategory = {
  id: mockCategoryId,
  name: "Lecture Notes",
  slug: "lecture-notes",
  description: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockTag = {
  id: mockTagId,
  name: "JavaScript",
  slug: "javascript",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockResource = {
  id: mockResourceId,
  title: "Test Resource",
  description: "A test resource description",
  fileUrl: "https://example.com/file.pdf",
  filePublicId: null,
  fileType: "application/pdf",
  fileSize: 1024,
  courseId: mockCourseId,
  categoryId: mockCategoryId,
  uploaderId: mockUserId,
  upvoteCount: 5,
  downvoteCount: 1,
  downloadCount: 10,
  viewCount: 50,
  reportCount: 0,
  isDeleted: false,
  deletedAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  course: mockCourse,
  category: mockCategory,
  uploader: {
    id: mockUserId,
    name: "Test User",
    email: "test@example.com",
    image: null,
  },
  resourceTags: [],
  _count: {
    resourceVotes: 6,
    comments: 3,
    resourceBookmarks: 2,
  },
};

export const mockDiscussion = {
  id: mockDiscussionId,
  title: "Test Discussion",
  content: "What do you think about this topic?",
  visibility: "PUBLIC" as const,
  department: null,
  batch: null,
  courseId: mockCourseId,
  categoryId: mockCategoryId,
  authorId: mockUserId,
  upvoteCount: 3,
  downvoteCount: 0,
  replyCount: 5,
  viewCount: 20,
  isPinned: false,
  isLocked: false,
  isSolved: false,
  isDeleted: false,
  deletedAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  author: {
    id: mockUserId,
    name: "Test User",
    email: "test@example.com",
    image: null,
  },
  course: mockCourse,
  category: {
    id: mockCategoryId,
    name: "General",
    slug: "general",
    color: "#6366f1",
  },
  discussionTags: [],
  _count: {
    discussionVotes: 3,
    replies: 5,
  },
};

export const mockQuestion = {
  id: mockQuestionId,
  title: "How to sort an array in JavaScript?",
  content: "I need help with sorting arrays.",
  status: "OPEN" as const,
  courseId: mockCourseId,
  categoryId: mockCategoryId,
  authorId: mockUserId,
  upvoteCount: 10,
  downvoteCount: 1,
  answerCount: 3,
  viewCount: 100,
  isDeleted: false,
  deletedAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  author: {
    id: mockUserId,
    name: "Test User",
    email: "test@example.com",
    image: null,
  },
  course: mockCourse,
  category: {
    id: mockCategoryId,
    name: "Programming",
    slug: "programming",
    color: "#10b981",
  },
  questionTags: [],
  _count: {
    questionVotes: 11,
    answers: 3,
  },
};

export const mockAnswer = {
  id: mockAnswerId,
  content: "You can use the Array.sort() method.",
  questionId: mockQuestionId,
  authorId: mockUserId2,
  isAccepted: true,
  upvoteCount: 8,
  downvoteCount: 0,
  isDeleted: false,
  deletedAt: null,
  createdAt: "2024-01-02T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
  author: {
    id: mockUserId2,
    name: "Helper User",
    email: "helper@example.com",
    image: null,
  },
  _count: {
    answerVotes: 8,
  },
};

export const mockEvent = {
  id: mockEventId,
  title: "Tech Talk 2024",
  description: "A talk about modern web development.",
  location: "NSU Auditorium",
  startTime: "2024-06-15T14:00:00.000Z",
  endTime: "2024-06-15T16:00:00.000Z",
  organizerId: mockUserId,
  maxAttendees: 100,
  rsvpCount: 25,
  categoryId: mockCategoryId,
  isDeleted: false,
  deletedAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  organizer: {
    id: mockUserId,
    name: "Test User",
    image: null,
  },
};

export const mockConnection = {
  id: mockConnectionId,
  requesterId: mockUserId,
  receiverId: mockUserId2,
  status: "PENDING" as const,
  isDeleted: false,
  deletedAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockConversation = {
  id: mockConversationId,
  type: "DIRECT" as const,
  name: null,
  isDeleted: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  participants: [
    {
      userId: mockUserId,
      user: { id: mockUserId, name: "Test User", image: null },
    },
    {
      userId: mockUserId2,
      user: { id: mockUserId2, name: "Other User", image: null },
    },
  ],
  lastMessage: {
    id: mockMessageId,
    content: "Hello!",
    createdAt: "2024-01-01T00:00:00.000Z",
    senderId: mockUserId,
  },
  _count: { messages: 10 },
};

export const mockMessage = {
  id: mockMessageId,
  content: "Hello!",
  conversationId: mockConversationId,
  senderId: mockUserId,
  isDeleted: false,
  deletedAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  sender: {
    id: mockUserId,
    name: "Test User",
    image: null,
  },
  readBy: [],
};

export const mockGamificationProfile = {
  id: "66666666-6666-4666-8666-666666666666",
  userId: mockUserId,
  points: 150,
  level: 3,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockBadge = {
  id: "77777777-7777-4777-8777-777777777777",
  name: "First Upload",
  description: "Upload your first resource",
  icon: "upload",
  criteria: { resourcesUploaded: 1 },
  points: 10,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};
