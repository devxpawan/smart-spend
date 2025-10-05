import { check, validationResult } from "express-validator";
import express from "express";
import Income from "../models/Income.js";
import mongoose from "mongoose";

const router = express.Router();

// @route   GET /api/incomes
// @desc    Get all incomes for a user
// @access  Private
router.get("/", async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      category,
      search,
      limit = 50,
      page = 1,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter object
    const filter = { user: req.user.id };

    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      filter.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.date = { $lte: new Date(endDate) };
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.description = { $regex: search, $options: "i" };
    }

    // Get total count for pagination
    const total = await Income.countDocuments(filter);

    // Get incomes
    const incomes = await Income.find(filter)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    res.json({
      incomes,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get incomes error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/incomes
// @desc    Create a new income
// @access  Private
router.post(
  "/",
  [
    check("description", "Description is required").trim().notEmpty().matches(/[a-zA-Z]/).withMessage("Description must contain at least one alphabetic character"),
    check("amount", "Amount is required and must be a number").isNumeric(),
    check("category", "Category is required").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const { amount, description, category, date, notes } =
      req.body;

    const newIncome = new Income({
      user: req.user.id,
      amount,
      description,
      category,
      date: date || Date.now(),
      notes,
    });

    const income = await newIncome.save();
    res.status(201).json(income);
  } catch (error) {
    console.error("Create income error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/incomes/:id
// @desc    Update income
// @access  Private
router.put(
  "/:id",
  [
    check("description", "Description must contain at least one alphabetic character")
      .optional()
      .trim()
      .notEmpty()
      .matches(/[a-zA-Z]/),
    check("amount", "Amount must be a number").optional().isNumeric(),
    check("category", "Category is required").optional().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const { amount, description, category, date, notes } =
      req.body;

    const income = await Income.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!income) {
      return res.status(404).json({ message: "Income not found" });
    }

    // Update fields
    income.amount = amount || income.amount;
    income.description = description || income.description;
    income.category = category || income.category;
    income.date = date || income.date;
    income.notes = notes !== undefined ? notes : income.notes;

    const updatedIncome = await income.save();
    res.json(updatedIncome);
  } catch (error) {
    console.error("Update income error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

// @route   DELETE /api/incomes/:id
// @desc    Delete income
// @access  Private
router.delete("/:id", async (req, res) => {
  try {
    const income = await Income.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!income) {
      return res.status(404).json({ message: "Income not found" });
    }

    await income.deleteOne();
    res.json({ message: "Income removed" });
  } catch (error) {
    console.error("Delete income error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/incomes/summary/monthly
// @desc    Get monthly income summary
// @access  Private
router.get("/summary/monthly", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ error: "Unauthorized: User not found" });
    }

    const { year = new Date().getFullYear() } = req.query;
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);

    const userId = new mongoose.Types.ObjectId(req.user.id);

    const summary = await Income.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$date" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          month: "$_id.month",
          total: 1,
          count: 1,
          _id: 0,
        },
      },
    ]);

    const fullYearSummary = Array.from({ length: 12 }, (_, i) => {
      const found = summary.find((m) => m.month === i + 1);
      return {
        month: i + 1,
        total: found ? found.total : 0,
        count: found ? found.count : 0,
      };
    });

    res.json(fullYearSummary);
  } catch (err) {
    console.error("Monthly summary error:", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: err.message });
  }
});

// @route   GET /api/incomes/summary/category
// @desc    Get income summary by category
// @access  Private
router.get("/summary/category", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {
      user: new mongoose.Types.ObjectId(req.user.id), // <-- Important
    };

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const summary = await Income.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json(summary);
  } catch (error) {
    console.error("Category summary error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/incomes/monthly/:year/:month
// @desc    Get incomes for a specific month
// @access  Private
router.get("/monthly/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(
      parseInt(year),
      parseInt(month),
      0,
      23,
      59,
      59
    );

    const filter = {
      user: req.user.id,
      date: { $gte: startDate, $lte: endDate },
    };

    const total = await Income.countDocuments(filter);
    const incomes = await Income.find(filter)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Calculate summary for the month
    const totalAmount = incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalCount = incomes.length;
    const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    const categoryBreakdown = await Income.aggregate([
      { $match: { ...filter, user: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, category: "$_id", total: 1, count: 1 } },
      { $sort: { total: -1 } },
    ]);

    const summary = {
      totalAmount,
      totalCount,
      categoryBreakdown,
      averageAmount,
    };

    res.json({
      incomes,
      summary,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get monthly incomes error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
