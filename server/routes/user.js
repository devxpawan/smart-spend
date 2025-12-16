import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import User from "../models/User.js";
import Bill from "../models/Bill.js";
import Expense from "../models/Expense.js";
import Income from "../models/Income.js";
import Warranty from "../models/Warranty.js";

const router = express.Router();

// Apply authentication middleware to all routes in this file
router.use(authenticateToken);

// @route   PUT api/user/categories/income
// @desc    Update user's income categories
// @access  Private
router.put('/categories/income', async (req, res) => {
  console.log('PUT /api/user/categories/income called');
  try {
    const { categories } = req.body;
    const userId = req.user.id;
    
    console.log('User ID:', userId);
    console.log('Categories:', categories);

    if (!Array.isArray(categories)) {
      return res.status(400).json({ msg: 'Categories must be an array' });
    }

    // Validate categories - each should be a non-empty string
    const validCategories = categories.filter(
      (cat) => typeof cat === 'string' && cat.trim().length > 0
    );
    
    console.log('Valid categories:', validCategories);

    const user = await User.findByIdAndUpdate(
      userId,
      { incomeCategories: validCategories },
      { new: true }
    ).select('-password');

    res.json({ user });
  } catch (err) {
    console.error('Error in PUT /api/user/categories/income:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/user/categories/expense
// @desc    Update user's expense categories
// @access  Private
router.put('/categories/expense', async (req, res) => {
  console.log('PUT /api/user/categories/expense called');
  try {
    const { categories } = req.body;
    const userId = req.user.id;
    
    console.log('User ID:', userId);
    console.log('Categories:', categories);

    if (!Array.isArray(categories)) {
      return res.status(400).json({ msg: 'Categories must be an array' });
    }

    // Validate categories - each should be a non-empty string
    const validCategories = categories.filter(
      (cat) => typeof cat === 'string' && cat.trim().length > 0
    );
    
    console.log('Valid categories:', validCategories);

    const user = await User.findByIdAndUpdate(
      userId,
      { expenseCategories: validCategories },
      { new: true }
    ).select('-password');

    res.json({ user });
  } catch (err) {
    console.error('Error in PUT /api/user/categories/expense:', err.message);
    res.status(500).send('Server Error');
  }
});

export default router;

// @route   DELETE api/user/records
// @desc    Clear selected user records (bills, expenses, incomes, warranties)
// @access  Private
router.delete('/records', async (req, res) => {
  try {
    const { records } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'Please provide records array with at least one item.' });
    }

    // Normalize allowed keys
    const allowed = new Set(['bills', 'expenses', 'incomes', 'warranties']);
    const selected = records.filter(r => typeof r === 'string').map(r => r.toLowerCase());
    const invalid = selected.filter(r => !allowed.has(r));
    if (invalid.length > 0) {
      return res.status(400).json({ message: `Invalid record types: ${invalid.join(', ')}` });
    }

    const results = {};

    const tasks = [];

    if (selected.includes('bills')) {
      tasks.push(
        (async () => {
          const { deletedCount } = await Bill.deleteMany({ user: userId });
          results.bills = deletedCount || 0;
        })()
      );
    }

    if (selected.includes('expenses')) {
      tasks.push(
        (async () => {
          const { deletedCount } = await Expense.deleteMany({ user: userId });
          results.expenses = deletedCount || 0;
        })()
      );
    }

    if (selected.includes('incomes')) {
      tasks.push(
        (async () => {
          const { deletedCount } = await Income.deleteMany({ user: userId });
          results.incomes = deletedCount || 0;
        })()
      );
    }

    if (selected.includes('warranties')) {
      // Use per-document delete to trigger Cloudinary cleanup hooks
      tasks.push(
        (async () => {
          const warranties = await Warranty.find({ user: userId }).select('_id');
          let count = 0;
          for (const w of warranties) {
            try {
              await Warranty.findByIdAndDelete(w._id);
              count += 1;
            } catch (e) {
              // continue on individual failures
            }
          }
          results.warranties = count;
        })()
      );
    }

    await Promise.all(tasks);

    const total = Object.values(results).reduce((acc, n) => acc + (n || 0), 0);
    return res.json({ message: 'Records cleared successfully', results, total });
  } catch (err) {
    console.error('Error clearing user records:', err);
    return res.status(500).json({ message: 'Server error while clearing records.' });
  }
});