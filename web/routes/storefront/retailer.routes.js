import express from "express";
import { getRetailers } from "../../controllers/storefront/storeRetailer.controller.js";
const router = express.Router();
 
router.get("/", getRetailers);
 
export default router;
 