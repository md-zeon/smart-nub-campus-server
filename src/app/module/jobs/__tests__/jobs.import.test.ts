import { describe, expect, it } from "vitest";
import { jobImportUtils } from "../jobs.import";

const { htmlToText, truncateForExtraction, buildExtractionText, isBlockedPageText, cleanPageTitle } =
  jobImportUtils;

describe("htmlToText", () => {
  it("strips script, style, comments and tags while keeping text", () => {
    const html = `
      <html><head><title>Ignored</title></head><body>
      <script>alert("x")</script>
      <!-- comment -->
      <h1>Software Engineer</h1>
      <p>Acme Ltd, Dhaka</p>
      <style>.x{}</style>
      </body></html>
    `;
    const text = htmlToText(html);
    expect(text).not.toContain("alert");
    expect(text).not.toContain("Ignored");
    expect(text).not.toContain("<h1>");
    expect(text).toContain("Software Engineer");
    expect(text).toContain("Acme Ltd, Dhaka");
  });

  it("keeps paragraph breaks from block tags", () => {
    const text = htmlToText("<p>First</p><p>Second</p>");
    expect(text).toContain("First\nSecond");
  });

  it("decodes entities and collapses whitespace", () => {
    const text = htmlToText("<p>A&nbsp;&amp;&nbsp;B</p><p>  C  </p>");
    expect(text).toContain("A & B");
    expect(text).not.toContain("  ");
  });
});

describe("truncateForExtraction", () => {
  it("keeps short text untouched", () => {
    const text = "short";
    expect(truncateForExtraction(text)).toBe(text);
  });

  it("preserves the head and tail of long text", () => {
    const head = "A".repeat(22000);
    const tail = "B".repeat(8000);
    const long = head + "C".repeat(50000) + tail;
    const out = truncateForExtraction(long);
    expect(out.startsWith(head)).toBe(true);
    expect(out.endsWith(tail)).toBe(true);
    expect(out).toContain("[...content omitted...]");
  });
});

describe("buildExtractionText", () => {
  it("prefixes labeled facts and page body", () => {
    const out = buildExtractionText("Body text here", [
      "Title: Engineer",
      "Salary: ৳50,000",
    ]);
    expect(out).toContain("Page metadata facts:");
    expect(out).toContain("Title: Engineer");
    expect(out).toContain("Salary: ৳50,000");
    expect(out).toContain("Page body:");
    expect(out).toContain("Body text here");
  });

  it("omits the facts header when there are no facts", () => {
    const out = buildExtractionText("Body", []);
    expect(out).not.toContain("Page metadata facts:");
    expect(out).toBe("Page body:\nBody");
  });

  it("marks an empty page body as relying on metadata facts", () => {
    const out = buildExtractionText("", ["Title: Engineer"]);
    expect(out).toContain("Page metadata facts:");
    expect(out).toContain("no readable page text");
  });
});

describe("isBlockedPageText", () => {
  it("detects LinkedIn sign-in walls", () => {
    expect(
      isBlockedPageText(
        "Agree & Join LinkedIn\nSkip to main content\nYou're signed out",
      ),
    ).toBe(true);
  });

  it("detects bot-check pages", () => {
    expect(
      isBlockedPageText(
        "Verification required\nOur systems have detected unusual traffic from your computer network.",
      ),
    ).toBe(true);
  });

  it("does not flag legitimate job content", () => {
    expect(
      isBlockedPageText(
        "Software Engineer\nResponsibilities:\n- Build features\nHow to Apply: send your CV to careers@example.com",
      ),
    ).toBe(false);
  });
});

describe("cleanPageTitle", () => {
  it("strips trailing job-board suffixes", () => {
    expect(
      cleanPageTitle(
        "CSE/EEE/IT Jobs in Bangladesh | We're Hiring – Frontend Developer | Facebook",
      ),
    ).toBe("CSE/EEE/IT Jobs in Bangladesh | We're Hiring – Frontend Developer");
    expect(
      cleanPageTitle("Crossing Hurdles hiring Software Engineer | Remote in Bangladesh | LinkedIn"),
    ).toBe("Crossing Hurdles hiring Software Engineer | Remote in Bangladesh");
  });

  it("leaves clean titles untouched", () => {
    expect(cleanPageTitle("Software Engineer")).toBe("Software Engineer");
  });
});
