import express from "express";
import { check, validationResult } from "express-validator";
import Expense from "../models/Expense.js";
import Income from "../models/Income.js";

const router = express.Router();

// @route   GET /api/recurring
// @desc    Get all recurring transactions for a user
// @access  Private
router.get("/", async (req, res) => {
  try {
    console.log("Fetching recurring transactions for user:", req.user?.id);

    // Validate user
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get recurring expenses
    const expenses = await Expense.find({
      user: req.user.id,
      isRecurring: true,
    }).sort({ nextRecurringDate: 1 });

    // Get recurring incomes
    const incomes = await Income.find({
      user: req.user.id,
      isRecurring: true,
    }).sort({ nextRecurringDate: 1 });

    res.json({
      expenses,
      incomes,
    });
  } catch (error) {
    console.error("Get recurring transactions error:", error);
    // Send more detailed error information
    res.status(500).json({
      message: "Failed to fetch recurring transactions",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// @route   PUT /api/recurring/:id
// @desc    Update recurring transaction
// @access  Private
router.put(
  "/:id",
  [
    check("isRecurring", "isRecurring is required").isBoolean(),
    check("recurringInterval", "Invalid recurring interval")
      .optional()
      .isIn(["daily", "weekly", "monthly", "yearly"]),
    check("recurringEndDate", "Invalid date").optional().isISO8601(),
    check("nextRecurringDate", "Invalid date").optional().isISO8601(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { type } = req.query; // 'expense' or 'income'
      const {
        isRecurring,
        recurringInterval,
        recurringEndDate,
        nextRecurringDate,
      } = req.body;

      // Validate type parameter
      if (type !== "expense" && type !== "income") {
        return res
          .status(400)
          .json({
            message: "Invalid transaction type. Must be 'expense' or 'income'",
          });
      }

      // Validate user
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      let transaction;
      if (type === "expense") {
        transaction = await Expense.findOne({
          _id: req.params.id,
          user: req.user.id,
        });
      } else if (type === "income") {
        transaction = await Income.findOne({
          _id: req.params.id,
          user: req.user.id,
        });
      }

      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Update fields
      transaction.isRecurring = isRecurring;
      if (isRecurring) {
        transaction.recurringInterval = recurringInterval;
        transaction.recurringEndDate = recurringEndDate
          ? new Date(recurringEndDate)
          : undefined;
        transaction.nextRecurringDate = nextRecurringDate
          ? new Date(nextRecurringDate)
          : undefined;
      } else {
        transaction.recurringInterval = undefined;
        transaction.recurringEndDate = undefined;
        transaction.nextRecurringDate = undefined;
      }

      const updatedTransaction = await transaction.save();
      res.json(updatedTransaction);
    } catch (error) {
      console.error("Update recurring transaction error:", error);
      res.status(500).json({
        message: "Failed to update recurring transaction",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

// @route   DELETE /api/recurring/:id
// @desc    Delete recurring transaction
// @access  Private
router.delete("/:id", async (req, res) => {
  try {
    const { type } = req.query; // 'expense' or 'income'

    // Validate type parameter
    if (type !== "expense" && type !== "income") {
      return res
        .status(400)
        .json({
          message: "Invalid transaction type. Must be 'expense' or 'income'",
        });
    }

    // Validate user
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    let transaction;
    if (type === "expense") {
      transaction = await Expense.findOne({
        _id: req.params.id,
        user: req.user.id,
      });
    } else if (type === "income") {
      transaction = await Income.findOne({
        _id: req.params.id,
        user: req.user.id,
      });
    }

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Remove recurring fields
    transaction.isRecurring = false;
    transaction.recurringInterval = undefined;
    transaction.recurringEndDate = undefined;
    transaction.nextRecurringDate = undefined;

    const updatedTransaction = await transaction.save();
    res.json(updatedTransaction);
  } catch (error) {
    console.error("Delete recurring transaction error:", error);
    res.status(500).json({
      message: "Failed to remove recurring transaction",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

export default router;
