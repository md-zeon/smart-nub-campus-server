import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { getSocketServer } from "../../lib/socket/socket-server";
import { notificationService } from "../notification/notification.service";
import {
  SendConnectionRequestInput,
  BlockUserInput,
  AddSkillInput,
  SearchPeopleQuery,
  GetMyConnectionsQuery,
  ConnectionWithUser,
  SuggestedPerson,
} from "./connection.interface";

/**
 * Helper: Get the other user in a connection based on the current user's ID.
 */
const getOtherUserId = (connection: { requesterId: string; receiverId: string }, userId: string) => {
  return connection.requesterId === userId ? connection.receiverId : connection.requesterId;
};

/**
 * Helper: Check if two users are blocked (either direction).
 */
const areUsersBlocked = async (userId1: string, userId2: string): Promise<boolean> => {
  const block = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: userId1, blockedId: userId2 },
        { blockerId: userId2, blockedId: userId1 },
      ],
    },
  });
  return !!block;
};

/**
 * Helper: Get all blocked user IDs for a user (both directions).
 */
const getBlockedUserIds = async (userId: string): Promise<string[]> => {
  const blocks = await prisma.blockedUser.findMany({
    where: {
      OR: [{ blockerId: userId }, { blockedId: userId }],
    },
    select: {
      blockerId: true,
      blockedId: true,
    },
  });

  const blockedIds = new Set<string>();
  for (const block of blocks) {
    blockedIds.add(block.blockerId);
    blockedIds.add(block.blockedId);
  }
  blockedIds.delete(userId); // Remove self from blocked list
  return Array.from(blockedIds);
};

/**
 * Helper: Build the other-user include fragment for connection queries.
 */
const buildOtherUserInclude = () => ({
  id: true,
  name: true,
  email: true,
  image: true,
  student: {
    select: {
      department: true,
      admissionYear: true,
      admissionSemester: true,
    },
  },
  profile: {
    select: {
      currentSemester: true,
      batchYear: true,
    },
  },
});

/**
 * Helper: Format a connection record with the other user's info.
 */
const formatConnection = (connection: Record<string, unknown>, userId: string): ConnectionWithUser => {
  const conn = connection as {
    id: string;
    requesterId: string;
    receiverId: string;
    status: string;
    isFavorite: boolean;
    createdAt: Date;
    updatedAt: Date;
    requester: Record<string, unknown>;
    receiver: Record<string, unknown>;
  };
  const otherUser = conn.requesterId === userId ? conn.receiver : conn.requester;
  return {
    id: conn.id,
    requesterId: conn.requesterId,
    receiverId: conn.receiverId,
    status: conn.status as ConnectionWithUser["status"],
    isFavorite: conn.isFavorite,
    note: (conn as Record<string, unknown>).note as string | null | undefined ?? null,
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
    otherUser: otherUser as ConnectionWithUser["otherUser"],
  };
};

/**
 * Send a connection request from the current user to a receiver.
 * Validates: not self-request, not already connected, not blocked.
 */
