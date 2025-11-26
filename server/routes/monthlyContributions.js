import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { processMonthlyContributions } from "../utils/processMonthlyContributions.js";

const router = express.Router();

// @route   POST /api/monthly-contributions/process
// @desc    Manually process monthly contributions
// @access  Private
router.post("/process", authenticateToken, async (req, res) => {
  try {
    const result = await processMonthlyContributions();
    
    if (result.success) {
      res.json({
        message: `Successfully processed monthly contributions for ${result.processedCount} goals`,
        processedCount: result.processedCount
      });
    } else {
      res.status(500).json({
        message: "Failed to process monthly contributions",
        error: result.error
      });
    }
  } catch (error) {
    console.error("Process monthly contributions error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;