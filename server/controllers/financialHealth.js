
import mongoose from "mongoose";
import Bill from "../models/Bill.js";
import Expense from "../models/Expense.js";
import Income from "../models/Income.js";

// @desc    Get financial health score and analysis
// @access  Private
export const getFinancialHealth = async (req, res) => {
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
      currentMonthIncomes,
      prevMonthIncomes,
      last3MonthsIncomes,
      totalIncomes,
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

      // Current month incomes
      Income.aggregate([
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

      // Previous month incomes
      Income.aggregate([
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

      // Last 3 months incomes for trend
      Income.aggregate([
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

      // Total historical data for incomes
      Income.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
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

    const currentIncomes = currentMonthIncomes[0] || { total: 0, count: 0 };
    const prevIncomes = prevMonthIncomes[0] || { total: 0, count: 0 };
    const historicalIncomes = totalIncomes[0] || { total: 0, count: 0 };

    // Calculate Financial Health Score (Monthly Surplus/Deficit)
    const totalOutgoings = currentExpenses.total + currentBills.total;
    const healthScore = currentIncomes.total - totalOutgoings;

    const scoreBreakdown = {
      monthlyBalance: {
        amount: healthScore,
        description:
          healthScore >= 0
            ? `You have a surplus of ${healthScore.toFixed(2)}.`
            : `You have a deficit of ${Math.abs(healthScore).toFixed(2)}.`,
        },
    };

    // Calculate bill payment rate for monthly comparison
    const billPaymentRate =
      currentBills.totalCount > 0
        ? (currentBills.paidCount / currentBills.totalCount) * 100
        : 100;

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
      incomes: {
        current: currentIncomes.total,
        previous: prevIncomes.total,
        change:
          prevIncomes.total > 0
            ? ((currentIncomes.total - prevIncomes.total) /
                prevIncomes.total) *
              100
            : 0,
        changeType:
          currentIncomes.total > prevIncomes.total
            ? "increase"
            : "decrease",
      },
    };

    // Calculate payment rate change
    monthlyComparison.paymentRate.change =
      monthlyComparison.paymentRate.current -
      monthlyComparison.paymentRate.previous;

    // Generate Improvement Suggestions
    const suggestions = [];

    if (healthScore >= 500) { // Example threshold for excellent surplus
      suggestions.push({
        type: "success",
        title: "Excellent Monthly Surplus!",
        description:
          "You're consistently generating a healthy surplus. Consider investing or saving more!",
        impact: "positive",
      });
    } else if (healthScore >= 0) { // Breaking even or small surplus
      suggestions.push({
        type: "info",
        title: "Managing Well",
        description:
          "You're breaking even or have a small surplus. Look for opportunities to increase your income or reduce non-essential spending.",
        impact: "medium",
      });
    } else if (healthScore >= -200) { // Small deficit
      suggestions.push({
        type: "warning",
        title: "Slight Deficit Detected",
        description:
          "You're spending slightly more than you earn. Review your recent expenses to identify areas for adjustment.",
        impact: "high",
      });
    } else { // Significant deficit
      suggestions.push({
        type: "critical",
        title: "Significant Monthly Deficit!",
        description:
          "You are consistently spending more than you earn. Immediate action is needed to reduce expenses or increase income.",
        impact: "critical",
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
};
