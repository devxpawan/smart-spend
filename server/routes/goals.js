import express from "express";
import mongoose from "mongoose";
import { check, validationResult } from "express-validator";
import Goal from "../models/Goal.js";
import { authenticateToken } from "../middleware/auth.js";
import { createAchievement, checkMilestoneAchievements } from "../utils/achievements.js";

const router = express.Router();

// @route   GET /api/goals
// @desc    Get all goals for a user
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user.id }).sort({ targetDate: 1 });
    res.json(goals);
  } catch (error) {
    console.error("Get goals error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/goals/:id
// @desc    Get a specific goal by ID
// @access  Private
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.json(goal);
  } catch (error) {
    console.error("Get goal error:", error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Goal not found" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/goals
// @desc    Create a new goal
// @access  Private
router.post(
  "/",
  [
    authenticateToken,
    [
      check("name", "Name is required").trim().notEmpty(),
      check("targetAmount", "Target amount is required and must be a number")
        .isNumeric()
        .custom((value) => {
          if (parseFloat(value) <= 0) {
            throw new Error("Target amount must be greater than 0");
          }
          return true;
        }),
      check("targetDate", "Target date is required").isISO8601(),
      check("monthlyContribution", "Monthly contribution must be a number")
        .optional()
        .isNumeric()
        .custom((value) => {
          if (parseFloat(value) < 0) {
            throw new Error("Monthly contribution cannot be negative");
          }
          return true;
        }),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, targetAmount, targetDate, description, monthlyContribution } = req.body;

      // Validate target date is in the future
      const targetDateObj = new Date(targetDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time part for comparison
      
      if (targetDateObj < today) {
        return res.status(400).json({ message: "Target date must be in the future" });
      }

      const newGoal = new Goal({
        user: req.user.id,
        name,
        targetAmount: parseFloat(targetAmount),
        targetDate: targetDateObj,
        description: description || "",
        monthlyContribution: monthlyContribution ? parseFloat(monthlyContribution) : 0, // Add this line
      });

      const goal = await newGoal.save();
      res.status(201).json(goal);
    } catch (error) {
      console.error("Create goal error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/goals/:id
// @desc    Update a goal
// @access  Private
router.put(
  "/:id",
  [
    authenticateToken,
    [
      check("name", "Name is required").optional().trim().notEmpty(),
      check("targetAmount", "Target amount must be a number")
        .optional()
        .isNumeric()
        .custom((value) => {
          if (parseFloat(value) <= 0) {
            throw new Error("Target amount must be greater than 0");
          }
          return true;
        }),
      check("targetDate", "Target date must be a valid date")
        .optional()
        .isISO8601(),
      check("monthlyContribution", "Monthly contribution must be a number")
        .optional()
        .isNumeric()
        .custom((value) => {
          if (parseFloat(value) < 0) {
            throw new Error("Monthly contribution cannot be negative");
          }
          return true;
        }),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, targetAmount, targetDate, description, monthlyContribution } = req.body;

      // Build goal object
      const goalFields = {};
      if (name) goalFields.name = name;
      if (targetAmount) goalFields.targetAmount = parseFloat(targetAmount);
      if (targetDate) {
        const targetDateObj = new Date(targetDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time part for comparison
        
        if (targetDateObj < today) {
          return res.status(400).json({ message: "Target date must be in the future" });
        }
        goalFields.targetDate = targetDateObj;
      }
      if (description !== undefined) goalFields.description = description;
      if (monthlyContribution !== undefined) goalFields.monthlyContribution = parseFloat(monthlyContribution); // Add this line

      let goal = await Goal.findOne({
        _id: req.params.id,
        user: req.user.id,
      });

      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Update the updatedAt field
      goalFields.updatedAt = Date.now();

      goal = await Goal.findByIdAndUpdate(
        req.params.id,
        { $set: goalFields },
        { new: true }
      );

      res.json(goal);
    } catch (error) {
      console.error("Update goal error:", error);
      if (error.kind === "ObjectId") {
        return res.status(404).json({ message: "Goal not found" });
      }
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   DELETE /api/goals/:id
// @desc    Delete a goal
// @access  Private
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    await Goal.deleteOne({ _id: req.params.id });
    res.json({ message: "Goal removed" });
  } catch (error) {
    console.error("Delete goal error:", error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Goal not found" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/goals/:id/contributions
// @desc    Add a contribution to a goal
// @access  Private
router.post(
  "/:id/contributions",
  [
    authenticateToken,
    [
      check("amount", "Amount is required and must be a number")
        .isNumeric()
        .custom((value) => {
          if (parseFloat(value) <= 0) {
            throw new Error("Amount must be greater than 0");
          }
          return true;
        }),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { amount, description } = req.body;

      const goal = await Goal.findOne({
        _id: req.params.id,
        user: req.user.id,
      });

      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Check if this is the first contribution to this goal
      const isFirstContribution = goal.contributions.length === 0;

      // Add contribution to the goal
      const contribution = {
        amount: parseFloat(amount),
        date: Date.now(),
        description: description || "",
      };

      goal.contributions.unshift(contribution);
      goal.savedAmount += parseFloat(amount);
      goal.updatedAt = Date.now();

      await goal.save();

      // Check if this is the first contribution to any goal for the user
      if (isFirstContribution) {
        // Check if user has made any contributions before
        const userGoals = await Goal.find({ user: req.user.id });
        const totalContributions = userGoals.reduce((total, g) => total + g.contributions.length, 0);
        
        if (totalContributions === 1) {
          // This is the user's very first contribution
          await createAchievement(req.user.id, "FIRST_CONTRIBUTION");
        }
      }

      // Check if goal is now completed
      if (goal.savedAmount >= goal.targetAmount) {
        // Goal completed! Award achievement
        await createAchievement(req.user.id, "GOAL_COMPLETED");
        
        // Count total completed goals for this user
        const completedGoals = await Goal.countDocuments({
          user: req.user.id,
          savedAmount: { $gte: goal.targetAmount }
        });
        
        // Check for milestone achievements
        await checkMilestoneAchievements(req.user.id, completedGoals);
      }

      res.json(goal);
    } catch (error) {
      console.error("Add contribution error:", error);
      if (error.kind === "ObjectId") {
        return res.status(404).json({ message: "Goal not found" });
      }
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;