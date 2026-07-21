import "multer";

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

  delete(publicId: string): Promise<boolean>;
}

export { type UploadResult, type UploadProvider };
