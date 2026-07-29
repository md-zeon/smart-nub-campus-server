import { Router } from "express";
import { uploadController } from "./upload.controller";
import multer from "multer";
import { UPLOAD_CONFIG } from "../../lib/upload/config";
import { onboardingUploadRateLimiter } from "../../middleware/rateLimit";

const router: Router = Router();

// Configure multer for memory storage (same as regular upload)
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

// Onboarding upload: no session required, strict rate limiting
router.use(onboardingUploadRateLimiter);

router.post("/", upload.single("file"), uploadController.upload);

export const onboardingUploadRoutes = router;
