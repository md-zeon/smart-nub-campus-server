import "multer";
import { v2 as cloudinary } from "cloudinary";
import { type UploadProvider, type UploadResult } from "./provider";
import ENVVARS from "../../../config/env";
import { UPLOAD_CONFIG } from "./config";

// Configure Cloudinary
cloudinary.config({
  cloud_name: ENVVARS.CLOUDINARY_CLOUD_NAME,
  api_key: ENVVARS.CLOUDINARY_API_KEY,
  api_secret: ENVVARS.CLOUDINARY_API_SECRET,
});

type MulterFile = Express.Multer.File;

export const cloudinaryProvider: UploadProvider = {
  async upload(
    file: MulterFile,
    options: {
      context: string;
      type?: "image" | "video" | "raw";
    },
  ): Promise<UploadResult> {
    // Compose folder path with root folder
    const folder = `${UPLOAD_CONFIG.rootFolder}/${options.context}`;

    // Determine resource type
    const resourceType = options.type || "image";

    // Upload to Cloudinary using buffer (memory storage)
    const result = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
      {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: false,
      },
    );

    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type as "image" | "video" | "raw",
      mimeType: file.mimetype,
      size: file.size,
      width: result.width,
      height: result.height,
      originalFilename: file.originalname,
    };
  },

  async delete(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === "ok";
    } catch (error) {
      console.error("Cloudinary delete failed:", error);
      return false;
    }
  },
};

export default cloudinaryProvider;
