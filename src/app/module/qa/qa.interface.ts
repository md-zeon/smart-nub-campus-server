import { VoteType } from "../../../generated/prisma/enums";

export interface CreateQuestionInput {
  title: string;
  content: string;
  categoryId: string;
  courseId?: string;
  tagIds?: string[];
}

export interface UpdateQuestionInput {
  title?: string;
  content?: string;
  tagIds?: string[];
}

export interface CreateAnswerInput {
  content: string;
}

export interface VoteInput {
  type: VoteType;
}

export interface ListQuestionsQuery {
  category?: string;
  tag?: string;
  search?: string;
  answered?: string;
  sort?: "latest" | "popular" | "unanswered";
  page?: number;
  limit?: number;
}
