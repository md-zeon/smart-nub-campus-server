import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    jobPost: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    jobApplication: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    badge: {
      findUnique: vi.fn(),
    },
    userBadge: {
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fns: unknown) => {
      if (Array.isArray(fns)) {
        return Promise.all(fns);
      }
      return (fns as (tx: unknown) => unknown)({});
    }),
  },
}));

const aiMocks = vi.hoisted(() => {
  const extractJobDetails = vi.fn();
  return {
    extractJobDetails,
    createProvider: vi.fn(() => ({ extractJobDetails })),
  };
});

vi.mock("../../../../app/lib/ai", () => aiMocks);

import { prisma } from "../../../../app/lib/prisma";
import { jobsService } from "../jobs.service";

const mockPrisma = vi.mocked(prisma);

const ownerId = "user-owner";
const strangerId = "user-stranger";
const adminId = "admin-001";
const jobId = "job-001";

const ownerJob = { id: jobId, title: "SDE", postedById: ownerId };
const otherJob = { id: jobId, title: "SDE", postedById: strangerId };

beforeEach(() => {
  vi.clearAllMocks();
  aiMocks.extractJobDetails.mockResolvedValue({
    title: "",
    company: "",
    description: "",
    employmentType: null,
    location: "",
    salaryRange: "",
    deadline: null,
    department: null,
    applicationUrl: "",
  });
});

// ─── createJob ──────────────────────────────────────────────────────

describe("createJob", () => {
  it("creates a job post with defaults for omitted fields", async () => {
    mockPrisma.jobPost.create.mockResolvedValue({ id: jobId } as never);

    const result = await jobsService.createJob(
      { title: "SDE", company: "Acme", employmentType: "FULL_TIME" },
      ownerId,
    );

    expect(result.id).toBe(jobId);
    expect(mockPrisma.jobPost.create).toHaveBeenCalledWith({
      data: {
        title: "SDE",
        company: "Acme",
        description: null,
        employmentType: "FULL_TIME",
        location: null,
        salaryRange: null,
        applicationUrl: null,
        deadline: null,
        department: null,
        source: undefined,
        sourceUrl: null,
        postedById: ownerId,
      },
      include: expect.any(Object),
    });
  });

  it("passes through source and sourceUrl when provided", async () => {
    mockPrisma.jobPost.create.mockResolvedValue({ id: jobId } as never);

    await jobsService.createJob(
      {
        title: "SDE",
        company: "Acme",
        employmentType: "FULL_TIME",
        source: "LINKEDIN",
        sourceUrl: "https://www.linkedin.com/jobs/view/123",
      },
      ownerId,
    );

    expect(mockPrisma.jobPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "LINKEDIN",
          sourceUrl: "https://www.linkedin.com/jobs/view/123",
        }),
      }),
    );
  });
});

// ─── importJob ─────────────────────────────────────────────────────

describe("importJob", () => {
  it("extracts a draft from raw description text", async () => {
    aiMocks.extractJobDetails.mockResolvedValue({
      title: "Software Engineer",
      company: "Acme",
      description: "Build great things with a great team.",
      employmentType: "FULL_TIME",
      location: "Dhaka",
      salaryRange: "৳40,000 - ৳60,000",
      deadline: null,
      department: null,
      applicationUrl: "https://acme.test/careers",
    });

    const result = await jobsService.importJob({
      input: "Software Engineer at Acme, Dhaka. Full-time.",
    });

    expect(result.title).toBe("Software Engineer");
    expect(result.company).toBe("Acme");
    expect(result.description).toContain("Build great things");
    expect(result.employmentType).toBe("FULL_TIME");
    expect(result.location).toBe("Dhaka");
    expect(result.salaryRange).toBe("৳40,000 - ৳60,000");
    expect(result.applicationUrl).toBe("https://acme.test/careers");
    expect(result.source).toBeNull();
    expect(result.sourceUrl).toBeNull();
    expect(aiMocks.extractJobDetails).toHaveBeenCalledWith(
      "Software Engineer at Acme, Dhaka. Full-time.",
    );
  });
});

