import { z } from "zod";

// Create a new AI chat session
export const createSessionSchema = z.object({
  title: z.string().max(200).optional(),
});

// Send a message in an AI chat session
export const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

// Mark a message as helpful/unhelpful
export const markHelpfulSchema = z.object({
  isHelpful: z.boolean(),
});

// Placeholder tool schemas
export const summarizePdfSchema = z.object({
  fileUrl: z.string().url(),
});

export const generateQuizSchema = z.object({
  content: z.string().min(10).max(50000),
  numQuestions: z.number().int().min(1).max(50).default(5),
});

export const generateFlashcardsSchema = z.object({
  content: z.string().min(10).max(50000),
  numCards: z.number().int().min(1).max(50).default(10),
});

export const explainCodeSchema = z.object({
  code: z.string().min(1).max(30000),
  language: z.string().max(50).optional(),
});
