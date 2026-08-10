import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { Prisma } from "../../../generated/prisma/client";
import { UserRole } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { sanitizeRichText } from "../../lib/sanitize";
import { getSocketServer } from "../../lib/socket/socket-server";
import { softDelete } from "../../shared/softDelete";
import { notificationService } from "../notification/notification.service";
import {
  ApplicationFormConfig,
  ApplyToTeamInput,
  CreateTeamRequestInput,
  DEFAULT_APPLICATION_FORM,
  ListTeamRequestsQuery,
  ReviewApplicationInput,
  TeamCategoryCount,
  TeamPopularSkill,
  UpdateTeamRequestInput,
} from "./team.interface";

/**
 * Creates a new team request with skill tags.
 * Automatically adds the creator as a LEADER member.
 */
const createTeamRequest = async (data: CreateTeamRequestInput, userId: string) => {
  const teamRequest = await prisma.$transaction(async (tx) => {
    const created = await tx.teamRequest.create({
      data: {
        title: data.title,
        description: sanitizeRichText(data.description),
        lookingForCount: data.lookingForCount,
        projectName: data.projectName ?? null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        category: data.category ?? null,
        difficulty: data.difficulty ?? null,
        meetingPreference: data.meetingPreference ?? "FLEXIBLE",
        contactInfo: data.contactInfo ?? null,
        applicationForm: (data.applicationForm as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        creatorId: userId,
        teamRequestSkills: {
          create: data.skillTagIds.map((tagId) => ({ tagId })),
        },
        teamMembers: {
          create: {
            userId,
            role: "LEADER",
          },
        },
      },
      include: {
        teamRequestSkills: { include: { tag: true } },
        teamMembers: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
    });

    return created;
  });

  return teamRequest;
};

/**
 * Gets a single team request by ID with skills, members, and application count.
 * Increments viewCount and checks if user has bookmarked.
 */
const getTeamRequest = async (id: string, userId?: string) => {
  const teamRequest = await prisma.teamRequest.findUnique({
    where: { id, isDeleted: false },
    select: { creatorId: true },
  });

  if (!teamRequest) {
    throw new AppError(status.NOT_FOUND, "Team request not found.");
  }

  let canViewFullApplications = false;
  if (userId) {
    if (teamRequest.creatorId === userId) {
      canViewFullApplications = true;
    } else {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      canViewFullApplications = user?.role === UserRole.ADMIN;
    }
  }

  const result = await prisma.teamRequest.findUnique({
    where: { id, isDeleted: false },
    include: {
      teamRequestSkills: { include: { tag: true } },
      teamMembers: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
      teamApplications: {
        include: canViewFullApplications
          ? {
              applicant: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  profile: {
                    select: {
                      bio: true,
                      githubUrl: true,
                      linkedinUrl: true,
                      portfolioUrl: true,
                      websiteUrl: true,
                      phoneNumber: true,
                      location: true,
                      currentSemester: true,
                      batchYear: true,
                    },
                  },
                  student: {
                    select: {
                      studentId: true,
                      department: true,
                      admissionYear: true,
                      admissionSemester: true,
                    },
                  },
                },
              },
            }
          : {
              applicant: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  reputation: true,
                },
              },
            },
        orderBy: { createdAt: "desc" },
      },
      creator: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { teamApplications: true } },
    },
  });

  if (!result) {
    throw new AppError(status.NOT_FOUND, "Team request not found.");
  }

  // Increment view count (fire and forget)
  prisma.teamRequest.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  // Check if user has bookmarked
  let isBookmarked = false;
  if (userId) {
    const bookmark = await prisma.teamBookmark.findUnique({
      where: { teamRequestId_userId: { teamRequestId: id, userId } },
    });
    isBookmarked = !!bookmark;
  }

  return { ...result, isBookmarked };
};

/**
 * Lists team requests with pagination and filters.
 * Excludes the user's own requests when excludeOwn is true.
 */
