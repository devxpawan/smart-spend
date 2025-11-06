import { check, validationResult } from "express-validator";
import express from "express";
import mongoose from "mongoose";
import BankAccount from "../models/BankAccount.js";
import Expense from "../models/Expense.js";
import { checkAndSendExpenseWarning } from "../utils/expenseWarning.js";

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
router.post(
  "/",
  [
    check("description", "Description is required").trim().notEmpty().matches(/[a-zA-Z]/).withMessage("Description must contain at least one alphabetic character"),
    check("amount", "Amount is required and must be a number").isNumeric(),
    check("category", "Category is required").notEmpty(),
    check("bankAccount", "Bank account is invalid").optional().isMongoId(),
    check("isRecurring", "isRecurring must be a boolean").optional().isBoolean(),
    check("recurringInterval", "Invalid recurring interval").optional().isIn([
      "daily",
      "weekly",
      "monthly",
      "yearly",
    ]),
    check("recurringEndDate", "Invalid date").optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const { amount, description, category, date, paymentMethod, bankAccount, 
      isRecurring, recurringInterval, recurringEndDate } = req.body;

    let session;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      if (bankAccount) {
        const account = await BankAccount.findById(bankAccount).session(session);
        if (!account) {
          throw new Error("Bank account not found");
        }
        account.currentBalance -= amount;
        await account.save({ session });
      }

      // Calculate next recurring date if recurring
      let nextRecurringDate = undefined;
      if (isRecurring && recurringInterval) {
        const startDate = new Date(date);
        switch (recurringInterval) {
          case "daily":
            nextRecurringDate = new Date(startDate);
            nextRecurringDate.setDate(startDate.getDate() + 1);
            break;
          case "weekly":
            nextRecurringDate = new Date(startDate);
            nextRecurringDate.setDate(startDate.getDate() + 7);
            break;
          case "monthly":
            nextRecurringDate = new Date(startDate);
            nextRecurringDate.setMonth(startDate.getMonth() + 1);
            break;
          case "yearly":
            nextRecurringDate = new Date(startDate);
            nextRecurringDate.setFullYear(startDate.getFullYear() + 1);
            break;
        }
      }

      const newExpense = new Expense({
        user: req.user.id,
        amount,
        description,
        category,
        date: date || Date.now(),
        paymentMethod,
        bankAccount: bankAccount || undefined,
        isRecurring: isRecurring || false,
        recurringInterval: isRecurring ? recurringInterval : undefined,
        recurringEndDate: isRecurring ? recurringEndDate : undefined,
        nextRecurringDate: isRecurring ? nextRecurringDate : undefined,
      });

      const expense = await newExpense.save({ session });
      await session.commitTransaction();

      // Trigger expense warning check asynchronously
      checkAndSendExpenseWarning(req.user.id).catch(err => {
        console.error('Error sending expense warning:', err);
      });

      res.status(201).json(expense);
    } catch (transactionError) {
      if (session) await session.abortTransaction();
      throw transactionError;
    } finally {
      if (session) session.endSession();
    }
  } catch (error) {
    console.error("Create expense error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

router.delete("/bulk-delete", async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "Expense IDs must be a non-empty array." });
  }

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const expensesToDelete = await Expense.find({
      _id: { $in: ids },
      user: req.user.id,
    }).session(session);
    
    const foundIds = expensesToDelete.map(i => i._id);

    // Adjust bank account balances
    const bankUpdates = new Map();
    for (const expense of expensesToDelete) {
      if (expense.bankAccount) {
        const accountId = expense.bankAccount.toString();
        const amount = bankUpdates.get(accountId) || 0;
        bankUpdates.set(accountId, amount + expense.amount);
      }
    }

    const updatePromises = [];
    for (const [accountId, adjustment] of bankUpdates.entries()) {
      updatePromises.push(
        BankAccount.updateOne(
          { _id: accountId },
          { $inc: { currentBalance: adjustment } },
          { session }
        )
      );
    }
    await Promise.all(updatePromises);

    // Delete the expenses that were found
    if (foundIds.length > 0) {
        await Expense.deleteMany({
          _id: { $in: foundIds },
          user: req.user.id,
        }, { session });
    }

    await session.commitTransaction();
    res.json({ message: `${foundIds.length} expenses removed successfully.` });

  } catch (error) {
    if (session) await session.abortTransaction();
    console.error("Bulk expense delete error:", error);
    res.status(500).json({ message: "Server error during bulk delete.", error: error.message });
  } finally {
    if (session) session.endSession();
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update expense
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
    check("bankAccount", "Bank account is invalid").optional().isMongoId(),
    check("isRecurring", "isRecurring must be a boolean").optional().isBoolean(),
    check("recurringInterval", "Invalid recurring interval").optional().isIn([
      "daily",
      "weekly",
      "monthly",
      "yearly",
    ]),
    check("recurringEndDate", "Invalid date").optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const { amount, description, category, date, paymentMethod, bankAccount,
      isRecurring, recurringInterval, recurringEndDate } = req.body;

    let session;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      const expense = await Expense.findOne({
        _id: req.params.id,
        user: req.user.id,
      }).session(session);

      if (!expense) {
        throw new Error("Expense not found");
      }

      const oldAmount = expense.amount;
      const oldBankAccount = expense.bankAccount;
      const newAmount = amount !== undefined ? amount : oldAmount;

      // Revert the old transaction if there was a bank account
      if (oldBankAccount) {
        const oldAccount = await BankAccount.findById(oldBankAccount).session(session);
        if (oldAccount) {
          oldAccount.currentBalance += oldAmount;
          await oldAccount.save({ session });
        }
      }

      // Apply the new transaction if there is a new bank account
      if (bankAccount) {
        const newAccount = await BankAccount.findById(bankAccount).session(session);
        if (!newAccount) {
          throw new Error("New bank account not found");
        }
        newAccount.currentBalance -= newAmount;
        await newAccount.save({ session });
      }

      // Calculate next recurring date if recurring
      let nextRecurringDate = expense.nextRecurringDate;
      if (isRecurring !== undefined) {
        if (isRecurring && recurringInterval) {
          const startDate = date ? new Date(date) : new Date(expense.date);
          switch (recurringInterval) {
            case "daily":
              nextRecurringDate = new Date(startDate);
              nextRecurringDate.setDate(startDate.getDate() + 1);
              break;
            case "weekly":
              nextRecurringDate = new Date(startDate);
              nextRecurringDate.setDate(startDate.getDate() + 7);
              break;
            case "monthly":
              nextRecurringDate = new Date(startDate);
              nextRecurringDate.setMonth(startDate.getMonth() + 1);
              break;
            case "yearly":
              nextRecurringDate = new Date(startDate);
              nextRecurringDate.setFullYear(startDate.getFullYear() + 1);
              break;
          }
        } else {
          // Not recurring anymore
          nextRecurringDate = undefined;
        }
      }

      // Update expense fields
      expense.amount = amount !== undefined ? amount : expense.amount;
      expense.description = description || expense.description;
      expense.category = category || expense.category;
      expense.date = date || expense.date;
      expense.paymentMethod = paymentMethod || expense.paymentMethod;
      expense.bankAccount = bankAccount || undefined;
      
      // Update recurring fields
      if (isRecurring !== undefined) {
        expense.isRecurring = isRecurring;
        if (isRecurring) {
          expense.recurringInterval = recurringInterval;
          expense.recurringEndDate = recurringEndDate || undefined;
          expense.nextRecurringDate = nextRecurringDate;
        } else {
          expense.recurringInterval = undefined;
          expense.recurringEndDate = undefined;
          expense.nextRecurringDate = undefined;
        }
      }

      const updatedExpense = await expense.save({ session });
      await session.commitTransaction();
      res.json(updatedExpense);
    } catch (transactionError) {
      if (session) await session.abortTransaction();
      throw transactionError;
    } finally {
      if (session) session.endSession();
    }
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
    let session;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      const expense = await Expense.findOne({
        _id: req.params.id,
        user: req.user.id,
      }).session(session);

      if (!expense) {
        throw new Error("Expense not found");
      }

      if (expense.bankAccount) {
        const account = await BankAccount.findById(expense.bankAccount).session(session);
        if (account) {
          account.currentBalance += expense.amount;
          await account.save({ session });
        }
      }

      await expense.deleteOne({ session });
      await session.commitTransaction();
      res.json({ message: "Expense removed" });
    } catch (transactionError) {
      if (session) await session.abortTransaction();
      throw transactionError;
    } finally {
      if (session) session.endSession();
    }
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

