import { describe, it, expect, vi, beforeEach } from "vitest";

const providerMock = vi.hoisted(() => ({
  upload: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("../../../lib/upload/cloudinary", () => ({
  default: providerMock,
  cloudinaryProvider: providerMock,
}));

import { uploadService } from "../upload.service";
import { UPLOAD_CONFIG } from "../../../lib/upload/config";

const makeFile = (overrides: Partial<Express.Multer.File> = {}) =>
  ({
    fieldname: "file",
    originalname: "photo.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: 1024,
    buffer: Buffer.from("mock"),
    ...overrides,
  }) as Express.Multer.File;

const uploadResult = {
  url: "https://cloud.example/photo.jpg",
  publicId: "uploads/avatars/abc123",
  resourceType: "image",
  mimeType: "image/jpeg",
  size: 1024,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("uploadService.upload", () => {
  it("throws BAD_REQUEST when no file is provided", async () => {
    await expect(
      uploadService.upload(undefined as unknown as Express.Multer.File, "avatars"),
    ).rejects.toThrow("No file provided");
  });

  it("rejects files larger than the configured maximum", async () => {
    await expect(
      uploadService.upload(
        makeFile({ size: UPLOAD_CONFIG.maxFileSize + 1 }),
        "avatars",
      ),
    ).rejects.toThrow("File size exceeds");
    expect(providerMock.upload).not.toHaveBeenCalled();
  });

  it("rejects disallowed upload contexts", async () => {
    await expect(
      uploadService.upload(makeFile(), "unknown-context"),
    ).rejects.toThrow("Invalid upload context: unknown-context");
    expect(providerMock.upload).not.toHaveBeenCalled();
  });

  it("accepts all configured contexts", async () => {
    providerMock.upload.mockResolvedValue(uploadResult);
    for (const context of UPLOAD_CONFIG.allowedContexts) {
      await uploadService.upload(makeFile(), context);
    }
    expect(providerMock.upload).toHaveBeenCalledTimes(
      UPLOAD_CONFIG.allowedContexts.length,
    );
  });

  it("rejects a MIME type that does not match the type hint", async () => {
    await expect(
      uploadService.upload(
        makeFile({ mimetype: "application/pdf" }),
        "avatars",
        "image",
      ),
    ).rejects.toThrow("Invalid image file type");
    expect(providerMock.upload).not.toHaveBeenCalled();
  });

  it("accepts a valid MIME type for the type hint", async () => {
    providerMock.upload.mockResolvedValue(uploadResult);

    const result = await uploadService.upload(
      makeFile({ mimetype: "image/png" }),
      "avatars",
      "image",
    );

    expect(result).toEqual(uploadResult);
    expect(providerMock.upload).toHaveBeenCalledWith(
      expect.objectContaining({ mimetype: "image/png" }),
      { context: "avatars", type: "image" },
    );
  });

  it("passes the file through when no type hint is given", async () => {
    providerMock.upload.mockResolvedValue(uploadResult);

    await uploadService.upload(makeFile(), "avatars");

    expect(providerMock.upload).toHaveBeenCalledWith(
      expect.anything(),
      { context: "avatars", type: undefined },
    );
  });

  it("maps a provider TimeoutError to REQUEST_TIMEOUT", async () => {
    const timeout = new Error("timed out");
    timeout.name = "TimeoutError";
    providerMock.upload.mockRejectedValue(timeout);

    await expect(
      uploadService.upload(makeFile(), "avatars"),
    ).rejects.toThrow("Upload timed out");
  });

  it("maps generic provider errors to INTERNAL_SERVER_ERROR", async () => {
    providerMock.upload.mockRejectedValue(new Error("boom"));

    await expect(
      uploadService.upload(makeFile(), "avatars"),
    ).rejects.toThrow("Failed to upload file");
  });
});

describe("uploadService.delete", () => {
  it("returns the provider delete result", async () => {
    providerMock.delete.mockResolvedValue(true);

    const result = await uploadService.delete("uploads/avatars/abc123");

    expect(result).toBe(true);
    expect(providerMock.delete).toHaveBeenCalledWith(
      "uploads/avatars/abc123",
    );
  });

  it("maps provider delete errors to INTERNAL_SERVER_ERROR", async () => {
    providerMock.delete.mockRejectedValue(new Error("boom"));

    await expect(uploadService.delete("public-id")).rejects.toThrow(
      "Failed to delete file",
    );
  });
});
