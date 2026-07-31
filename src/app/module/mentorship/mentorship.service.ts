import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import {
  ApplicationStatus,
  Department,
  NotificationType,
  UserRole,
  UserStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { notificationService } from "../notification/notification.service";
import {
  CreateMentorshipRequestInput,
  ListMentorsQuery,
  ListRequestsQuery,
  UpdateMentorshipRequestInput,
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

const listMentors = async (query: ListMentorsQuery) => {
  const { department, industry, topic, page = 1, limit = 12 } = query;
  const skip = (page - 1) * limit;

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

  const [mentors, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      select: MENTOR_SELECT,
    }),
    prisma.user.count({ where }),
  ]);

  const mentorIds = mentors.map((m) => m.id);
  const connectionCounts = await prisma.connection.groupBy({
    by: ["receiverId"],
    where: {
      status: "ACCEPTED",
      receiverId: { in: mentorIds },
    },
    _count: true,
  });

  const countByUser = new Map(
    connectionCounts.map((c) => [c.receiverId, c._count]),
  );

  return {
    data: mentors.map((mentor) => ({
      ...mentor,
      stats: {
        connectionCount: countByUser.get(mentor.id) ?? 0,
      },
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

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
    select: { id: true, name: true },
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

  const request = await prisma.mentorshipRequest.create({
    data: {
      mentorId: data.mentorId,
      menteeId,
      topic: data.topic ?? null,
      message: data.message ?? null,
    },
    include: REQUEST_INCLUDE,
  });

  await notificationService.createNotification({
    userId: data.mentorId,
    senderId: menteeId,
    type: NotificationType.MENTORSHIP_REQUEST_RECEIVED,
    title: "New mentorship request",
    message: `${request.mentee.name} requested mentorship${
      request.topic ? ` on "${request.topic}"` : ""
    }.`,
    link: "/mentorship",
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

  const updated = await prisma.mentorshipRequest.update({
    where: { id },
    data: {
      status: data.status,
      respondedAt: new Date(),
    },
    include: REQUEST_INCLUDE,
  });

  const recipientId = isMentor ? request.menteeId : request.mentorId;

  await notificationService.createNotification({
    userId: recipientId,
    senderId: userId,
    type: NotificationType.MENTORSHIP_REQUEST_UPDATED,
    title: "Mentorship request updated",
    message: isMentor
      ? `Your mentorship request with ${request.mentor.name} was ${data.status.toLowerCase()}.`
      : `${request.mentee.name} withdrew their mentorship request.`,
    link: "/mentorship",
  });

  return updated;
};

export const mentorshipService = {
  listMentors,
  createMentorshipRequest,
  listRequests,
  updateMentorshipRequest,
};
