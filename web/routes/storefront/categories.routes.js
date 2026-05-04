import express from "express";
import { getCategories } from "../../controllers/storefront/storeSettings.controller.js";
const router = express.Router();
 
router.get("/", getCategories);
 
export default router;
 