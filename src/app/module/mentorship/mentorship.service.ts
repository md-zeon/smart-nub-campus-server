import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import {
  ApplicationStatus,
  Department,
  MeetingPreference,
  MentorshipGoalStatus,
  MentorshipSessionStatus,
  MentorshipStatus,
  NotificationType,
  UserRole,
  UserStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { sanitizeRichText } from "../../lib/sanitize";
import { getSocketServer } from "../../lib/socket/socket-server";
import { notificationService } from "../notification/notification.service";
import {
  CompleteMentorshipInput,
  CreateMentorshipGoalInput,
  CreateMentorshipRequestInput,
  CreateMentorshipSessionInput,
  ListMentorsQuery,
  ListMentorshipsQuery,
  ListRequestsQuery,
  RateMentorInput,
  SendMentorshipMessageInput,
  UpdateMentorshipGoalInput,
  UpdateMentorshipRequestInput,
  UpdateMentorshipSessionInput,
} from "./mentorship.interface";

const MENTOR_SELECT = {
  id: true,
  name: true,
  image: true,
  profile: {
    select: {
      jobTitle: true,
      currentEmployer: true,
      industry: true,
      mentorshipTopics: true,
      batchYear: true,
      location: true,
      mentorHeadline: true,
      mentorBio: true,
      mentorAvailability: true,
      mentorCadence: true,
      mentorMeetingFormat: true,
      mentorMaxMentees: true,
    },
  },
  student: {
    select: {
      department: true,
      graduationYear: true,
      degreeTitle: true,
    },
  },
} satisfies Prisma.UserSelect;

const REQUEST_INCLUDE = {
  mentor: {
    select: {
      id: true,
      name: true,
      image: true,
      profile: {
        select: { jobTitle: true, currentEmployer: true },
      },
    },
  },
  mentee: {
    select: {
      id: true,
      name: true,
      image: true,
      student: {
        select: { department: true, admissionYear: true, admissionSemester: true },
      },
    },
  },
} satisfies Prisma.MentorshipRequestInclude;

const MENTORSHIP_PARTY_SELECT = {
  select: {
    id: true,
    name: true,
    image: true,
    profile: { select: { jobTitle: true, currentEmployer: true, location: true } },
    student: { select: { department: true, admissionYear: true } },
  },
} as const;

const MENTORSHIP_INCLUDE = {
  request: { select: { topic: true, message: true, goals: true, createdAt: true } },
  mentor: MENTORSHIP_PARTY_SELECT,
  mentee: MENTORSHIP_PARTY_SELECT,
  goals: { orderBy: [{ order: "asc" as const }, { createdAt: "asc" as const }] },
  sessions: { orderBy: { scheduledAt: "desc" as const } },
  _count: { select: { messages: true } },
} satisfies Prisma.MentorshipInclude;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Committed capacity for a mentor = ACTIVE relationships + PENDING requests. */
const getCommittedSlots = async (mentorIds: string[]) => {
  if (mentorIds.length === 0) {
    return { activeByMentor: new Map<string, number>(), pendingByMentor: new Map<string, number>() };
  }

  const [active, pending] = await Promise.all([
    prisma.mentorship.groupBy({
      by: ["mentorId"],
      where: { mentorId: { in: mentorIds }, status: MentorshipStatus.ACTIVE },
      _count: true,
    }),
    prisma.mentorshipRequest.groupBy({
      by: ["mentorId"],
      where: {
        mentorId: { in: mentorIds },
        status: ApplicationStatus.PENDING,
      },
      _count: true,
    }),
  ]);

  return {
    activeByMentor: new Map(active.map((a) => [a.mentorId, a._count])),
    pendingByMentor: new Map(pending.map((p) => [p.mentorId, p._count])),
  };
};

/**
 * Per-viewer relationship state with each listed mentor: whether the viewer
 * already has an ACTIVE mentorship, a PENDING request, or none. Accepted
 * requests are excluded here because acceptance always creates a mentorship
 * record whose status reflects the real relationship state.
 * Cards for mentors the viewer is actively mentoring show the pending/active
 * state so the client can swap the "Request" CTA accordingly.
 */
const getViewerRelationships = async (
  viewerId: string | undefined,
  mentorIds: string[],
) => {
  const stateByMentor = new Map<string, "active" | "pending" | "none">();
  if (!viewerId || mentorIds.length === 0) {
    return stateByMentor;
  }

  const [active, pending] = await Promise.all([
    prisma.mentorship.findMany({
      where: {
        mentorId: { in: mentorIds },
        menteeId: viewerId,
        status: MentorshipStatus.ACTIVE,
      },
      select: { mentorId: true },
    }),
    prisma.mentorshipRequest.findMany({
      where: {
        mentorId: { in: mentorIds },
        menteeId: viewerId,
        status: ApplicationStatus.PENDING,
      },
      select: { mentorId: true },
    }),
  ]);

  for (const relationship of active) {
    stateByMentor.set(relationship.mentorId, "active");
  }
  for (const request of pending) {
    if (!stateByMentor.has(request.mentorId)) {
      stateByMentor.set(request.mentorId, "pending");
    }
  }

  return stateByMentor;
};

const touchMentorshipActivity = async (id: string) => {
  await prisma.mentorship.update({
    where: { id },
    data: { lastActivityAt: new Date() },
  });
};

const notify = async (input: {
  userId: string;
  senderId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) => {
  await notificationService.createNotification({
    userId: input.userId,
    senderId: input.senderId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? "/mentorship",
  });
};

// ── Mentor directory ────────────────────────────────────────────────────────

const listMentors = async (
  query: ListMentorsQuery,
  viewerId?: string,
) => {
  const { department, industry, topic, sort = "relevance", page = 1, limit = 12 } = query;

  const profileWhere: Prisma.UserProfileWhereInput = { isMentor: true };
  if (industry) {
    profileWhere.industry = { contains: industry, mode: "insensitive" };
  }
  if (topic) {
    profileWhere.mentorshipTopics = { has: topic };
  }

  const where: Prisma.UserWhereInput = {
    role: UserRole.ALUMNI,
    status: UserStatus.ACTIVE,
    isDeleted: false,
    profile: { is: profileWhere },
    student: {
      is: department ? { department: department as Department } : undefined,
    },
  };

  // The viewer's department drives personal relevance when no explicit filter.
  let viewerDepartment: string | null = null;
  if (viewerId && !department) {
    const viewer = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { student: { select: { department: true } } },
    });
    viewerDepartment = viewer?.student?.department ?? null;
  }

  const matchedTopics = (topic ? topic.split(/[,\s]+/).filter(Boolean) : []) as string[];

  const [mentors, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: sort === "name" ? { name: "asc" } : undefined,
      take: 500,
      select: MENTOR_SELECT,
    }),
    prisma.user.count({ where }),
  ]);

  const mentorIds = mentors.map((m) => m.id);
  const [connectionCounts, ratingAggregates, capacity, viewerState] = await Promise.all([
    prisma.connection.groupBy({
      by: ["receiverId"],
      where: { status: "ACCEPTED", receiverId: { in: mentorIds } },
      _count: true,
    }),
    prisma.mentorship.groupBy({
      by: ["mentorId"],
      where: { mentorId: { in: mentorIds }, mentorRating: { not: null } },
      _avg: { mentorRating: true },
      _count: { mentorRating: true },
    }),
    getCommittedSlots(mentorIds),
    getViewerRelationships(viewerId, mentorIds),
  ]);

  const countByUser = new Map(connectionCounts.map((c) => [c.receiverId, c._count]));
  const ratingByMentor = new Map(
    ratingAggregates.map((r) => [
      r.mentorId,
      {
        average: r._avg.mentorRating ?? null,
        count: r._count.mentorRating,
      },
    ]),
  );

  const scored = mentors.map((mentor) => {
    let score = 0;
    let bestMatchTopic: string | null = null;

    // 1) Department alignment (+40) — the strongest signal.
    const mentorDepartment = mentor.student?.department;
    const targetDepartment = department ?? viewerDepartment;
    if (mentorDepartment && targetDepartment && mentorDepartment === targetDepartment) {
      score += 40;
    }

    // 2) Topic/goal overlap (+25 each, capped at +75).
    const mentorTopics = (mentor.profile?.mentorshipTopics ?? []).map((t) => t.toLowerCase());
    if (matchedTopics.length > 0) {
      let overlap = 0;
      for (const t of matchedTopics) {
        if (mentorTopics.some((mt) => mt.includes(t.toLowerCase()) || t.toLowerCase().includes(mt))) {
          overlap += 25;
          if (!bestMatchTopic) bestMatchTopic = t;
        }
      }
      score += Math.min(overlap, 75);
    }

    // 3) Industry alignment (+10).
    if (industry && mentor.profile?.industry) {
      if (mentor.profile.industry.toLowerCase().includes(industry.toLowerCase())) {
        score += 10;
      }
    }

    // 4) Profile completeness / availability (+5) — signals a mentor who will engage.
    if (mentor.profile?.mentorAvailability || mentor.profile?.mentorHeadline) {
      score += 5;
    }

    const maxMentees = mentor.profile?.mentorMaxMentees ?? 3;
    const committed =
      (capacity.activeByMentor.get(mentor.id) ?? 0) +
      (capacity.pendingByMentor.get(mentor.id) ?? 0);
    const slotsAvailable = Math.max(0, maxMentees - committed);

    return {
      ...mentor,
      stats: {
        connectionCount: countByUser.get(mentor.id) ?? 0,
        maxMentees,
        committedSlots: committed,
        slotsAvailable,
      },
      rating: {
        average: ratingByMentor.get(mentor.id)?.average ?? null,
        count: ratingByMentor.get(mentor.id)?.count ?? 0,
      },
      matchScore: score,
      bestMatchTopic,
      relationshipState:
        mentor.id === viewerId ? "self" : (viewerState.get(mentor.id) ?? "none"),
    };
  });

  if (sort === "relevance") {
    scored.sort((a, b) => b.matchScore - a.matchScore || a.name.localeCompare(b.name));
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const data = scored.slice(start, start + limit);

  return {
    data,
    meta: { page: safePage, limit, total, totalPages },
  };
};

