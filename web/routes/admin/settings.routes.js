import express from "express";
import {
    getFilterSettings,
    updateFilterSettings
} from "../../controllers/admin/settings.controller.js"

const router = express.Router();
router.get("/", getFilterSettings);
router.post("/", updateFilterSettings);

export default router;