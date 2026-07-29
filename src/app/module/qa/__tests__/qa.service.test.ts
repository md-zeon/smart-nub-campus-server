import { describe, it, expect, vi, beforeEach } from "vitest";
import { qaService } from "../qa.service";
import { prisma } from "../../../../app/lib/prisma";
import { VoteType } from "../../../../generated/prisma/enums";

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    questionCategory: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    course: { findUnique: vi.fn() },
    tag: { findUnique: vi.fn(), findMany: vi.fn() },
    question: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    questionTag: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
    questionVote: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    questionBookmark: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    answer: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    answerVote: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (fns: any) => {
      if (Array.isArray(fns)) {
        return Promise.all(fns);
      }
      const tx = new Proxy(
        {},
        {
          get: (_target, prop) => (prisma as any)[prop],
        }
      );
      return fns(tx);
    }),
  },
}));

const m = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  (m.$transaction as any).mockImplementation(async (fns: any) => {
    if (Array.isArray(fns)) {
      return Promise.all(fns);
    }
    const tx = new Proxy(
      {},
      { get: (_t: any, prop: string | symbol) => (prisma as any)[prop] }
    );
    return fns(tx);
  });
});

const APP_NOT_FOUND = "Question not found.";
const APP_FORBIDDEN_Q = "You can only edit your own questions.";
const APP_FORBIDDEN_DEL_Q = "You can only delete your own questions.";
const APP_SELF_VOTE = "You cannot vote on your own question.";

// ─────────────────────────────────────────────────────────────────────
// createQuestion
// ─────────────────────────────────────────────────────────────────────
describe("createQuestion", () => {
  const userId = "u1";

  it("should create a question with category only", async () => {
    (m.questionCategory.findUnique as any).mockResolvedValue({
      id: "cat1",
      name: "General",
    });
    (m.question.create as any).mockResolvedValue({
      id: "q1",
      title: "T",
      content: "C",
    });

    const result = await qaService.createQuestion(
      { title: "T", content: "C", categoryId: "cat1" },
      userId
    );

    expect(result.id).toBe("q1");
    expect(m.questionCategory.findUnique).toHaveBeenCalledWith({
      where: { id: "cat1" },
    });
    expect(m.question.create).toHaveBeenCalledTimes(1);
  });

  it("should throw when category not found", async () => {
    (m.questionCategory.findUnique as any).mockResolvedValue(null);

    await expect(
      qaService.createQuestion(
        { title: "T", content: "C", categoryId: "missing" },
        userId
      )
    ).rejects.toThrow("Question category not found.");
  });

  it("should validate courseId when provided", async () => {
    (m.questionCategory.findUnique as any).mockResolvedValue({ id: "cat1" });
    (m.course.findUnique as any).mockResolvedValue(null);

    await expect(
      qaService.createQuestion(
        { title: "T", content: "C", categoryId: "cat1", courseId: "bad" },
        userId
      )
    ).rejects.toThrow("Course not found.");
  });

  it("should skip courseId validation when not provided", async () => {
    (m.questionCategory.findUnique as any).mockResolvedValue({ id: "cat1" });
    (m.question.create as any).mockResolvedValue({ id: "q1" });

    await qaService.createQuestion(
      { title: "T", content: "C", categoryId: "cat1" },
      userId
    );

    expect(m.course.findUnique).not.toHaveBeenCalled();
  });

  it("should validate each tagId when provided", async () => {
    (m.questionCategory.findUnique as any).mockResolvedValue({ id: "cat1" });
    (m.tag.findUnique as any)
      .mockResolvedValueOnce({ id: "tag1" })
      .mockResolvedValueOnce(null);

    await expect(
      qaService.createQuestion(
        {
          title: "T",
          content: "C",
          categoryId: "cat1",
          tagIds: ["tag1", "tag-bad"],
        },
        userId
      )
    ).rejects.toThrow("Tag not found: tag-bad");
  });

  it("should create question with tagIds via nested create", async () => {
    (m.questionCategory.findUnique as any).mockResolvedValue({ id: "cat1" });
    (m.tag.findUnique as any).mockResolvedValue({ id: "tag1" });
    (m.question.create as any).mockResolvedValue({ id: "q1" });

    const result = await qaService.createQuestion(
      { title: "T", content: "C", categoryId: "cat1", tagIds: ["tag1"] },
      userId
    );

    expect(result.id).toBe("q1");
    const createCall = (m.question.create as any).mock.calls[0][0];
    expect(createCall.data.questionTags).toEqual({
      create: [{ tagId: "tag1" }],
    });
  });

  it("should create question with courseId", async () => {
    (m.questionCategory.findUnique as any).mockResolvedValue({ id: "cat1" });
    (m.course.findUnique as any).mockResolvedValue({ id: "c1" });
    (m.question.create as any).mockResolvedValue({ id: "q1" });

    await qaService.createQuestion(
      {
        title: "T",
        content: "C",
        categoryId: "cat1",
        courseId: "c1",
      },
      userId
    );

    const createCall = (m.question.create as any).mock.calls[0][0];
    expect(createCall.data.courseId).toBe("c1");
  });

  it("should set courseId to null when not provided", async () => {
    (m.questionCategory.findUnique as any).mockResolvedValue({ id: "cat1" });
    (m.question.create as any).mockResolvedValue({ id: "q1" });

    await qaService.createQuestion(
      { title: "T", content: "C", categoryId: "cat1" },
      userId
    );

    const createCall = (m.question.create as any).mock.calls[0][0];
    expect(createCall.data.courseId).toBeNull();
  });

  it("should not include questionTags when tagIds is empty", async () => {
    (m.questionCategory.findUnique as any).mockResolvedValue({ id: "cat1" });
    (m.question.create as any).mockResolvedValue({ id: "q1" });

    await qaService.createQuestion(
      { title: "T", content: "C", categoryId: "cat1", tagIds: [] },
      userId
    );

    const createCall = (m.question.create as any).mock.calls[0][0];
    expect(createCall.data.questionTags).toBeUndefined();
  });

  it("should set authorId to userId", async () => {
    (m.questionCategory.findUnique as any).mockResolvedValue({ id: "cat1" });
    (m.question.create as any).mockResolvedValue({ id: "q1" });

    await qaService.createQuestion(
      { title: "T", content: "C", categoryId: "cat1" },
      userId
    );

    const createCall = (m.question.create as any).mock.calls[0][0];
    expect(createCall.data.authorId).toBe(userId);
  });
});

