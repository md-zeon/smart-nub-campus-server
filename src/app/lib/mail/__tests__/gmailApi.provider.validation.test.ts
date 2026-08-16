import { describe, it, expect, vi } from "vitest";

vi.mock("../../../../config/env", () => ({
  default: {
    GMAIL_USER: "sender@gmail.com",
    GMAIL_API_CLIENT_ID: undefined,
    GMAIL_API_CLIENT_SECRET: "client-secret",
    GMAIL_API_REFRESH_TOKEN: "refresh-token",
  },
}));

import { GmailApiProvider } from "../gmailApi.provider";

describe("GmailApiProvider constructor validation", () => {
  it("throws when GMAIL_API_CLIENT_ID is missing", () => {
    expect(() => new GmailApiProvider()).toThrow(/GMAIL_API_CLIENT_ID/);
  });
});
