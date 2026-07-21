import { describe, it, expect, vi, beforeEach } from "vitest";
import { VoteType } from "../../../../generated/prisma/enums";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    discussion: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    discussionCategory: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    course: {
      findUnique: vi.fn(),
    },
    tag: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    discussionTag: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    discussionVote: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    discussionBookmark: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    discussionReply: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    discussionReplyVote: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../gamification/gamification.service", () => ({
  gamificationService: {
    awardPoints: vi.fn().mockResolvedValue(undefined),
    handleContentDeleted: vi.fn().mockResolvedValue(undefined),
    handleUpvote: vi.fn().mockResolvedValue(undefined),
    handleDownvote: vi.fn().mockResolvedValue(undefined),
    handleVoteReversal: vi.fn().mockResolvedValue(undefined),
  },
}));

import { discussionService } from "../discussion.service";

const CATEGORY_ID = "cat-1";
const COURSE_ID = "course-1";
const AUTHOR_ID = "user-author";
const OTHER_USER_ID = "user-other";
const DISCUSSION_ID = "disc-1";
const TAG_ID = "tag-1";
const REPLY_ID = "reply-1";

const mockCategory = { id: CATEGORY_ID, name: "General", slug: "general" };
const mockCourse = { id: COURSE_ID, code: "CS101", name: "Intro to CS" };
const mockAuthor = { id: AUTHOR_ID, name: "Alice", email: "alice@test.com", image: null };
const mockOtherUser = { id: OTHER_USER_ID, name: "Bob", email: "bob@test.com", image: null };

const mockDiscussion = {
  id: DISCUSSION_ID,
  title: "Test Discussion",
  content: "Body text",
  categoryId: CATEGORY_ID,
  courseId: null,
  authorId: AUTHOR_ID,
  visibility: "PUBLIC",
  isDeleted: false,
  isPinned: false,
  isLocked: false,
  isSolved: false,
  viewCount: 0,
  upvoteCount: 0,
  replyCount: 0,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  category: mockCategory,
  course: null,
  author: mockAuthor,
  discussionTags: [],
};

const mockDiscussionFull = {
  ...mockDiscussion,
  _count: { discussionReplies: 0, discussionBookmarks: 0 },
};

function mockTxCallback() {
  mockPrisma.$transaction.mockImplementation(async (fns: any) => {
    if (Array.isArray(fns)) {
      return Promise.all(fns);
    }
    return fns(mockPrisma);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTxCallback();
});

describe("createDiscussion", () => {
  const createInput = {
    title: "New Discussion",
    content: "This is the body",
    categoryId: CATEGORY_ID,
    tagIds: [TAG_ID],
  };

  it("creates a discussion and returns it", async () => {
    const createdDiscussion = {
      ...mockDiscussion,
      title: "New Discussion",
      content: "This is the body",
      discussionTags: [{ tagId: TAG_ID, tag: { id: TAG_ID, name: "react", slug: "react" } }],
    };
    vi.mocked(mockPrisma.discussionCategory.findUnique).mockResolvedValue(mockCategory as any);
    vi.mocked(mockPrisma.discussion.create).mockResolvedValue(createdDiscussion as any);

    const result = await discussionService.createDiscussion(createInput, AUTHOR_ID);

    expect(mockPrisma.discussionCategory.findUnique).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID },
    });
    expect(mockPrisma.discussion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "New Discussion",
          content: "This is the body",
          categoryId: CATEGORY_ID,
          authorId: AUTHOR_ID,
        }),
      }),
    );
    expect(result).toBeDefined();
    expect(result!.title).toBe("New Discussion");
  });

  it("includes course lookup when courseId is provided", async () => {
    vi.mocked(mockPrisma.discussionCategory.findUnique).mockResolvedValue(mockCategory as any);
    vi.mocked(mockPrisma.course.findUnique).mockResolvedValue(mockCourse as any);
    vi.mocked(mockPrisma.discussion.create).mockResolvedValue({
      ...mockDiscussion,
      courseId: COURSE_ID,
    } as any);

    await discussionService.createDiscussion(
      { ...createInput, courseId: COURSE_ID },
      AUTHOR_ID,
    );

    expect(mockPrisma.course.findUnique).toHaveBeenCalledWith({
      where: { id: COURSE_ID },
    });
  });

  it("throws when category not found", async () => {
    vi.mocked(mockPrisma.discussionCategory.findUnique).mockResolvedValue(null);

    await expect(
      discussionService.createDiscussion(createInput, AUTHOR_ID),
    ).rejects.toThrow("Discussion category not found.");
  });

  it("throws when course not found", async () => {
    vi.mocked(mockPrisma.discussionCategory.findUnique).mockResolvedValue(mockCategory as any);
    vi.mocked(mockPrisma.course.findUnique).mockResolvedValue(null);

    await expect(
      discussionService.createDiscussion({ ...createInput, courseId: COURSE_ID }, AUTHOR_ID),
    ).rejects.toThrow("Course not found.");
  });
});

