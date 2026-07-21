import status from "http-status";
import { VoteType } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
  CreateAnswerInput,
  CreateQuestionInput,
  ListQuestionsQuery,
  UpdateQuestionInput,
  VoteInput,
} from "./qa.interface";

/**
 * Creates a new question with optional tags.
 * Validates category and course existence.
 */
const createQuestion = async (data: CreateQuestionInput, userId: string) => {
  const category = await prisma.questionCategory.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Question category not found.");
  }

  if (data.courseId) {
    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
    });
    if (!course) {
      throw new AppError(status.NOT_FOUND, "Course not found.");
    }
  }

  if (data.tagIds?.length) {
    for (const tagId of data.tagIds) {
      const tag = await prisma.tag.findUnique({ where: { id: tagId } });
      if (!tag) {
        throw new AppError(status.NOT_FOUND, `Tag not found: ${tagId}`);
      }
    }
  }

  const question = await prisma.question.create({
    data: {
      title: data.title,
      content: data.content,
      categoryId: data.categoryId,
      courseId: data.courseId ?? null,
      authorId: userId,
      questionTags: data.tagIds?.length
        ? {
            create: data.tagIds.map((tagId) => ({ tagId })),
          }
        : undefined,
    },
    include: {
      category: true,
      course: true,
      author: { select: { id: true, name: true, email: true, image: true } },
      questionTags: { include: { tag: true } },
    },
  });

  return question;
};

/**
 * Gets a single question by ID.
 * Increments view count.
 * Returns user vote and bookmark state if userId provided.
 */
const getQuestion = async (id: string, userId?: string) => {
  const question = await prisma.question.findUnique({
    where: { id, isDeleted: false },
    include: {
      category: true,
      course: true,
      author: { select: { id: true, name: true, email: true, image: true } },
      questionTags: { include: { tag: true } },
      _count: { select: { answers: true, questionBookmarks: true } },
    },
  });

  if (!question) {
    throw new AppError(status.NOT_FOUND, "Question not found.");
  }

  await prisma.question.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  let userVote: VoteType | null = null;
  let isBookmarked = false;

  if (userId) {
    const vote = await prisma.questionVote.findUnique({
      where: { questionId_userId: { questionId: id, userId } },
      select: { type: true },
    });
    userVote = vote?.type ?? null;

    const bookmark = await prisma.questionBookmark.findUnique({
      where: { questionId_userId: { questionId: id, userId } },
      select: { id: true },
    });
    isBookmarked = !!bookmark;
  }

  return {
    ...question,
    viewCount: question.viewCount + 1,
    userVote,
    isBookmarked,
  };
};

/**
 * Lists answers for a question, sorted accepted-first then by votes/recency.
 * Includes author and the current user's vote state.
 */
const listAnswers = async (questionId: string, userId?: string) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId, isDeleted: false },
    select: { id: true },
  });

  if (!question) {
    throw new AppError(status.NOT_FOUND, "Question not found.");
  }

  const answers = await prisma.answer.findMany({
    where: { questionId, isDeleted: false },
    orderBy: [{ isAccepted: "desc" }, { upvoteCount: "desc" }, { createdAt: "asc" }],
    include: {
      author: { select: { id: true, name: true, email: true, image: true, reputation: true } },
      answerVotes: { where: userId ? { userId } : undefined, select: { type: true } },
      _count: { select: { answerVotes: true } },
    },
  });

  return answers.map((a) => ({
    ...a,
    userVote: a.answerVotes?.[0]?.type ?? null,
    answerVotes: undefined,
  }));
};

/**
 * Lists questions with pagination, filters, and search.
 * Supports category, tag, answered/unanswered filters and sort options.
 */
