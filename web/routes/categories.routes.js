const express = require("express");
const router = express.Router();
const {
    getCategories,
    createCategories,
    updateCategories,
    deleteCategories,
  } = require("../controllers/categories.controller");

router.get("/categories", getCategories);
router.post("/categories", createCategories);
router.put("/categories/:id", updateCategories);
router.delete("/categories/:id", deleteCategories);

module.exports = router;