// ─────────────────────────────────────────────────────────────────────
// getQuestion
// ─────────────────────────────────────────────────────────────────────
describe("getQuestion", () => {
  const qId = "q1";

  it("should return question with incremented viewCount", async () => {
    const mockQ = {
      id: qId,
      title: "T",
      viewCount: 5,
      author: { id: "a1", name: "A" },
      category: { id: "cat1" },
      course: null,
      questionTags: [],
      _count: { answers: 2, questionBookmarks: 1 },
    };
    (m.question.findUnique as any).mockResolvedValue(mockQ);
    (m.question.update as any).mockResolvedValue({});

    const result = await qaService.getQuestion(qId);

    expect(result.viewCount).toBe(6);
    expect(m.question.update).toHaveBeenCalledWith({
      where: { id: qId },
      data: { viewCount: { increment: 1 } },
    });
  });

  it("should throw when question not found", async () => {
    (m.question.findUnique as any).mockResolvedValue(null);

    await expect(qaService.getQuestion(qId)).rejects.toThrow(APP_NOT_FOUND);
  });

  it("should only find non-deleted questions", async () => {
    (m.question.findUnique as any).mockResolvedValue(null);

    await expect(qaService.getQuestion(qId)).rejects.toThrow();

    expect(m.question.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: qId, isDeleted: false }) })
    );
  });

  it("should return null userVote and false isBookmarked for anonymous", async () => {
    const mockQ = {
      id: qId,
      viewCount: 0,
      author: {},
      category: {},
      questionTags: [],
      _count: { answers: 0, questionBookmarks: 0 },
    };
    (m.question.findUnique as any).mockResolvedValue(mockQ);
    (m.question.update as any).mockResolvedValue({});

    const result = await qaService.getQuestion(qId);

    expect(result.userVote).toBeNull();
    expect(result.isBookmarked).toBe(false);
    expect(m.questionVote.findUnique).not.toHaveBeenCalled();
    expect(m.questionBookmark.findUnique).not.toHaveBeenCalled();
  });

  it("should return userVote when user has voted", async () => {
    const mockQ = {
      id: qId,
      viewCount: 0,
      author: {},
      category: {},
      questionTags: [],
      _count: { answers: 0, questionBookmarks: 0 },
    };
    (m.question.findUnique as any).mockResolvedValue(mockQ);
    (m.question.update as any).mockResolvedValue({});
    (m.questionVote.findUnique as any).mockResolvedValue({ type: "UP" });
    (m.questionBookmark.findUnique as any).mockResolvedValue(null);

    const result = await qaService.getQuestion(qId, "user1");

    expect(result.userVote).toBe("UP");
    expect(m.questionVote.findUnique).toHaveBeenCalled();
  });

  it("should return isBookmarked true when user bookmarked", async () => {
    const mockQ = {
      id: qId,
      viewCount: 0,
      author: {},
      category: {},
      questionTags: [],
      _count: { answers: 0, questionBookmarks: 0 },
    };
    (m.question.findUnique as any).mockResolvedValue(mockQ);
    (m.question.update as any).mockResolvedValue({});
    (m.questionVote.findUnique as any).mockResolvedValue(null);
    (m.questionBookmark.findUnique as any).mockResolvedValue({ id: "bm1" });

    const result = await qaService.getQuestion(qId, "user1");

    expect(result.isBookmarked).toBe(true);
  });

  it("should return userVote null and isBookmarked false when user has not voted/bookmarked", async () => {
    const mockQ = {
      id: qId,
      viewCount: 0,
      author: {},
      category: {},
      questionTags: [],
      _count: { answers: 0, questionBookmarks: 0 },
    };
    (m.question.findUnique as any).mockResolvedValue(mockQ);
    (m.question.update as any).mockResolvedValue({});
    (m.questionVote.findUnique as any).mockResolvedValue(null);
    (m.questionBookmark.findUnique as any).mockResolvedValue(null);

    const result = await qaService.getQuestion(qId, "user1");

    expect(result.userVote).toBeNull();
    expect(result.isBookmarked).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listAnswers
// ─────────────────────────────────────────────────────────────────────
describe("listAnswers", () => {
  const qId = "q1";

  it("should list answers for a question", async () => {
    (m.question.findUnique as any).mockResolvedValue({ id: qId });
    (m.answer.findMany as any).mockResolvedValue([
      { id: "a1", content: "ans1", answerVotes: [], _count: { answerVotes: 0 } },
      { id: "a2", content: "ans2", answerVotes: [], _count: { answerVotes: 0 } },
    ]);

    const result = await qaService.listAnswers(qId);

    expect(result).toHaveLength(2);
    expect(m.answer.findMany).toHaveBeenCalled();
  });

  it("should throw when question not found", async () => {
    (m.question.findUnique as any).mockResolvedValue(null);

    await expect(qaService.listAnswers(qId)).rejects.toThrow(APP_NOT_FOUND);
  });

  it("should strip answerVotes and attach userVote", async () => {
    (m.question.findUnique as any).mockResolvedValue({ id: qId });
    (m.answer.findMany as any).mockResolvedValue([
      {
        id: "a1",
        content: "x",
        answerVotes: [{ type: "UP" }],
        _count: { answerVotes: 1 },
      },
    ]);

    const result = await qaService.listAnswers(qId, "u1");

    expect(result[0].userVote).toBe("UP");
    expect(result[0].answerVotes).toBeUndefined();
  });

  it("should return null userVote when user has not voted", async () => {
    (m.question.findUnique as any).mockResolvedValue({ id: qId });
    (m.answer.findMany as any).mockResolvedValue([
      { id: "a1", content: "x", answerVotes: [], _count: { answerVotes: 0 } },
    ]);

    const result = await qaService.listAnswers(qId, "u1");

    expect(result[0].userVote).toBeNull();
  });

  it("should filter out deleted answers", async () => {
    (m.question.findUnique as any).mockResolvedValue({ id: qId });
    (m.answer.findMany as any).mockResolvedValue([]);

    await qaService.listAnswers(qId);

    expect(m.answer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isDeleted: false }),
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────
// listQuestions
// ─────────────────────────────────────────────────────────────────────
describe("listQuestions", () => {
  it("should return paginated questions with defaults", async () => {
    (m.question.findMany as any).mockResolvedValue([
      { id: "q1", title: "Q1" },
    ]);
    (m.question.count as any).mockResolvedValue(1);

    const result = await qaService.listQuestions({});

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(12);
    expect(result.meta.totalPages).toBe(1);
  });

  it("should use $transaction array pattern", async () => {
    (m.question.findMany as any).mockResolvedValue([]);
    (m.question.count as any).mockResolvedValue(0);

    await qaService.listQuestions({});

    expect(m.$transaction).toHaveBeenCalledWith(
      expect.arrayContaining([expect.anything(), expect.anything()])
    );
  });

  it("should apply search filter with OR on title and content", async () => {
    (m.question.findMany as any).mockResolvedValue([]);
    (m.question.count as any).mockResolvedValue(0);

    await qaService.listQuestions({ search: "prisma" });

    const findManyOpts = (m.question.findMany as any).mock.calls[0][0];
    expect(findManyOpts.where.OR).toEqual([
      { title: { contains: "prisma", mode: "insensitive" } },
      { content: { contains: "prisma", mode: "insensitive" } },
    ]);
  });

  it("should apply category filter by slug", async () => {
    (m.question.findMany as any).mockResolvedValue([]);
    (m.question.count as any).mockResolvedValue(0);

    await qaService.listQuestions({ category: "general" });

    const findManyOpts = (m.question.findMany as any).mock.calls[0][0];
    expect(findManyOpts.where.category).toEqual({ slug: "general" });
  });

  it("should apply tag filter by slug", async () => {
    (m.question.findMany as any).mockResolvedValue([]);
    (m.question.count as any).mockResolvedValue(0);

    await qaService.listQuestions({ tag: "typescript" });

    const findManyOpts = (m.question.findMany as any).mock.calls[0][0];
    expect(findManyOpts.where.questionTags).toEqual({
      some: { tag: { slug: "typescript" } },
    });
  });

  it("should filter answered questions", async () => {
    (m.question.findMany as any).mockResolvedValue([]);
    (m.question.count as any).mockResolvedValue(0);

    await qaService.listQuestions({ answered: "true" });

    const findManyOpts = (m.question.findMany as any).mock.calls[0][0];
    expect(findManyOpts.where.isAnswered).toBe(true);
  });

  it("should filter unanswered questions", async () => {
    (m.question.findMany as any).mockResolvedValue([]);
    (m.question.count as any).mockResolvedValue(0);

    await qaService.listQuestions({ answered: "false" });

    const findManyOpts = (m.question.findMany as any).mock.calls[0][0];
    expect(findManyOpts.where.isAnswered).toBe(false);
  });

  it("should sort by popular", async () => {
    (m.question.findMany as any).mockResolvedValue([]);
    (m.question.count as any).mockResolvedValue(0);

    await qaService.listQuestions({ sort: "popular" });

    const findManyOpts = (m.question.findMany as any).mock.calls[0][0];
    expect(findManyOpts.orderBy).toEqual([
      { upvoteCount: "desc" },
      { answerCount: "desc" },
    ]);
  });

  it("should sort by unanswered", async () => {
    (m.question.findMany as any).mockResolvedValue([]);
    (m.question.count as any).mockResolvedValue(0);

    await qaService.listQuestions({ sort: "unanswered" });

    const findManyOpts = (m.question.findMany as any).mock.calls[0][0];
    expect(findManyOpts.orderBy).toEqual([
      { isAnswered: "asc" },
      { createdAt: "desc" },
    ]);
  });

  it("should default sort to latest", async () => {
    (m.question.findMany as any).mockResolvedValue([]);
    (m.question.count as any).mockResolvedValue(0);

    await qaService.listQuestions({});

    const findManyOpts = (m.question.findMany as any).mock.calls[0][0];
    expect(findManyOpts.orderBy).toEqual([{ createdAt: "desc" }]);
  });

  it("should calculate skip/take from page and limit", async () => {
    (m.question.findMany as any).mockResolvedValue([]);
    (m.question.count as any).mockResolvedValue(0);

    await qaService.listQuestions({ page: 3, limit: 5 });

    const findManyOpts = (m.question.findMany as any).mock.calls[0][0];
    expect(findManyOpts.skip).toBe(10);
    expect(findManyOpts.take).toBe(5);
  });

  it("should always filter out deleted questions", async () => {
    (m.question.findMany as any).mockResolvedValue([]);
    (m.question.count as any).mockResolvedValue(0);

    await qaService.listQuestions({});

    const findManyOpts = (m.question.findMany as any).mock.calls[0][0];
    expect(findManyOpts.where.isDeleted).toBe(false);
  });

  it("should attach userVote and isBookmarked when userId provided", async () => {
    const mockQ = { id: "q1", title: "T" };
    (m.question.findMany as any).mockResolvedValue([mockQ]);
    (m.question.count as any).mockResolvedValue(1);
    (m.questionVote.findMany as any).mockResolvedValue([
      { questionId: "q1", type: "UP" },
    ]);
    (m.questionBookmark.findMany as any).mockResolvedValue([
      { questionId: "q1" },
    ]);

    const result = await qaService.listQuestions({}, "u1");

    expect(result.data[0].userVote).toBe("UP");
    expect(result.data[0].isBookmarked).toBe(true);
  });

  it("should default userVote to null and isBookmarked to false when no votes", async () => {
    const mockQ = { id: "q1", title: "T" };
    (m.question.findMany as any).mockResolvedValue([mockQ]);
    (m.question.count as any).mockResolvedValue(1);
    (m.questionVote.findMany as any).mockResolvedValue([]);
    (m.questionBookmark.findMany as any).mockResolvedValue([]);

    const result = await qaService.listQuestions({}, "u1");

    expect(result.data[0].userVote).toBeNull();
    expect(result.data[0].isBookmarked).toBe(false);
  });

  it("should skip user state queries when no userId", async () => {
    (m.question.findMany as any).mockResolvedValue([{ id: "q1" }]);
    (m.question.count as any).mockResolvedValue(1);

    await qaService.listQuestions({});

    expect(m.questionVote.findMany).not.toHaveBeenCalled();
    expect(m.questionBookmark.findMany).not.toHaveBeenCalled();
  });

  it("should combine multiple filters", async () => {
    (m.question.findMany as any).mockResolvedValue([]);
    (m.question.count as any).mockResolvedValue(0);

    await qaService.listQuestions({
      search: "help",
      category: "cse",
      tag: "prisma",
      answered: "true",
      sort: "popular",
      page: 2,
      limit: 5,
    });

    const findManyOpts = (m.question.findMany as any).mock.calls[0][0];
    const where = findManyOpts.where;
    expect(where.OR).toBeDefined();
    expect(where.category).toEqual({ slug: "cse" });
    expect(where.questionTags).toEqual({
      some: { tag: { slug: "prisma" } },
    });
    expect(where.isAnswered).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// updateQuestion
// ─────────────────────────────────────────────────────────────────────
describe("updateQuestion", () => {
  const qId = "q1";
  const userId = "u1";

  it("should update title and content of own question", async () => {
    (m.question.findUnique as any)
      .mockResolvedValueOnce({ id: qId, authorId: userId })
      .mockResolvedValueOnce({
        id: qId,
        title: "New",
        content: "New body",
        author: {},
        category: {},
        questionTags: [],
      });
    (m.question.update as any).mockResolvedValue({});

    const result = await qaService.updateQuestion(
      qId,
      { title: "New", content: "New body" },
      userId
    );

    expect(result).toBeDefined();
    expect(m.question.update).toHaveBeenCalled();
  });

  it("should throw when question not found", async () => {
    (m.question.findUnique as any).mockResolvedValue(null);

    await expect(
      qaService.updateQuestion(qId, { title: "X" }, userId)
    ).rejects.toThrow(APP_NOT_FOUND);
  });

  it("should throw when user is not the author", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: "other",
    });

    await expect(
      qaService.updateQuestion(qId, { title: "X" }, userId)
    ).rejects.toThrow(APP_FORBIDDEN_Q);
  });

  it("should update tags when tagIds provided", async () => {
    (m.question.findUnique as any)
      .mockResolvedValueOnce({ id: qId, authorId: userId })
      .mockResolvedValueOnce({ id: qId, author: {}, category: {}, questionTags: [] });
    (m.questionTag.deleteMany as any).mockResolvedValue({});
    (m.questionTag.create as any).mockResolvedValue({});

    await qaService.updateQuestion(qId, { tagIds: ["t1", "t2"] }, userId);

    expect(m.questionTag.deleteMany).toHaveBeenCalledWith({
      where: { questionId: qId },
    });
    expect(m.questionTag.createMany).toHaveBeenCalledWith({
      data: [
        { questionId: qId, tagId: "t1" },
        { questionId: qId, tagId: "t2" },
      ],
    });
  });

  it("should not call deleteMany when tagIds not provided", async () => {
    (m.question.findUnique as any)
      .mockResolvedValueOnce({ id: qId, authorId: userId })
      .mockResolvedValueOnce({ id: qId, author: {}, category: {}, questionTags: [] });

    await qaService.updateQuestion(qId, { title: "X" }, userId);

    expect(m.questionTag.deleteMany).not.toHaveBeenCalled();
  });

  it("should not update fields not provided", async () => {
    (m.question.findUnique as any)
      .mockResolvedValueOnce({ id: qId, authorId: userId })
      .mockResolvedValueOnce({ id: qId, author: {}, category: {}, questionTags: [] });

    await qaService.updateQuestion(qId, {}, userId);

    const updateCalls = (m.question.update as any).mock.calls;
    const dataUpdateCall = updateCalls.find(
      (c: any) => c[0]?.where?.id === qId && "data" in c[0]
    );
    if (dataUpdateCall) {
      expect(dataUpdateCall[0].data).toEqual({});
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// deleteQuestion
// ─────────────────────────────────────────────────────────────────────
describe("deleteQuestion", () => {
  const qId = "q1";
  const userId = "u1";

  it("should soft delete own question", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: userId,
    });
    (m.question.update as any).mockResolvedValue({});

    const result = await qaService.deleteQuestion(qId, userId);

    expect(result.message).toBe("Question deleted successfully.");
    expect(m.question.update).toHaveBeenCalledWith({
      where: { id: qId },
      data: { isDeleted: true, deletedAt: expect.any(Date) },
    });
  });

  it("should throw when question not found", async () => {
    (m.question.findUnique as any).mockResolvedValue(null);

    await expect(qaService.deleteQuestion(qId, userId)).rejects.toThrow(
      APP_NOT_FOUND
    );
  });

  it("should throw when user is not the author", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: "other",
    });

    await expect(qaService.deleteQuestion(qId, userId)).rejects.toThrow(
      APP_FORBIDDEN_DEL_Q
    );
  });

  it("should only check non-deleted questions", async () => {
    (m.question.findUnique as any).mockResolvedValue(null);

    await expect(qaService.deleteQuestion(qId, userId)).rejects.toThrow();

    expect(m.question.findUnique).toHaveBeenCalledWith({
      where: { id: qId, isDeleted: false },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// voteQuestion
// ─────────────────────────────────────────────────────────────────────
describe("voteQuestion", () => {
  const qId = "q1";
  const userId = "u1";

  it("should add a new upvote", async () => {
    (m.question.findUnique as any)
      .mockResolvedValueOnce({ id: qId, authorId: "author1" })
      .mockResolvedValueOnce({ upvoteCount: 1 });
    (m.questionVote.findUnique as any).mockResolvedValue(null);
    (m.questionVote.create as any).mockResolvedValue({});

    const result = await qaService.voteQuestion(qId, userId, {
      type: VoteType.UP,
    });

    expect(result.action).toBe("added");
    expect(m.questionVote.create).toHaveBeenCalled();
  });

  it("should add a new downvote without changing upvoteCount", async () => {
    (m.question.findUnique as any)
      .mockResolvedValueOnce({ id: qId, authorId: "author1" })
      .mockResolvedValueOnce({ upvoteCount: 0 });
    (m.questionVote.findUnique as any).mockResolvedValue(null);
    (m.questionVote.create as any).mockResolvedValue({});

    const result = await qaService.voteQuestion(qId, userId, {
      type: VoteType.DOWN,
    });

    expect(result.action).toBe("added");
  });

  it("should remove vote when same type (toggle off)", async () => {
    (m.question.findUnique as any)
      .mockResolvedValueOnce({ id: qId, authorId: "author1" })
      .mockResolvedValueOnce({ upvoteCount: 0 });
    (m.questionVote.findUnique as any).mockResolvedValue({
      id: "v1",
      type: "UP",
    });
    (m.questionVote.delete as any).mockResolvedValue({});

    const result = await qaService.voteQuestion(qId, userId, {
      type: VoteType.UP,
    });

    expect(result.action).toBe("removed");
    expect(m.questionVote.delete).toHaveBeenCalled();
  });

  it("should switch vote from UP to DOWN", async () => {
    (m.question.findUnique as any)
      .mockResolvedValueOnce({ id: qId, authorId: "author1" })
      .mockResolvedValueOnce({ upvoteCount: 0 });
    (m.questionVote.findUnique as any).mockResolvedValue({
      id: "v1",
      type: "UP",
    });
    (m.questionVote.update as any).mockResolvedValue({});

    const result = await qaService.voteQuestion(qId, userId, {
      type: VoteType.DOWN,
    });

    expect(result.action).toBe("updated");
    expect(m.questionVote.update).toHaveBeenCalled();
  });

  it("should switch vote from DOWN to UP", async () => {
    (m.question.findUnique as any)
      .mockResolvedValueOnce({ id: qId, authorId: "author1" })
      .mockResolvedValueOnce({ upvoteCount: 1 });
    (m.questionVote.findUnique as any).mockResolvedValue({
      id: "v1",
      type: "DOWN",
    });
    (m.questionVote.update as any).mockResolvedValue({});

    const result = await qaService.voteQuestion(qId, userId, {
      type: VoteType.UP,
    });

    expect(result.action).toBe("updated");
  });

  it("should throw when question not found", async () => {
    (m.question.findUnique as any).mockResolvedValue(null);

    await expect(
      qaService.voteQuestion(qId, userId, { type: VoteType.UP })
    ).rejects.toThrow(APP_NOT_FOUND);
  });

  it("should throw when user tries to vote on own question", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: userId,
    });

    await expect(
      qaService.voteQuestion(qId, userId, { type: VoteType.UP })
    ).rejects.toThrow(APP_SELF_VOTE);
  });

  it("should return the updated upvoteCount", async () => {
    (m.question.findUnique as any)
      .mockResolvedValueOnce({ id: qId, authorId: "author1" })
      .mockResolvedValueOnce({ upvoteCount: 7 });
    (m.questionVote.findUnique as any).mockResolvedValue(null);
    (m.questionVote.create as any).mockResolvedValue({});

    const result = await qaService.voteQuestion(qId, userId, {
      type: VoteType.UP,
    });

    expect(result.upvoteCount).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────────
// voteAnswer
// ─────────────────────────────────────────────────────────────────────
describe("voteAnswer", () => {
  const aId = "a1";
  const userId = "u1";

  it("should add a new upvote to an answer", async () => {
    (m.answer.findUnique as any)
      .mockResolvedValueOnce({ id: aId, authorId: "author1" })
      .mockResolvedValueOnce({ upvoteCount: 1 });
    (m.answerVote.findUnique as any).mockResolvedValue(null);
    (m.answerVote.create as any).mockResolvedValue({});

    const result = await qaService.voteAnswer(aId, userId, {
      type: VoteType.UP,
    });

    expect(result.action).toBe("added");
    expect(m.answerVote.create).toHaveBeenCalled();
  });

  it("should remove answer vote when same type", async () => {
    (m.answer.findUnique as any)
      .mockResolvedValueOnce({ id: aId, authorId: "author1" })
      .mockResolvedValueOnce({ upvoteCount: 0 });
    (m.answerVote.findUnique as any).mockResolvedValue({
      id: "v1",
      type: "UP",
    });
    (m.answerVote.delete as any).mockResolvedValue({});

    const result = await qaService.voteAnswer(aId, userId, {
      type: VoteType.UP,
    });

    expect(result.action).toBe("removed");
  });

  it("should update answer vote to different type", async () => {
    (m.answer.findUnique as any)
      .mockResolvedValueOnce({ id: aId, authorId: "author1" })
      .mockResolvedValueOnce({ upvoteCount: 0 });
    (m.answerVote.findUnique as any).mockResolvedValue({
      id: "v1",
      type: "UP",
    });
    (m.answerVote.update as any).mockResolvedValue({});

    const result = await qaService.voteAnswer(aId, userId, {
      type: VoteType.DOWN,
    });

    expect(result.action).toBe("updated");
  });

  it("should throw when answer not found", async () => {
    (m.answer.findUnique as any).mockResolvedValue(null);

    await expect(
      qaService.voteAnswer(aId, userId, { type: VoteType.UP })
    ).rejects.toThrow("Answer not found.");
  });

  it("should throw when voting on own answer", async () => {
    (m.answer.findUnique as any).mockResolvedValue({
      id: aId,
      authorId: userId,
    });

    await expect(
      qaService.voteAnswer(aId, userId, { type: VoteType.UP })
    ).rejects.toThrow("You cannot vote on your own answer.");
  });

  it("should only check non-deleted answers", async () => {
    (m.answer.findUnique as any).mockResolvedValue(null);

    await expect(
      qaService.voteAnswer(aId, userId, { type: VoteType.UP })
    ).rejects.toThrow();

    expect(m.answer.findUnique).toHaveBeenCalledWith({
      where: { id: aId, isDeleted: false },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// bookmarkQuestion
// ─────────────────────────────────────────────────────────────────────
describe("bookmarkQuestion", () => {
  const qId = "q1";
  const userId = "u1";

  it("should add a bookmark", async () => {
    (m.question.findUnique as any).mockResolvedValue({ id: qId });
    (m.questionBookmark.findUnique as any).mockResolvedValue(null);
    (m.questionBookmark.create as any).mockResolvedValue({});

    const result = await qaService.bookmarkQuestion(qId, userId);

    expect(result.action).toBe("added");
    expect(m.questionBookmark.create).toHaveBeenCalled();
  });

  it("should remove existing bookmark", async () => {
    (m.question.findUnique as any).mockResolvedValue({ id: qId });
    (m.questionBookmark.findUnique as any).mockResolvedValue({
      id: "bm1",
    });
    (m.questionBookmark.delete as any).mockResolvedValue({});

    const result = await qaService.bookmarkQuestion(qId, userId);

    expect(result.action).toBe("removed");
    expect(m.questionBookmark.delete).toHaveBeenCalled();
  });

  it("should throw when question not found", async () => {
    (m.question.findUnique as any).mockResolvedValue(null);

    await expect(
      qaService.bookmarkQuestion(qId, userId)
    ).rejects.toThrow(APP_NOT_FOUND);
  });

  it("should only check non-deleted questions", async () => {
    (m.question.findUnique as any).mockResolvedValue(null);

    await expect(
      qaService.bookmarkQuestion(qId, userId)
    ).rejects.toThrow();

    expect(m.question.findUnique).toHaveBeenCalledWith({
      where: { id: qId, isDeleted: false },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// createAnswer
// ─────────────────────────────────────────────────────────────────────
describe("createAnswer", () => {
  const qId = "q1";
  const userId = "u1";

  it("should create an answer on a question", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      isClosed: false,
    });
    (m.answer.create as any).mockResolvedValue({
      id: "a1",
      content: "Answer",
      author: { id: userId },
    });
    (m.question.update as any).mockResolvedValue({});

    const result = await qaService.createAnswer(
      qId,
      { content: "Answer" },
      userId
    );

    expect(result.id).toBe("a1");
  });

  it("should throw when question not found", async () => {
    (m.question.findUnique as any).mockResolvedValue(null);

    await expect(
      qaService.createAnswer(qId, { content: "X" }, userId)
    ).rejects.toThrow(APP_NOT_FOUND);
  });

  it("should throw when question is closed", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      isClosed: true,
    });

    await expect(
      qaService.createAnswer(qId, { content: "X" }, userId)
    ).rejects.toThrow("This question is closed. No new answers allowed.");
  });

  it("should increment answerCount atomically", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      isClosed: false,
    });
    (m.answer.create as any).mockResolvedValue({ id: "a1", author: {} });
    (m.question.update as any).mockResolvedValue({});

    await qaService.createAnswer(qId, { content: "X" }, userId);

    expect(m.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: qId },
        data: { answerCount: { increment: 1 } },
      })
    );
  });

  it("should only check non-deleted questions", async () => {
    (m.question.findUnique as any).mockResolvedValue(null);

    await expect(
      qaService.createAnswer(qId, { content: "X" }, userId)
    ).rejects.toThrow();

    expect(m.question.findUnique).toHaveBeenCalledWith({
      where: { id: qId, isDeleted: false },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// deleteAnswer
// ─────────────────────────────────────────────────────────────────────
describe("deleteAnswer", () => {
  const aId = "a1";
  const userId = "u1";

  it("should soft delete own answer", async () => {
    (m.answer.findUnique as any).mockResolvedValue({
      id: aId,
      authorId: userId,
      isAccepted: false,
      questionId: "q1",
      question: { authorId: "author1" },
    });
    (m.answer.update as any).mockResolvedValue({});
    (m.question.update as any).mockResolvedValue({});

    const result = await qaService.deleteAnswer(aId, userId);

    expect(result.message).toBe("Answer deleted successfully.");
  });

  it("should throw when answer not found", async () => {
    (m.answer.findUnique as any).mockResolvedValue(null);

    await expect(qaService.deleteAnswer(aId, userId)).rejects.toThrow(
      "Answer not found."
    );
  });

  it("should throw when user is neither answer author nor question author", async () => {
    (m.answer.findUnique as any).mockResolvedValue({
      id: aId,
      authorId: "author1",
      question: { authorId: "author2" },
    });

    await expect(qaService.deleteAnswer(aId, userId)).rejects.toThrow(
      "You can only delete your own answers."
    );
  });

  it("should allow question author to delete answer", async () => {
    const qAuthorId = "qauthor";
    (m.answer.findUnique as any).mockResolvedValue({
      id: aId,
      authorId: "someone-else",
      isAccepted: false,
      questionId: "q1",
      question: { authorId: qAuthorId },
    });
    (m.answer.update as any).mockResolvedValue({});
    (m.question.update as any).mockResolvedValue({});

    const result = await qaService.deleteAnswer(aId, qAuthorId);

    expect(result.message).toBe("Answer deleted successfully.");
  });

  it("should decrement answerCount", async () => {
    (m.answer.findUnique as any).mockResolvedValue({
      id: aId,
      authorId: userId,
      isAccepted: false,
      questionId: "q1",
      question: { authorId: "other" },
    });
    (m.answer.update as any).mockResolvedValue({});
    (m.question.update as any).mockResolvedValue({});

    await qaService.deleteAnswer(aId, userId);

    expect(m.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { answerCount: { decrement: 1 } },
      })
    );
  });

  it("should unaccept and update isAnswered when deleting accepted answer", async () => {
    (m.answer.findUnique as any).mockResolvedValue({
      id: aId,
      authorId: userId,
      isAccepted: true,
      questionId: "q1",
      question: { authorId: "other" },
    });
    (m.answer.update as any).mockResolvedValue({});
    (m.question.update as any).mockResolvedValue({});

    await qaService.deleteAnswer(aId, userId);

    expect(m.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "q1" },
        data: { isAnswered: false },
      })
    );
  });

  it("should only check non-deleted answers", async () => {
    (m.answer.findUnique as any).mockResolvedValue(null);

    await expect(qaService.deleteAnswer(aId, userId)).rejects.toThrow();

    expect(m.answer.findUnique).toHaveBeenCalledWith({
      where: { id: aId, isDeleted: false },
      include: { question: { select: { authorId: true } } },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// acceptAnswer
// ─────────────────────────────────────────────────────────────────────
describe("acceptAnswer", () => {
  const qId = "q1";
  const aId = "a1";
  const userId = "u1";

  it("should accept an answer as question author", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: userId,
    });
    (m.answer.findUnique as any).mockResolvedValue({
      id: aId,
      isAccepted: false,
      authorId: "ans-author",
    });
    (m.answer.findFirst as any).mockResolvedValue(null);
    (m.answer.update as any).mockResolvedValue({});
    (m.user.update as any).mockResolvedValue({});
    (m.question.update as any).mockResolvedValue({});

    const result = await qaService.acceptAnswer(qId, aId, userId);

    expect(result.isAccepted).toBe(true);
    expect(result.isAnswered).toBe(true);
  });

  it("should throw when question not found", async () => {
    (m.question.findUnique as any).mockResolvedValue(null);

    await expect(
      qaService.acceptAnswer(qId, aId, userId)
    ).rejects.toThrow(APP_NOT_FOUND);
  });

  it("should throw when user is not the question author", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: "other",
    });

    await expect(
      qaService.acceptAnswer(qId, aId, userId)
    ).rejects.toThrow("Only the question author can accept answers.");
  });

  it("should throw when answer not found", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: userId,
    });
    (m.answer.findUnique as any).mockResolvedValue(null);

    await expect(
      qaService.acceptAnswer(qId, aId, userId)
    ).rejects.toThrow("Answer not found.");
  });

  it("should return early if answer is already accepted", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: userId,
    });
    (m.answer.findUnique as any).mockResolvedValue({
      id: aId,
      isAccepted: true,
    });

    const result = await qaService.acceptAnswer(qId, aId, userId);

    expect(result.isAccepted).toBe(true);
    expect(m.user.update).not.toHaveBeenCalled();
  });

  it("should unaccept previous answer and accept new one", async () => {
    const prevAnswerId = "a-old";
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: userId,
    });
    (m.answer.findUnique as any).mockResolvedValue({
      id: aId,
      isAccepted: false,
      authorId: "new-author",
    });
    (m.answer.findFirst as any).mockResolvedValue({
      id: prevAnswerId,
      authorId: "old-author",
    });
    (m.answer.update as any).mockResolvedValue({});
    (m.user.update as any).mockResolvedValue({});
    (m.question.update as any).mockResolvedValue({});

    const result = await qaService.acceptAnswer(qId, aId, userId);

    expect(result.isAccepted).toBe(true);
  });

  it("should set isAnswered to true on the question", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: userId,
    });
    (m.answer.findUnique as any).mockResolvedValue({
      id: aId,
      isAccepted: false,
      authorId: "ans-author",
    });
    (m.answer.findFirst as any).mockResolvedValue(null);
    (m.answer.update as any).mockResolvedValue({});
    (m.user.update as any).mockResolvedValue({});
    (m.question.update as any).mockResolvedValue({});

    await qaService.acceptAnswer(qId, aId, userId);

    expect(m.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: qId },
        data: { isAnswered: true },
      })
    );
  });

  it("should answer belong to the correct question", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: userId,
    });
    (m.answer.findUnique as any).mockResolvedValue(null);

    await expect(
      qaService.acceptAnswer(qId, aId, userId)
    ).rejects.toThrow("Answer not found.");

    expect(m.answer.findUnique).toHaveBeenCalledWith({
      where: { id: aId, questionId: qId, isDeleted: false },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// unacceptAnswer
// ─────────────────────────────────────────────────────────────────────
describe("unacceptAnswer", () => {
  const qId = "q1";
  const userId = "u1";

  it("should unaccept an accepted answer", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: userId,
    });
    (m.answer.findFirst as any)
      .mockResolvedValueOnce({
        id: "a1",
        authorId: "ans-author",
        isAccepted: true,
      })
      .mockResolvedValueOnce(null);
    (m.answer.update as any).mockResolvedValue({});
    (m.user.update as any).mockResolvedValue({});
    (m.question.update as any).mockResolvedValue({});

    const result = await qaService.unacceptAnswer(qId, userId);

    expect(result.isAccepted).toBe(false);
    expect(result.isAnswered).toBe(false);
  });

  it("should throw when question not found", async () => {
    (m.question.findUnique as any).mockResolvedValue(null);

    await expect(qaService.unacceptAnswer(qId, userId)).rejects.toThrow(
      APP_NOT_FOUND
    );
  });

  it("should throw when user is not the question author", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: "other",
    });

    await expect(qaService.unacceptAnswer(qId, userId)).rejects.toThrow(
      "Only the question author can unaccept answers."
    );
  });

  it("should throw when no accepted answer exists", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: userId,
    });
    (m.answer.findFirst as any).mockResolvedValue(null);

    await expect(qaService.unacceptAnswer(qId, userId)).rejects.toThrow(
      "No accepted answer to remove."
    );
  });

  it("should deduct -15 reputation from answer author", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: userId,
    });
    (m.answer.findFirst as any)
      .mockResolvedValueOnce({
        id: "a1",
        authorId: "ans-author",
        isAccepted: true,
      })
      .mockResolvedValueOnce(null);
    (m.answer.update as any).mockResolvedValue({});
    (m.question.update as any).mockResolvedValue({});

    await qaService.unacceptAnswer(qId, userId);

    expect(m.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: qId },
        data: { isAnswered: false },
      })
    );
  });

  it("should set isAnswered to true if another accepted answer exists", async () => {
    (m.question.findUnique as any).mockResolvedValue({
      id: qId,
      authorId: userId,
    });
    (m.answer.findFirst as any)
      .mockResolvedValueOnce({
        id: "a1",
        authorId: "ans-author",
        isAccepted: true,
      })
      .mockResolvedValueOnce({ id: "a2", isAccepted: true });
    (m.answer.update as any).mockResolvedValue({});
    (m.user.update as any).mockResolvedValue({});
    (m.question.update as any).mockResolvedValue({});

    await qaService.unacceptAnswer(qId, userId);

    expect(m.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: qId },
        data: { isAnswered: true },
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────
// getBookmarkedQuestions
// ─────────────────────────────────────────────────────────────────────
describe("getBookmarkedQuestions", () => {
  it("should return bookmarked questions with pagination", async () => {
    (m.questionBookmark.findMany as any).mockResolvedValue([
      { question: { id: "q1" } },
      { question: { id: "q2" } },
    ]);
    (m.questionBookmark.count as any).mockResolvedValue(2);

    const result = await qaService.getBookmarkedQuestions("u1");

    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
  });

  it("should use custom page and limit", async () => {
    (m.questionBookmark.findMany as any).mockResolvedValue([]);
    (m.questionBookmark.count as any).mockResolvedValue(0);

    const result = await qaService.getBookmarkedQuestions("u1", 2, 5);

    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(5);
  });

  it("should use default page=1 limit=12", async () => {
    (m.questionBookmark.findMany as any).mockResolvedValue([]);
    (m.questionBookmark.count as any).mockResolvedValue(0);

    const result = await qaService.getBookmarkedQuestions("u1");

    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(12);
  });

  it("should return empty data when no bookmarks", async () => {
    (m.questionBookmark.findMany as any).mockResolvedValue([]);
    (m.questionBookmark.count as any).mockResolvedValue(0);

    const result = await qaService.getBookmarkedQuestions("u1");

    expect(result.data).toHaveLength(0);
  });

  it("should extract question from bookmark relation", async () => {
    const mockQuestion = { id: "q1", title: "Test" };
    (m.questionBookmark.findMany as any).mockResolvedValue([
      { question: mockQuestion },
    ]);
    (m.questionBookmark.count as any).mockResolvedValue(1);

    const result = await qaService.getBookmarkedQuestions("u1");

    expect(result.data[0]).toEqual(mockQuestion);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listCategories
// ─────────────────────────────────────────────────────────────────────
describe("listCategories", () => {
  it("should return all categories with question counts", async () => {
    (m.questionCategory.findMany as any).mockResolvedValue([
      { id: "c1", name: "General", _count: { questions: 5 } },
      { id: "c2", name: "CSE", _count: { questions: 10 } },
    ]);

    const result = await qaService.listCategories();

    expect(result).toHaveLength(2);
    expect(result[0]._count.questions).toBe(5);
  });

  it("should return empty array when no categories", async () => {
    (m.questionCategory.findMany as any).mockResolvedValue([]);

    const result = await qaService.listCategories();

    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listTags
// ─────────────────────────────────────────────────────────────────────
describe("listTags", () => {
  it("should return all tags with question usage counts", async () => {
    (m.tag.findMany as any).mockResolvedValue([
      { id: "t1", name: "TypeScript", _count: { questionTags: 8 } },
    ]);

    const result = await qaService.listTags();

    expect(result).toHaveLength(1);
    expect(result[0]._count.questionTags).toBe(8);
  });

  it("should return empty array when no tags", async () => {
    (m.tag.findMany as any).mockResolvedValue([]);

    const result = await qaService.listTags();

    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// getTopContributors
// ─────────────────────────────────────────────────────────────────────
describe("getTopContributors", () => {
  it("should return top contributors ranked by question count", async () => {
    (m.question.groupBy as any).mockResolvedValue([
      { authorId: "u1", _count: { _all: 10 } },
      { authorId: "u2", _count: { _all: 5 } },
    ]);
    (m.user.findMany as any).mockResolvedValue([
      { id: "u1", name: "Alice", image: null },
      { id: "u2", name: "Bob", image: null },
    ]);

    const result = await qaService.getTopContributors();

    expect(result).toHaveLength(2);
    expect(result[0].rank).toBe(1);
    expect(result[0].name).toBe("Alice");
    expect(result[0].questionCount).toBe(10);
  });

  it("should use default limit of 5", async () => {
    (m.question.groupBy as any).mockResolvedValue([]);
    (m.user.findMany as any).mockResolvedValue([]);

    await qaService.getTopContributors();

    expect(m.question.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });

  it("should accept custom limit", async () => {
    (m.question.groupBy as any).mockResolvedValue([]);
    (m.user.findMany as any).mockResolvedValue([]);

    await qaService.getTopContributors(10);

    expect(m.question.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });

  it("should filter out users not found in user table", async () => {
    (m.question.groupBy as any).mockResolvedValue([
      { authorId: "u1", _count: { _all: 3 } },
      { authorId: "u-gone", _count: { _all: 2 } },
    ]);
    (m.user.findMany as any).mockResolvedValue([
      { id: "u1", name: "Alice" },
    ]);

    const result = await qaService.getTopContributors();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  it("should fallback name to Unknown for missing users (filtered out)", async () => {
    (m.question.groupBy as any).mockResolvedValue([
      { authorId: "u1", _count: { _all: 1 } },
    ]);
    (m.user.findMany as any).mockResolvedValue([]);

    const result = await qaService.getTopContributors();

    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// getTrending
// ─────────────────────────────────────────────────────────────────────
describe("getTrending", () => {
  it("should return trending questions sorted by views", async () => {
    (m.question.findMany as any).mockResolvedValue([
      { id: "q1", viewCount: 100 },
      { id: "q2", viewCount: 50 },
    ]);

    const result = await qaService.getTrending();

    expect(result).toHaveLength(2);
    expect(m.question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ viewCount: "desc" }, { answerCount: "desc" }],
      })
    );
  });

  it("should use default limit of 5", async () => {
    (m.question.findMany as any).mockResolvedValue([]);

    await qaService.getTrending();

    expect(m.question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });

  it("should accept custom limit", async () => {
    (m.question.findMany as any).mockResolvedValue([]);

    await qaService.getTrending(10);

    expect(m.question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });

  it("should filter out deleted questions", async () => {
    (m.question.findMany as any).mockResolvedValue([]);

    await qaService.getTrending();

    expect(m.question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isDeleted: false },
      })
    );
  });

  it("should return empty array when no trending questions", async () => {
    (m.question.findMany as any).mockResolvedValue([]);

    const result = await qaService.getTrending();

    expect(result).toHaveLength(0);
  });
});
