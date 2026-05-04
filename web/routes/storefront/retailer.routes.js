import express from "express";
import { getRetailers } from "../../controllers/storefront/storeRetailer.controller.js";
import { getCategories } from "../../controllers/storefront/filter.controller.js"
 
const router = express.Router();
 
router.get("/", getRetailers);
router.get("/", getCategories);
 
export default router;
 