describe("getDiscussion", () => {
  it("returns a discussion and increments view count", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(mockDiscussionFull as any);
    vi.mocked(mockPrisma.discussion.update).mockResolvedValue({} as any);

    const result = await discussionService.getDiscussion(DISCUSSION_ID);

    expect(result).toBeDefined();
    expect(result!.viewCount).toBe(1);
    expect(mockPrisma.discussion.update).toHaveBeenCalledWith({
      where: { id: DISCUSSION_ID },
      data: { viewCount: { increment: 1 } },
    });
  });

  it("throws when discussion not found", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(null);

    await expect(discussionService.getDiscussion(DISCUSSION_ID)).rejects.toThrow(
      "Discussion not found.",
    );
  });

  it("returns user vote and bookmark state when userId is provided", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(mockDiscussionFull as any);
    vi.mocked(mockPrisma.discussion.update).mockResolvedValue({} as any);
    vi.mocked(mockPrisma.discussionVote.findUnique).mockResolvedValue({
      type: VoteType.UP,
    } as any);
    vi.mocked(mockPrisma.discussionBookmark.findUnique).mockResolvedValue({
      id: "bm-1",
    } as any);

    const result = await discussionService.getDiscussion(DISCUSSION_ID, OTHER_USER_ID);

    expect(result!.userVote).toBe(VoteType.UP);
    expect(result!.isBookmarked).toBe(true);
  });

  it("returns null vote and false bookmark when user has no state", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(mockDiscussionFull as any);
    vi.mocked(mockPrisma.discussion.update).mockResolvedValue({} as any);
    vi.mocked(mockPrisma.discussionVote.findUnique).mockResolvedValue(null);
    vi.mocked(mockPrisma.discussionBookmark.findUnique).mockResolvedValue(null);

    const result = await discussionService.getDiscussion(DISCUSSION_ID, OTHER_USER_ID);

    expect(result!.userVote).toBeNull();
    expect(result!.isBookmarked).toBe(false);
  });
});

describe("listDiscussions", () => {
  const mockDiscussions = [
    { ...mockDiscussion, _count: { discussionReplies: 2 } },
  ];

  it("returns paginated results with meta", async () => {
    mockPrisma.$transaction.mockResolvedValue([mockDiscussions, 1]);

    const result = await discussionService.listDiscussions({});

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual(
      expect.objectContaining({ page: 1, limit: 12, total: 1 }),
    );
  });

  it("applies category filter", async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 0]);
    vi.mocked(mockPrisma.discussion.findMany).mockResolvedValue([] as any);

    await discussionService.listDiscussions({ category: "general" });

    expect(mockPrisma.discussion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: { slug: "general" },
        }),
      }),
    );
  });

  it("enriches results with user vote and bookmark state", async () => {
    mockPrisma.$transaction.mockResolvedValue([mockDiscussions, 1]);
    vi.mocked(mockPrisma.discussionVote.findMany).mockResolvedValue([
      { discussionId: DISCUSSION_ID, type: VoteType.UP },
    ] as any);
    vi.mocked(mockPrisma.discussionBookmark.findMany).mockResolvedValue([
      { discussionId: DISCUSSION_ID },
    ] as any);

    const result = await discussionService.listDiscussions({}, OTHER_USER_ID);

    expect(result.data[0].userVote).toBe(VoteType.UP);
    expect(result.data[0].isBookmarked).toBe(true);
  });
});