const listQuestions = async (query: ListQuestionsQuery, userId?: string) => {
  const {
    category,
    tag,
    search,
    answered,
    sort = "latest",
    page = 1,
    limit = 12,
  } = query;

  const skip = (page - 1) * limit;
  const take = limit;

  const where: Record<string, unknown> = { isDeleted: false };

  if (category) {
    where.category = { slug: category };
  }

  if (tag) {
    where.questionTags = { some: { tag: { slug: tag } } };
  }

  if (answered === "true") {
    where.isAnswered = true;
  } else if (answered === "false") {
    where.isAnswered = false;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  let orderBy: Record<string, unknown>[];
  switch (sort) {
    case "popular":
      orderBy = [{ upvoteCount: "desc" }, { answerCount: "desc" }];
      break;
    case "unanswered":
      orderBy = [{ isAnswered: "asc" }, { createdAt: "desc" }];
      break;
    case "latest":
    default:
      orderBy = [{ createdAt: "desc" }];
      break;
  }

  const [questions, total] = await prisma.$transaction([
    prisma.question.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        course: { select: { id: true, code: true, name: true } },
        author: { select: { id: true, name: true, image: true } },
        questionTags: {
          include: { tag: { select: { id: true, name: true, slug: true } } },
        },
        _count: { select: { answers: true } },
      },
    }),
    prisma.question.count({ where }),
  ]);

  let questionsWithUserState = questions;

  if (userId) {
    const questionIds = questions.map((q) => q.id);

    const [votes, bookmarks] = await Promise.all([
      prisma.questionVote.findMany({
        where: { questionId: { in: questionIds }, userId },
        select: { questionId: true, type: true },
      }),
      prisma.questionBookmark.findMany({
        where: { questionId: { in: questionIds }, userId },
        select: { questionId: true },
      }),
    ]);

    const voteMap = new Map(votes.map((v) => [v.questionId, v.type]));
    const bookmarkSet = new Set(bookmarks.map((b) => b.questionId));

    questionsWithUserState = questions.map((q) => ({
      ...q,
      userVote: voteMap.get(q.id) ?? null,
      isBookmarked: bookmarkSet.has(q.id),
    }));
  }

  return {
    data: questionsWithUserState,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Updates a question. Only the author can update title, content, and tags.
 */
const updateQuestion = async (
  id: string,
  data: UpdateQuestionInput,
  userId: string,
) => {
  const existing = await prisma.question.findUnique({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Question not found.");
  }

  if (existing.authorId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only edit your own questions.");
  }

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;

  await prisma.$transaction(async (tx) => {
    await tx.question.update({ where: { id }, data: updateData });

    if (data.tagIds) {
      await tx.questionTag.deleteMany({ where: { questionId: id } });
      for (const tagId of data.tagIds) {
        await tx.questionTag.create({
          data: { questionId: id, tagId },
        });
      }
    }
  });

  return prisma.question.findUnique({
    where: { id },
    include: {
      category: true,
      course: true,
      author: { select: { id: true, name: true, email: true, image: true } },
      questionTags: { include: { tag: true } },
    },
  });
};

/**
 * Soft deletes a question. Only the author can delete.
 */
const deleteQuestion = async (id: string, userId: string) => {
  const existing = await prisma.question.findUnique({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Question not found.");
  }

  if (existing.authorId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only delete your own questions.");
  }

  await prisma.question.update({
    where: { id },
    data: { isDeleted: true },
  });

  return { message: "Question deleted successfully." };
};

/**
 * Creates an answer on a question.
 * Increments answerCount atomically.
 */
const createAnswer = async (
  questionId: string,
  data: CreateAnswerInput,
  userId: string,
) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId, isDeleted: false },
  });

  if (!question) {
    throw new AppError(status.NOT_FOUND, "Question not found.");
  }

  if (question.isClosed) {
    throw new AppError(status.FORBIDDEN, "This question is closed. No new answers allowed.");
  }

  const answer = await prisma.$transaction(async (tx) => {
    const created = await tx.answer.create({
      data: {
        content: data.content,
        questionId,
        authorId: userId,
      },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    await tx.question.update({
      where: { id: questionId },
      data: { answerCount: { increment: 1 } },
    });

    return created;
  });

  return answer;
};

/**
 * Soft deletes an answer. Only the answer author or question author can delete.
 * Decrements answerCount atomically.
 */
const deleteAnswer = async (answerId: string, userId: string) => {
  const answer = await prisma.answer.findUnique({
    where: { id: answerId, isDeleted: false },
    include: { question: { select: { authorId: true } } },
  });

  if (!answer) {
    throw new AppError(status.NOT_FOUND, "Answer not found.");
  }

  if (answer.authorId !== userId && answer.question.authorId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only delete your own answers.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.answer.update({
      where: { id: answerId },
      data: { isDeleted: true },
    });

    await tx.question.update({
      where: { id: answer.questionId },
      data: { answerCount: { decrement: 1 } },
    });

    // If the deleted answer was accepted, unaccept it and recalculate isAnswered
    if (answer.isAccepted) {
      await tx.question.update({
        where: { id: answer.questionId },
        data: { isAnswered: false },
      });

      // Award -15 reputation to the answer author
      await tx.user.update({
        where: { id: answer.authorId },
        data: { reputation: { decrement: 15 } },
      });
    }
  });

  return { message: "Answer deleted successfully." };
};

