import { Router } from "express";
import { uploadController } from "./upload.controller";
import multer from "multer";
import { UPLOAD_CONFIG } from "../../lib/upload/config";
import verifySession from "../../middleware/verifySession";
import { uploadRateLimiter } from "../../middleware/rateLimit";

const router: Router = Router();

// Configure multer for memory storage (better for Cloudinary uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD_CONFIG.maxFileSize,
  },
  fileFilter: (_req, file, cb) => {
    // Collect all allowed MIME types
    const allAllowedMimes = Object.values(UPLOAD_CONFIG.allowedMimeTypes).flat();

    if (allAllowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

// All upload routes require authentication and rate limiting
router.use(verifySession);
router.use(uploadRateLimiter);

router.post("/", upload.single("file"), uploadController.upload);
router.post("/delete", uploadController.delete);

export const uploadRoutes = router;
