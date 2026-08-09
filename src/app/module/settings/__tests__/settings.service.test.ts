import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mockAuth: {
    api: {
      changePassword: vi.fn(),
    },
  },
  mockBcrypt: {
    compare: vi.fn(),
  },
  mockPrisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    userSettings: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
    userNotificationSettings: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    session: { findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    loginHistory: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    dataExport: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    account: { findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: mocks.mockPrisma,
}));

vi.mock("../../../../app/lib/auth", () => ({
  auth: mocks.mockAuth,
}));

vi.mock("better-auth/node", () => ({
  fromNodeHeaders: vi.fn(() => ({ headers: {} })),
}));

vi.mock("bcryptjs", () => ({
  default: mocks.mockBcrypt,
}));

import { settingsService } from "../settings.service";

const userId = "user-001";

const mockSettings = {
  id: "settings-1",
  userId,
  showProfile: "EVERYONE",
  showAcademicInfo: "EVERYONE",
  connectionRequestPolicy: "EVERYONE",
  messagingPolicy: "EVERYONE",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockBcrypt.compare.mockResolvedValue(true);
});

describe("getPrivacySettings", () => {
  it("returns existing settings", async () => {
    mocks.mockPrisma.userSettings.findUnique.mockResolvedValue(
      mockSettings as never,
    );

    const result = await settingsService.getPrivacySettings(userId);

    expect(result).toEqual(mockSettings);
    expect(mocks.mockPrisma.userSettings.create).not.toHaveBeenCalled();
  });

  it("creates settings when none exist", async () => {
    mocks.mockPrisma.userSettings.findUnique.mockResolvedValue(null as never);
    mocks.mockPrisma.userSettings.create.mockResolvedValue(
      mockSettings as never,
    );

    const result = await settingsService.getPrivacySettings(userId);

    expect(mocks.mockPrisma.userSettings.create).toHaveBeenCalledWith({
      data: { userId },
    });
    expect(result).toEqual(mockSettings);
  });
});

describe("updatePrivacySettings", () => {
  it("upserts with only the provided fields", async () => {
    mocks.mockPrisma.userSettings.upsert.mockResolvedValue(
      mockSettings as never,
    );

    await settingsService.updatePrivacySettings(userId, {
      showProfile: "ONLY_ME",
      allowMessageRequests: true,
    });

    expect(mocks.mockPrisma.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId },
      update: { showProfile: "ONLY_ME", allowMessageRequests: true },
      create: { userId },
    });
  });

  it("passes an empty update object when no fields are provided", async () => {
    mocks.mockPrisma.userSettings.upsert.mockResolvedValue(
      mockSettings as never,
    );

    await settingsService.updatePrivacySettings(userId, {});

    expect(mocks.mockPrisma.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId },
      update: {},
      create: { userId },
    });
  });
});

describe("getNotificationSettings", () => {
  it("returns existing notification settings", async () => {
    mocks.mockPrisma.userNotificationSettings.findUnique.mockResolvedValue({
      id: "ns-1",
      userId,
    } as never);

    const result = await settingsService.getNotificationSettings(userId);

    expect(result).toEqual({ id: "ns-1", userId });
  });

  it("creates notification settings when none exist", async () => {
    mocks.mockPrisma.userNotificationSettings.findUnique.mockResolvedValue(
      null as never,
    );
    mocks.mockPrisma.userNotificationSettings.create.mockResolvedValue({
      id: "ns-1",
      userId,
    } as never);

    await settingsService.getNotificationSettings(userId);

    expect(mocks.mockPrisma.userNotificationSettings.create).toHaveBeenCalledWith(
      { data: { userId } },
    );
  });
});

describe("updateNotificationSettings", () => {
  it("upserts the notification settings", async () => {
    mocks.mockPrisma.userNotificationSettings.upsert.mockResolvedValue(
      { id: "ns-1", userId, emailOnMessage: true } as never,
    );

    const result = await settingsService.updateNotificationSettings(userId, {
      emailOnMessage: true,
    });

    expect(mocks.mockPrisma.userNotificationSettings.upsert).toHaveBeenCalledWith({
      where: { userId },
      update: { emailOnMessage: true },
      create: { userId, emailOnMessage: true },
    });
    expect(result.id).toBe("ns-1");
  });
});

