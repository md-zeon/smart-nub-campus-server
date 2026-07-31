import status from "http-status";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import sanitizeHtml from "sanitize-html";
import AppError from "../../errorHelpers/AppError";
import {
  Department,
  JobSource,
  JobType,
} from "../../../generated/prisma/enums";
import { createProvider } from "../../lib/ai";
import type { JobDetailsResult } from "../../lib/ai";
import ENVVARS from "../../../config/env";

const MAX_FETCH_BYTES = 2 * 1024 * 1024; // 2 MB
const FETCH_TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 5;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_FIELD_LENGTH = 200;

export interface ParsedJobDraft {
  title: string;
  company: string;
  description: string;
  employmentType: JobType | null;
  location: string;
  salaryRange: string;
  deadline: string | null;
  department: Department | null;
  applicationUrl: string;
  source: JobSource | null;
  sourceUrl: string | null;
}

let providerInstance: ReturnType<typeof createProvider> | null = null;

const getProvider = (): ReturnType<typeof createProvider> => {
  if (!providerInstance) {
    providerInstance = createProvider({
      provider: ENVVARS.AI_PROVIDER,
      apiKey: ENVVARS.AI_PROVIDER_API_KEY,
      model: ENVVARS.AI_PROVIDER_MODEL,
    });
  }
  return providerInstance;
};

// ── SSRF-safe fetch ──────────────────────────────────────────────────────────

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  [0x00000000, 0x00ffffff], // 0.0.0.0/8
  [0x0a000000, 0x0affffff], // 10.0.0.0/8
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16 (link-local)
  [0xac100000, 0xac1fffff], // 172.16.0.0/12
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
  [0xffff0000, 0xffffffff], // 255.255.255.255
];

const ipToInt = (ip: string): number => {
  const [a, b, c, d] = ip.split(".").map(Number);
  return (((a << 24) | (b << 16) | (c << 8) | d) >>> 0);
};

const isPrivateIpv4 = (ip: string): boolean => {
  const int = ipToInt(ip);
  return PRIVATE_IPV4_RANGES.some(([lo, hi]) => int >= lo && int <= hi);
};

const assertSafeUrl = async (rawUrl: string): Promise<URL> => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AppError(status.BAD_REQUEST, "Invalid URL provided.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError(
      status.BAD_REQUEST,
      "Only http and https URLs can be imported.",
    );
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (isIP(hostname)) {
    if (hostname.includes(":")) {
      throw new AppError(
        status.BAD_REQUEST,
        "IPv6 address URLs are not supported.",
      );
    }
    if (isPrivateIpv4(hostname)) {
      throw new AppError(
        status.BAD_REQUEST,
        "This URL points to a private network address.",
      );
    }
    return url;
  }

  const addresses = await lookup(hostname, { all: true });
  for (const { address } of addresses) {
    if (address.includes(":")) {
      throw new AppError(
        status.BAD_REQUEST,
        "This URL resolves to a network address that cannot be fetched.",
      );
    }
    if (isPrivateIpv4(address)) {
      throw new AppError(
        status.BAD_REQUEST,
        "This URL points to a private network address.",
      );
    }
  }

  return url;
};

