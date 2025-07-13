import express from "express";
import Expense from "../models/Expense.js";
import Bill from "../models/Bill.js";
import mongoose from "mongoose";

const router = express.Router();

// @route   GET /api/expenses
// @desc    Get all expenses for a user
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
    const total = await Expense.countDocuments(filter);

    // Get expenses
    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    res.json({
      expenses,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/expenses
// @desc    Create a new expense
// @access  Private
router.post("/", async (req, res) => {
  try {
    const { amount, description, category, date, paymentMethod, notes } =
      req.body;

    const newExpense = new Expense({
      user: req.user.id,
      amount,
      description,
      category,
      date: date || Date.now(),
      paymentMethod,
      notes,
    });

    const expense = await newExpense.save();
    res.status(201).json(expense);
  } catch (error) {
    console.error("Create expense error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update expense
// @access  Private
router.put("/:id", async (req, res) => {
  try {
    const { amount, description, category, date, paymentMethod, notes } =
      req.body;

    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Update fields
    expense.amount = amount || expense.amount;
    expense.description = description || expense.description;
    expense.category = category || expense.category;
    expense.date = date || expense.date;
    expense.paymentMethod = paymentMethod || expense.paymentMethod;
    expense.notes = notes !== undefined ? notes : expense.notes;

    const updatedExpense = await expense.save();
    res.json(updatedExpense);
  } catch (error) {
    console.error("Update expense error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Private
router.delete("/:id", async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    await expense.deleteOne();
    res.json({ message: "Expense removed" });
  } catch (error) {
    console.error("Delete expense error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/expenses/summary/monthly
// @desc    Get monthly expense summary
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

    const summary = await Expense.aggregate([
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

// @route   GET /api/expenses/summary/category
// @desc    Get expense summary by category
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

    const summary = await Expense.aggregate([
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

// @route   GET /api/expenses/monthly/:year/:month
// @desc    Get expenses for a specific month
// @access  Private
router.get("/monthly/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;
    const { limit = 50, page = 1, category, search } = req.query;
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

    // Build filter object
    const filter = {
      user: req.user.id,
      date: { $gte: startDate, $lte: endDate },
    };

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.description = { $regex: search, $options: "i" };
    }

    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Calculate summary for the month
    const totalAmount = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const categories = [
      ...new Set(expenses.map((expense) => expense.category)),
    ];

    const categoryBreakdown = categories
      .map((cat) => {
        const categoryExpenses = expenses.filter(
          (expense) => expense.category === cat
        );
        return {
          category: cat,
          total: categoryExpenses.reduce(
            (sum, expense) => sum + expense.amount,
            0
          ),
          count: categoryExpenses.length,
        };
      })
      .sort((a, b) => b.total - a.total);

    const summary = {
      totalAmount,
      totalCount: expenses.length,
      categoryBreakdown,
      averageAmount:
        expenses.length > 0 ? totalAmount / expenses.length : 0,
    };

    res.json({
      expenses,
      summary,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get monthly expenses error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/expenses/financial-health
// @desc    Get financial health score and analysis
// @access  Private
router.get("/financial-health", async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Get current month data
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(
      currentYear,
      currentMonth + 1,
      0,
      23,
      59,
      59
    );

    // Get previous month data for comparison
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthStart = new Date(prevYear, prevMonth, 1);
    const prevMonthEnd = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59);

    // Get last 3 months for trend analysis
    const threeMonthsAgo = new Date(currentYear, currentMonth - 3, 1);

    // Parallel data fetching
    const [
      currentMonthExpenses,
      prevMonthExpenses,
      currentMonthBills,
      prevMonthBills,
      last3MonthsExpenses,
      last3MonthsBills,
      totalExpenses,
      totalBills,
    ] = await Promise.all([
      // Current month expenses
      Expense.aggregate([
        {
          $match: {
            user: userId,
            date: { $gte: currentMonthStart, $lte: currentMonthEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      // Previous month expenses
      Expense.aggregate([
        {
          $match: {
            user: userId,
            date: { $gte: prevMonthStart, $lte: prevMonthEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      // Current month bills
      Bill.aggregate([
        {
          $match: {
            user: userId,
            dueDate: { $gte: currentMonthStart, $lte: currentMonthEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            paid: { $sum: { $cond: ["$isPaid", "$amount", 0] } },
            paidCount: { $sum: { $cond: ["$isPaid", 1, 0] } },
            totalCount: { $sum: 1 },
          },
        },
      ]),

      // Previous month bills
      Bill.aggregate([
        {
          $match: {
            user: userId,
            dueDate: { $gte: prevMonthStart, $lte: prevMonthEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            paid: { $sum: { $cond: ["$isPaid", "$amount", 0] } },
            paidCount: { $sum: { $cond: ["$isPaid", 1, 0] } },
            totalCount: { $sum: 1 },
          },
        },
      ]),

      // Last 3 months expenses for trend
      Expense.aggregate([
        {
          $match: {
            user: userId,
            date: { $gte: threeMonthsAgo, $lte: currentMonthEnd },
          },
        },
        {
          $group: {
            _id: { month: { $month: "$date" }, year: { $year: "$date" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      // Last 3 months bills for trend
      Bill.aggregate([
        {
          $match: {
            user: userId,
            dueDate: { $gte: threeMonthsAgo, $lte: currentMonthEnd },
          },
        },
        {
          $group: {
            _id: {
              month: { $month: "$dueDate" },
              year: { $year: "$dueDate" },
            },
            total: { $sum: "$amount" },
            paid: { $sum: { $cond: ["$isPaid", "$amount", 0] } },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      // Total historical data for averages
      Expense.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      Bill.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            paid: { $sum: { $cond: ["$isPaid", "$amount", 0] } },
            paidCount: { $sum: { $cond: ["$isPaid", 1, 0] } },
            totalCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Extract data with defaults
    const currentExpenses = currentMonthExpenses[0] || {
      total: 0,
      count: 0,
    };
    const prevExpenses = prevMonthExpenses[0] || { total: 0, count: 0 };
    const currentBills = currentMonthBills[0] || {
      total: 0,
      paid: 0,
      paidCount: 0,
      totalCount: 0,
    };
    const prevBills = prevMonthBills[0] || {
      total: 0,
      paid: 0,
      paidCount: 0,
      totalCount: 0,
    };
    const historicalExpenses = totalExpenses[0] || { total: 0, count: 0 };
    const historicalBills = totalBills[0] || {
      total: 0,
      paid: 0,
      paidCount: 0,
      totalCount: 0,
    };

    // Calculate Financial Health Score (0-100)
    let healthScore = 0;
    const scoreBreakdown = {};

    // 1. Bill Payment Performance (40 points)
    const billPaymentRate =
      currentBills.totalCount > 0
        ? (currentBills.paidCount / currentBills.totalCount) * 100
        : 100;
    const billPaymentScore = Math.min(40, (billPaymentRate / 100) * 40);
    scoreBreakdown.billPayment = {
      score: Math.round(billPaymentScore),
      rate: Math.round(billPaymentRate),
      description: `${currentBills.paidCount}/${currentBills.totalCount} bills paid this month`,
    };
    healthScore += billPaymentScore;

    // 2. Spending Consistency (30 points)
    const expenseVariation =
      prevExpenses.total > 0
        ? Math.abs(currentExpenses.total - prevExpenses.total) /
          prevExpenses.total
        : 0;
    const consistencyScore = Math.max(0, 30 - expenseVariation * 30);
    scoreBreakdown.spendingConsistency = {
      score: Math.round(consistencyScore),
      variation: Math.round(expenseVariation * 100),
      description:
        expenseVariation < 0.1
          ? "Very consistent spending"
          : expenseVariation < 0.3
          ? "Moderately consistent spending"
          : "Highly variable spending",
    };
    healthScore += consistencyScore;

    // 3. Expense Trend (20 points)
    let trendScore = 20;
    if (last3MonthsExpenses.length >= 2) {
      const recentExpenses = last3MonthsExpenses.slice(-2);
      if (recentExpenses[1].total > recentExpenses[0].total * 1.1) {
        trendScore = 10; // Increasing trend
      } else if (recentExpenses[1].total < recentExpenses[0].total * 0.9) {
        trendScore = 20; // Decreasing trend (good)
      } else {
        trendScore = 15; // Stable trend
      }
    }
    scoreBreakdown.expenseTrend = {
      score: trendScore,
      description:
        trendScore === 20
          ? "Decreasing expenses"
          : trendScore === 15
          ? "Stable expenses"
          : "Increasing expenses",
    };
    healthScore += trendScore;

    // 4. Financial Activity (10 points)
    const activityScore = Math.min(10, (currentExpenses.count / 10) * 10);
    scoreBreakdown.activity = {
      score: Math.round(activityScore),
      transactions: currentExpenses.count,
      description: `${currentExpenses.count} transactions this month`,
    };
    healthScore += activityScore;

    // Round final score
    healthScore = Math.round(Math.min(100, Math.max(0, healthScore)));

    // Monthly Comparison
    const monthlyComparison = {
      expenses: {
        current: currentExpenses.total,
        previous: prevExpenses.total,
        change:
          prevExpenses.total > 0
            ? ((currentExpenses.total - prevExpenses.total) /
                prevExpenses.total) *
              100
            : 0,
        changeType:
          currentExpenses.total > prevExpenses.total
            ? "increase"
            : "decrease",
      },
      bills: {
        current: currentBills.total,
        previous: prevBills.total,
        change:
          prevBills.total > 0
            ? ((currentBills.total - prevBills.total) / prevBills.total) *
              100
            : 0,
        changeType:
          currentBills.total > prevBills.total ? "increase" : "decrease",
      },
      paymentRate: {
        current: billPaymentRate,
        previous:
          prevBills.totalCount > 0
            ? (prevBills.paidCount / prevBills.totalCount) * 100
            : 100,
        change: 0,
      },
    };

    // Calculate payment rate change
    monthlyComparison.paymentRate.change =
      monthlyComparison.paymentRate.current -
      monthlyComparison.paymentRate.previous;

    // Generate Improvement Suggestions
    const suggestions = [];

    if (billPaymentRate < 90) {
      suggestions.push({
        type: "critical",
        title: "Improve Bill Payment Rate",
        description: `You've paid ${currentBills.paidCount} out of ${currentBills.totalCount} bills this month. Set up automatic payments to avoid late fees.`,
        impact: "high",
      });
    }

    if (expenseVariation > 0.3) {
      suggestions.push({
        type: "warning",
        title: "Stabilize Your Spending",
        description: `Your expenses varied by ${Math.round(
          expenseVariation * 100
        )}% from last month. Create a monthly budget to maintain consistency.`,
        impact: "medium",
      });
    }

    if (currentExpenses.total > prevExpenses.total * 1.2) {
      suggestions.push({
        type: "warning",
        title: "Monitor Expense Growth",
        description: `Your expenses increased by ${Math.round(
          monthlyComparison.expenses.change
        )}% this month. Review your spending categories.`,
        impact: "medium",
      });
    }

    if (currentExpenses.count < 5) {
      suggestions.push({
        type: "info",
        title: "Track More Expenses",
        description:
          "Recording more transactions will give you better insights into your spending patterns.",
        impact: "low",
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        type: "success",
        title: "Great Financial Health!",
        description:
          "You're maintaining excellent financial habits. Keep up the good work!",
        impact: "positive",
      });
    }

    res.json({
      healthScore,
      scoreBreakdown,
      monthlyComparison,
      suggestions,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Financial health calculation error:", error);
    res
      .status(500)
      .json({ message: "Server error calculating financial health" });
  }
});

export default router;
