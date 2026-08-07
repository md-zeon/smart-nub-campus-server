import { prisma } from "../../lib/prisma";
import {
  EntitySearchResult,
  GlobalSearchResult,
  SearchFilters,
  SearchItem,
  SearchType,
} from "./search.interface";

interface DataColumn {
  sql: string;
  key: string;
}

interface EntityConfig {
  type: SearchType;
  table: string;
  titleColumn: string;
  snippetColumn: string | null;
  subtitleColumn: string | null;
  dataColumns: DataColumn[];
  baseConditions: string[];
  filterColumns: { key: keyof SearchFilters; column: string }[];
  useTsVector: boolean;
}

const ENTITY_CONFIGS: Record<SearchType, EntityConfig> = {
  course: {
    type: "course",
    table: "course",
    titleColumn: '"name"',
    snippetColumn: '"description"',
    subtitleColumn: '"code"',
    dataColumns: [
      { sql: '"code"', key: "code" },
      { sql: '"department"', key: "department" },
    ],
    baseConditions: [],
    filterColumns: [{ key: "department", column: '"department"::text' }],
    useTsVector: true,
  },
  resource: {
    type: "resource",
    table: "resource",
    titleColumn: '"title"',
    snippetColumn: '"description"',
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
    useTsVector: true,
  },
  discussion: {
    type: "discussion",
    table: "discussion",
    titleColumn: '"title"',
    snippetColumn: '"content"',
    subtitleColumn: null,
    dataColumns: [
      { sql: '"categoryId"', key: "categoryId" },
      { sql: '"replyCount"', key: "replyCount" },
      { sql: '"upvoteCount"', key: "upvoteCount" },
      { sql: '"isSolved"', key: "isSolved" },
    ],
    baseConditions: ['"isDeleted" = false'],
    filterColumns: [{ key: "categoryId", column: '"categoryId"' }],
    useTsVector: true,
  },
  question: {
    type: "question",
    table: "question",
    titleColumn: '"title"',
    snippetColumn: '"content"',
    subtitleColumn: null,
    dataColumns: [
      { sql: '"categoryId"', key: "categoryId" },
      { sql: '"answerCount"', key: "answerCount" },
      { sql: '"upvoteCount"', key: "upvoteCount" },
      { sql: '"isAnswered"', key: "isAnswered" },
    ],
    baseConditions: ['"isDeleted" = false'],
    filterColumns: [{ key: "categoryId", column: '"categoryId"' }],
    useTsVector: true,
  },
  team: {
    type: "team",
    table: "team_requests",
    titleColumn: '"title"',
    snippetColumn: '"description"',
    subtitleColumn: '"projectName"',
    dataColumns: [
      { sql: '"projectName"', key: "projectName" },
      { sql: '"status"', key: "status" },
      { sql: '"difficulty"', key: "difficulty" },
      { sql: '"lookingForCount"', key: "lookingForCount" },
      { sql: '"currentMemberCount"', key: "currentMemberCount" },
    ],
    baseConditions: ['"isDeleted" = false', `"status" != 'CLOSED'`],
    filterColumns: [],
    useTsVector: true,
  },
  event: {
    type: "event",
    table: "events",
    titleColumn: '"title"',
    snippetColumn: '"description"',
    subtitleColumn: '"status"',
    dataColumns: [
      { sql: '"status"', key: "status" },
      { sql: '"eventDate"', key: "eventDate" },
      { sql: '"location"', key: "location" },
    ],
    baseConditions: [`"status" != 'CANCELLED'`],
    filterColumns: [],
    useTsVector: true,
  },
  job: {
    type: "job",
    table: "job_posts",
    titleColumn: '"title"',
    snippetColumn: '"description"',
    subtitleColumn: '"company"',
    dataColumns: [
      { sql: '"company"', key: "company" },
      { sql: '"employmentType"', key: "employmentType" },
      { sql: '"location"', key: "location" },
      { sql: '"salaryRange"', key: "salaryRange" },
    ],
    baseConditions: [`"status" = 'OPEN'`],
    filterColumns: [{ key: "department", column: '"department"::text' }],
    useTsVector: true,
  },
  mentor: {
    type: "mentor",
    table: "user_profiles",
    titleColumn: '"mentorHeadline"',
    snippetColumn: '"mentorBio"',
    subtitleColumn: '"jobTitle"',
    dataColumns: [
      { sql: '"jobTitle"', key: "jobTitle" },
      { sql: '"currentEmployer"', key: "currentEmployer" },
      { sql: '"userId"', key: "userId" },
    ],
    baseConditions: ['"isMentor" = true'],
    filterColumns: [],
    useTsVector: true,
  },
  user: {
    type: "user",
    table: "user",
    titleColumn: '"name"',
    snippetColumn: null,
    subtitleColumn: '"email"',
    dataColumns: [
      { sql: '"image"', key: "image" },
      { sql: '"role"', key: "role" },
    ],
    baseConditions: [
      '"isDeleted" = false',
      `"status" = 'ACTIVE'`,
      '"isDeactivated" = false',
    ],
    filterColumns: [],
    useTsVector: false,
  },
};

