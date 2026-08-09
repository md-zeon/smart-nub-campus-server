import sanitizeHtml from "sanitize-html";

/**
 * Shared allow-list sanitizer for user-generated rich text (TipTap / HTML).
 *
 * All rich-text content (discussions, Q&A, teams, messages, connection notes,
 * mentorship messages, resources, jobs) must pass through `sanitizeRichText`
 * before being stored so that no raw HTML can reach the client and render via
 * `dangerouslySetInnerHTML`. Blocked tags/attributes/schemes are stripped.
 */
const RICH_TEXT_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "span",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title"],
    span: ["class"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      },
    }),
  },
  disallowedTagsMode: "discard",
};

export const sanitizeRichText = (
  value: string | null | undefined,
): string => {
  if (!value) return "";
  const cleaned = sanitizeHtml(value, RICH_TEXT_SANITIZE_OPTIONS).trim();
  return cleaned;
};
