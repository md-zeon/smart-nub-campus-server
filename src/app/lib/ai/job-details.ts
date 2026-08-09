import type { JobDetailsResult } from "./providers/types";

export const EMPTY_JOB_DETAILS: JobDetailsResult = {
  title: "",
  company: "",
  description: "",
  employmentType: "",
  location: "",
  salaryRange: "",
  department: "",
  deadline: "",
  applicationUrl: "",
};

const JOB_DETAILS_KEYS: (keyof JobDetailsResult)[] = [
  "title",
  "company",
  "description",
  "employmentType",
  "location",
  "salaryRange",
  "department",
  "deadline",
  "applicationUrl",
];

export const isJobDetailsResult = (
  value: unknown,
): value is JobDetailsResult => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return JOB_DETAILS_KEYS.every((key) => typeof record[key] === "string");
};

export const parseJobDetailsJson = (
  text: string,
): JobDetailsResult | null => {
  const cleaned = text.replace(/```(?:json)?\s*/gi, "").trim();
  if (!cleaned) return null;
  try {
    const parsed: unknown = JSON.parse(cleaned);
    return isJobDetailsResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const JOB_DETAILS_SCHEMA = `{
  "title": "Job title, or empty string if unknown",
  "company": "Company or organization name, or empty string if unknown",
  "description": "The cleaned job description as simple, well-formed HTML built from ONLY these tags: p, h1, h2, h3, strong, em, u, s, code, pre, blockquote, ul, ol, li, hr, br, mark, and a (links). Structure it into short sections with h3 headings such as 'Responsibilities', 'Requirements', and 'How to Apply', using ul/li for bullet lists. Escape the characters & < > in all text. Never emit script, style, iframe, img, or any event-handler attribute, and use only http, https, or mailto href values. Empty string if the source text contains no real description.",
  "employmentType": "One of: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, REMOTE. Common wording maps as follows: 'Full-time' -> FULL_TIME, 'Part-time' -> PART_TIME, 'Contractual'/'Fixed-term' -> CONTRACT, 'Intern'/'Internship' -> INTERNSHIP, 'Remote'/'Work from home'/'Hybrid' -> REMOTE. Empty string if unknown or not clearly stated.",
  "location": "Work location (city and country, or 'Remote'), or empty string if unknown",
  "salaryRange": "Salary or compensation exactly as written, including currency and frequency (e.g. '৳30,000 - ৳50,000 monthly'). Look for labels such as salary, compensation, pay, remuneration, package, or stipend (for internships). Empty string if not stated anywhere.",
  "department": "One of: CSE, ECSE, EEE, EEEE, BBA, MBA, ENGLISH, MAE, BANGLA, MAB, LLB, MPH, BPH, ME, CIVIL, BTX, EBTX. Empty string if it does not clearly belong to a university department (only relevant for roles tied to a specific academic department, e.g. university teaching positions).",
  "deadline": "Application deadline as an ISO date string (YYYY-MM-DD). It may be labeled 'Last date to apply', 'Deadline', 'Closing date', 'Application deadline', or 'Apply before'. Empty string if not stated anywhere.",
  "applicationUrl": "URL where candidates should apply (from 'Apply', 'Apply now', or an application link), or empty string if not present in the text"
}`;

const JOB_DETAILS_RULES = `- Use empty strings for fields you cannot determine — never invent values. Prefer explicit statements over inference.
- Include every key above with a string value; do not add extra keys.
- "employmentType" must be exactly one of the listed enum values or empty.
- "department" must be exactly one of the listed enum values or empty.
- Scan the entire page body, including text near the top and at the bottom (salary, deadline and the apply link are often listed near the apply button).
- The "description" HTML must be safe: no script, style, iframe, img, or on* attributes, and no javascript: URLs.`;

const REPAIR_ERROR =
  "The previous response was either not valid JSON or did not match the required schema (every field must be a string).";

export const buildJobDetailsPrompt = (content: string): string =>
  `You are a job listing parser. Extract structured job details from the text below (it may be a pasted job description or text scraped from a job board such as LinkedIn, Facebook, BdJobs, Indeed, Glassdoor, or a company career page).

The source text may start with a "Page metadata facts:" section (facts extracted from the page metadata) followed by the "Page body". Use the body text to fill in or confirm every field; trust the metadata facts unless the body clearly contradicts them.

Return ONLY a valid JSON object (no markdown, no code fences) with this exact structure:
${JOB_DETAILS_SCHEMA}

Rules:
${JOB_DETAILS_RULES}

Source text:
${content}`;

export const buildJobDetailsRepairPrompt = (
  content: string,
  error: string,
): string =>
  `Your previous response could not be parsed. Error: ${error}

Re-read the source text and return ONLY a valid JSON object (no markdown, no code fences) with every field as a string (empty string if unknown), matching this exact structure and these rules:

${JOB_DETAILS_SCHEMA}

Rules:
${JOB_DETAILS_RULES}

Source text:
${content}`;

export const JOB_DETAILS_REPAIR_ERROR = REPAIR_ERROR;
