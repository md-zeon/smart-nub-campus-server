import "multer";
import { type UploadContext } from "./config";

type UploadResult = {
  url: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  originalFilename?: string;
};

interface UploadProvider {
  upload(
    file: Express.Multer.File,
    options: {
      context: string;
      type?: "image" | "video" | "raw";
    },
  ): Promise<UploadResult>;
}

export { type UploadResult, type UploadProvider };