const sendConnectionRequest = async (
  data: SendConnectionRequestInput,
  userId: string,
) => {
  if (data.receiverId === userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot send a connection request to yourself.");
  }

  // Check if receiver exists
  const receiver = await prisma.user.findUnique({
    where: { id: data.receiverId },
  });
  if (!receiver) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  // Check if blocked
  const blocked = await areUsersBlocked(userId, data.receiverId);
  if (blocked) {
    throw new AppError(
      status.FORBIDDEN,
      "You cannot send a connection request to this user.",
    );
  }

  // Check for existing connection (either direction)
  const existingConnection = await prisma.connection.findFirst({
    where: {
      OR: [
        { requesterId: userId, receiverId: data.receiverId },
        { requesterId: data.receiverId, receiverId: userId },
      ],
    },
  });

  if (existingConnection) {
    if (existingConnection.status === "PENDING") {
      throw new AppError(
        status.CONFLICT,
        "A pending connection request already exists.",
      );
    }
    if (existingConnection.status === "ACCEPTED") {
      throw new AppError(
        status.CONFLICT,
        "You are already connected with this user.",
      );
    }
    // If REJECTED, allow re-request — update the existing record
    const updated = await prisma.connection.update({
      where: { id: existingConnection.id },
      data: {
        requesterId: userId,
        receiverId: data.receiverId,
        status: "PENDING",
        isFavorite: false,
        note: data.note ?? null,
      },
    });
    notificationService.createNotification({
      userId: data.receiverId,
      type: "CONNECTION_REQUEST",
      title: "New Connection Request",
      message: `Someone sent you a connection request.`,
      link: "/connections",
    }).catch(() => {});
    try {
      const io = getSocketServer();
      io.to(`user:${data.receiverId}`).emit("connection:request", {
        id: updated.id,
        requesterId: updated.requesterId,
        receiverId: updated.receiverId,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
      });
    } catch { /* Socket.IO may not be initialized */ }
    return updated;
  }

  const connection = await prisma.connection.create({
    data: {
      requesterId: userId,
      receiverId: data.receiverId,
      status: "PENDING",
      note: data.note ?? null,
    },
  });

  notificationService.createNotification({
    userId: data.receiverId,
    type: "CONNECTION_REQUEST",
    title: "New Connection Request",
    message: `Someone sent you a connection request.`,
    link: "/connections",
  }).catch(() => {});
  try {
    const io = getSocketServer();
    io.to(`user:${data.receiverId}`).emit("connection:request", {
      id: connection.id,
      requesterId: connection.requesterId,
      receiverId: connection.receiverId,
      status: connection.status,
      createdAt: connection.createdAt.toISOString(),
    });
  } catch { /* Socket.IO may not be initialized */ }
  return connection;
};

/**
 * Accept a pending connection request. Only the receiver can accept.
 */
const acceptConnection = async (connectionId: string, userId: string) => {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new AppError(status.NOT_FOUND, "Connection request not found.");
  }

  if (connection.receiverId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "Only the receiver can accept a connection request.",
    );
  }

  if (connection.status !== "PENDING") {
    throw new AppError(
      status.BAD_REQUEST,
      "This connection request is no longer pending.",
    );
  }

  const updated = await prisma.connection.update({
    where: { id: connectionId },
    data: { status: "ACCEPTED" },
  });

  notificationService.createNotification({
    userId: connection.requesterId,
    type: "CONNECTION_ACCEPTED",
    title: "Connection Accepted",
    message: `Your connection request was accepted.`,
    link: "/connections",
  }).catch(() => {});
  try {
    const io = getSocketServer();
    io.to(`user:${connection.requesterId}`).emit("connection:accepted", {
      id: updated.id,
      requesterId: updated.requesterId,
      receiverId: updated.receiverId,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch { /* Socket.IO may not be initialized */ }

  return updated;
};

/**
 * Reject a pending connection request. Only the receiver can reject.
 */
const rejectConnection = async (connectionId: string, userId: string) => {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new AppError(status.NOT_FOUND, "Connection request not found.");
  }

  if (connection.receiverId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "Only the receiver can reject a connection request.",
    );
  }

  if (connection.status !== "PENDING") {
    throw new AppError(
      status.BAD_REQUEST,
      "This connection request is no longer pending.",
    );
  }

  const updated = await prisma.connection.update({
    where: { id: connectionId },
    data: { status: "REJECTED" },
  });

  return updated;
};

/**
 * Block a user. Creates a BlockedUser record and removes any pending connection.
 */
const blockUser = async (data: BlockUserInput, userId: string) => {
  if (data.blockedId === userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot block yourself.");
  }

  const blockedUser = await prisma.user.findUnique({
    where: { id: data.blockedId },
  });
  if (!blockedUser) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  // Check if already blocked
  const existingBlock = await prisma.blockedUser.findUnique({
    where: {
      blockerId_blockedId: {
        blockerId: userId,
        blockedId: data.blockedId,
      },
    },
  });

  if (existingBlock) {
    throw new AppError(status.CONFLICT, "User is already blocked.");
  }

  await prisma.$transaction(async (tx) => {
    // Create the block
    await tx.blockedUser.create({
      data: {
        blockerId: userId,
        blockedId: data.blockedId,
      },
    });

    // Remove any pending connection between the two users
    await tx.connection.deleteMany({
      where: {
        status: "PENDING",
        OR: [
          { requesterId: userId, receiverId: data.blockedId },
          { requesterId: data.blockedId, receiverId: userId },
        ],
      },
    });
  });

  return { message: "User blocked successfully." };
};