const listTeamRequests = async (query: ListTeamRequestsQuery, userId?: string) => {
  const {
    status: filterStatus,
    category,
    difficulty,
    meetingPreference,
    skill,
    search,
    sort = "newest",
    page = 1,
    limit = 12,
    excludeOwn = false,
    bookmarked = false,
  } = query;

  const skip = (page - 1) * limit;
  const take = limit;

  // Base where clause — only non-deleted
  const where: Record<string, unknown> = { isDeleted: false };

  // Exclude own requests if requested
  if (excludeOwn && userId) {
    where.creatorId = { not: userId };
  }

  // Filter by status
  if (filterStatus) {
    where.status = filterStatus;
  }

  // Filter by category
  if (category) {
    where.category = category;
  }

  // Filter by difficulty
  if (difficulty) {
    where.difficulty = difficulty;
  }

  // Filter by meeting preference
  if (meetingPreference) {
    where.meetingPreference = meetingPreference;
  }

  // Filter by skill tag
  if (skill) {
    where.teamRequestSkills = {
      some: { tag: { slug: skill } },
    };
  }

  // Filter by bookmarked
  if (bookmarked && userId) {
    where.teamBookmarks = {
      some: { userId },
    };
  }

  // Search in title and description
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  // Sort options
  let orderBy: Record<string, unknown>;
  switch (sort) {
    case "deadline":
      orderBy = { deadline: "asc" };
      break;
    case "applications":
      orderBy = { teamApplications: { _count: "desc" } };
      break;
    case "newest":
    default:
      orderBy = { createdAt: "desc" };
      break;
  }

  const [teamRequests, total] = await prisma.$transaction([
    prisma.teamRequest.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        teamRequestSkills: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        creator: { select: { id: true, name: true, image: true } },
        teamMembers: { select: { userId: true } },
        ...(userId
          ? {
              teamBookmarks: { where: { userId }, select: { id: true } },
              teamApplications: { where: { applicantId: userId, status: { not: "WITHDRAWN" } }, select: { id: true, status: true } },
            }
          : {}),
        _count: { select: { teamApplications: true, teamMembers: true } },
      },
    }),
    prisma.teamRequest.count({ where }),
  ]);

  const mapped = teamRequests.map((t) => {
    const { teamBookmarks, teamApplications, ...rest } = t as typeof t & {
      teamBookmarks?: { id: string }[];
      teamApplications?: { id: string; status: string }[];
    };
    return {
      ...rest,
      isBookmarked: (teamBookmarks?.length ?? 0) > 0,
      hasApplied: (teamApplications?.length ?? 0) > 0,
    };
  });

  return {
    data: mapped,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Updates a team request. Only the creator can update.
 */
const updateTeamRequest = async (
  id: string,
  data: UpdateTeamRequestInput,
  userId: string,
) => {
  const existing = await prisma.teamRequest.findUnique({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Team request not found.");
  }

  if (existing.creatorId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only edit your own team requests.");
  }

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description ? sanitizeRichText(data.description) : null;
  if (data.lookingForCount !== undefined) updateData.lookingForCount = data.lookingForCount;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.projectName !== undefined) updateData.projectName = data.projectName;
  if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
  if (data.meetingPreference !== undefined) updateData.meetingPreference = data.meetingPreference;
  if (data.contactInfo !== undefined) updateData.contactInfo = data.contactInfo;
  if (data.applicationForm !== undefined) updateData.applicationForm = data.applicationForm;

  return prisma.$transaction(async (tx) => {
    // Update the team request
    await tx.teamRequest.update({ where: { id }, data: updateData });

    // Update skills if provided
    if (data.skillTagIds) {
      await tx.teamRequestSkill.deleteMany({ where: { teamRequestId: id } });
      await tx.teamRequestSkill.createMany({
        data: data.skillTagIds.map((tagId) => ({ teamRequestId: id, tagId })),
      });
    }

    // If lookingForCount decreased below currentMemberCount, update status
    if (data.lookingForCount !== undefined && data.lookingForCount < existing.currentMemberCount) {
      await tx.teamRequest.update({
        where: { id },
        data: { lookingForCount: data.lookingForCount },
      });
    }

    return tx.teamRequest.findUnique({
      where: { id },
      include: {
        teamRequestSkills: { include: { tag: true } },
        teamMembers: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
    });
  });
};

/**
 * Soft deletes a team request. Only the creator can delete.
 */
const deleteTeamRequest = async (id: string, userId: string) => {
  const existing = await prisma.teamRequest.findUnique({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Team request not found.");
  }

  if (existing.creatorId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only delete your own team requests.");
  }

  await softDelete(prisma.teamRequest, id);

  return { message: "Team request deleted successfully." };
};

/**
 * Applies to a team request. Users cannot apply to their own requests.
 */
const applyToTeam = async (
  teamRequestId: string,
  userId: string,
  data: ApplyToTeamInput,
) => {
  const teamRequest = await prisma.teamRequest.findUnique({
    where: { id: teamRequestId, isDeleted: false },
  });

  if (!teamRequest) {
    throw new AppError(status.NOT_FOUND, "Team request not found.");
  }

  // Users cannot apply to their own requests
  if (teamRequest.creatorId === userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot apply to your own team request.");
  }

  // Check if already applied
  const existingApplication = await prisma.teamApplication.findUnique({
    where: { teamRequestId_applicantId: { teamRequestId, applicantId: userId } },
  });

  if (existingApplication) {
    throw new AppError(status.CONFLICT, "You have already applied to this team request.");
  }

  // Enforce required fields from the team's application form config
  const formConfig =
    (teamRequest.applicationForm as ApplicationFormConfig | null) ??
    DEFAULT_APPLICATION_FORM;
  const responses = data.responses ?? {};
  const missingFields: string[] = [];
  for (const field of formConfig.fields) {
    if (field.required && !(responses[field.key] ?? "").trim()) {
      missingFields.push(field.key);
    }
  }
  for (const question of formConfig.questions) {
    if (question.required && !(responses[question.id] ?? "").trim()) {
      missingFields.push(question.label);
    }
  }
  if (missingFields.length > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Please fill in all required fields before applying.",
    );
  }

  const application = await prisma.teamApplication.create({
    data: {
      teamRequestId,
      applicantId: userId,
      message: data.message ?? null,
      responses: (data.responses as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
    include: {
      applicant: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  notificationService.createNotification({
    userId: teamRequest.creatorId,
    senderId: userId,
    type: "TEAM_APPLICATION",
    title: "Team Application",
    message: `Someone applied to your team request.`,
    link: `/teams/${teamRequestId}`,
  }).catch(() => {});

  // Broadcast new application to team room (non-blocking)
  try {
    const io = getSocketServer();
    io.to(`team:${teamRequestId}`).emit("team:application", {
      teamRequestId,
      application: {
        id: application.id,
        teamId: teamRequestId,
        applicantId: userId,
        status: application.status,
        createdAt: application.createdAt.toISOString(),
      },
    });
  } catch {
    // Socket.IO may not be initialized in test environments
  }

  return application;
};

/**
 * Reviews an application (accept/reject). Only the creator can review.
 * When accepted, creates a TeamMember and updates member count.
 */
const reviewApplication = async (
  teamRequestId: string,
  applicationId: string,
  reviewStatus: ReviewApplicationInput["status"],
  userId: string,
) => {
  const teamRequest = await prisma.teamRequest.findUnique({
    where: { id: teamRequestId, isDeleted: false },
  });

  if (!teamRequest) {
    throw new AppError(status.NOT_FOUND, "Team request not found.");
  }

  if (teamRequest.creatorId !== userId) {
    throw new AppError(status.FORBIDDEN, "Only the creator can review applications.");
  }

  const application = await prisma.teamApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found.");
  }

  if (application.teamRequestId !== teamRequestId) {
    throw new AppError(status.BAD_REQUEST, "Application does not belong to this team request.");
  }

  if (application.status !== "PENDING") {
    throw new AppError(status.BAD_REQUEST, "Only pending applications can be reviewed.");
  }

  // If accepting, check if there's room
  if (reviewStatus === "ACCEPTED") {
    if (teamRequest.currentMemberCount >= teamRequest.lookingForCount) {
      throw new AppError(status.BAD_REQUEST, "Team is already full.");
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: { teamRequestId_userId: { teamRequestId, userId: application.applicantId } },
    });

    if (existingMember) {
      throw new AppError(status.CONFLICT, "User is already a team member.");
    }
  }

  // Update application status and create member if accepted
  const result = await prisma.$transaction(async (tx) => {
    // Update application status
    const updatedApplication = await tx.teamApplication.update({
      where: { id: applicationId },
      data: {
        status: reviewStatus,
        reviewedAt: new Date(),
      },
    });

    if (reviewStatus === "ACCEPTED") {
      // Add as team member
      await tx.teamMember.create({
        data: {
          teamRequestId,
          userId: application.applicantId,
          role: "MEMBER",
        },
      });

      // Increment member count and check if team is now filled
      const newCount = teamRequest.currentMemberCount + 1;
      const newStatus = newCount >= teamRequest.lookingForCount ? "FILLED" : teamRequest.status;

      await tx.teamRequest.update({
        where: { id: teamRequestId },
        data: {
          currentMemberCount: newCount,
          status: newStatus,
        },
      });
    }

    return updatedApplication;
  });

  notificationService.createNotification({
    userId: application.applicantId,
    senderId: userId,
    type: reviewStatus === "ACCEPTED" ? "TEAM_APPLICATION_ACCEPTED" : "TEAM_APPLICATION_REJECTED",
    title: reviewStatus === "ACCEPTED" ? "Application Accepted" : "Application Rejected",
    message: reviewStatus === "ACCEPTED"
      ? `Your team application was accepted.`
      : `Your team application was rejected.`,
    link: `/teams/${teamRequestId}`,
  }).catch(() => {});

  // Broadcast application review result to team room (non-blocking)
  try {
    const io = getSocketServer();
    io.to(`team:${teamRequestId}`).emit("team:application", {
      teamRequestId,
      application: {
        id: result.id,
        teamId: teamRequestId,
        applicantId: application.applicantId,
        status: result.status,
        createdAt: result.createdAt.toISOString(),
      },
    });
  } catch {
    // Socket.IO may not be initialized in test environments
  }

  return result;
};

/**
 * Withdraws a pending application. Only the applicant can withdraw.
 */
const withdrawApplication = async (teamRequestId: string, userId: string) => {
  const application = await prisma.teamApplication.findUnique({
    where: { teamRequestId_applicantId: { teamRequestId, applicantId: userId } },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found.");
  }

  if (application.status !== "PENDING") {
    throw new AppError(status.BAD_REQUEST, "Only pending applications can be withdrawn.");
  }

  const updated = await prisma.teamApplication.update({
    where: { id: application.id },
    data: { status: "WITHDRAWN" },
  });

  return updated;
};

/**
 * Lists all members of a team request.
 */
const getTeamMembers = async (teamRequestId: string) => {
  const teamRequest = await prisma.teamRequest.findUnique({
    where: { id: teamRequestId, isDeleted: false },
  });

  if (!teamRequest) {
    throw new AppError(status.NOT_FOUND, "Team request not found.");
  }

  const members = await prisma.teamMember.findMany({
    where: { teamRequestId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return members;
};

/**
 * Allows a member to leave a team. Creator cannot leave if other members exist.
 */
const leaveTeam = async (teamRequestId: string, userId: string) => {
  const teamRequest = await prisma.teamRequest.findUnique({
    where: { id: teamRequestId, isDeleted: false },
  });

  if (!teamRequest) {
    throw new AppError(status.NOT_FOUND, "Team request not found.");
  }

  const membership = await prisma.teamMember.findUnique({
    where: { teamRequestId_userId: { teamRequestId, userId } },
  });

  if (!membership) {
    throw new AppError(status.NOT_FOUND, "You are not a member of this team.");
  }

  // Creator (LEADER) cannot leave if other members exist
  if (membership.role === "LEADER") {
    const otherMembersCount = await prisma.teamMember.count({
      where: { teamRequestId, userId: { not: userId } },
    });

    if (otherMembersCount > 0) {
      throw new AppError(
        status.BAD_REQUEST,
        "Team creator cannot leave while other members exist. Transfer leadership or remove all members first.",
      );
    }
  }

  // Remove member and decrement count
  await prisma.$transaction(async (tx) => {
    await tx.teamMember.delete({
      where: { id: membership.id },
    });

    const newCount = teamRequest.currentMemberCount - 1;
    const revertStatus = teamRequest.status === "FILLED" ? "OPEN" : teamRequest.status;

    await tx.teamRequest.update({
      where: { id: teamRequestId },
      data: {
        currentMemberCount: newCount,
        status: revertStatus,
      },
    });
  });

  return { message: "You have left the team." };
};

/**
 * Removes a member from a team. Only the creator/leader can remove.
 */
const removeMember = async (
  teamRequestId: string,
  memberId: string,
  userId: string,
) => {
  const teamRequest = await prisma.teamRequest.findUnique({
    where: { id: teamRequestId, isDeleted: false },
  });

  if (!teamRequest) {
    throw new AppError(status.NOT_FOUND, "Team request not found.");
  }

  // Check if the requesting user is the creator or a leader
  const requesterMembership = await prisma.teamMember.findUnique({
    where: { teamRequestId_userId: { teamRequestId, userId } },
  });

  if (!requesterMembership || requesterMembership.role !== "LEADER") {
    throw new AppError(status.FORBIDDEN, "Only the team leader can remove members.");
  }

  // Cannot remove yourself
  if (memberId === requesterMembership.id) {
    throw new AppError(status.BAD_REQUEST, "Use the leave team endpoint to leave the team.");
  }

  const membershipToRemove = await prisma.teamMember.findUnique({
    where: { id: memberId },
  });

  if (!membershipToRemove || membershipToRemove.teamRequestId !== teamRequestId) {
    throw new AppError(status.NOT_FOUND, "Member not found in this team.");
  }

  // Remove member and decrement count
  const result = await prisma.$transaction(async (tx) => {
    await tx.teamMember.delete({ where: { id: memberId } });

    const newCount = teamRequest.currentMemberCount - 1;
    const revertStatus = teamRequest.status === "FILLED" ? "OPEN" : teamRequest.status;

    await tx.teamRequest.update({
      where: { id: teamRequestId },
      data: {
        currentMemberCount: newCount,
        status: revertStatus,
      },
    });

    return { message: "Member removed successfully." };
  });

  return result;
};

/**
 * Gets category counts for sidebar display.
 */
const getCategoryCounts = async (): Promise<TeamCategoryCount[]> => {
  const counts = await prisma.teamRequest.groupBy({
    by: ["category"],
    where: { isDeleted: false, status: "OPEN" },
    _count: { category: true },
    orderBy: { _count: { category: "desc" } },
  });

  return counts
    .filter((c) => c.category !== null)
    .map((c) => ({
      category: c.category!,
      count: c._count.category,
    }));
};

/**
 * Gets popular skills across all team requests.
 */
const getPopularSkills = async (): Promise<TeamPopularSkill[]> => {
  const skills = await prisma.teamRequestSkill.groupBy({
    by: ["tagId"],
    where: {
      teamRequest: { isDeleted: false, status: "OPEN" },
    },
    _count: { tagId: true },
    orderBy: { _count: { tagId: "desc" } },
    take: 20,
  });

  const tagIds = skills.map((s) => s.tagId);
  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
    select: { id: true, name: true },
  });

  const tagMap = new Map(tags.map((t) => [t.id, t.name]));

  return skills.map((s) => ({
    tagId: s.tagId,
    name: tagMap.get(s.tagId) || "Unknown",
    count: s._count.tagId,
  }));
};

/**
 * Gets teams created by the current user.
 */
const getMyTeams = async (userId: string) => {
  const teams = await prisma.teamRequest.findMany({
    where: { creatorId: userId, isDeleted: false },
    include: {
      teamRequestSkills: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      _count: { select: { teamApplications: true, teamMembers: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return teams;
};

/**
 * Gets applications made by the current user.
 */
const getMyApplications = async (userId: string) => {
  const applications = await prisma.teamApplication.findMany({
    where: { applicantId: userId },
    include: {
      teamRequest: {
        include: {
          teamRequestSkills: { include: { tag: { select: { id: true, name: true, slug: true } } } },
          creator: { select: { id: true, name: true, image: true } },
          _count: { select: { teamMembers: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return applications;
};

/**
 * Gets applications for a team. Only the creator can view.
 */
const getTeamApplications = async (teamRequestId: string, userId: string) => {
  const teamRequest = await prisma.teamRequest.findUnique({
    where: { id: teamRequestId, isDeleted: false },
  });

  if (!teamRequest) {
    throw new AppError(status.NOT_FOUND, "Team request not found.");
  }

  if (teamRequest.creatorId !== userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== UserRole.ADMIN) {
      throw new AppError(status.FORBIDDEN, "Only the team creator can view applications.");
    }
  }

  const applications = await prisma.teamApplication.findMany({
    where: { teamRequestId },
    include: {
      applicant: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          profile: {
            select: {
              bio: true,
              githubUrl: true,
              linkedinUrl: true,
              portfolioUrl: true,
              websiteUrl: true,
              phoneNumber: true,
              location: true,
              currentSemester: true,
              batchYear: true,
            },
          },
          student: {
            select: {
              studentId: true,
              department: true,
              admissionYear: true,
              admissionSemester: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return applications;
};

/**
 * Toggles bookmark for a team request.
 */
const toggleBookmark = async (teamRequestId: string, userId: string) => {
  const teamRequest = await prisma.teamRequest.findUnique({
    where: { id: teamRequestId, isDeleted: false },
  });

  if (!teamRequest) {
    throw new AppError(status.NOT_FOUND, "Team request not found.");
  }

  const existingBookmark = await prisma.teamBookmark.findUnique({
    where: { teamRequestId_userId: { teamRequestId, userId } },
  });

  if (existingBookmark) {
    // Remove bookmark
    await prisma.$transaction([
      prisma.teamBookmark.delete({ where: { id: existingBookmark.id } }),
      prisma.teamRequest.update({
        where: { id: teamRequestId },
        data: { bookmarkCount: { decrement: 1 } },
      }),
    ]);
    return { message: "Bookmark removed.", bookmarked: false };
  } else {
    // Add bookmark
    await prisma.$transaction([
      prisma.teamBookmark.create({ data: { teamRequestId, userId } }),
      prisma.teamRequest.update({
        where: { id: teamRequestId },
        data: { bookmarkCount: { increment: 1 } },
      }),
    ]);
    return { message: "Team bookmarked.", bookmarked: true };
  }
};

export const teamService = {
  createTeamRequest,
  getTeamRequest,
  listTeamRequests,
  updateTeamRequest,
  deleteTeamRequest,
  applyToTeam,
  reviewApplication,
  withdrawApplication,
  getTeamMembers,
  leaveTeam,
  removeMember,
  getCategoryCounts,
  getPopularSkills,
  getMyTeams,
  getMyApplications,
  getTeamApplications,
  toggleBookmark,
};
