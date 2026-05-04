import express from "express";
import {
  getCategories,
  createCategories,
  updateCategories,
  deleteCategories,
} from "../../controllers/admin/categories.controller.js"

const router = express.Router();
router.get("/", getCategories);
router.post("/", createCategories);
router.put("/:id", updateCategories);
router.delete("/:id", deleteCategories);

export default router;