// ── Requests ────────────────────────────────────────────────────────────────

const createMentorshipRequest = async (
  menteeId: string,
  data: CreateMentorshipRequestInput,
) => {
  if (data.mentorId === menteeId) {
    throw new AppError(
      status.BAD_REQUEST,
      "You cannot request mentorship from yourself.",
    );
  }

  const mentor = await prisma.user.findFirst({
    where: {
      id: data.mentorId,
      role: UserRole.ALUMNI,
      status: UserStatus.ACTIVE,
      isDeleted: false,
      profile: { is: { isMentor: true } },
    },
    select: { id: true, name: true, profile: { select: { mentorMaxMentees: true } } },
  });

  if (!mentor) {
    throw new AppError(status.NOT_FOUND, "Mentor not found.");
  }

  const existing = await prisma.mentorshipRequest.findFirst({
    where: {
      mentorId: data.mentorId,
      menteeId,
      status: { in: [ApplicationStatus.PENDING, ApplicationStatus.ACCEPTED] },
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(
      status.CONFLICT,
      "You already have an active mentorship request with this mentor.",
    );
  }

  // Capacity check: a mentor cannot be over-committed.
  const committed = await getCommittedSlots([data.mentorId]);
  const maxMentees = mentor.profile?.mentorMaxMentees ?? 3;
  const committedSlots =
    (committed.activeByMentor.get(data.mentorId) ?? 0) +
    (committed.pendingByMentor.get(data.mentorId) ?? 0);

  if (committedSlots >= maxMentees) {
    throw new AppError(
      status.CONFLICT,
      `${mentor.name} is currently at full capacity and isn't accepting new mentees right now. Please try another mentor.`,
    );
  }

  const request = await prisma.mentorshipRequest.create({
    data: {
      mentorId: data.mentorId,
      menteeId,
      topic: data.topic ?? null,
      message: data.message ? sanitizeRichText(data.message) : null,
      goals: data.goals,
    },
    include: REQUEST_INCLUDE,
  });

  await notify({
    userId: data.mentorId,
    senderId: menteeId,
    type: NotificationType.MENTORSHIP_REQUEST_RECEIVED,
    title: "New mentorship request",
    message: `${request.mentee.name} requested mentorship${
      request.topic ? ` on "${request.topic}"` : ""
    }.`,
    link: "/mentorship/requests",
  });

  return request;
};

const listRequests = async (userId: string, query: ListRequestsQuery) => {
  const { role = "mentee", status: requestStatus, page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.MentorshipRequestWhereInput =
    role === "mentor" ? { mentorId: userId } : { menteeId: userId };

  if (requestStatus) {
    where.status = requestStatus as ApplicationStatus;
  }

  const [requests, total] = await prisma.$transaction([
    prisma.mentorshipRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: REQUEST_INCLUDE,
    }),
    prisma.mentorshipRequest.count({ where }),
  ]);

  return {
    data: requests,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const updateMentorshipRequest = async (
  userId: string,
  id: string,
  data: UpdateMentorshipRequestInput,
) => {
  const request = await prisma.mentorshipRequest.findUnique({
    where: { id },
    include: REQUEST_INCLUDE,
  });

  if (!request) {
    throw new AppError(status.NOT_FOUND, "Mentorship request not found.");
  }

  const isMentor = request.mentorId === userId;
  const isMentee = request.menteeId === userId;

  if (!isMentor && !isMentee) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not involved in this mentorship request.",
    );
  }

  if (request.status !== ApplicationStatus.PENDING) {
    throw new AppError(
      status.BAD_REQUEST,
      "This mentorship request has already been responded to.",
    );
  }

  if (isMentee && data.status !== ApplicationStatus.WITHDRAWN) {
    throw new AppError(
      status.BAD_REQUEST,
      "Mentees can only withdraw a mentorship request.",
    );
  }

  if (isMentor && data.status === ApplicationStatus.WITHDRAWN) {
    throw new AppError(
      status.BAD_REQUEST,
      "Mentors can accept or reject a request, but not withdraw it.",
    );
  }

  // When accepting, re-check capacity before the relationship starts.
  if (data.status === ApplicationStatus.ACCEPTED) {
    const mentorUser = await prisma.user.findUnique({
      where: { id: request.mentorId },
      select: { profile: { select: { mentorMaxMentees: true } } },
    });
    const committed = await getCommittedSlots([request.mentorId]);
    const maxMentees = mentorUser?.profile?.mentorMaxMentees ?? 3;
    const committedSlots =
      (committed.activeByMentor.get(request.mentorId) ?? 0) +
      (committed.pendingByMentor.get(request.mentorId) ?? 0);

    if (committedSlots >= maxMentees) {
      throw new AppError(
        status.CONFLICT,
        "You are at full mentoring capacity right now. Consider raising your maximum number of mentees.",
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.mentorshipRequest.update({
      where: { id },
      data: {
        status: data.status,
        respondedAt: new Date(),
      },
      include: REQUEST_INCLUDE,
    });

    // Acceptance is the start of a relationship — seed it with the goals the
    // mentee stated in their request so the pair begins with structure.
    if (data.status === ApplicationStatus.ACCEPTED) {
      await tx.mentorship.create({
        data: {
          requestId: id,
          mentorId: request.mentorId,
          menteeId: request.menteeId,
          goals: {
            create: (request.goals ?? []).map((goal, index) => ({
              title: goal,
              order: index,
            })),
          },
        },
      });
    }

    return updatedRequest;
  });

  const recipientId = isMentor ? request.menteeId : request.mentorId;

  if (data.status === ApplicationStatus.ACCEPTED) {
    await notify({
      userId: recipientId,
      senderId: userId,
      type: NotificationType.MENTORSHIP_ACCEPTED,
      title: "Mentorship started",
      message: `${request.mentor.name} accepted your mentorship request. You can now set goals and schedule your first session.`,
      link: "/mentorship",
    });
  } else {
    await notify({
      userId: recipientId,
      senderId: userId,
      type: NotificationType.MENTORSHIP_REQUEST_UPDATED,
      title: "Mentorship request updated",
      message: isMentor
        ? `Your mentorship request with ${request.mentor.name} was ${data.status.toLowerCase()}.`
        : `${request.mentee.name} withdrew their mentorship request.`,
      link: "/mentorship/requests",
    });
  }

  return updated;
};

// ── Relationships ───────────────────────────────────────────────────────────

const listMentorships = async (userId: string, query: ListMentorshipsQuery) => {
  const { status: relationshipStatus, page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.MentorshipWhereInput = {
    OR: [{ mentorId: userId }, { menteeId: userId }],
  };
  if (relationshipStatus) {
    where.status = relationshipStatus as MentorshipStatus;
  }

  const [mentorships, total] = await prisma.$transaction([
    prisma.mentorship.findMany({
      where,
      skip,
      take: limit,
      orderBy: { lastActivityAt: "desc" },
      include: MENTORSHIP_INCLUDE,
    }),
    prisma.mentorship.count({ where }),
  ]);

  const data = mentorships.map((mentorship) => {
    const isMentor = mentorship.mentorId === userId;
    const other = isMentor ? mentorship.mentee : mentorship.mentor;
    const completedSessions = mentorship.sessions.filter(
      (s) => s.status === MentorshipSessionStatus.COMPLETED,
    );
    const upcomingSession = mentorship.sessions
      .filter(
        (s) =>
          s.status === MentorshipSessionStatus.SCHEDULED &&
          s.scheduledAt.getTime() >= Date.now(),
      )
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];

    return {
      ...mentorship,
      role: isMentor ? "mentor" : "mentee",
      other,
      stats: {
        goalCount: mentorship.goals.length,
        completedGoalCount: mentorship.goals.filter(
          (g) => g.status === MentorshipGoalStatus.COMPLETED,
        ).length,
        sessionCount: mentorship.sessions.length,
        completedSessionCount: completedSessions.length,
        upcomingSession: upcomingSession
          ? {
              id: upcomingSession.id,
              scheduledAt: upcomingSession.scheduledAt.toISOString(),
              format: upcomingSession.format,
              location: upcomingSession.location,
            }
          : null,
      },
    };
  });

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getMentorship = async (userId: string, id: string) => {
  const mentorship = await prisma.mentorship.findUnique({
    where: { id },
    include: MENTORSHIP_INCLUDE,
  });

  if (!mentorship) {
    throw new AppError(status.NOT_FOUND, "Mentorship not found.");
  }

  const isMentor = mentorship.mentorId === userId;
  const isMentee = mentorship.menteeId === userId;

  if (!isMentor && !isMentee) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not part of this mentorship.",
    );
  }

  const other = isMentor ? mentorship.mentee : mentorship.mentor;
  const daysSinceLastActivity = Math.max(
    0,
    Math.floor(
      (Date.now() - mentorship.lastActivityAt.getTime()) / (24 * 60 * 60 * 1000),
    ),
  );
  const completedSessions = mentorship.sessions.filter(
    (s) => s.status === MentorshipSessionStatus.COMPLETED,
  );
  const upcomingSession = mentorship.sessions
    .filter(
      (s) =>
        s.status === MentorshipSessionStatus.SCHEDULED &&
        s.scheduledAt.getTime() >= Date.now(),
    )
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];

  return {
    ...mentorship,
    role: isMentor ? "mentor" : "mentee",
    other,
    stats: {
      daysSinceLastActivity,
      goalCount: mentorship.goals.length,
      completedGoalCount: mentorship.goals.filter(
        (g) => g.status === MentorshipGoalStatus.COMPLETED,
      ).length,
      sessionCount: mentorship.sessions.length,
      completedSessionCount: completedSessions.length,
      upcomingSession: upcomingSession
        ? {
            id: upcomingSession.id,
            scheduledAt: upcomingSession.scheduledAt.toISOString(),
            format: upcomingSession.format,
            location: upcomingSession.location,
          }
        : null,
    },
  };
};