const fetchPageSafe = async (rawUrl: string): Promise<string> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let current = await assertSafeUrl(rawUrl);
    let response: Response | null = null;

    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SmartNUBJobsBot/1.0; +https://smartnubcampus.com)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.8,bn;q=0.6",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw new AppError(
            status.BAD_GATEWAY,
            "The job page redirected without a target.",
          );
        }
        current = await assertSafeUrl(new URL(location, current).toString());
        continue;
      }

      break;
    }

    if (!response || response.status >= 400) {
      throw new AppError(
        status.BAD_GATEWAY,
        "Could not read the job page from the provided link.",
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const isReadable =
      contentType.includes("text/html") ||
      contentType.includes("application/xhtml+xml") ||
      contentType.includes("text/plain");
    if (!isReadable) {
      throw new AppError(
        status.UNPROCESSABLE_ENTITY,
        "The link does not point to a readable job page.",
      );
    }

    const contentLength = Number(response.headers.get("content-length") || "0");
    if (contentLength > MAX_FETCH_BYTES) {
      throw new AppError(
        status.UNPROCESSABLE_ENTITY,
        "The page is too large to read.",
      );
    }

    const html = await response.text();
    if (html.length > MAX_FETCH_BYTES) {
      throw new AppError(
        status.UNPROCESSABLE_ENTITY,
        "The page is too large to read.",
      );
    }

    return html;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(
        status.GATEWAY_TIMEOUT,
        "The job page took too long to respond.",
      );
    }
    throw new AppError(
      status.BAD_GATEWAY,
      "Could not read the job page from the provided link.",
    );
  } finally {
    clearTimeout(timer);
  }
};

// ── HTML metadata extraction ─────────────────────────────────────────────────

const decodeEntities = (value: string): string =>
  value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCharCode(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const getAttr = (tag: string, name: string): string => {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"),
  );
  return match ? decodeEntities(match[1].trim()) : "";
};

interface PageMetadata {
  title: string;
  description: string;
}

const extractMeta = (html: string): PageMetadata => {
  const metas: Record<string, string> = {};
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    for (const attr of ["property", "name", "itemprop"]) {
      const key = getAttr(tag, attr).toLowerCase();
      if (!key) continue;
      const value = getAttr(tag, "content");
      if (value && metas[key] === undefined) metas[key] = value;
    }
  }

  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const title =
    metas["og:title"] ||
    metas["twitter:title"] ||
    decodeEntities(titleTag).replace(/\s+/g, " ").trim();
  const description =
    metas["og:description"] ||
    metas["twitter:description"] ||
    metas["description"] ||
    "";

  return { title, description };
};

// ── JSON-LD JobPosting extraction ────────────────────────────────────────────

type JsonLdNode = Record<string, unknown>;

const extractJsonLdNodes = (html: string): JsonLdNode[] => {
  const blocks =
    html.match(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ) ?? [];
  const nodes: JsonLdNode[] = [];

  for (const block of blocks) {
    const body = block
      .replace(/^<script[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();
    if (!body) continue;
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed)) nodes.push(...parsed);
      else if (parsed && typeof parsed === "object") nodes.push(parsed);
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }

  return nodes;
};

const jsonLdValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => jsonLdValue(item))
      .filter(Boolean)
      .join(", ");
  }
  if (value && typeof value === "object") {
    const record = value as JsonLdNode;
    const name = record.name ?? record["@id"] ?? record.title ?? record.value;
    return typeof name === "string" || typeof name === "number"
      ? String(name)
      : "";
  }
  return "";
};

const flattenGraph = (nodes: JsonLdNode[]): JsonLdNode[] => {
  const flat: JsonLdNode[] = [];
  for (const node of nodes) {
    const graph = node["@graph"];
    if (Array.isArray(graph)) flat.push(...(graph as JsonLdNode[]));
    else flat.push(node);
  }
  return flat;
};

const normalizeEmploymentType = (raw: string): JobType | null => {
  const value = raw.trim().toUpperCase();
  if (!value) return null;
  const isRemote = value === "REMOTE" || value === "REMOTE/FULL_TIME";
  if (
    value.includes("FULL_TIME") ||
    value.includes("FULL-TIME") ||
    value.includes("FULL TIME") ||
    value === "PERMANENT"
  ) {
    return JobType.FULL_TIME;
  }
  if (
    value.includes("PART_TIME") ||
    value.includes("PART-TIME") ||
    value.includes("PART TIME")
  ) {
    return JobType.PART_TIME;
  }
  if (value.includes("CONTRACT")) return JobType.CONTRACT;
  if (value.includes("INTERNSHIP") || value === "INTERN") {
    return JobType.INTERNSHIP;
  }
  if (isRemote) return JobType.REMOTE;
  return null;
};

