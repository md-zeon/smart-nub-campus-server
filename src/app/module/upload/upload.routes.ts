import { Router } from "express";
import { uploadController } from "./upload.controller";
import multer from "multer";
import { UPLOAD_CONFIG } from "../../lib/upload/config";

const router: Router = Router();

// Configure multer for memory storage (better for Cloudinary uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD_CONFIG.maxFileSize,
  },
});

router.post("/", upload.single("file"), uploadController.upload);
router.post("/delete", uploadController.delete);

export const uploadRoutes = router;