/**
 * Unblock a previously blocked user.
 */
const unblockUser = async (blockedId: string, userId: string) => {
  const existingBlock = await prisma.blockedUser.findUnique({
    where: {
      blockerId_blockedId: {
        blockerId: userId,
        blockedId,
      },
    },
  });

  if (!existingBlock) {
    throw new AppError(status.NOT_FOUND, "Block not found.");
  }

  await prisma.blockedUser.delete({
    where: { id: existingBlock.id },
  });

  return { message: "User unblocked successfully." };
};

/**
 * Get the list of users the current user has blocked, with their profile info
 * resolved into an `otherUser` shape for the client.
 */
const getBlockedUsers = async (userId: string) => {
  const blocks = await prisma.blockedUser.findMany({
    where: { blockerId: userId },
    orderBy: { createdAt: "desc" },
    select: { blockedId: true },
  });

  if (blocks.length === 0) return [];

  const blockedIds = blocks.map((b) => b.blockedId);

  const users = await prisma.user.findMany({
    where: { id: { in: blockedIds }, isDeleted: false },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      student: {
        select: {
          department: true,
          admissionYear: true,
          admissionSemester: true,
        },
      },
      profile: {
        select: { currentSemester: true },
      },
    },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    student: u.student,
    profile: u.profile,
  }));
};

/**
 * Remove an accepted connection or cancel a pending outgoing request.
 * Either party can remove accepted connections. Only the requester can cancel pending.
 */
const removeConnection = async (connectionId: string, userId: string) => {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new AppError(status.NOT_FOUND, "Connection not found.");
  }

  if (
    connection.requesterId !== userId &&
    connection.receiverId !== userId
  ) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not part of this connection.",
    );
  }

  if (connection.status === "PENDING") {
    // Only the requester can cancel a pending request
    if (connection.requesterId !== userId) {
      throw new AppError(
        status.FORBIDDEN,
        "Only the requester can cancel a pending connection request.",
      );
    }
  } else if (connection.status !== "ACCEPTED") {
    throw new AppError(
      status.BAD_REQUEST,
      "Only accepted or pending connections can be removed.",
    );
  }

  await prisma.connection.delete({
    where: { id: connectionId },
  });

  try {
    const io = getSocketServer();
    const otherUserId = getOtherUserId(connection, userId);
    io.to(`user:${otherUserId}`).emit("connection:removed", {
      connectionId,
      removedBy: userId,
    });
  } catch { /* Socket.IO may not be initialized */ }

  return { message: "Connection removed successfully." };
};

/**
 * Get the current user's accepted connections with optional filters.
 */
