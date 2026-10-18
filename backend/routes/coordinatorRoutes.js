import express from "express";
import multer from "multer";
import {
    getCoordinatorDashboard,
    getImportTemplate,
    previewImport,
    confirmImport,
    getImportHistory,
} from "../controllers/coordinatorController.js";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (req, file, cb) => {
        const allowedExtensions = [".xlsx", ".xls", ".csv"];
        const isAllowed = allowedExtensions.some((ext) =>
            file.originalname.toLowerCase().endsWith(ext)
        );
        if (isAllowed) {
            cb(null, true);
        } else {
            cb(new Error("Only .csv, .xlsx, and .xls spreadsheet files are supported."));
        }
    },
});

router.use(protect, allowRoles("coordinator", "admin"));

router.get("/dashboard", getCoordinatorDashboard);
router.get("/import/template", getImportTemplate);
router.post("/import/preview", upload.single("file"), previewImport);
router.post("/import/confirm", confirmImport);
router.get("/import/history", getImportHistory);

export default router;
