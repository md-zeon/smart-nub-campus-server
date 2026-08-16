import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const envMock = vi.hoisted(() => ({
  default: {
    GMAIL_USER: "sender@gmail.com",
    GMAIL_API_CLIENT_ID: "client-id",
    GMAIL_API_CLIENT_SECRET: "client-secret",
    GMAIL_API_REFRESH_TOKEN: "refresh-token",
  },
}));

vi.mock("../../../../config/env", () => envMock);

const nodemailerMock = vi.hoisted(() => ({
  createTransport: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({
      message: Buffer.from("raw-message"),
    }),
  })),
}));

vi.mock("nodemailer", () => ({ default: nodemailerMock }));

import { GmailApiProvider } from "../gmailApi.provider";

const fetchMock = vi.fn();

describe("GmailApiProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    nodemailerMock.createTransport.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exchanges the refresh token and sends a base64url message via the Gmail API", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "ya29.token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "message-id" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const provider = new GmailApiProvider();
    await provider.send({
      to: "student@nub.ac.bd",
      subject: "Verify your email - Smart NUB Campus",
      html: "<p>Your OTP is 123456</p>",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const tokenCall = fetchMock.mock.calls[0];
    expect(tokenCall[0]).toBe("https://oauth2.googleapis.com/token");
    const tokenInit = tokenCall[1] as RequestInit;
    expect(String(tokenInit.body)).toContain("grant_type=refresh_token");
    expect(String(tokenInit.body)).toContain("client_id=client-id");
    expect(String(tokenInit.body)).toContain("refresh_token=refresh-token");

    const sendCall = fetchMock.mock.calls[1];
    expect(sendCall[0]).toBe(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    );
    const sendInit = sendCall[1] as RequestInit;
    const headers = sendInit.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer ya29.token");
    const body = JSON.parse(sendInit.body as string) as { raw: string };
    expect(body.raw).toBe(Buffer.from("raw-message").toString("base64url"));

    expect(nodemailerMock.createTransport).toHaveBeenCalledWith({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
  });

  it("throws when the OAuth token refresh fails", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("invalid_grant", { status: 400 }),
    );

    const provider = new GmailApiProvider();
    await expect(
      provider.send({ to: "a@b.c", subject: "s", html: "h" }),
    ).rejects.toThrow(/Gmail OAuth token refresh failed \(400\)/);
  });

  it("throws when the Gmail API rejects the message", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "ya29.token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("raw message malformed", { status: 400 }),
      );

    const provider = new GmailApiProvider();
    await expect(
      provider.send({ to: "a@b.c", subject: "s", html: "h" }),
    ).rejects.toThrow(/Gmail API send failed \(400\)/);
  });
});
