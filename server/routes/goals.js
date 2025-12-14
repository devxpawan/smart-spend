import express from "express";
import { check, validationResult } from "express-validator";
import Goal from "../models/Goal.js";

const router = express.Router();

// @route   GET /api/goals
// @desc    Get all goals for a user
// @access  Private
router.get("/", async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user.id }).sort({ targetDate: 1 });
    res.json(goals);
  } catch (error) {
    console.error("Get goals error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/goals
// @desc    Create a new goal
// @access  Private
router.post(
  "/",
  [
    check("name", "Goal name is required").not().isEmpty(),
    check("targetAmount", "Target amount is required and must be a number").isNumeric(),
    check("targetDate", "Target date must be a valid date").isISO8601().toDate(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, targetAmount, targetDate, description } = req.body;

      const newGoal = new Goal({
        user: req.user.id,
        name,
        targetAmount,
        targetDate,
        description,
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
router.put("/:id", async (req, res) => {
  try {
    const { name, targetAmount, targetDate, description, currentAmount } = req.body;

    const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    if (name) goal.name = name;
    if (targetAmount) goal.targetAmount = targetAmount;
    if (targetDate) goal.targetDate = targetDate;
    if (description) goal.description = description;
    if (currentAmount) goal.currentAmount = currentAmount;

    const updatedGoal = await goal.save();
    res.json(updatedGoal);
  } catch (error) {
    console.error("Update goal error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/goals/:id
// @desc    Delete a goal
// @access  Private
router.delete("/:id", async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    await goal.deleteOne();
    res.json({ message: "Goal removed" });
  } catch (error) {
    console.error("Delete goal error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/goals/:id/contribute
// @desc    Add a contribution to a goal
// @access  Private
router.post(
  "/:id/contribute",
  [check("amount", "Contribution amount is required and must be a number").isNumeric()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { amount } = req.body;
      const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id });

      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      goal.currentAmount += parseFloat(amount);

      // Check if the goal is achieved
      if (goal.currentAmount >= goal.targetAmount) {
        goal.isAchieved = true;
      }

      await goal.save();
      res.json(goal);
    } catch (error) {
      console.error("Contribute to goal error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
