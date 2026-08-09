import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    tag: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { tagService } from "../tag.service";
import { prisma } from "../../../../app/lib/prisma";

const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tagService", () => {
  describe("listTags", () => {
    it("returns tags with summed usage counts", async () => {
      mockPrisma.tag.findMany.mockResolvedValue([
        {
          id: "tag-1",
          name: "JavaScript",
          slug: "javascript",
          createdAt: new Date("2025-01-01"),
          _count: {
            resourceTags: 2,
            discussionTags: 3,
            questionTags: 1,
            teamRequestSkills: 0,
            userSkills: 4,
          },
        },
      ] as never);

      const result = await tagService.listTags();

      expect(result).toEqual([
        {
          id: "tag-1",
          name: "JavaScript",
          slug: "javascript",
          createdAt: expect.any(Date),
          totalCount: 10,
        },
      ]);
      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: "asc" } }),
      );
    });

    it("returns an empty array when no tags exist", async () => {
      mockPrisma.tag.findMany.mockResolvedValue([] as never);

      const result = await tagService.listTags();

      expect(result).toEqual([]);
    });

    it("passes a case-insensitive search filter", async () => {
      mockPrisma.tag.findMany.mockResolvedValue([] as never);

      await tagService.listTags("react");

      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: { contains: "react", mode: "insensitive" } },
        }),
      );
    });
  });

  describe("createTag", () => {
    it("creates a tag with a slugified name", async () => {
      mockPrisma.tag.upsert.mockResolvedValue({
        id: "tag-1",
        name: "Machine Learning",
        slug: "machine-learning",
      } as never);

      const result = await tagService.createTag("Machine Learning");

      expect(mockPrisma.tag.upsert).toHaveBeenCalledWith({
        where: { slug: "machine-learning" },
        update: {},
        create: { name: "Machine Learning", slug: "machine-learning" },
      });
      expect(result.slug).toBe("machine-learning");
    });

    it("returns the existing tag when slug already exists", async () => {
      mockPrisma.tag.upsert.mockResolvedValue({
        id: "existing",
        name: "React",
        slug: "react",
      } as never);

      const result = await tagService.createTag("React");

      expect(result.id).toBe("existing");
      expect(mockPrisma.tag.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe("createTags", () => {
    it("creates multiple tags and trims names", async () => {
      mockPrisma.tag.upsert.mockImplementation(async (args: any) => ({
        id: args.create.name,
        name: args.create.name,
        slug: args.create.slug,
      }));

      const result = await tagService.createTags(["React ", "Node.js"]);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("React");
      expect(mockPrisma.tag.upsert).toHaveBeenCalledTimes(2);
    });

    it("returns an empty array when given no names", async () => {
      const result = await tagService.createTags([]);

      expect(result).toEqual([]);
      expect(mockPrisma.tag.upsert).not.toHaveBeenCalled();
    });
  });
});
