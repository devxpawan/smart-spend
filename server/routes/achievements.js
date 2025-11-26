import express from "express";
import Achievement from "../models/Achievement.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// @route   GET /api/achievements
// @desc    Get all achievements for the logged-in user
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
  try {
    const achievements = await Achievement.find({ user: req.user.id })
      .sort({ earnedAt: -1 });
    
    res.json(achievements);
  } catch (error) {
    console.error("Get achievements error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/achievements/unseen
// @desc    Get unseen achievements for the logged-in user
// @access  Private
router.get("/unseen", authenticateToken, async (req, res) => {
  try {
    const achievements = await Achievement.find({ 
      user: req.user.id,
      isSeen: false
    }).sort({ earnedAt: -1 });
    
    res.json(achievements);
  } catch (error) {
    console.error("Get unseen achievements error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/achievements/:id/mark-seen
// @desc    Mark an achievement as seen
// @access  Private
router.put("/:id/mark-seen", authenticateToken, async (req, res) => {
  try {
    const achievement = await Achievement.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!achievement) {
      return res.status(404).json({ message: "Achievement not found" });
    }

    achievement.isSeen = true;
    await achievement.save();

    res.json(achievement);
  } catch (error) {
    console.error("Mark achievement as seen error:", error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Achievement not found" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

export default router;