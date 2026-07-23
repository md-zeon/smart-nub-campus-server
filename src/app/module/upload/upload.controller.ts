import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { uploadService } from "./upload.service";
import type { UploadResult } from "../../lib/upload/provider";

const upload = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new Error("No file uploaded");
  }

  const context = req.body.context || "uploads";
  const type = req.body.type || "image";

  const result: UploadResult = await uploadService.upload(
    req.file,
    context,
    type as "image" | "video" | "raw",
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "File uploaded successfully",
    data: result,
  });
});

const deleteFile = catchAsync(async (req, res) => {
  const { publicId } = req.body;

  if (!publicId) {
    throw new Error("publicId is required");
  }

  const deleted = await uploadService.delete(publicId);

  if (!deleted) {
    throw new Error("File not found or could not be deleted");
  }

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "File deleted successfully",
  });
});

export const uploadController = {
  upload,
  delete: deleteFile,
};
