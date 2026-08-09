import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  searchAnalytics: { create: vi.fn() },
  searchClick: { create: vi.fn() },
  $queryRawUnsafe: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({ prisma: mockPrisma }));

import { prisma } from "../../lib/prisma";
import { searchService } from "./search.service";
import { ALL_SEARCH_ENTITIES } from "./search.service";

const viewerWithScoping = {
  id: "viewer-1",
  student: { department: "CSE" },
  profile: { batchYear: 2022 },
};

const courseRow = (id: string, rank: number) => ({
  id,
  title: `Course ${id}`,
  snippet: null,
  subtitle: "CSE101",
  rank,
  createdAt: "2024-01-01T00:00:00.000Z",
  code: "CSE101",
  department: "CSE",
});

const setRaw = (
  selectRows: unknown[],
  count: number | ((sql: string) => number) = selectRows.length,
) => {
  vi.mocked(prisma.$queryRawUnsafe).mockImplementation(
    async (sql: string): Promise<unknown[]> =>
      sql.includes("COUNT(*)")
        ? [{ count: typeof count === "function" ? count(String(sql)) : count }]
        : selectRows,
  );
};

const rawSelectCalls = () =>
  vi
    .mocked(prisma.$queryRawUnsafe)
    .mock.calls.map(([sql]) => String(sql))
    .filter((sql) => !sql.includes("COUNT(*)"));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(
    viewerWithScoping as never,
  );
  vi.mocked(prisma.searchAnalytics.create).mockResolvedValue(
    { id: "a" } as never,
  );
  vi.mocked(prisma.searchClick.create).mockResolvedValue({ id: "c" } as never);
});

describe("searchService.search", () => {
  it("returns the grouped response shape with every entity key", async () => {
    setRaw([courseRow("c1", 0.5)], (sql) => (sql.includes('FROM "course"') ? 1 : 0));

    const result = await searchService.search("viewer-1", "database", "all", 1, 5, {});

    expect(Object.keys(result.data).sort()).toEqual([...ALL_SEARCH_ENTITIES].sort());
    expect(result.data.courses.items).toHaveLength(1);
    expect(result.data.courses.total).toBe(1);
    expect(result.meta.total).toBe(1);
  });

  it("returns an empty no-results shape", async () => {
    setRaw([], 0);

    const result = await searchService.search("viewer-1", "zzzzz", "all", 1, 5, {});

    for (const entity of ALL_SEARCH_ENTITIES) {
      expect(result.data[entity].items).toEqual([]);
      expect(result.data[entity].total).toBe(0);
    }
    expect(result.meta.total).toBe(0);
    expect(result.meta.bestMatch).toBeNull();
    expect(prisma.searchAnalytics.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ zeroResult: true }) }),
    );
  });

  it("selects the highest-ranked result as bestMatch", async () => {
    setRaw([courseRow("c1", 0.8), courseRow("c2", 0.5)], 2);

    const result = await searchService.search("viewer-1", "database", "courses", 1, 5, {});
    expect(result.meta.bestMatch?.id).toBe("c1");
  });

  it("does not pick a zero-rank result as bestMatch", async () => {
    setRaw([courseRow("c1", 0), courseRow("c2", 0)], 2);

    const result = await searchService.search("viewer-1", "database", "courses", 1, 5, {});
    expect(result.meta.bestMatch).toBeNull();
  });

  it("only queries the requested entity when scoped", async () => {
    setRaw([courseRow("c1", 0.5)], 2);

    const result = await searchService.search("viewer-1", "database", "courses", 1, 5, {});

    expect(result.data.courses.total).toBe(2);
    expect(result.data.resources.total).toBe(0);
    const selectSqls = rawSelectCalls();
    expect(selectSqls).toHaveLength(1);
    expect(selectSqls[0]).toContain('FROM "course"');
  });

  it("applies people scoping (self, blocked, searchableProfile, alumni directory)", async () => {
    setRaw([], 0);

    await searchService.search("viewer-1", "ali", "people", 1, 5, {});

    const sql = rawSelectCalls()[0];
    expect(sql).toContain("FROM \"user\" u");
    expect(sql).toContain('u."id" <>');
    expect(sql).toContain('"blocked_users" bu');
    expect(sql).toContain('us."searchableProfile" IS NULL OR us."searchableProfile" = true');
    expect(sql).toContain('"showInAlumniDirectory"');
    expect(sql).toContain('s."id" IS NOT NULL');
    expect(sql).toContain('u."name" %');
    expect(sql).toContain("word_similarity");
  });

  it("adds department/batch visibility clauses when the viewer has them", async () => {
    setRaw([], 0);

    await searchService.search("viewer-1", "networking", "discussions", 1, 5, {});

    const sql = rawSelectCalls()[0];
    expect(sql).toContain("d.\"visibility\" = 'PUBLIC'");
    expect(sql).toContain("'DEPARTMENT'");
    expect(sql).toContain('astu."department"::text');
    expect(sql).toContain("'BATCH'");
    expect(sql).toContain('aup."batchYear"');
  });

  it("only exposes PUBLIC discussions when the viewer has no scope", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { id: "viewer-1", student: null, profile: null } as never,
    );
    setRaw([], 0);

    await searchService.search("viewer-1", "networking", "discussions", 1, 5, {});

    const sql = rawSelectCalls()[0];
    expect(sql).toContain("d.\"visibility\" = 'PUBLIC'");
    expect(sql).not.toContain("'DEPARTMENT'");
    expect(sql).not.toContain("'BATCH'");
  });

  it("includes pg_trgm typo fallback + ranked-below-FTS similarity for prose entities", async () => {
    setRaw([], 0);

    await searchService.search("viewer-1", "indexng", "resources", 1, 5, {});

    const sql = rawSelectCalls()[0];
    expect(sql).toContain('ILIKE \'%\' ||');
    expect(sql).toContain("similarity(COALESCE(\"title\"");
    expect(sql).toContain("* 0.5");
    expect(sql).toContain("websearch_to_tsquery");
  });

  it("never inlines the raw query into SQL (parameterized)", async () => {
    const malicious = "database'; DROP TABLE course; --";
    setRaw([], 0);

    await searchService.search("viewer-1", malicious, "courses", 1, 5, {});

    const selectSql = rawSelectCalls()[0];
    expect(selectSql).not.toContain(malicious);
    expect(selectSql).not.toContain("DROP TABLE");
  });

  it("records analytics best-effort even when logging fails", async () => {
    setRaw([courseRow("c1", 0.5)], 1);
    vi.mocked(prisma.searchAnalytics.create).mockRejectedValueOnce(new Error("db down"));

    await expect(
      searchService.search("viewer-1", "database", "courses", 1, 5, {}),
    ).resolves.toMatchObject({
      meta: { total: 1 },
      data: { courses: { total: 1 } },
    });
  });
});

describe("searchService.recordClick", () => {
  it("persists a click with query, entity, result and position", async () => {
    await searchService.recordClick("viewer-1", {
      query: "database",
      entity: "courses",
      resultId: "c1",
      position: 2,
    });

    expect(prisma.searchClick.create).toHaveBeenCalledWith({
      data: {
        userId: "viewer-1",
        query: "database",
        entity: "courses",
        resultId: "c1",
        position: 2,
      },
    });
  });
});