// ─── updateJob / deleteJob ownership ────────────────────────────────

describe("updateJob ownership", () => {
  it("allows the poster to update their own job", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(ownerJob as never);
    mockPrisma.jobPost.update.mockResolvedValue({ id: jobId } as never);

    const result = await jobsService.updateJob(
      jobId,
      { title: "Senior SDE" },
      ownerId,
      "ALUMNI",
    );

    expect(result.id).toBe(jobId);
    expect(mockPrisma.jobPost.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: jobId },
        data: expect.objectContaining({ title: "Senior SDE" }),
      }),
    );
  });

  it("forbids a non-owner from updating the job", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(ownerJob as never);

    await expect(
      jobsService.updateJob(jobId, { title: "Hacked" }, strangerId, "STUDENT"),
    ).rejects.toThrow("You can only update jobs you posted.");
  });

  it("allows an admin to update any job", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(otherJob as never);
    mockPrisma.jobPost.update.mockResolvedValue({ id: jobId } as never);

    const result = await jobsService.updateJob(
      jobId,
      { status: "CLOSED" },
      adminId,
      "ADMIN",
    );

    expect(result.id).toBe(jobId);
  });

  it("throws NOT_FOUND when the job does not exist", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(null);

    await expect(
      jobsService.updateJob(jobId, { title: "X" }, ownerId, "ALUMNI"),
    ).rejects.toThrow("Job post not found.");
  });
});

describe("deleteJob ownership", () => {
  it("allows the poster to delete their own job", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(ownerJob as never);
    mockPrisma.jobPost.delete.mockResolvedValue({} as never);

    const result = await jobsService.deleteJob(jobId, ownerId, "ALUMNI");

    expect(result).toEqual({ message: "Job post deleted successfully." });
    expect(mockPrisma.jobPost.delete).toHaveBeenCalledWith({
      where: { id: jobId },
    });
  });

  it("forbids a non-owner from deleting the job", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(ownerJob as never);

    await expect(
      jobsService.deleteJob(jobId, strangerId, "STUDENT"),
    ).rejects.toThrow("You can only delete jobs you posted.");
    expect(mockPrisma.jobPost.delete).not.toHaveBeenCalled();
  });

  it("allows an admin to delete any job", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(otherJob as never);
    mockPrisma.jobPost.delete.mockResolvedValue({} as never);

    const result = await jobsService.deleteJob(jobId, adminId, "ADMIN");

    expect(result.message).toBe("Job post deleted successfully.");
  });
});

// ─── applyToJob ─────────────────────────────────────────────────────

describe("applyToJob", () => {
  const openJob = {
    id: jobId,
    title: "SDE",
    company: "Acme",
    status: "OPEN",
    postedById: ownerId,
  };

  it("throws NOT_FOUND when the job does not exist", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(null);

    await expect(
      jobsService.applyToJob(jobId, strangerId, { coverLetter: "Hi" }),
    ).rejects.toThrow("Job post not found.");
  });

  it("rejects applications for closed jobs", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue({
      ...openJob,
      status: "CLOSED",
    } as never);

    await expect(
      jobsService.applyToJob(jobId, strangerId, {}),
    ).rejects.toThrow("This job post is not open for applications.");
  });

  it("blocks the poster from applying to their own job", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(openJob as never);

    await expect(
      jobsService.applyToJob(jobId, ownerId, {}),
    ).rejects.toThrow("You cannot apply to your own job post.");
  });

  it("blocks duplicate applications", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(openJob as never);
    mockPrisma.jobApplication.findUnique.mockResolvedValue({
      id: "app-1",
    } as never);

    await expect(
      jobsService.applyToJob(jobId, strangerId, {}),
    ).rejects.toThrow("You have already applied to this job.");
  });

  it("creates an application and notifies the poster", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(openJob as never);
    mockPrisma.jobApplication.findUnique.mockResolvedValue(null);
    mockPrisma.jobApplication.create.mockResolvedValue({
      id: "app-1",
      applicant: { id: strangerId, name: "Bob", image: null },
    } as never);
    mockPrisma.notification.create.mockResolvedValue({} as never);

    const result = await jobsService.applyToJob(jobId, strangerId, {
      coverLetter: "Hi",
      resumeUrl: "https://resume.test/bob.pdf",
    });

    expect(result.id).toBe("app-1");
    expect(mockPrisma.jobApplication.create).toHaveBeenCalledWith({
      data: {
        jobPostId: jobId,
        applicantId: strangerId,
        coverLetter: "Hi",
        resumeUrl: "https://resume.test/bob.pdf",
      },
      include: expect.any(Object),
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: ownerId,
          senderId: strangerId,
          type: "JOB_APPLICATION_RECEIVED",
        }),
      }),
    );
  });
});

