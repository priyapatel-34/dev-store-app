const express = require("express");
const router = express.Router();
const {
    getCategories,
    createCategories,
    updateCategories,
    deleteCategories,
  } = require("../../controllers/admin/categories.controller.js")

router.get("/", getCategories);
router.post("/", createCategories);
router.put("/:id", updateCategories);
router.delete("/:id", deleteCategories);

module.exports = router;const res = await fetch