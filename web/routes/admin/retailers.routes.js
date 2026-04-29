import express from "express";
import multer from "multer";
import {
  getRetailers,
  createRetailer,
  updateRetailer,
  deleteRetailer,
  getRetailerById,
  importRetailersCSV,
} from "../../controllers/admin/retailers.controller.js";

const router = express.Router();
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const isCsvExtension = file.originalname.toLowerCase().endsWith(".csv");
    const isCsvMime = [
      "text/csv",
      "application/vnd.ms-excel",   
      "application/csv",
      "text/plain",                  
    ].includes(file.mimetype);

    if (isCsvExtension) {
      return cb(null, true);
    }

    if (isCsvMime) {
      return cb(null, true);
    }

    cb(new Error("Only .csv files are allowed."));
  },
});

router.post("/import", upload.single("file"), importRetailersCSV);

router.get("/", getRetailers);
router.post("/", createRetailer);
router.put("/:id", updateRetailer);
router.delete("/:id", deleteRetailer);
router.get("/:id", getRetailerById);

export default router;