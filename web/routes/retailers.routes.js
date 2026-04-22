import express from "express";
import multer from "multer";
import {
  getRetailers,
  createRetailer,
  updateRetailer,
  deleteRetailer,
  getRetailerById,
  importRetailersCSV,
  toggleRetailerStatus
} from "../controllers/retailers.controller.js";
const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.get("/", getRetailers);
router.post("/", createRetailer);
router.put("/:id", updateRetailer);
router.delete("/:id", deleteRetailer);
router.get("/:id", getRetailerById);
router.post("/import", upload.single("file"), importRetailersCSV);
router.patch("/:id/toggle", toggleRetailerStatus);

export default router;