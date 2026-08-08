import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    course: {
      findUnique: vi.fn(),
    },
  },
}));

import { courseService } from "../course.service";
import { prisma } from "../../../../app/lib/prisma";

const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("courseService.getCourseById", () => {
  it("returns the course with resource/discussion/question counts", async () => {
    const course = {
      id: "course-1",
      code: "CSE 101",
      title: "Programming Fundamentals",
      _count: { resources: 4, discussions: 2, questions: 1 },
    };
    mockPrisma.course.findUnique.mockResolvedValue(course as never);

    const result = await courseService.getCourseById("course-1");

    expect(result).toEqual(course);
    expect(mockPrisma.course.findUnique).toHaveBeenCalledWith({
      where: { id: "course-1" },
      include: {
        _count: {
          select: { resources: true, discussions: true, questions: true },
        },
      },
    });
  });

  it("returns null when the course does not exist", async () => {
    mockPrisma.course.findUnique.mockResolvedValue(null as never);

    const result = await courseService.getCourseById("missing");

    expect(result).toBeNull();
  });
});
