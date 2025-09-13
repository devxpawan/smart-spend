
import express from "express";
import { getFinancialHealth } from "../controllers/financialHealth.js";

const router = express.Router();

// @route   GET /api/financial-health
// @desc    Get financial health score and analysis
// @access  Private
router.get("/", getFinancialHealth);

export default router;
