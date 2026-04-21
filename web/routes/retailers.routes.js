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
  importRetailersCSV
} = require("../controllers/retailers.controller");

router.get("/retailers", getRetailers);
router.post("/retailers", createRetailer);
router.put("/retailers/:id", updateRetailer);
router.delete("/retailers/:id", deleteRetailer);
router.get("/retailers/:id", getRetailerById);
router.post("/retailers/import", upload.single("file"), importRetailersCSV);

module.exports = router;