/**
 * Accepts an answer. Only the question author can accept.
 * Sets isAccepted on the answer and isAnswered on the question.
 * Awards +15 reputation to the answer author.
 */
const acceptAnswer = async (
  questionId: string,
  answerId: string,
  userId: string,
) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId, isDeleted: false },
  });

  if (!question) {
    throw new AppError(status.NOT_FOUND, "Question not found.");
  }

  if (question.authorId !== userId) {
    throw new AppError(status.FORBIDDEN, "Only the question author can accept answers.");
  }

  const answer = await prisma.answer.findUnique({
    where: { id: answerId, questionId, isDeleted: false },
  });

  if (!answer) {
    throw new AppError(status.NOT_FOUND, "Answer not found.");
  }

  // If this answer is already accepted, do nothing
  if (answer.isAccepted) {
    return { isAccepted: true, isAnswered: true };
  }

  // Remove any previously accepted answer on this question
  const previousAccepted = await prisma.answer.findFirst({
    where: { questionId, isAccepted: true, isDeleted: false },
  });

  if (previousAccepted) {
    await prisma.$transaction(async (tx) => {
      // Unaccept previous answer
      await tx.answer.update({
        where: { id: previousAccepted.id },
        data: { isAccepted: false },
      });

      // Deduct -15 reputation from previous answer author
      await tx.user.update({
        where: { id: previousAccepted.authorId },
        data: { reputation: { decrement: 15 } },
      });

      // Accept new answer
      await tx.answer.update({
        where: { id: answerId },
        data: { isAccepted: true },
      });

      // Award +15 reputation to new answer author
      await tx.user.update({
        where: { id: answer.authorId },
        data: { reputation: { increment: 15 } },
      });

      // Ensure isAnswered is true
      await tx.question.update({
        where: { id: questionId },
        data: { isAnswered: true },
      });
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.answer.update({
        where: { id: answerId },
        data: { isAccepted: true },
      });

      await tx.user.update({
        where: { id: answer.authorId },
        data: { reputation: { increment: 15 } },
      });

      await tx.question.update({
        where: { id: questionId },
        data: { isAnswered: true },
      });
    });
  }

  return { isAccepted: true, isAnswered: true };
};

/**
 * Removes accepted answer from a question.
 * Only the question author can unaccept.
 * Recalculates isAnswered (true if any other accepted answer exists).
 * Deducts -15 reputation from the answer author.
 */
const unacceptAnswer = async (questionId: string, userId: string) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId, isDeleted: false },
  });

  if (!question) {
    throw new AppError(status.NOT_FOUND, "Question not found.");
  }

  if (question.authorId !== userId) {
    throw new AppError(status.FORBIDDEN, "Only the question author can unaccept answers.");
  }

  const acceptedAnswer = await prisma.answer.findFirst({
    where: { questionId, isAccepted: true, isDeleted: false },
  });

  if (!acceptedAnswer) {
    throw new AppError(status.BAD_REQUEST, "No accepted answer to remove.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.answer.update({
      where: { id: acceptedAnswer.id },
      data: { isAccepted: false },
    });

    // Deduct -15 reputation from the answer author
    await tx.user.update({
      where: { id: acceptedAnswer.authorId },
      data: { reputation: { decrement: 15 } },
    });

    // Check if any other answer is still accepted
    const otherAccepted = await tx.answer.findFirst({
      where: {
        questionId,
        isAccepted: true,
        isDeleted: false,
        id: { not: acceptedAnswer.id },
      },
    });

    await tx.question.update({
      where: { id: questionId },
      data: { isAnswered: !!otherAccepted },
    });
  });

  return { isAccepted: false, isAnswered: false };
};