export const ALL_SEARCH_TYPES = Object.keys(ENTITY_CONFIGS) as SearchType[];

type RawRow = Record<string, unknown>;

const rankExpr = (config: EntityConfig) =>
  config.useTsVector
    ? `ts_rank("searchTsv", websearch_to_tsquery('english', $1))`
    : `word_similarity("name", $1)`;

const matchExpr = (config: EntityConfig) =>
  config.useTsVector
    ? `"searchTsv" @@ websearch_to_tsquery('english', $1)`
    : `"name" ILIKE '%' || $1 || '%'`;

const buildWhere = (config: EntityConfig): string => {
  const clauses: string[] = [matchExpr(config), ...config.baseConditions];
  config.filterColumns.forEach((fc, index) => {
    const paramIndex = index + 2;
    clauses.push(`($${paramIndex}::text IS NULL OR ${fc.column} = $${paramIndex})`);
  });
  return `WHERE ${clauses.join("\n  AND ")}`;
};

const buildQueryParams = (
  config: EntityConfig,
  q: string,
  filters: SearchFilters,
): unknown[] => {
  const params: unknown[] = [q];
  for (const fc of config.filterColumns) {
    params.push(filters[fc.key] ?? null);
  }
  return params;
};

const buildSelectSql = (config: EntityConfig, where: string): string => {
  const limitIndex = config.filterColumns.length + 2;
  const offsetIndex = limitIndex + 1;
  const dataSelect = config.dataColumns.length
    ? `,\n  ${config.dataColumns.map((d) => d.sql).join(",\n  ")}`
    : "";
  return `
SELECT
  "id",
  ${config.titleColumn} AS "title",
  ${config.snippetColumn ?? "NULL"} AS "snippet",
  ${config.subtitleColumn ?? "NULL"} AS "subtitle",
  ${rankExpr(config)} AS "rank",
  "createdAt" AS "createdAt"${dataSelect}
FROM "${config.table}"
${where}
ORDER BY "rank" DESC, "createdAt" DESC
LIMIT $${limitIndex} OFFSET $${offsetIndex}`;
};

const buildCountSql = (config: EntityConfig, where: string): string => {
  return `
SELECT COUNT(*)::int AS "count"
FROM "${config.table}"
${where}`;
};

const mapRow = (config: EntityConfig, row: RawRow): SearchItem => ({
  type: config.type,
  id: row.id as string,
  title: (row.title as string) ?? null,
  snippet: (row.snippet as string) ?? null,
  subtitle: (row.subtitle as string) ?? null,
  rank: Number(row.rank) || 0,
  createdAt: row.createdAt ? new Date(row.createdAt as Date).toISOString() : null,
  data: Object.fromEntries(
    config.dataColumns.map((d) => [d.key, row[d.key] ?? null]),
  ),
});

const searchEntity = async (
  type: SearchType,
  q: string,
  page: number,
  limit: number,
  filters: SearchFilters,
): Promise<EntitySearchResult> => {
  const config = ENTITY_CONFIGS[type];
  const offset = (page - 1) * limit;
  const where = buildWhere(config);

  const queryParams = buildQueryParams(config, q, filters);
  const rows = await prisma.$queryRawUnsafe<RawRow[]>(
    buildSelectSql(config, where),
    ...queryParams,
    limit,
    offset,
  );

  const [countRow] = await prisma.$queryRawUnsafe<{ count: number }[]>(
    buildCountSql(config, where),
    ...queryParams,
  );

  return {
    type,
    items: rows.map((row) => mapRow(config, row)),
    total: countRow.count,
    page,
    limit,
  };
};

const globalSearch = async (
  q: string,
  page: number,
  limit: number,
  filters: SearchFilters,
): Promise<GlobalSearchResult> => {
  const perTypeLimit = Math.max(limit, 20);
  const results = await Promise.all(
    ALL_SEARCH_TYPES.map((type) => searchEntity(type, q, 1, perTypeLimit, filters)),
  );

  const allItems = results
    .flatMap((r) => r.items)
    .sort((a, b) => b.rank - a.rank);

  const offset = (page - 1) * limit;
  const items = allItems.slice(offset, offset + limit);

  const facetTotals = Object.fromEntries(
    results.map((r) => [r.type, r.total]),
  ) as GlobalSearchResult["facetTotals"];

  return {
    query: q,
    total: results.reduce((sum, r) => sum + r.total, 0),
    facetTotals,
    items,
  };
};

export const searchService = {
  searchEntity,
  globalSearch,
};