describe("changePassword", () => {
  it("throws NOT_FOUND when the user does not exist", async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue(null as never);

    await expect(
      settingsService.changePassword(
        userId,
        { currentPassword: "old", newPassword: "new" },
        { cookie: "session" },
      ),
    ).rejects.toThrow("User not found.");
  });

  it("maps better-auth failures to an incorrect password error", async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
    } as never);
    mocks.mockAuth.api.changePassword.mockRejectedValue(
      new Error("invalid password"),
    );

    await expect(
      settingsService.changePassword(
        userId,
        { currentPassword: "wrong", newPassword: "new" },
        {},
      ),
    ).rejects.toThrow("Current password is incorrect.");
  });

  it("calls the auth api with the supplied credentials", async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
    } as never);
    mocks.mockAuth.api.changePassword.mockResolvedValue({ status: 200 });

    await settingsService.changePassword(
      userId,
      { currentPassword: "old", newPassword: "new" },
      { authorization: "Bearer x" },
    );

    expect(mocks.mockAuth.api.changePassword).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { currentPassword: "old", newPassword: "new" },
      }),
    );
  });
});

describe("getActiveSessions", () => {
  it("maps sessions and flags the current one", async () => {
    const now = new Date("2025-01-01");
    mocks.mockPrisma.session.findMany.mockResolvedValue([
      { id: "s-1", userId, ipAddress: "1.2.3.4", userAgent: "chrome", createdAt: now, updatedAt: now, expiresAt: now },
      { id: "s-2", userId, ipAddress: null, userAgent: null, createdAt: now, updatedAt: now, expiresAt: now },
    ] as never);

    const result = await settingsService.getActiveSessions(userId, "s-1");

    expect(result).toHaveLength(2);
    expect(result[0].isCurrent).toBe(true);
    expect(result[0].expiresAt).toBe(now.toISOString());
    expect(result[1].isCurrent).toBe(false);
    expect(result[1].ipAddress).toBeNull();
  });
});

describe("terminateSession", () => {
  it("refuses to terminate the current session", async () => {
    await expect(
      settingsService.terminateSession(userId, "s-1", "s-1"),
    ).rejects.toThrow("Cannot terminate your current session");
  });

  it("throws NOT_FOUND when the session is missing or owned by another user", async () => {
    mocks.mockPrisma.session.findUnique.mockResolvedValue(null as never);

    await expect(
      settingsService.terminateSession(userId, "s-2", "s-1"),
    ).rejects.toThrow("Session not found.");

    mocks.mockPrisma.session.findUnique.mockResolvedValue({
      id: "s-2",
      userId: "someone-else",
    } as never);

    await expect(
      settingsService.terminateSession(userId, "s-2", "s-1"),
    ).rejects.toThrow("Session not found.");
  });

  it("deletes the session", async () => {
    mocks.mockPrisma.session.findUnique.mockResolvedValue({
      id: "s-2",
      userId,
    } as never);
    mocks.mockPrisma.session.delete.mockResolvedValue({} as never);

    await settingsService.terminateSession(userId, "s-2", "s-1");

    expect(mocks.mockPrisma.session.delete).toHaveBeenCalledWith({
      where: { id: "s-2" },
    });
  });
});

describe("terminateOtherSessions", () => {
  it("deletes all sessions except the current one", async () => {
    mocks.mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 } as never);

    await settingsService.terminateOtherSessions(userId, "s-1");

    expect(mocks.mockPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId, id: { not: "s-1" } },
    });
  });
});

describe("getLoginHistory", () => {
  it("returns paginated login history entries", async () => {
    const now = new Date("2025-01-01");
    mocks.mockPrisma.loginHistory.findMany.mockResolvedValue([
      { id: "lh-1", ipAddress: "1.2.3.4", userAgent: "chrome", success: true, failureReason: null, createdAt: now },
    ] as never);
    mocks.mockPrisma.loginHistory.count.mockResolvedValue(1 as never);

    const result = await settingsService.getLoginHistory(userId, 1, 10);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].createdAt).toBe(now.toISOString());
    expect(result.meta.total).toBe(1);
    expect(mocks.mockPrisma.loginHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 }),
    );
  });
});

