import express from "express";
import {getFilters} from "../../controllers/storefront/storeSettings.controller.js";
const router = express.Router();
 
router.get("/", getFilters);
 
export default router;
 