// ─── listApplications ownership ─────────────────────────────────────

describe("listApplications ownership", () => {
  it("allows the poster to view applications", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(ownerJob as never);
    mockPrisma.jobApplication.findMany.mockResolvedValue([] as never);

    const result = await jobsService.listApplications(jobId, ownerId, "ALUMNI");

    expect(result.job.id).toBe(jobId);
    expect(result.data).toEqual([]);
  });

  it("allows an admin to view applications", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(otherJob as never);
    mockPrisma.jobApplication.findMany.mockResolvedValue([] as never);

    const result = await jobsService.listApplications(jobId, adminId, "ADMIN");

    expect(result.job.id).toBe(jobId);
  });

  it("forbids a non-owner from viewing applications", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(ownerJob as never);

    await expect(
      jobsService.listApplications(jobId, strangerId, "STUDENT"),
    ).rejects.toThrow("You can only view applications for jobs you posted.");
  });

  it("throws NOT_FOUND when the job does not exist", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(null);

    await expect(
      jobsService.listApplications(jobId, ownerId, "ALUMNI"),
    ).rejects.toThrow("Job post not found.");
  });
});

// ─── updateApplicationStatus ownership ──────────────────────────────

describe("updateApplicationStatus ownership", () => {
  it("allows the poster to accept an application and notifies the applicant", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(ownerJob as never);
    mockPrisma.jobApplication.findUnique.mockResolvedValue({
      id: "app-1",
      jobPostId: jobId,
      applicantId: strangerId,
    } as never);
    mockPrisma.jobApplication.update.mockResolvedValue({ id: "app-1" } as never);
    mockPrisma.notification.create.mockResolvedValue({} as never);

    const result = await jobsService.updateApplicationStatus(
      jobId,
      "app-1",
      ownerId,
      "ALUMNI",
      { status: "ACCEPTED" },
    );

    expect(result.id).toBe("app-1");
    expect(mockPrisma.jobApplication.update).toHaveBeenCalledWith({
      where: { id: "app-1" },
      data: { status: "ACCEPTED" },
      include: expect.any(Object),
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: strangerId,
          senderId: ownerId,
          type: "JOB_APPLICATION_UPDATED",
        }),
      }),
    );
  });

  it("forbids a non-owner from updating application status", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(ownerJob as never);

    await expect(
      jobsService.updateApplicationStatus(
        jobId,
        "app-1",
        strangerId,
        "STUDENT",
        { status: "REJECTED" },
      ),
    ).rejects.toThrow("You can only manage applications for jobs you posted.");
  });

  it("throws NOT_FOUND when the application does not belong to the job", async () => {
    mockPrisma.jobPost.findUnique.mockResolvedValue(ownerJob as never);
    mockPrisma.jobApplication.findUnique.mockResolvedValue({
      id: "app-1",
      jobPostId: "other-job",
      applicantId: strangerId,
    } as never);

    await expect(
      jobsService.updateApplicationStatus(jobId, "app-1", ownerId, "ALUMNI", {
        status: "REJECTED",
      }),
    ).rejects.toThrow("Job application not found.");
  });
});