const jsonLdToJob = (nodes: JsonLdNode[]): Partial<ParsedJobDraft> => {
  const job = flattenGraph(nodes).find(
    (node) => node["@type"] === "JobPosting",
  );
  if (!job) return {};

  const employmentTypeRaw = Array.isArray(job.employmentType)
    ? job.employmentType
    : job.employmentType
      ? [job.employmentType]
      : [];
  const employmentType =
    employmentTypeRaw
      .map((value) => normalizeEmploymentType(jsonLdValue(value)))
      .find((value) => value !== null) ?? null;

  const locationRaw = jsonLdValue(job.jobLocation);
  const address = (job.jobLocation as JsonLdNode | undefined)?.address;
  const addressParts = [
    jsonLdValue((address as JsonLdNode | undefined)?.addressLocality),
    jsonLdValue((address as JsonLdNode | undefined)?.addressRegion),
    jsonLdValue((address as JsonLdNode | undefined)?.addressCountry),
  ].filter(Boolean);
  const location = addressParts.length > 0 ? addressParts.join(", ") : locationRaw;

  let salaryRange = "";
  const baseSalary = job.baseSalary;
  if (baseSalary && typeof baseSalary === "object") {
    const value = jsonLdValue((baseSalary as JsonLdNode).value);
    const currency = jsonLdValue((baseSalary as JsonLdNode).currency);
    const unit = jsonLdValue((baseSalary as JsonLdNode).unitText);
    salaryRange = [value, currency, unit].filter(Boolean).join(" ");
  } else if (typeof baseSalary === "string" || typeof baseSalary === "number") {
    salaryRange = String(baseSalary);
  }

  const deadline = jsonLdValue(job.validThrough || job.applicationDeadline);

  const description = sanitizeHtml(jsonLdValue(job.description), {
    allowedTags: [],
    allowedAttributes: {},
  });

  const applicationUrl =
    jsonLdValue(job.url) ||
    jsonLdValue(job.directApply) ||
    jsonLdValue(job.applicationContact);

  return {
    title: jsonLdValue(job.title || job.name),
    company: jsonLdValue(
      (job.hiringOrganization as JsonLdNode | undefined)?.name ??
        job.hiringOrganization,
    ),
    description: description || undefined,
    employmentType,
    location: location || undefined,
    salaryRange: salaryRange || undefined,
    deadline: deadline || undefined,
    applicationUrl: applicationUrl || undefined,
  };
};

// ── Source detection ──────────────────────────────────────────────────────────

interface SourceRule {
  hosts: RegExp;
  source: JobSource;
}

const SOURCE_RULES: SourceRule[] = [
  { hosts: /(^|\.)linkedin\.com$/, source: JobSource.LINKEDIN },
  { hosts: /(^|\.)(facebook|fb)\.com$/, source: JobSource.FACEBOOK },
  { hosts: /(^|\.)bdjobs\.com(\.bd)?$/, source: JobSource.BDJOBS },
  { hosts: /(^|\.)indeed\.com$/, source: JobSource.INDEED },
  { hosts: /(^|\.)glassdoor\.com$/, source: JobSource.GLASSDOOR },
  { hosts: /(^|\.)bikroy\.com$/, source: JobSource.BIKROY },
  { hosts: /(^|\.)chakri\.com$/, source: JobSource.CHAKRI },
  { hosts: /(^|\.)prothomalo\.com$/, source: JobSource.CHAKRI },
  { hosts: /(^|\.)jobsbd\.com$/, source: JobSource.JOBSBD },
  { hosts: /(^|\.)google\.com$/, source: JobSource.GOOGLE_JOBS },
];