const getMyConnections = async (userId: string, query: GetMyConnectionsQuery) => {
  const { filter = "ALL", page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  // Get blocked user IDs to exclude
  const blockedIds = await getBlockedUserIds(userId);

  // Get current user's student info for semester comparison
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: {
        select: {
          admissionYear: true,
          admissionSemester: true,
        },
      },
      profile: {
        select: {
          currentSemester: true,
        },
      },
    },
  });

  const where: Prisma.ConnectionWhereInput = {
    status: "ACCEPTED",
    OR: [{ requesterId: userId }, { receiverId: userId }],
  };

  // Apply filter
  if (filter === "FAVORITES") {
    where.isFavorite = true;
  }

  const [connections, total] = await Promise.all([
    prisma.connection.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        requester: {
          select: buildOtherUserInclude(),
        },
        receiver: {
          select: buildOtherUserInclude(),
        },
      },
    }),
    prisma.connection.count({ where }),
  ]);

  let filteredConnections = connections;

  // Apply semester-based filters
  if (
    (filter === "SENIORS" || filter === "JUNIORS" || filter === "SAME_SEMESTER") &&
    currentUser?.profile?.currentSemester
  ) {
    filteredConnections = connections.filter((conn) => {
      const otherUserId = getOtherUserId(conn, userId);
      const otherUser =
        conn.requesterId === otherUserId ? conn.requester : conn.receiver;
      const otherStudent = otherUser.student;
      const otherProfile = otherUser.profile;

      if (!otherStudent || !otherProfile?.currentSemester) return false;

      const mySemester = currentUser.profile?.currentSemester ?? 0;
      const otherSemester = otherProfile.currentSemester;

      if (filter === "SENIORS") return otherSemester > mySemester;
      if (filter === "JUNIORS") return otherSemester < mySemester;
      if (filter === "SAME_SEMESTER") return otherSemester === mySemester;
      return true;
    });
  }

  // Exclude blocked users from results
  const result = filteredConnections
    .filter((conn) => {
      const otherUserId = getOtherUserId(conn, userId);
      return !blockedIds.includes(otherUserId);
    })
    .map((conn) => formatConnection(conn, userId));

  // When an in-memory filter was applied, the DB count no longer matches the
  // returned set — derive the total (and pages) from the filtered result so
  // pagination stays accurate.
  const isInMemoryFiltered =
    filter === "FAVORITES" ||
    filter === "SENIORS" ||
    filter === "JUNIORS" ||
    filter === "SAME_SEMESTER";
  const effectiveTotal = isInMemoryFiltered ? result.length : total;

  return {
    data: result,
    meta: {
      page,
      limit,
      total: effectiveTotal,
      totalPages: Math.ceil(effectiveTotal / limit),
    },
  };
};

/**
 * Get incoming pending connection requests.
 */
const getPendingRequests = async (userId: string) => {
  const blockedIds = await getBlockedUserIds(userId);

  const requests = await prisma.connection.findMany({
    where: {
      receiverId: userId,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
    include: {
      requester: {
        select: buildOtherUserInclude(),
      },
    },
  });

  // Exclude blocked users
  const filtered = requests.filter(
    (req) => !blockedIds.includes(req.requesterId),
  );

  return filtered.map((req) => ({
    id: req.id,
    requesterId: req.requesterId,
    receiverId: req.receiverId,
    status: req.status,
    isFavorite: req.isFavorite,
    note: req.note ?? null,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
    otherUser: req.requester,
  }));
};

/**
 * Get outgoing pending connection requests.
 */
const getSentRequests = async (userId: string) => {
  const blockedIds = await getBlockedUserIds(userId);

  const requests = await prisma.connection.findMany({
    where: {
      requesterId: userId,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
    include: {
      receiver: {
        select: buildOtherUserInclude(),
      },
    },
  });

  // Exclude blocked users
  const filtered = requests.filter(
    (req) => !blockedIds.includes(req.receiverId),
  );

  return filtered.map((req) => ({
    id: req.id,
    requesterId: req.requesterId,
    receiverId: req.receiverId,
    status: req.status,
    isFavorite: req.isFavorite,
    note: req.note ?? null,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
    otherUser: req.receiver,
  }));
};

/**
 * Toggle the isFavorite flag on a connection.
 */
const toggleFavorite = async (connectionId: string, userId: string) => {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new AppError(status.NOT_FOUND, "Connection not found.");
  }

  if (
    connection.requesterId !== userId &&
    connection.receiverId !== userId
  ) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not part of this connection.",
    );
  }

  if (connection.status !== "ACCEPTED") {
    throw new AppError(
      status.BAD_REQUEST,
      "Only accepted connections can be favorited.",
    );
  }

  const updated = await prisma.connection.update({
    where: { id: connectionId },
    data: { isFavorite: !connection.isFavorite },
  });

  return updated;
};

/**
 * People You May Know algorithm:
 * 1. Get current user's accepted connections (A)
 * 2. Get blocked user IDs (excluded from results)
 * 3. For each connection in A, get their accepted connections (B)
 * 4. Filter B to exclude: current user, already connected, blocked
 * 5. Count mutual connections for each candidate
 * 6. Boost score: +2 for same department, +1 for same semester
 * 7. Sort by score descending, return top N
 */
