import { DiscussionVisibility, VoteType } from "../../../generated/prisma/enums";

export interface CreateDiscussionInput {
  title: string;
  content: string;
  categoryId: string;
  courseId?: string;
  tagIds?: string[];
  visibility?: DiscussionVisibility;
}

export interface UpdateDiscussionInput {
  title?: string;
  content?: string;
  categoryId?: string;
  courseId?: string;
  tagIds?: string[];
  visibility?: DiscussionVisibility;
}

export interface CreateReplyInput {
  content: string;
  parentId?: string;
}

export interface VoteInput {
  type: VoteType;
}

export interface ListDiscussionsQuery {
  category?: string;
  /** Comma-separated tag slugs (matches discussions having ANY of the tags). */
  tag?: string;
  visibility?: DiscussionVisibility;
  search?: string;
  sort?: "latest" | "popular" | "unanswered";
  page?: number;
  limit?: number;
}
