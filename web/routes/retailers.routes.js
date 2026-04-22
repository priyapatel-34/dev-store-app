const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const {
  getRetailers,
  createRetailer,
  updateRetailer,
  deleteRetailer,
  getRetailerById,
  importRetailersCSV,
  exportRetailersCSV,
  toggleRetailerStatus
} = require("../controllers/retailers.controller");

router.get("/", getRetailers);
router.post("/", createRetailer);
router.put("/:id", updateRetailer);
router.delete("/:id", deleteRetailer);
router.get("/:id", getRetailerById);
router.post("/import", upload.single("file"), importRetailersCSV);
router.patch("/:id/toggle", toggleRetailerStatus);
router.get("/export", exportRetailersCSV);

module.exports = router;