router.patch("/bulk-update", async (req, res) => {
  const { ids, updates } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "Expense IDs must be a non-empty array." });
  }

  if (typeof updates !== 'object' || updates === null || Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "Update data must be a non-empty object." });
  }

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const updatePromises = ids.map(async (id) => {
      const expense = await Expense.findOne({ _id: id, user: req.user.id }).session(session);
      if (!expense) {
        console.warn(`Expense with ID ${id} not found for this user.`);
        return null;
      }

      const oldAmount = expense.amount;
      const newAmount = updates.amount !== undefined ? parseFloat(updates.amount) : oldAmount;

      if (updates.amount !== undefined && newAmount !== oldAmount) {
        if (expense.bankAccount) {
          const bankAccount = await BankAccount.findById(expense.bankAccount).session(session);
          if (bankAccount) {
            bankAccount.currentBalance = bankAccount.currentBalance + oldAmount - newAmount;
            await bankAccount.save({ session });
          }
        }
      }

      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          expense[key] = updates[key];
        }
      });

      return await expense.save({ session });
    });

    const updatedExpenses = await Promise.all(updatePromises);

    await session.commitTransaction();
    res.json({ 
      message: "Expenses updated successfully", 
      updatedCount: updatedExpenses.filter(e => e !== null).length 
    });

  } catch (error) {
    if (session) await session.abortTransaction();
    console.error("Bulk expense update error:", error);
    res.status(500).json({ message: "Server error during bulk update.", error: error.message });
  } finally {
    if (session) session.endSession();
  }
});

export default router;