describe("requestExport", () => {
  it("creates an export job and marks it completed", async () => {
    mocks.mockPrisma.dataExport.create.mockResolvedValue({
      id: "job-1",
      userId,
      type: "FULL",
      status: "PROCESSING",
    } as never);
    mocks.mockPrisma.dataExport.update.mockResolvedValue({
      id: "job-1",
      status: "COMPLETED",
    } as never);

    const result = await settingsService.requestExport(userId, { type: "FULL" });

    expect(result).toEqual({ jobId: "job-1", status: "COMPLETED" });
    expect(mocks.mockPrisma.dataExport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job-1" },
        data: expect.objectContaining({ status: "COMPLETED" }),
      }),
    );
  });
});

describe("getExportStatus", () => {
  it("returns the export status for the owner", async () => {
    const now = new Date("2025-01-01");
    mocks.mockPrisma.dataExport.findUnique.mockResolvedValue({
      id: "job-1",
      userId,
      type: "FULL",
      status: "COMPLETED",
      fileUrl: "https://example.com/export.zip",
      expiresAt: now,
      createdAt: now,
    } as never);

    const result = await settingsService.getExportStatus(userId, "job-1");

    expect(result).toEqual({
      jobId: "job-1",
      type: "FULL",
      status: "COMPLETED",
      fileUrl: "https://example.com/export.zip",
      expiresAt: now.toISOString(),
      createdAt: now.toISOString(),
    });
  });

  it("throws NOT_FOUND for a missing or foreign job", async () => {
    mocks.mockPrisma.dataExport.findUnique.mockResolvedValue(null as never);

    await expect(
      settingsService.getExportStatus(userId, "job-1"),
    ).rejects.toThrow("Export job not found.");

    mocks.mockPrisma.dataExport.findUnique.mockResolvedValue({
      id: "job-1",
      userId: "someone-else",
    } as never);

    await expect(
      settingsService.getExportStatus(userId, "job-1"),
    ).rejects.toThrow("Export job not found.");
  });
});

describe("downloadExport", () => {
  it("returns the download URL for a completed export", async () => {
    mocks.mockPrisma.dataExport.findUnique.mockResolvedValue({
      id: "job-1",
      userId,
      status: "COMPLETED",
      fileUrl: "https://example.com/export.zip",
    } as never);

    const result = await settingsService.downloadExport(userId, "job-1");

    expect(result).toEqual({ downloadUrl: "https://example.com/export.zip" });
  });

  it("rejects exports that are not ready", async () => {
    mocks.mockPrisma.dataExport.findUnique.mockResolvedValue({
      id: "job-1",
      userId,
      status: "PROCESSING",
      fileUrl: null,
    } as never);

    await expect(
      settingsService.downloadExport(userId, "job-1"),
    ).rejects.toThrow("Export is not ready for download.");
  });
});

describe("requestArchive", () => {
  it("verifies the password and creates an ARCHIVE job", async () => {
    mocks.mockPrisma.account.findFirst.mockResolvedValue({
      password: "$2a$10$hashed",
    } as never);
    mocks.mockPrisma.dataExport.create.mockResolvedValue({
      id: "job-1",
      userId,
      type: "ARCHIVE",
      status: "PROCESSING",
    } as never);
    mocks.mockPrisma.dataExport.update.mockResolvedValue({
      id: "job-1",
      status: "COMPLETED",
    } as never);

    const result = await settingsService.requestArchive(userId, "secret");

    expect(mocks.mockBcrypt.compare).toHaveBeenCalled();
    expect(result).toEqual({ jobId: "job-1" });
    expect(mocks.mockPrisma.dataExport.create).toHaveBeenCalledWith({
      data: { userId, type: "ARCHIVE", status: "PROCESSING" },
    });
  });

  it("rejects an incorrect password before creating the job", async () => {
    mocks.mockPrisma.account.findFirst.mockResolvedValue({
      password: "$2a$10$hashed",
    } as never);
    mocks.mockBcrypt.compare.mockResolvedValue(false);

    await expect(
      settingsService.requestArchive(userId, "wrong"),
    ).rejects.toThrow("Invalid password.");
    expect(mocks.mockPrisma.dataExport.create).not.toHaveBeenCalled();
  });

  it("throws when no credential account exists", async () => {
    mocks.mockPrisma.account.findFirst.mockResolvedValue(null as never);

    await expect(
      settingsService.requestArchive(userId, "secret"),
    ).rejects.toThrow("No password-based account found.");
  });
});