describe("updateDiscussion", () => {
  const updateData = { title: "Updated Title" };

  it("updates own discussion", async () => {
    vi.mocked(mockPrisma.discussion.findUnique)
      .mockResolvedValueOnce(mockDiscussion as any)
      .mockResolvedValueOnce({ ...mockDiscussion, title: "Updated Title" } as any);

    const result = await discussionService.updateDiscussion(DISCUSSION_ID, updateData, AUTHOR_ID);

    expect(mockPrisma.discussion.update).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result!.title).toBe("Updated Title");
  });

  it("throws when discussion not found", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(null);

    await expect(
      discussionService.updateDiscussion(DISCUSSION_ID, updateData, AUTHOR_ID),
    ).rejects.toThrow("Discussion not found.");
  });

  it("throws when user is not the author", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(mockDiscussion as any);

    await expect(
      discussionService.updateDiscussion(DISCUSSION_ID, updateData, OTHER_USER_ID),
    ).rejects.toThrow("You can only edit your own discussions.");
  });

  it("validates category when changing it", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(mockDiscussion as any);
    vi.mocked(mockPrisma.discussionCategory.findUnique).mockResolvedValue(null);

    await expect(
      discussionService.updateDiscussion(
        DISCUSSION_ID,
        { categoryId: "cat-new" },
        AUTHOR_ID,
      ),
    ).rejects.toThrow("Discussion category not found.");
  });
});

describe("deleteDiscussion", () => {
  it("soft-deletes own discussion", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(mockDiscussion as any);

    const result = await discussionService.deleteDiscussion(DISCUSSION_ID, AUTHOR_ID);

    expect(mockPrisma.discussion.update).toHaveBeenCalledWith({
      where: { id: DISCUSSION_ID },
      data: { isDeleted: true },
    });
    expect(result).toEqual({ message: "Discussion deleted successfully." });
  });

  it("throws when discussion not found", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(null);

    await expect(
      discussionService.deleteDiscussion(DISCUSSION_ID, AUTHOR_ID),
    ).rejects.toThrow("Discussion not found.");
  });

  it("throws when user is not the author", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(mockDiscussion as any);

    await expect(
      discussionService.deleteDiscussion(DISCUSSION_ID, OTHER_USER_ID),
    ).rejects.toThrow("You can only delete your own discussions.");
  });
});

describe("voteDiscussion", () => {
  it("adds a new upvote", async () => {
    vi.mocked(mockPrisma.discussion.findUnique)
      .mockResolvedValueOnce(mockDiscussion as any)
      .mockResolvedValueOnce({ upvoteCount: 1 } as any);
    vi.mocked(mockPrisma.discussionVote.findUnique).mockResolvedValue(null);

    const result = await discussionService.voteDiscussion(DISCUSSION_ID, OTHER_USER_ID, {
      type: VoteType.UP,
    });

    expect(result.action).toBe("added");
    expect(result.upvoteCount).toBe(1);
    expect(mockPrisma.discussionVote.create).toHaveBeenCalled();
  });

  it("removes vote when clicking same type", async () => {
    vi.mocked(mockPrisma.discussion.findUnique)
      .mockResolvedValueOnce(mockDiscussion as any)
      .mockResolvedValueOnce({ upvoteCount: 0 } as any);
    vi.mocked(mockPrisma.discussionVote.findUnique).mockResolvedValue({
      id: "vote-1",
      type: VoteType.UP,
    } as any);

    const result = await discussionService.voteDiscussion(DISCUSSION_ID, OTHER_USER_ID, {
      type: VoteType.UP,
    });

    expect(result.action).toBe("removed");
    expect(mockPrisma.discussionVote.delete).toHaveBeenCalled();
  });

  it("switches vote type from down to up", async () => {
    vi.mocked(mockPrisma.discussion.findUnique)
      .mockResolvedValueOnce(mockDiscussion as any)
      .mockResolvedValueOnce({ upvoteCount: 1 } as any);
    vi.mocked(mockPrisma.discussionVote.findUnique).mockResolvedValue({
      id: "vote-1",
      type: VoteType.DOWN,
    } as any);

    const result = await discussionService.voteDiscussion(DISCUSSION_ID, OTHER_USER_ID, {
      type: VoteType.UP,
    });

    expect(result.action).toBe("updated");
    expect(mockPrisma.discussionVote.update).toHaveBeenCalled();
  });

  it("throws when discussion not found", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(null);

    await expect(
      discussionService.voteDiscussion(DISCUSSION_ID, OTHER_USER_ID, { type: VoteType.UP }),
    ).rejects.toThrow("Discussion not found.");
  });

  it("throws when voting on own discussion", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(mockDiscussion as any);

    await expect(
      discussionService.voteDiscussion(DISCUSSION_ID, AUTHOR_ID, { type: VoteType.UP }),
    ).rejects.toThrow("You cannot vote on your own discussion.");
  });
});

