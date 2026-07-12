import { Request, Response, NextFunction } from "express";
import { uploadService } from "./upload.service";
import type { UploadResult } from "../../lib/upload/provider";

export class UploadController {
  async upload(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      const context = req.body.context || "uploads";
      const type = req.body.type || "image";

      const result: UploadResult = await uploadService.upload(
        req.file,
        context,
        type as "image" | "video" | "raw",
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();