describe("deactivateAccount", () => {
  it("deactivates the account and terminates all sessions", async () => {
    mocks.mockPrisma.account.findFirst.mockResolvedValue({
      password: "$2a$10$hashed",
    } as never);
    mocks.mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      isDeactivated: false,
    } as never);
    mocks.mockPrisma.user.update.mockResolvedValue({} as never);
    mocks.mockPrisma.session.deleteMany.mockResolvedValue({ count: 1 } as never);

    await settingsService.deactivateAccount(userId, "secret");

    expect(mocks.mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: expect.objectContaining({ isDeactivated: true }),
    });
    expect(mocks.mockPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId },
    });
  });

  it("throws when the account is already deactivated", async () => {
    mocks.mockPrisma.account.findFirst.mockResolvedValue({
      password: "$2a$10$hashed",
    } as never);
    mocks.mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      isDeactivated: true,
    } as never);

    await expect(
      settingsService.deactivateAccount(userId, "secret"),
    ).rejects.toThrow("Account is already deactivated.");
  });
});

describe("requestDeletion", () => {
  it("schedules deletion 30 days out and logs an audit entry when a reason is given", async () => {
    mocks.mockPrisma.account.findFirst.mockResolvedValue({
      password: "$2a$10$hashed",
    } as never);
    mocks.mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      scheduledDeletionAt: null,
    } as never);
    mocks.mockPrisma.user.update.mockResolvedValue({} as never);
    mocks.mockPrisma.auditLog.create.mockResolvedValue({} as never);

    const result = await settingsService.requestDeletion(userId, "secret", "moving on");

    expect(result.scheduledDeletionAt).toBeDefined();
    expect(mocks.mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scheduledDeletionAt: expect.any(Date),
        }),
      }),
    );
    expect(mocks.mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "ACCOUNT_DELETION_REQUESTED" }),
      }),
    );
  });

  it("throws when deletion is already scheduled", async () => {
    mocks.mockPrisma.account.findFirst.mockResolvedValue({
      password: "$2a$10$hashed",
    } as never);
    mocks.mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      scheduledDeletionAt: new Date(),
    } as never);

    await expect(
      settingsService.requestDeletion(userId, "secret"),
    ).rejects.toThrow("Deletion is already scheduled.");
  });
});

describe("cancelDeletion", () => {
  it("clears the scheduled deletion and logs the cancellation", async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      scheduledDeletionAt: new Date(),
    } as never);
    mocks.mockPrisma.user.update.mockResolvedValue({} as never);
    mocks.mockPrisma.auditLog.create.mockResolvedValue({} as never);

    await settingsService.cancelDeletion(userId);

    expect(mocks.mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { scheduledDeletionAt: null },
    });
    expect(mocks.mockPrisma.auditLog.create).toHaveBeenCalled();
  });

  it("throws when no deletion is scheduled", async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      scheduledDeletionAt: null,
    } as never);

    await expect(settingsService.cancelDeletion(userId)).rejects.toThrow(
      "No deletion is scheduled.",
    );
  });
});

describe("getDeletionStatus", () => {
  it("returns the scheduled deletion date", async () => {
    const now = new Date("2025-01-01");
    mocks.mockPrisma.user.findUnique.mockResolvedValue({
      scheduledDeletionAt: now,
    } as never);

    const result = await settingsService.getDeletionStatus(userId);

    expect(result.scheduledDeletionAt).toBe(now.toISOString());
  });

  it("returns null when no deletion is scheduled", async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue({
      scheduledDeletionAt: null,
    } as never);

    const result = await settingsService.getDeletionStatus(userId);

    expect(result.scheduledDeletionAt).toBeNull();
  });
});

describe("recordLoginHistory", () => {
  it("records a login entry with defaults", async () => {
    mocks.mockPrisma.loginHistory.create.mockResolvedValue({} as never);

    await settingsService.recordLoginHistory(userId);

    expect(mocks.mockPrisma.loginHistory.create).toHaveBeenCalledWith({
      data: {
        userId,
        ipAddress: null,
        userAgent: null,
        success: true,
        failureReason: null,
      },
    });
  });

  it("records a failed login with the given details", async () => {
    mocks.mockPrisma.loginHistory.create.mockResolvedValue({} as never);

    await settingsService.recordLoginHistory(
      userId,
      "1.2.3.4",
      "chrome",
      false,
      "bad password",
    );

    expect(mocks.mockPrisma.loginHistory.create).toHaveBeenCalledWith({
      data: {
        userId,
        ipAddress: "1.2.3.4",
        userAgent: "chrome",
        success: false,
        failureReason: "bad password",
      },
    });
  });
});