/**
 * Toggles a vote on a question.
 * Same vote type = remove, different = update, no vote = add.
 * Self-voting is not allowed. Updates upvoteCount atomically.
 */
const voteQuestion = async (
  questionId: string,
  userId: string,
  input: VoteInput,
) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId, isDeleted: false },
  });

  if (!question) {
    throw new AppError(status.NOT_FOUND, "Question not found.");
  }

  if (question.authorId === userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot vote on your own question.");
  }

  const existingVote = await prisma.questionVote.findUnique({
    where: { questionId_userId: { questionId, userId } },
  });

  if (existingVote) {
    if (existingVote.type === input.type) {
      // Remove vote
      await prisma.$transaction(async (tx) => {
        await tx.questionVote.delete({ where: { id: existingVote.id } });
        if (input.type === VoteType.UP) {
          await tx.question.update({
            where: { id: questionId },
            data: { upvoteCount: { decrement: 1 } },
          });
        }
      });

      const updated = await prisma.question.findUnique({
        where: { id: questionId },
        select: { upvoteCount: true },
      });

      return { action: "removed", upvoteCount: updated!.upvoteCount };
    }

    // Update vote
    await prisma.$transaction(async (tx) => {
      await tx.questionVote.update({
        where: { id: existingVote.id },
        data: { type: input.type },
      });
      if (input.type === VoteType.UP) {
        await tx.question.update({
          where: { id: questionId },
          data: { upvoteCount: { increment: 1 } },
        });
      } else {
        await tx.question.update({
          where: { id: questionId },
          data: { upvoteCount: { decrement: 1 } },
        });
      }
    });

    const updated = await prisma.question.findUnique({
      where: { id: questionId },
      select: { upvoteCount: true },
    });

    return { action: "updated", upvoteCount: updated!.upvoteCount };
  }

  // Add new vote
  await prisma.$transaction(async (tx) => {
    await tx.questionVote.create({
      data: { questionId, userId, type: input.type },
    });
    if (input.type === VoteType.UP) {
      await tx.question.update({
        where: { id: questionId },
        data: { upvoteCount: { increment: 1 } },
      });
    }
  });

  const updated = await prisma.question.findUnique({
    where: { id: questionId },
    select: { upvoteCount: true },
  });

  return { action: "added", upvoteCount: updated!.upvoteCount };
};

/**
 * Toggles a vote on an answer.
 * Same vote type = remove, different = update, no vote = add.
 * Updates answer upvoteCount atomically.
 */
const voteAnswer = async (
  answerId: string,
  userId: string,
  input: VoteInput,
) => {
  const answer = await prisma.answer.findUnique({
    where: { id: answerId, isDeleted: false },
  });

  if (!answer) {
    throw new AppError(status.NOT_FOUND, "Answer not found.");
  }

  if (answer.authorId === userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot vote on your own answer.");
  }

  const existingVote = await prisma.answerVote.findUnique({
    where: { answerId_userId: { answerId, userId } },
  });

  if (existingVote) {
    if (existingVote.type === input.type) {
      // Remove vote
      await prisma.$transaction(async (tx) => {
        await tx.answerVote.delete({ where: { id: existingVote.id } });
        if (input.type === VoteType.UP) {
          await tx.answer.update({
            where: { id: answerId },
            data: { upvoteCount: { decrement: 1 } },
          });
        }
      });

      const updated = await prisma.answer.findUnique({
        where: { id: answerId },
        select: { upvoteCount: true },
      });

      return { action: "removed", upvoteCount: updated!.upvoteCount };
    }

    // Update vote
    await prisma.$transaction(async (tx) => {
      await tx.answerVote.update({
        where: { id: existingVote.id },
        data: { type: input.type },
      });
      if (input.type === VoteType.UP) {
        await tx.answer.update({
          where: { id: answerId },
          data: { upvoteCount: { increment: 1 } },
        });
      } else {
        await tx.answer.update({
          where: { id: answerId },
          data: { upvoteCount: { decrement: 1 } },
        });
      }
    });

    const updated = await prisma.answer.findUnique({
      where: { id: answerId },
      select: { upvoteCount: true },
    });

    return { action: "updated", upvoteCount: updated!.upvoteCount };
  }

  // Add new vote
  await prisma.$transaction(async (tx) => {
    await tx.answerVote.create({
      data: { answerId, userId, type: input.type },
    });
    if (input.type === VoteType.UP) {
      await tx.answer.update({
        where: { id: answerId },
        data: { upvoteCount: { increment: 1 } },
      });
    }
  });

  const updated = await prisma.answer.findUnique({
    where: { id: answerId },
    select: { upvoteCount: true },
  });

  return { action: "added", upvoteCount: updated!.upvoteCount };
};

