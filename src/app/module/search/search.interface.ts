export type SearchEntity =
  | "people"
  | "resources"
  | "discussions"
  | "questions"
  | "teams"
  | "events"
  | "courses"
  | "jobs"
  | "mentorship";

export type SearchEntityFilter = "all" | SearchEntity;

export interface SearchFilters {
  department?: string;
  categoryId?: string;
  courseId?: string;
}

export interface SearchQuery {
  q: string;
  entity: SearchEntityFilter;
  page: number;
  limit: number;
  filters: SearchFilters;
}

export interface NormalizedSearchResult {
  id: string;
  title: string | null;
  subtitle: string | null;
  snippet: string | null;
  url: string | null;
  rank: number;
  type: SearchEntity;
  createdAt: string | null;
  data: Record<string, unknown>;
}

export interface SearchGroupResponse {
  items: NormalizedSearchResult[];
  total: number;
}

export interface SearchMeta {
  total: number;
  bestMatch: NormalizedSearchResult | null;
}

export interface SearchResponse {
  query: string;
  data: Record<SearchEntity, SearchGroupResponse>;
  meta: SearchMeta;
}

export interface SearchClickInput {
  query: string;
  entity: SearchEntity;
  resultId?: string;
  position?: number;
}