const detectSourceFromUrl = (rawUrl: string): JobSource | null => {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

    for (const rule of SOURCE_RULES) {
      if (rule.hosts.test(hostname)) return rule.source;
    }

    if (
      hostname.endsWith("google.com") &&
      url.pathname.startsWith("/search") &&
      (url.searchParams.get("q") ?? "")
        .toLowerCase()
        .includes("job")
    ) {
      return JobSource.GOOGLE_JOBS;
    }
  } catch {
    // not a URL — source stays null
  }
  return null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const cleanString = (
  value: string | null | undefined,
  max = MAX_FIELD_LENGTH,
): string => (value ?? "").trim().replace(/\s+/g, " ").slice(0, max);

const cleanDescription = (
  value: string | null | undefined,
): string => (value ?? "").trim().slice(0, MAX_DESCRIPTION_LENGTH);

const parseDeadline = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const mapDepartment = (
  value: string | null | undefined,
): Department | null => {
  const normalized = (value ?? "").trim().toUpperCase();
  if (!normalized) return null;
  return (
    Object.values(Department).find((item) => item === normalized) ?? null
  );
};

const mapEmploymentType = (
  value: string | null | undefined,
): JobType | null => {
  const normalized = (value ?? "").trim().toUpperCase();
  if (!normalized) return null;
  return (
    Object.values(JobType).find((item) => item === normalized) ?? null
  );
};

const toApplicationUrl = (
  value: string | null | undefined,
  fallback: string | null,
): string => {
  const candidate = cleanString(value, 2048);
  if (!candidate) return fallback ?? "";
  try {
    const url = new URL(candidate);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    // ignore invalid URLs
  }
  return fallback ?? "";
};

// ── Public orchestrator ───────────────────────────────────────────────────────

export const parseJobImport = async (
  input: string,
): Promise<ParsedJobDraft> => {
  const trimmed = input.trim();
  const isUrl = /^https?:\/\//i.test(trimmed);

  const source = isUrl ? detectSourceFromUrl(trimmed) : null;
  const sourceUrl = isUrl ? trimmed : null;

  let metadata: Partial<ParsedJobDraft> = {};
  let textToExtract: string | null = trimmed;

  if (isUrl) {
    try {
      const html = await fetchPageSafe(trimmed);
      const pageMeta = extractMeta(html);
      metadata = jsonLdToJob(extractJsonLdNodes(html));

      // Open Graph fields fill gaps the JSON-LD might miss.
      if (!metadata.title) metadata.title = pageMeta.title;
      if (!metadata.description) metadata.description = pageMeta.description;

      const description = metadata.description ?? "";
      textToExtract = [
        metadata.title ? `Job Title: ${metadata.title}` : "",
        metadata.company ? `Company: ${metadata.company}` : "",
        metadata.location ? `Location: ${metadata.location}` : "",
        description,
      ]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 12000);
    } catch {
      // Login wall / unreachable page — fall back to AI with the URL itself.
      textToExtract = trimmed;
    }
  }

  let ai: Partial<JobDetailsResult> = {};
  try {
    if (textToExtract) {
      ai = await getProvider().extractJobDetails(textToExtract);
    }
  } catch {
    ai = {};
  }

  return {
    title: cleanString(metadata.title || ai.title),
    company: cleanString(metadata.company || ai.company),
    description: cleanDescription(metadata.description || ai.description),
    employmentType:
      metadata.employmentType ?? mapEmploymentType(ai.employmentType),
    location: cleanString(metadata.location || ai.location),
    salaryRange: cleanString(metadata.salaryRange || ai.salaryRange, 100),
    deadline: parseDeadline(metadata.deadline || ai.deadline),
    department: mapDepartment(ai.department),
    applicationUrl: toApplicationUrl(metadata.applicationUrl, null) ||
      toApplicationUrl(ai.applicationUrl, null),
    source,
    sourceUrl,
  };
};

export const jobImportUtils = {
  detectSourceFromUrl,
};