// ── Goals ───────────────────────────────────────────────────────────────────

const requireParticipant = async (mentorshipId: string, userId: string) => {
  const mentorship = await prisma.mentorship.findUnique({
    where: { id: mentorshipId },
    select: { mentorId: true, menteeId: true, status: true },
  });

  if (!mentorship) {
    throw new AppError(status.NOT_FOUND, "Mentorship not found.");
  }

  const isParticipant =
    mentorship.mentorId === userId || mentorship.menteeId === userId;
  if (!isParticipant) {
    throw new AppError(status.FORBIDDEN, "You are not part of this mentorship.");
  }

  if (mentorship.status !== MentorshipStatus.ACTIVE) {
    throw new AppError(
      status.BAD_REQUEST,
      "This mentorship is no longer active.",
    );
  }

  return mentorship;
};

/**
 * Like requireParticipant, but restricts the action to the mentor of an active
 * mentorship. Mentors drive scheduling and closure; mentees contribute goals,
 * messages, and requests.
 */
const requireMentor = async (mentorshipId: string, userId: string) => {
  const mentorship = await prisma.mentorship.findUnique({
    where: { id: mentorshipId },
    select: { mentorId: true, menteeId: true, status: true },
  });

  if (!mentorship) {
    throw new AppError(status.NOT_FOUND, "Mentorship not found.");
  }

  if (mentorship.mentorId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "Only the mentor can manage sessions and close a mentorship.",
    );
  }

  if (mentorship.status !== MentorshipStatus.ACTIVE) {
    throw new AppError(
      status.BAD_REQUEST,
      "This mentorship is no longer active.",
    );
  }

  return mentorship;
};