const getSuggestedPeople = async (userId: string) => {
  // Get current user's info for scoring
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: { select: { department: true } },
      profile: { select: { currentSemester: true } },
    },
  });

  // Get blocked user IDs
  const blockedIds = await getBlockedUserIds(userId);

  // Get current user's accepted connections
  const myConnections = await prisma.connection.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { receiverId: userId }],
    },
    select: {
      requesterId: true,
      receiverId: true,
    },
  });

  // Build set of already connected user IDs (including self)
  const connectedIds = new Set<string>([userId]);
  for (const conn of myConnections) {
    connectedIds.add(conn.requesterId);
    connectedIds.add(conn.receiverId);
  }

  // Get second-degree connections (friends of friends)
  const friendIds = myConnections.map((conn) =>
    conn.requesterId === userId ? conn.receiverId : conn.requesterId,
  );

  if (friendIds.length === 0) {
    return [];
  }

  // Get all second-degree connections
  const secondDegreeConnections = await prisma.connection.findMany({
    where: {
      status: "ACCEPTED",
      OR: friendIds.map((fid) => ({
        OR: [{ requesterId: fid }, { receiverId: fid }],
      })),
    },
    select: {
      requesterId: true,
      receiverId: true,
    },
  });

  // Count mutual connections for each candidate
  const mutualCountMap = new Map<string, number>();

  for (const conn of secondDegreeConnections) {
    const candidateId =
      conn.requesterId === userId || connectedIds.has(conn.requesterId)
        ? conn.receiverId
        : conn.requesterId;

    if (
      connectedIds.has(candidateId) ||
      blockedIds.includes(candidateId) ||
      candidateId === userId
    ) {
      continue;
    }

    mutualCountMap.set(
      candidateId,
      (mutualCountMap.get(candidateId) ?? 0) + 1,
    );
  }

  if (mutualCountMap.size === 0) {
    return [];
  }

  // Fetch candidate user info
  const candidateIds = Array.from(mutualCountMap.keys());
  const candidates = await prisma.user.findMany({
    where: { id: { in: candidateIds }, isDeleted: false },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      student: {
        select: {
          department: true,
          admissionYear: true,
          admissionSemester: true,
        },
      },
      profile: {
        select: {
          currentSemester: true,
        },
      },
    },
  });

  // Calculate scores and build results
  const suggestions: SuggestedPerson[] = candidates
    .map((candidate) => {
      const mutualConnections = mutualCountMap.get(candidate.id) ?? 0;
      let score = mutualConnections;

      // Boost: +2 for same department
      if (
        currentUser?.student?.department &&
        candidate.student?.department &&
        currentUser.student.department === candidate.student.department
      ) {
        score += 2;
      }

      // Boost: +1 for same semester
      if (
        currentUser?.profile?.currentSemester &&
        candidate.profile?.currentSemester &&
        currentUser.profile.currentSemester === candidate.profile.currentSemester
      ) {
        score += 1;
      }

      return {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        image: candidate.image,
        department: candidate.student?.department ?? "Unknown",
        currentSemester: candidate.profile?.currentSemester ?? null,
        mutualConnections,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return suggestions;
};

/**
 * Add a skill tag to the current user.
 */
const addSkill = async (data: AddSkillInput, userId: string) => {
  // Check if tag exists
  const tag = await prisma.tag.findUnique({
    where: { id: data.tagId },
  });
  if (!tag) {
    throw new AppError(status.NOT_FOUND, "Tag not found.");
  }

  // Check if already added
  const existing = await prisma.userSkill.findUnique({
    where: {
      userId_tagId: {
        userId,
        tagId: data.tagId,
      },
    },
  });

  if (existing) {
    throw new AppError(status.CONFLICT, "Skill already added.");
  }

  const userSkill = await prisma.userSkill.create({
    data: {
      userId,
      tagId: data.tagId,
    },
    include: {
      tag: true,
    },
  });

  return userSkill;
};

/**
 * Remove a skill tag from the current user.
 */
const removeSkill = async (skillId: string, userId: string) => {
  const userSkill = await prisma.userSkill.findUnique({
    where: { id: skillId },
  });

  if (!userSkill) {
    throw new AppError(status.NOT_FOUND, "Skill not found.");
  }

  if (userSkill.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only remove your own skills.",
    );
  }

  await prisma.userSkill.delete({
    where: { id: skillId },
  });

  return { message: "Skill removed successfully." };
};

/**
 * Get a user's skills.
 */
const getUserSkills = async (userId: string) => {
  const skills = await prisma.userSkill.findMany({
    where: { userId },
    include: {
      tag: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return skills;
};

/**
 * Search people by name, department, semester, or skills.
 * Excludes blocked users.
 */
const searchPeople = async (query: SearchPeopleQuery, userId: string) => {
  const { query: searchQuery, department, semester, skills, page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const blockedIds = await getBlockedUserIds(userId);

  const where: Prisma.UserWhereInput = {
    isDeleted: false,
    id: { notIn: [...blockedIds, userId] },
    role: "STUDENT",
  };

  // Name search
  if (searchQuery) {
    where.name = { contains: searchQuery, mode: "insensitive" };
  }

  // Department filter
  if (department) {
    where.student = {
      ...((where.student as Prisma.StudentWhereInput) || {}),
      department: department as Prisma.EnumDepartmentFilter["equals"],
    };
  }

  // Semester filter
  if (semester) {
    const semesterNum = parseInt(semester, 10);
    if (!isNaN(semesterNum)) {
      where.profile = {
        ...((where.profile as Prisma.UserProfileWhereInput) || {}),
        currentSemester: semesterNum,
      };
    }
  }

  // Skills filter — user must have ALL specified skills
  if (skills && skills.length > 0) {
    where.userSkills = {
      some: {
        tagId: { in: skills },
      },
    };
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        student: {
          select: {
            department: true,
            admissionYear: true,
            admissionSemester: true,
          },
        },
        profile: {
          select: {
            currentSemester: true,
            batchYear: true,
            bio: true,
          },
        },
        userSkills: {
          include: {
            tag: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // Resolve the current user's existing connection (if any) to each result so the
  // client can show the correct relationship (connected / pending / etc.) instead
  // of always rendering a "Connect" button.
  const userIds = users.map((u) => u.id);
  const existing = await prisma.connection.findMany({
    where: {
      OR: [
        { requesterId: userId, receiverId: { in: userIds } },
        { receiverId: userId, requesterId: { in: userIds } },
      ],
    },
    select: {
      id: true,
      requesterId: true,
      receiverId: true,
      status: true,
    },
  });

  const connectionByUserId = new Map<
    string,
    { id: string; status: string; requesterId: string }
  >();
  for (const conn of existing) {
    const otherId =
      conn.requesterId === userId ? conn.receiverId : conn.requesterId;
    connectionByUserId.set(otherId, {
      id: conn.id,
      status: conn.status,
      requesterId: conn.requesterId,
    });
  }

  const data = users.map((u) => {
    const conn = connectionByUserId.get(u.id);
    let connectionStatus: "NONE" | "CONNECTED" | "PENDING_INCOMING" | "PENDING_OUTGOING" =
      "NONE";
    if (conn) {
      if (conn.status === "ACCEPTED") connectionStatus = "CONNECTED";
      else if (conn.status === "PENDING") {
        connectionStatus =
          conn.requesterId === userId ? "PENDING_OUTGOING" : "PENDING_INCOMING";
      }
    }
    return {
      ...u,
      connectionStatus,
      connectionId: conn?.id ?? null,
    };
  });

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const connectionService = {
  sendConnectionRequest,
  acceptConnection,
  rejectConnection,
  blockUser,
  unblockUser,
  removeConnection,
  getMyConnections,
  getPendingRequests,
  getSentRequests,
  toggleFavorite,
  getSuggestedPeople,
  addSkill,
  removeSkill,
  getUserSkills,
  searchPeople,
  getBlockedUsers,
};
