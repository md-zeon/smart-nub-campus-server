// Centralized upload configuration
import ENVVARS from "../../../config/env";

const MAX_UPLOAD_SIZE_MB = parseInt(ENVVARS.MAX_UPLOAD_SIZE_MB || "5", 10);
const CLOUDINARY_FOLDER = ENVVARS.CLOUDINARY_FOLDER || "uploads";

export const UPLOAD_CONFIG = {
  maxFileSize: MAX_UPLOAD_SIZE_MB * 1024 * 1024, // Convert MB to bytes
  rootFolder: CLOUDINARY_FOLDER,
  allowedMimeTypes: {
    image: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      // SVG excluded due to stored XSS risk via embedded JavaScript
    ],
    video: ["video/mp4", "video/webm", "video/quicktime"],
    raw: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  } as Record<"image" | "video" | "raw", string[]>,
  allowedContexts: [
    "verification",
    "resources",
    "avatars",
    "clubs",
    "events",
    "posts",
    "uploads",
  ] as const,
} as const;

export type UploadContext = (typeof UPLOAD_CONFIG.allowedContexts)[number];