const createGoal = async (
  userId: string,
  mentorshipId: string,
  data: CreateMentorshipGoalInput,
) => {
  await requireParticipant(mentorshipId, userId);

  const maxOrder = await prisma.mentorshipGoal.aggregate({
    where: { mentorshipId },
    _max: { order: true },
  });

  const goal = await prisma.mentorshipGoal.create({
    data: {
      mentorshipId,
      title: data.title,
      description: data.description ? sanitizeRichText(data.description) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  await touchMentorshipActivity(mentorshipId);
  return goal;
};

const updateGoal = async (
  userId: string,
  goalId: string,
  data: UpdateMentorshipGoalInput,
) => {
  const goal = await prisma.mentorshipGoal.findUnique({
    where: { id: goalId },
    select: { id: true, mentorshipId: true, mentorship: { select: { mentorId: true, menteeId: true } } },
  });

  if (!goal) {
    throw new AppError(status.NOT_FOUND, "Goal not found.");
  }

  await requireParticipant(goal.mentorshipId, userId);

  const updated = await prisma.mentorshipGoal.update({
    where: { id: goalId },
    data: {
      title: data.title,
      description: data.description === undefined ? undefined : data.description ? sanitizeRichText(data.description) : null,
      dueDate: data.dueDate === undefined ? undefined : data.dueDate ? new Date(data.dueDate) : null,
      status: data.status as MentorshipGoalStatus | undefined,
    },
  });

  await touchMentorshipActivity(goal.mentorshipId);

  // Notify the other party on progress changes.
  const otherId = goal.mentorship.mentorId === userId ? goal.mentorship.menteeId : goal.mentorship.mentorId;
  if (data.status === MentorshipGoalStatus.COMPLETED) {
    await notify({
      userId: otherId,
      senderId: userId,
      type: NotificationType.MENTORSHIP_GOAL_UPDATED,
      title: "Goal completed",
      message: `A goal was marked complete: "${updated.title}".`,
    });
  }

  return updated;
};

const deleteGoal = async (userId: string, goalId: string) => {
  const goal = await prisma.mentorshipGoal.findUnique({
    where: { id: goalId },
    select: { id: true, mentorshipId: true },
  });

  if (!goal) {
    throw new AppError(status.NOT_FOUND, "Goal not found.");
  }

  await requireParticipant(goal.mentorshipId, userId);

  await prisma.mentorshipGoal.delete({ where: { id: goalId } });
  await touchMentorshipActivity(goal.mentorshipId);

  return { deleted: true };
};

// ── Sessions ────────────────────────────────────────────────────────────────

const createSession = async (
  userId: string,
  mentorshipId: string,
  data: CreateMentorshipSessionInput,
) => {
  const mentorship = await requireMentor(mentorshipId, userId);

  const scheduledAt = new Date(data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new AppError(status.BAD_REQUEST, "Invalid scheduled time.");
  }

  const session = await prisma.mentorshipSession.create({
    data: {
      mentorshipId,
      scheduledAt,
      durationMinutes: data.durationMinutes ?? 60,
      format: (data.format as MeetingPreference | undefined) ?? MeetingPreference.ONLINE,
      location: data.location ?? null,
      agenda: data.agenda ?? null,
      createdById: userId,
    },
  });

  await touchMentorshipActivity(mentorshipId);

  await notify({
    userId: mentorship.menteeId,
    senderId: userId,
    type: NotificationType.MENTORSHIP_SESSION_SCHEDULED,
    title: "New session scheduled",
    message: `A mentorship session has been scheduled for ${session.scheduledAt.toLocaleString()}.`,
  });

  return session;
};

const updateSession = async (
  userId: string,
  sessionId: string,
  data: UpdateMentorshipSessionInput,
) => {
  const session = await prisma.mentorshipSession.findUnique({
    where: { id: sessionId },
    select: { id: true, mentorshipId: true, mentorship: { select: { mentorId: true, menteeId: true } } },
  });

  if (!session) {
    throw new AppError(status.NOT_FOUND, "Session not found.");
  }

  await requireMentor(session.mentorshipId, userId);

  const updateData: Prisma.MentorshipSessionUpdateInput = {
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    durationMinutes: data.durationMinutes,
    format: data.format as MeetingPreference | undefined,
    location: data.location === undefined ? undefined : data.location,
    agenda: data.agenda === undefined ? undefined : data.agenda,
    notes: data.notes === undefined ? undefined : data.notes,
    actionItems: data.actionItems === undefined ? undefined : data.actionItems,
  };

  if (data.status === MentorshipSessionStatus.COMPLETED) {
    updateData.status = MentorshipSessionStatus.COMPLETED;
    updateData.completedAt = new Date();
  } else if (data.status === MentorshipSessionStatus.CANCELLED) {
    updateData.status = MentorshipSessionStatus.CANCELLED;
  } else if (data.status === MentorshipSessionStatus.SCHEDULED) {
    updateData.status = MentorshipSessionStatus.SCHEDULED;
    updateData.completedAt = null;
  }

  const updated = await prisma.mentorshipSession.update({
    where: { id: sessionId },
    data: updateData,
  });

  await touchMentorshipActivity(session.mentorshipId);

  if (data.status === MentorshipSessionStatus.COMPLETED || data.status === MentorshipSessionStatus.CANCELLED) {
    await notify({
      userId: session.mentorship.menteeId,
      senderId: userId,
      type: NotificationType.MENTORSHIP_SESSION_UPDATED,
      title: data.status === MentorshipSessionStatus.COMPLETED ? "Session completed" : "Session cancelled",
      message:
        data.status === MentorshipSessionStatus.COMPLETED
          ? "A session was marked as completed. Check the notes and action items."
          : "A scheduled session was cancelled.",
    });
  }

  return updated;
};

// ── Messages ────────────────────────────────────────────────────────────────

const listMessages = async (userId: string, mentorshipId: string, before?: string, limit = 50) => {
  await prisma.mentorship.findFirstOrThrow({
    where: {
      id: mentorshipId,
      OR: [{ mentorId: userId }, { menteeId: userId }],
    },
    select: { id: true },
  });

  const messages = await prisma.mentorshipMessage.findMany({
    where: {
      mentorshipId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { sender: { select: { id: true, name: true, image: true } } },
  });

  return { data: messages.reverse() };
};

const sendMessage = async (
  userId: string,
  mentorshipId: string,
  data: SendMentorshipMessageInput,
) => {
  const mentorship = await prisma.mentorship.findUnique({
    where: { id: mentorshipId },
    select: { mentorId: true, menteeId: true },
  });

  if (!mentorship) {
    throw new AppError(status.NOT_FOUND, "Mentorship not found.");
  }

  const isParticipant =
    mentorship.mentorId === userId || mentorship.menteeId === userId;
  if (!isParticipant) {
    throw new AppError(status.FORBIDDEN, "You are not part of this mentorship.");
  }

  const message = await prisma.mentorshipMessage.create({
    data: {
      mentorshipId,
      senderId: userId,
      body: sanitizeRichText(data.body),
    },
    include: { sender: { select: { id: true, name: true, image: true } } },
  });

  await touchMentorshipActivity(mentorshipId);

  const recipientId =
    mentorship.mentorId === userId ? mentorship.menteeId : mentorship.mentorId;

  // Realtime delivery to both participants' personal rooms.
  try {
    const io = getSocketServer();
    const payload = {
      id: message.id,
      mentorshipId,
      senderId: message.senderId,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        image: message.sender.image,
      },
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    };
    io.to(`user:${mentorship.mentorId}`).emit("mentorship:message", payload);
    io.to(`user:${mentorship.menteeId}`).emit("mentorship:message", payload);
  } catch {
    // Socket.IO may not be initialized in test environments.
  }

  await notify({
    userId: recipientId,
    senderId: userId,
    type: NotificationType.MENTORSHIP_MESSAGE,
    title: "New message",
    message: `${message.sender.name} sent you a message in your mentorship.`,
  });

  return message;
};

// ── Closure ─────────────────────────────────────────────────────────────────

const completeMentorship = async (
  userId: string,
  mentorshipId: string,
  data: CompleteMentorshipInput,
) => {
  const mentorship = await requireMentor(mentorshipId, userId);

  const updated = await prisma.mentorship.update({
    where: { id: mentorshipId },
    data: {
      status: MentorshipStatus.COMPLETED,
      endedAt: new Date(),
      lastActivityAt: new Date(),
      menteeFeedback: data.feedback ?? null,
    },
  });

  await notify({
    userId: mentorship.menteeId,
    senderId: userId,
    type: NotificationType.MENTORSHIP_COMPLETED,
    title: "Mentorship completed",
    message:
      "Your mentorship has been marked as complete. Thanks for being part of it! You can now rate your mentor to help future mentees.",
  });

  return updated;
};

const rateMentor = async (
  userId: string,
  mentorshipId: string,
  data: RateMentorInput,
) => {
  const mentorship = await prisma.mentorship.findUnique({
    where: { id: mentorshipId },
    select: { menteeId: true, status: true, mentorRating: true },
  });

  if (!mentorship) {
    throw new AppError(status.NOT_FOUND, "Mentorship not found.");
  }

  if (mentorship.menteeId !== userId) {
    throw new AppError(status.FORBIDDEN, "Only the mentee can rate the mentor.");
  }

  if (mentorship.status === MentorshipStatus.ACTIVE) {
    throw new AppError(
      status.BAD_REQUEST,
      "You can only rate your mentor after the mentorship has been completed.",
    );
  }

  if (mentorship.mentorRating !== null) {
    throw new AppError(
      status.BAD_REQUEST,
      "You have already rated this mentor.",
    );
  }

  const updated = await prisma.mentorship.update({
    where: { id: mentorshipId },
    data: {
      mentorRating: data.rating,
      mentorFeedback: data.feedback ?? null,
    },
  });

  return updated;
};

const endMentorship = async (userId: string, mentorshipId: string) => {
  const mentorship = await requireMentor(mentorshipId, userId);

  const updated = await prisma.mentorship.update({
    where: { id: mentorshipId },
    data: {
      status: MentorshipStatus.ENDED,
      endedAt: new Date(),
      lastActivityAt: new Date(),
    },
  });

  await notify({
    userId: mentorship.menteeId,
    senderId: userId,
    type: NotificationType.MENTORSHIP_ENDED,
    title: "Mentorship ended",
    message:
      "Your mentorship has been ended. You can still rate your mentor to help future mentees.",
  });

  return updated;
};

export const mentorshipService = {
  listMentors,
  createMentorshipRequest,
  listRequests,
  updateMentorshipRequest,
  listMentorships,
  getMentorship,
  createGoal,
  updateGoal,
  deleteGoal,
  createSession,
  updateSession,
  listMessages,
  sendMessage,
  completeMentorship,
  rateMentor,
  endMentorship,
};
