import {
  type UploadProvider,
  type UploadResult,
} from "../../lib/upload/provider";
import cloudinaryProvider from "../../lib/upload/cloudinary";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { UPLOAD_CONFIG } from "../../lib/upload/config";

export class UploadService {
  private provider: UploadProvider;

  constructor() {
    this.provider = cloudinaryProvider;
  }

  async upload(
    file: Express.Multer.File,
    context: string,
    type?: "image" | "video" | "raw",
  ): Promise<UploadResult> {
    // Validate file exists
    if (!file) {
      throw new AppError(status.BAD_REQUEST, "No file provided");
    }

    // Validate file size using centralized config
    if (file.size > UPLOAD_CONFIG.maxFileSize) {
      throw new AppError(
        status.BAD_REQUEST,
        `File size exceeds ${UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB limit`,
      );
    }

    // Validate MIME type based on type hint using centralized config
    if (type && file.mimetype) {
      const allowedTypes = UPLOAD_CONFIG.allowedMimeTypes;
      const allowedMimes = allowedTypes[type as keyof typeof allowedTypes];
      if (allowedMimes && !allowedMimes.includes(file.mimetype)) {
        throw new AppError(status.BAD_REQUEST, `Invalid ${type} file type`);
      }
    }

    try {
      return await this.provider.upload(file, { context, type });
    } catch (error) {
      console.error("Upload failed:", error);
      throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to upload file");
    }
  }

  async delete(publicId: string): Promise<boolean> {
    try {
      return await this.provider.delete(publicId);
    } catch (error) {
      console.error("Delete failed:", error);
      throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to delete file");
    }
  }
}

export const uploadService = new UploadService();