describe("bookmarkDiscussion", () => {
  it("adds a bookmark when none exists", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(mockDiscussion as any);
    vi.mocked(mockPrisma.discussionBookmark.findUnique).mockResolvedValue(null);

    const result = await discussionService.bookmarkDiscussion(DISCUSSION_ID, OTHER_USER_ID);

    expect(result).toEqual({ action: "added" });
    expect(mockPrisma.discussionBookmark.create).toHaveBeenCalled();
  });

  it("removes bookmark when one already exists", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(mockDiscussion as any);
    vi.mocked(mockPrisma.discussionBookmark.findUnique).mockResolvedValue({
      id: "bm-1",
    } as any);

    const result = await discussionService.bookmarkDiscussion(DISCUSSION_ID, OTHER_USER_ID);

    expect(result).toEqual({ action: "removed" });
    expect(mockPrisma.discussionBookmark.delete).toHaveBeenCalled();
  });

  it("throws when discussion not found", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(null);

    await expect(
      discussionService.bookmarkDiscussion(DISCUSSION_ID, OTHER_USER_ID),
    ).rejects.toThrow("Discussion not found.");
  });
});

describe("createReply", () => {
  const replyData = { content: "Nice point!" };

  it("creates a reply and increments replyCount", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(mockDiscussion as any);
    vi.mocked(mockPrisma.discussionReply.create).mockResolvedValue({
      id: REPLY_ID,
      content: "Nice point!",
      discussionId: DISCUSSION_ID,
      authorId: OTHER_USER_ID,
      author: mockOtherUser,
    } as any);

    const result = await discussionService.createReply(DISCUSSION_ID, replyData, OTHER_USER_ID);

    expect(result).toBeDefined();
    expect(result!.content).toBe("Nice point!");
    expect(mockPrisma.discussionReply.create).toHaveBeenCalled();
  });

  it("throws when discussion not found", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue(null);

    await expect(
      discussionService.createReply(DISCUSSION_ID, replyData, OTHER_USER_ID),
    ).rejects.toThrow("Discussion not found.");
  });

  it("throws when discussion is locked", async () => {
    vi.mocked(mockPrisma.discussion.findUnique).mockResolvedValue({
      ...mockDiscussion,
      isLocked: true,
    } as any);

    await expect(
      discussionService.createReply(DISCUSSION_ID, replyData, OTHER_USER_ID),
    ).rejects.toThrow("This discussion is locked.");
  });
});

describe("deleteReply", () => {
  it("deletes own reply", async () => {
    const mockReply = {
      id: REPLY_ID,
      authorId: OTHER_USER_ID,
      discussionId: DISCUSSION_ID,
      isDeleted: false,
      discussion: { authorId: AUTHOR_ID },
    };
    vi.mocked(mockPrisma.discussionReply.findUnique).mockResolvedValue(mockReply as any);

    const result = await discussionService.deleteReply(REPLY_ID, OTHER_USER_ID);

    expect(result).toEqual({ message: "Reply deleted successfully." });
    expect(mockPrisma.discussionReply.update).toHaveBeenCalledWith({
      where: { id: REPLY_ID },
      data: { isDeleted: true },
    });
  });

  it("allows discussion author to delete a reply", async () => {
    const mockReply = {
      id: REPLY_ID,
      authorId: OTHER_USER_ID,
      discussionId: DISCUSSION_ID,
      isDeleted: false,
      discussion: { authorId: AUTHOR_ID },
    };
    vi.mocked(mockPrisma.discussionReply.findUnique).mockResolvedValue(mockReply as any);

    const result = await discussionService.deleteReply(REPLY_ID, AUTHOR_ID);

    expect(result).toEqual({ message: "Reply deleted successfully." });
  });

  it("throws when reply not found", async () => {
    vi.mocked(mockPrisma.discussionReply.findUnique).mockResolvedValue(null);

    await expect(
      discussionService.deleteReply(REPLY_ID, OTHER_USER_ID),
    ).rejects.toThrow("Reply not found.");
  });

  it("throws when user is neither reply author nor discussion author", async () => {
    const mockReply = {
      id: REPLY_ID,
      authorId: OTHER_USER_ID,
      discussionId: DISCUSSION_ID,
      isDeleted: false,
      discussion: { authorId: AUTHOR_ID },
    };
    vi.mocked(mockPrisma.discussionReply.findUnique).mockResolvedValue(mockReply as any);

    const strangerId = "user-stranger";
    await expect(
      discussionService.deleteReply(REPLY_ID, strangerId),
    ).rejects.toThrow("You can only delete your own replies.");
  });
});
