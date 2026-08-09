import { describe, expect, it } from "vitest";
import {
  buildJobDetailsPrompt,
  buildJobDetailsRepairPrompt,
  EMPTY_JOB_DETAILS,
  isJobDetailsResult,
  parseJobDetailsJson,
} from "../job-details";

const VALID_JSON = JSON.stringify({
  title: "Software Engineer",
  company: "Acme",
  description: "<h3>Responsibilities</h3><ul><li>Build</li></ul>",
  employmentType: "FULL_TIME",
  location: "Dhaka",
  salaryRange: "৳50,000",
  department: "CSE",
  deadline: "2026-12-31",
  applicationUrl: "https://example.com/apply",
});

describe("parseJobDetailsJson", () => {
  it("parses a valid flat string schema", () => {
    expect(parseJobDetailsJson(VALID_JSON)).toEqual(JSON.parse(VALID_JSON));
  });

  it("strips markdown code fences", () => {
    const result = parseJobDetailsJson(`\`\`\`json\n${VALID_JSON}\n\`\`\``);
    expect(result?.title).toBe("Software Engineer");
  });

  it("returns null for invalid JSON", () => {
    expect(parseJobDetailsJson("not json {")).toBeNull();
  });

  it("returns null for a non-string field value", () => {
    const broken = VALID_JSON.replace('"FULL_TIME"', "42");
    expect(parseJobDetailsJson(broken)).toBeNull();
  });

  it("returns null when a required field is missing", () => {
    const { company: _company, ...withoutCompany } = JSON.parse(VALID_JSON);
    expect(parseJobDetailsJson(JSON.stringify(withoutCompany))).toBeNull();
  });

  it("returns null for empty or whitespace input", () => {
    expect(parseJobDetailsJson("")).toBeNull();
    expect(parseJobDetailsJson("   ")).toBeNull();
  });
});

describe("isJobDetailsResult", () => {
  it("accepts an object with all string fields", () => {
    expect(isJobDetailsResult(JSON.parse(VALID_JSON))).toBe(true);
  });

  it("rejects null, arrays and primitives", () => {
    expect(isJobDetailsResult(null)).toBe(false);
    expect(isJobDetailsResult([{}])).toBe(false);
    expect(isJobDetailsResult("x")).toBe(false);
  });
});

describe("EMPTY_JOB_DETAILS", () => {
  it("has every field as an empty string", () => {
    expect(isJobDetailsResult(EMPTY_JOB_DETAILS)).toBe(true);
    expect(Object.values(EMPTY_JOB_DETAILS).every((v) => v === "")).toBe(true);
  });
});

describe("job detail prompts", () => {
  const source = "Software Engineer at Acme, Dhaka. Full-time.";

  it("builds an extraction prompt with the source and HTML rules", () => {
    const prompt = buildJobDetailsPrompt(source);
    expect(prompt).toContain(source);
    expect(prompt).toContain("description");
    expect(prompt).toContain("ul/li");
    expect(prompt).toContain("script");
  });

  it("builds a repair prompt with the error and source", () => {
    const prompt = buildJobDetailsRepairPrompt(source, "Schema mismatch");
    expect(prompt).toContain("Schema mismatch");
    expect(prompt).toContain(source);
  });
});
