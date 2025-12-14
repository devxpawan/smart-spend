import express from "express";
import insightsService from "../services/insightsService.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Get spending insights and patterns
router.get("/spending-patterns", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const months = parseInt(req.query.months) || 3;
    
    const insights = await insightsService.analyzeSpendingPatterns(userId, months);
    
    res.json({
      success: true,
      data: insights,
      message: "Spending patterns analyzed successfully"
    });
  } catch (error) {
    console.error("Error in spending patterns endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Failed to analyze spending patterns",
      error: error.message
    });
  }
});

// Get quick insights summary for dashboard
router.get("/summary", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get insights for the last 2 months for quick summary
    const insights = await insightsService.analyzeSpendingPatterns(userId, 2);
    
    // Return only essential data for dashboard widget
    const summary = {
      unusualCount: insights.unusualSpending.length,
      highSeverityCount: insights.unusualSpending.filter(p => p.severity === "high").length,
      summary: insights.summary,
      topTip: insights.insights.savingsTips?.[0] || null,
      hasData: insights.unusualSpending.length > 0 || insights.insights.savingsTips?.length > 0
    };
    
    res.json({
      success: true,
      data: summary,
      message: "Insights summary retrieved successfully"
    });
  } catch (error) {
    console.error("Error in insights summary endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get insights summary",
      error: error.message
    });
  }
});

// Get personalized savings tips
router.get("/savings-tips", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const insights = await insightsService.analyzeSpendingPatterns(userId, 3);
    
    res.json({
      success: true,
      data: {
        savingsTips: insights.insights.savingsTips || [],
        educationalFact: insights.insights.educationalFact || null,
        recommendation: insights.insights.recommendation || null
      },
      message: "Savings tips retrieved successfully"
    });
  } catch (error) {
    console.error("Error in savings tips endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get savings tips",
      error: error.message
    });
  }
});

// Get unusual spending alerts
router.get("/unusual-spending", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const months = parseInt(req.query.months) || 3;
    
    const insights = await insightsService.analyzeSpendingPatterns(userId, months);
    
    // Filter by severity if requested
    let unusualSpending = insights.unusualSpending;
    if (req.query.severity) {
      unusualSpending = unusualSpending.filter(p => p.severity === req.query.severity);
    }
    
    res.json({
      success: true,
      data: {
        unusualSpending,
        totalPatterns: insights.unusualSpending.length,
        highSeverityCount: insights.unusualSpending.filter(p => p.severity === "high").length
      },
      message: "Unusual spending patterns retrieved successfully"
    });
  } catch (error) {
    console.error("Error in unusual spending endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get unusual spending patterns",
      error: error.message
    });
  }
});

export default router;