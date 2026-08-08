import { prisma } from "../../lib/prisma";
import {
  NormalizedSearchResult,
  SearchClickInput,
  SearchEntity,
  SearchEntityFilter,
  SearchFilters,
  SearchGroupResponse,
  SearchResponse,
} from "./search.interface";

interface DataColumn {
  sql: string;
  key: string;
}

interface FilterColumn {
  key: keyof SearchFilters;
  column: string;
}

interface ViewerContext {
  id: string;
  student: { department: string } | null;
  profile: { batchYear: number } | null;
}

class SqlParams {
  values: unknown[] = [];

  add(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

interface QueryContext {
  q: string;
  tsq: string;
  qp: string;
  viewer: ViewerContext;
  params: SqlParams;
}

interface EntityConfig {
  entity: SearchEntity;
  from: string;
  idColumn: string;
  createdAtColumn: string;
  searchTsvColumn: string | null;
  titleColumn: string;
  headlineColumn: string | null;
  plainSnippetColumn: string | null;
  subtitleColumn: string | null;
  dataColumns: DataColumn[];
  baseConditions: string[];
  filterColumns: FilterColumn[];
  matchSql?: (ctx: QueryContext) => string;
  rankSql?: (ctx: QueryContext) => string;
  scopedConditions?: (ctx: QueryContext) => string[];
  url: (row: Row) => string | null;
}

type Row = Record<string, unknown>;

const tsMatch = (ctx: QueryContext, config: EntityConfig) =>
  `${config.searchTsvColumn} @@ ${ctx.tsq}`;

const fallbackMatch = (ctx: QueryContext, config: EntityConfig) =>
  `${config.titleColumn} ILIKE '%' || ${ctx.qp} || '%'`;

const tsRank = (ctx: QueryContext, config: EntityConfig) =>
  `CASE
    WHEN ${config.searchTsvColumn} @@ ${ctx.tsq}
      THEN ts_rank_cd(${config.searchTsvColumn}, ${ctx.tsq}, 32)
    ELSE similarity(COALESCE(${config.titleColumn}, ''), ${ctx.qp}) * 0.5
  END`;

const peopleMatch = (ctx: QueryContext) =>
  `(u."name" ILIKE '%' || ${ctx.qp} || '%'
    OR u."name" % ${ctx.qp}
    OR up."bio" ILIKE '%' || ${ctx.qp} || '%'
    OR s."degreeTitle" ILIKE '%' || ${ctx.qp} || '%')`;

const peopleRank = (ctx: QueryContext) =>
  `GREATEST(word_similarity(u."name", ${ctx.qp}), similarity(u."name", ${ctx.qp}))`;

const peopleScoping = (ctx: QueryContext): string[] => {
  const p = ctx.params;
  return [
    `u."id" <> ${p.add(ctx.viewer.id)}`,
    `NOT EXISTS (
      SELECT 1 FROM "blocked_users" bu
      WHERE bu."blockerId" = u."id" AND bu."blockedId" = ${p.add(ctx.viewer.id)}
    )`,
    `NOT EXISTS (
      SELECT 1 FROM "blocked_users" bu
      WHERE bu."blockerId" = ${p.add(ctx.viewer.id)} AND bu."blockedId" = u."id"
    )`,
    `(us."searchableProfile" IS NULL OR us."searchableProfile" = true)`,
    `(s."academicStatus" IS NULL OR s."academicStatus" != 'GRADUATED' OR up."showInAlumniDirectory" = true)`,
  ];
};

const discussionVisibility = (ctx: QueryContext): string[] => {
  const conditions = [`d."visibility" = 'PUBLIC'`];
  if (ctx.viewer.student) {
    conditions.push(
      `(d."visibility" = 'DEPARTMENT' AND astu."department"::text = ${ctx.params.add(ctx.viewer.student.department)}::text)`,
    );
  }
  if (ctx.viewer.profile) {
    conditions.push(
      `(d."visibility" = 'BATCH' AND aup."batchYear" = ${ctx.params.add(ctx.viewer.profile.batchYear)})`,
    );
  }
  return [`(${conditions.join(" OR ")})`];
};

const ENTITY_CONFIGS: Record<SearchEntity, EntityConfig> = {
  people: {
    entity: "people",
    from: `"user" u
      LEFT JOIN "user_profiles" up ON up."userId" = u."id"
      LEFT JOIN "student" s ON s."userId" = u."id"
      LEFT JOIN "user_settings" us ON us."userId" = u."id"`,
    idColumn: 'u."id"',
    createdAtColumn: 'u."createdAt"',
    searchTsvColumn: null,
    titleColumn: 'u."name"',
    headlineColumn: null,
    plainSnippetColumn: 'up."bio"',
    subtitleColumn: `CASE
      WHEN s."department" IS NOT NULL
        THEN s."department"::text || ' · ' || s."admissionYear"::text
      ELSE NULL
    END`,
    dataColumns: [
      { sql: 'u."email"', key: "email" },
      { sql: 'u."image"', key: "image" },
      { sql: 'u."role"', key: "role" },
      { sql: 's."department"', key: "department" },
      { sql: 's."admissionYear"', key: "admissionYear" },
      { sql: 's."academicStatus"', key: "academicStatus" },
    ],
    baseConditions: [
      'u."isDeleted" = false',
      `u."status" = 'ACTIVE'`,
      'u."isDeactivated" = false',
      's."id" IS NOT NULL',
    ],
    filterColumns: [{ key: "department", column: 's."department"::text' }],
    matchSql: peopleMatch,
    rankSql: peopleRank,
    scopedConditions: peopleScoping,
    url: (row) => `/profile/${String(row.id)}`,
  },
  resources: {
    entity: "resources",
    from: '"resource"',
    idColumn: '"id"',
    createdAtColumn: '"createdAt"',
    searchTsvColumn: '"searchTsv"',
    titleColumn: '"title"',
    headlineColumn: '"description"',
    plainSnippetColumn: null,
    subtitleColumn: '"fileType"',
    dataColumns: [
      { sql: '"fileType"', key: "fileType" },
      { sql: '"categoryId"', key: "categoryId" },
      { sql: '"courseId"', key: "courseId" },
    ],
    baseConditions: ['"isDeleted" = false'],
    filterColumns: [
      { key: "categoryId", column: '"categoryId"' },
      { key: "courseId", column: '"courseId"' },
    ],
    url: (row) => `/resources/${String(row.id)}`,
  },
  discussions: {
    entity: "discussions",
    from: `"discussion" d
      LEFT JOIN "user" au ON au."id" = d."authorId"
      LEFT JOIN "student" astu ON astu."userId" = au."id"
      LEFT JOIN "user_profiles" aup ON aup."userId" = au."id"`,
    idColumn: 'd."id"',
    createdAtColumn: 'd."createdAt"',
    searchTsvColumn: 'd."searchTsv"',
    titleColumn: 'd."title"',
    headlineColumn: 'd."content"',
    plainSnippetColumn: null,
    subtitleColumn: null,
    dataColumns: [
      { sql: 'd."categoryId"', key: "categoryId" },
      { sql: 'd."replyCount"', key: "replyCount" },
      { sql: 'd."upvoteCount"', key: "upvoteCount" },
      { sql: 'd."isSolved"', key: "isSolved" },
      { sql: 'au."name"', key: "authorName" },
      { sql: 'au."image"', key: "authorImage" },
    ],
    baseConditions: ['d."isDeleted" = false'],
    filterColumns: [{ key: "categoryId", column: 'd."categoryId"' }],
    scopedConditions: discussionVisibility,
    url: (row) => `/discussions/${String(row.id)}`,
  },
  questions: {
    entity: "questions",
    from: '"question"',
    idColumn: '"id"',
    createdAtColumn: '"createdAt"',
    searchTsvColumn: '"searchTsv"',
    titleColumn: '"title"',
    headlineColumn: '"content"',
    plainSnippetColumn: null,
    subtitleColumn: null,
    dataColumns: [
      { sql: '"categoryId"', key: "categoryId" },
      { sql: '"answerCount"', key: "answerCount" },
      { sql: '"upvoteCount"', key: "upvoteCount" },
      { sql: '"isAnswered"', key: "isAnswered" },
    ],
    baseConditions: ['"isDeleted" = false'],
    filterColumns: [{ key: "categoryId", column: '"categoryId"' }],
    url: (row) => `/qa/${String(row.id)}`,
  },
  teams: {
    entity: "teams",
    from: `"team_requests" t
      LEFT JOIN "user" tcu ON tcu."id" = t."creatorId"
      LEFT JOIN "student" tcs ON tcs."userId" = tcu."id"`,
    idColumn: 't."id"',
    createdAtColumn: 't."createdAt"',
    searchTsvColumn: 't."searchTsv"',
    titleColumn: 't."title"',
    headlineColumn: 't."description"',
    plainSnippetColumn: null,
    subtitleColumn: 't."projectName"',
    dataColumns: [
      { sql: 't."projectName"', key: "projectName" },
      { sql: 't."status"', key: "status" },
      { sql: 't."difficulty"', key: "difficulty" },
      { sql: 't."lookingForCount"', key: "lookingForCount" },
      { sql: 't."currentMemberCount"', key: "currentMemberCount" },
    ],
    baseConditions: ['t."isDeleted" = false', `t."status" != 'CLOSED'`],
    filterColumns: [{ key: "department", column: 'tcs."department"::text' }],
    url: (row) => `/teams/${String(row.id)}`,
  },
  events: {
    entity: "events",
    from: `"events" e
      LEFT JOIN "user" eo ON eo."id" = e."organizerId"
      LEFT JOIN "student" eos ON eos."userId" = eo."id"`,
    idColumn: 'e."id"',
    createdAtColumn: 'e."createdAt"',
    searchTsvColumn: 'e."searchTsv"',
    titleColumn: 'e."title"',
    headlineColumn: 'e."description"',
    plainSnippetColumn: null,
    subtitleColumn: 'e."status"',
    dataColumns: [
      { sql: 'e."status"', key: "status" },
      { sql: 'e."eventDate"', key: "eventDate" },
      { sql: 'e."location"', key: "location" },
    ],
    baseConditions: [`e."status" != 'CANCELLED'`],
    filterColumns: [{ key: "department", column: 'eos."department"::text' }],
    url: (row) => `/events/${String(row.id)}`,
  },
  courses: {
    entity: "courses",
    from: '"course"',
    idColumn: '"id"',
    createdAtColumn: '"createdAt"',
    searchTsvColumn: '"searchTsv"',
    titleColumn: '"name"',
    headlineColumn: '"description"',
    plainSnippetColumn: null,
    subtitleColumn: '"code"',
    dataColumns: [
      { sql: '"code"', key: "code" },
      { sql: '"department"', key: "department" },
    ],
    baseConditions: [],
    filterColumns: [{ key: "department", column: '"department"::text' }],
    url: (row) => `/courses/${String(row.id)}`,
  },
  jobs: {
    entity: "jobs",
    from: '"job_posts"',
    idColumn: '"id"',
    createdAtColumn: '"createdAt"',
    searchTsvColumn: '"searchTsv"',
    titleColumn: '"title"',
    headlineColumn: '"description"',
    plainSnippetColumn: null,
    subtitleColumn: '"company"',
    dataColumns: [
      { sql: '"company"', key: "company" },
      { sql: '"employmentType"', key: "employmentType" },
      { sql: '"location"', key: "location" },
      { sql: '"salaryRange"', key: "salaryRange" },
    ],
    baseConditions: [`"status" = 'OPEN'`],
    filterColumns: [{ key: "department", column: '"department"::text' }],
    url: (row) => `/jobs/${String(row.id)}`,
  },
  mentorship: {
    entity: "mentorship",
    from: `"user_profiles" up
      LEFT JOIN "user" mup ON mup."id" = up."userId"
      LEFT JOIN "user_settings" us ON us."userId" = up."userId"`,
    idColumn: 'up."id"',
    createdAtColumn: 'up."createdAt"',
    searchTsvColumn: 'up."searchTsv"',
    titleColumn: 'up."mentorHeadline"',
    headlineColumn: 'up."mentorBio"',
    plainSnippetColumn: null,
    subtitleColumn: 'up."jobTitle"',
    dataColumns: [
      { sql: 'up."jobTitle"', key: "jobTitle" },
      { sql: 'up."currentEmployer"', key: "currentEmployer" },
      { sql: 'up."mentorshipTopics"', key: "mentorshipTopics" },
      { sql: 'up."userId"', key: "userId" },
    ],
    baseConditions: [
      'up."isMentor" = true',
      'mup."isDeleted" = false',
      `mup."status" = 'ACTIVE'`,
      'mup."isDeactivated" = false',
      `(us."searchableProfile" IS NULL OR us."searchableProfile" = true)`,
    ],
    filterColumns: [],
    url: (row) => `/profile/${String(row.userId ?? row.id)}`,
  },
};

export const ALL_SEARCH_ENTITIES = Object.keys(ENTITY_CONFIGS) as SearchEntity[];

const buildWhere = (
  config: EntityConfig,
  ctx: QueryContext,
  filters: SearchFilters,
): string => {
  const clauses: string[] = [];
  clauses.push(
    config.matchSql
      ? config.matchSql(ctx)
      : `(${tsMatch(ctx, config)} OR ${fallbackMatch(ctx, config)})`,
  );
  clauses.push(...config.baseConditions);

  for (const fc of config.filterColumns) {
    const p = ctx.params.add(filters[fc.key] ?? null);
    clauses.push(`(${p}::text IS NULL OR ${fc.column} = ${p})`);
  }

  if (config.scopedConditions) {
    clauses.push(...config.scopedConditions(ctx));
  }

  return `WHERE ${clauses.join("\n  AND ")}`;
};

const buildSelect = (
  config: EntityConfig,
  ctx: QueryContext,
  where: string,
  limit: number,
  offset: number,
): string => {
  const rank = config.rankSql ? config.rankSql(ctx) : tsRank(ctx, config);
  const snippetExpr =
    config.searchTsvColumn && config.headlineColumn
      ? `ts_headline('english', ${config.headlineColumn}, ${ctx.tsq}, 'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=15')`
      : (config.plainSnippetColumn ?? "NULL");
  const dataSelect = config.dataColumns.length
    ? `,\n  ${config.dataColumns.map((d) => d.sql).join(",\n  ")}`
    : "";

  return `
SELECT
  ${config.idColumn} AS "id",
  ${config.titleColumn} AS "title",
  ${snippetExpr} AS "snippet",
  ${config.subtitleColumn ?? "NULL"} AS "subtitle",
  ${rank} AS "rank",
  ${config.createdAtColumn} AS "createdAt"${dataSelect}
FROM ${config.from}
${where}
ORDER BY "rank" DESC, "createdAt" DESC
LIMIT ${ctx.params.add(limit)} OFFSET ${ctx.params.add(offset)}`;
};

const buildCount = (config: EntityConfig, where: string): string =>
  `SELECT COUNT(*)::int AS "count"\nFROM ${config.from}\n${where}`;

const mapRow = (config: EntityConfig, row: Row): NormalizedSearchResult => ({
  id: String(row.id),
  title: (row.title as string) ?? null,
  subtitle: (row.subtitle as string) ?? null,
  snippet: (row.snippet as string) ?? null,
  url: config.url(row),
  rank: Number(row.rank) || 0,
  type: config.entity,
  createdAt: row.createdAt
    ? new Date(row.createdAt as Date).toISOString()
    : null,
  data: Object.fromEntries(
    config.dataColumns.map((d) => [d.key, row[d.key] ?? null]),
  ),
});

const runEntity = async (
  entity: SearchEntity,
  q: string,
  page: number,
  limit: number,
  filters: SearchFilters,
  viewer: ViewerContext,
): Promise<SearchGroupResponse> => {
  const config = ENTITY_CONFIGS[entity];
  const params = new SqlParams();
  const ctx: QueryContext = {
    q,
    tsq: config.searchTsvColumn
      ? `websearch_to_tsquery('english', ${params.add(q)}::text)`
      : "",
    qp: `${params.add(q)}::text`,
    viewer,
    params,
  };

  const where = buildWhere(config, ctx, filters);
  const whereParams = [...params.values];

  const offset = (page - 1) * limit;
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    buildSelect(config, ctx, where, limit, offset),
    ...params.values,
  );

  const [countRow] = await prisma.$queryRawUnsafe<{ count: number }[]>(
    buildCount(config, where),
    ...whereParams,
  );

  return {
    items: rows.map((row) => mapRow(config, row)),
    total: countRow?.count ?? 0,
  };
};

const recordAnalytics = async (
  userId: string,
  q: string,
  entityTotals: Record<string, number>,
  resultCount: number,
  tookMs: number,
): Promise<void> => {
  try {
    await prisma.searchAnalytics.create({
      data: {
        userId,
        query: q,
        entityTotals,
        resultCount,
        zeroResult: resultCount === 0,
        tookMs,
      },
    });
  } catch (error) {
    console.warn("[search] analytics log skipped:", error);
  }
};

const search = async (
  userId: string,
  q: string,
  entity: SearchEntityFilter,
  page: number,
  limit: number,
  filters: SearchFilters,
): Promise<SearchResponse> => {
  const started = Date.now();

  const viewerRow = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      student: { select: { department: true } },
      profile: { select: { batchYear: true } },
    },
  });

  const viewer: ViewerContext = {
    id: viewerRow?.id ?? userId,
    student: viewerRow?.student?.department
      ? { department: viewerRow.student.department }
      : null,
    profile: viewerRow?.profile?.batchYear
      ? { batchYear: viewerRow.profile.batchYear }
      : null,
  };

  const targets: SearchEntity[] =
    entity === "all" ? [...ALL_SEARCH_ENTITIES] : [entity];

  const groups = await Promise.all(
    targets.map((e) => runEntity(e, q, page, limit, filters, viewer)),
  );

  const data = {} as SearchResponse["data"];
  for (const e of ALL_SEARCH_ENTITIES) {
    data[e] = { items: [], total: 0 };
  }
  targets.forEach((e, i) => {
    data[e] = groups[i];
  });

  const allItems = targets.flatMap((e, i) => groups[i].items);
  const total = targets.reduce((sum, e, i) => sum + groups[i].total, 0);
  const bestMatch =
    allItems
      .filter((item) => item.rank > 0)
      .sort((a, b) => b.rank - a.rank)[0] ?? null;

  const entityTotals = Object.fromEntries(
    targets.map((e, i) => [e, groups[i].total]),
  );

  await recordAnalytics(userId, q, entityTotals, total, Date.now() - started);

  return { query: q, data, meta: { total, bestMatch } };
};

const recordClick = async (userId: string, input: SearchClickInput) => {
  try {
    await prisma.searchClick.create({
      data: {
        userId,
        query: input.query,
        entity: input.entity,
        resultId: input.resultId ?? null,
        position: input.position ?? null,
      },
    });
  } catch (error) {
    console.warn("[search] click log skipped:", error);
  }
};

export const searchService = {
  search,
  recordClick,
};
