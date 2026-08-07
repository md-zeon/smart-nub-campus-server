export type SearchType =
  | "course"
  | "resource"
  | "discussion"
  | "question"
  | "team"
  | "event"
  | "job"
  | "mentor"
  | "user";

export type SearchTypeFilter = "all" | SearchType;

export interface SearchFilters {
  department?: string;
  categoryId?: string;
  courseId?: string;
}

export interface SearchQuery {
  q: string;
  type: SearchTypeFilter;
  page: number;
  limit: number;
  filters: SearchFilters;
}

export interface SearchItem {
  type: SearchType;
  id: string;
  title: string | null;
  snippet: string | null;
  subtitle: string | null;
  rank: number;
  createdAt: string | null;
  data: Record<string, unknown>;
}

export interface EntitySearchResult {
  type: SearchType;
  items: SearchItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GlobalSearchResult {
  query: string;
  total: number;
  facetTotals: Partial<Record<SearchType, number>>;
  items: SearchItem[];
}
