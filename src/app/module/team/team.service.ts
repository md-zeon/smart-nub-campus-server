import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { getSocketServer } from "../../lib/socket/socket-server";
import { notificationService } from "../notification/notification.service";
import {
  ApplyToTeamInput,
  CreateTeamRequestInput,
  ListTeamRequestsQuery,
  ReviewApplicationInput,
  UpdateTeamRequestInput,
} from "./team.interface";

/**
 * Creates a new team request with skill tags.
 * Automatically adds the creator as a LEADER member.
 */
const createTeamRequest = async (data: CreateTeamRequestInput, userId: string) => {
  const teamRequest = await prisma.$transaction(async (tx) => {
    // Create the team request with skills and initial member
    const created = await tx.teamRequest.create({
      data: {
        title: data.title,
        description: data.description,
        lookingForCount: data.lookingForCount,
        projectName: data.projectName ?? null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        category: data.category ?? null,
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
 */
const getTeamRequest = async (id: string) => {
  const teamRequest = await prisma.teamRequest.findUnique({
    where: { id, isDeleted: false },
    include: {
      teamRequestSkills: { include: { tag: true } },
      teamMembers: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
      creator: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { teamApplications: true } },
    },
  });

  if (!teamRequest) {
    throw new AppError(status.NOT_FOUND, "Team request not found.");
  }

  return teamRequest;
};

/**
 * Lists team requests with pagination and filters.
 * Excludes the user's own requests when excludeOwn is true.
 */
const listTeamRequests = async (query: ListTeamRequestsQuery, userId?: string) => {
  const {
    status: filterStatus,
    category,
    skill,
    search,
    sort = "newest",
    page = 1,
    limit = 12,
    excludeOwn = false,
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

  // Filter by skill tag
  if (skill) {
    where.teamRequestSkills = {
      some: { tag: { slug: skill } },
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
  let orderBy: Record<string, string>;
  switch (sort) {
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "popular":
      orderBy = { currentMemberCount: "desc" };
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
        _count: { select: { teamApplications: true, teamMembers: true } },
      },
    }),
    prisma.teamRequest.count({ where }),
  ]);

  return {
    data: teamRequests,
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
  if (data.description !== undefined) updateData.description = data.description;
  if (data.lookingForCount !== undefined) updateData.lookingForCount = data.lookingForCount;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.projectName !== undefined) updateData.projectName = data.projectName;
  if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
  if (data.category !== undefined) updateData.category = data.category;

  return prisma.$transaction(async (tx) => {
    // Update the team request
    await tx.teamRequest.update({ where: { id }, data: updateData });

    // Update skills if provided
    if (data.skillTagIds) {
      await tx.teamRequestSkill.deleteMany({ where: { teamRequestId: id } });
      for (const tagId of data.skillTagIds) {
        await tx.teamRequestSkill.create({
          data: { teamRequestId: id, tagId },
        });
      }
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

  await prisma.teamRequest.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });

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

  const application = await prisma.teamApplication.create({
    data: {
      teamRequestId,
      applicantId: userId,
      message: data.message ?? null,
    },
    include: {
      applicant: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  notificationService.createNotification({
    userId: teamRequest.creatorId,
    type: "TEAM_APPLICATION",
    title: "Team Application",
    message: `Someone applied to your team request.`,
    link: `/teams/${teamRequestId}`,
  }).catch(() => {});

  // Broadcast new application to connected clients (non-blocking)
  try {
    const io = getSocketServer();
    io.emit("team:application", {
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
    type: reviewStatus === "ACCEPTED" ? "TEAM_APPLICATION_ACCEPTED" : "TEAM_APPLICATION_REJECTED",
    title: reviewStatus === "ACCEPTED" ? "Application Accepted" : "Application Rejected",
    message: reviewStatus === "ACCEPTED"
      ? `Your team application was accepted.`
      : `Your team application was rejected.`,
    link: `/teams/${teamRequestId}`,
  }).catch(() => {});

  // Broadcast application review result to connected clients (non-blocking)
  try {
    const io = getSocketServer();
    io.emit("team:application", {
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
};
