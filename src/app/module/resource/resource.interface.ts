import { ReportReason, ReportStatus } from "../../../generated/prisma/enums";

export interface CreateResourceInput {
  title: string;
  description?: string;
  fileUrl: string;
  filePublicId?: string;
  fileType: string;
  fileSize: number;
  courseId: string;
  categoryId: string;
  tags: string[];
}

export interface UpdateResourceInput {
  title?: string;
  description?: string;
  categoryId?: string;
  tags?: string[];
}

export interface ListResourcesQuery {
  courseId?: string;
  categoryId?: string;
  tag?: string;
  search?: string;
  sort?: "newest" | "popular" | "downloads";
  page?: number;
  limit?: number;
}

export interface CreateCommentInput {
  content: string;
  parentId?: string;
}

export interface ReportResourceInput {
  reason: ReportReason;
  description?: string;
}

export interface ReviewReportInput {
  status: ReportStatus;
}

export interface ToggleVoteResult {
  action: "added" | "updated" | "removed";
  upvoteCount: number;
  downvoteCount: number;
}

export interface ToggleBookmarkResult {
  action: "added" | "removed";
}