/**
 * Toggles a bookmark on a question.
 */
const bookmarkQuestion = async (questionId: string, userId: string) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId, isDeleted: false },
  });

  if (!question) {
    throw new AppError(status.NOT_FOUND, "Question not found.");
  }

  const existingBookmark = await prisma.questionBookmark.findUnique({
    where: { questionId_userId: { questionId, userId } },
  });

  if (existingBookmark) {
    await prisma.questionBookmark.delete({
      where: { id: existingBookmark.id },
    });
    return { action: "removed" };
  }

  await prisma.questionBookmark.create({
    data: { questionId, userId },
  });

  return { action: "added" };
};

/**
 * Gets all bookmarked questions for a user.
 */
const getBookmarkedQuestions = async (userId: string, page = 1, limit = 12) => {
  const skip = (page - 1) * limit;

  const [bookmarks, total] = await prisma.$transaction([
    prisma.questionBookmark.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        question: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
            author: { select: { id: true, name: true, image: true } },
            _count: { select: { answers: true } },
          },
        },
      },
    }),
    prisma.questionBookmark.count({ where: { userId } }),
  ]);

  return {
    data: bookmarks.map((b) => b.question),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Lists all question categories with their question counts.
 */
const listCategories = async () => {
  const categories = await prisma.questionCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { questions: true } } },
  });
  return categories;
};

/**
 * Lists all shared tags with their question usage counts.
 * Tags are shared across Resources, Discussions, Questions, and Teams.
 */
const listTags = async () => {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { questionTags: true } } },
  });
  return tags;
};

/**
 * Returns top contributors ranked by number of questions authored.
 */
const getTopContributors = async (limit = 5) => {
  const authors = await prisma.question.groupBy({
    by: ["authorId"],
    _count: { _all: true },
    orderBy: { _count: { authorId: "desc" } },
    take: limit,
  });

  const userIds = authors.map((a) => a.authorId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isDeleted: false },
    select: { id: true, name: true, image: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return authors
    .map((entry, index) => ({
      rank: index + 1,
      name: userMap.get(entry.authorId)?.name ?? "Unknown",
      image: userMap.get(entry.authorId)?.image ?? null,
      questionCount: entry._count._all,
    }))
    .filter((entry) => entry.name !== "Unknown");
};

/**
 * Returns trending questions (top by views) for the sidebar.
 */
const getTrending = async (limit = 5) => {
  const questions = await prisma.question.findMany({
    where: { isDeleted: false },
    orderBy: [{ viewCount: "desc" }, { answerCount: "desc" }],
    take: limit,
    include: {
      category: { select: { id: true, name: true, slug: true } },
      author: { select: { id: true, name: true, image: true } },
      _count: { select: { answers: true } },
    },
  });
  return questions;
};

export const qaService = {
  createQuestion,
  getQuestion,
  listAnswers,
  listQuestions,
  updateQuestion,
  deleteQuestion,
  createAnswer,
  deleteAnswer,
  acceptAnswer,
  unacceptAnswer,
  voteQuestion,
  voteAnswer,
  bookmarkQuestion,
  getBookmarkedQuestions,
  listCategories,
  listTags,
  getTopContributors,
  getTrending,
};
