import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

// Apply authentication middleware to all routes in this file
router.use(authenticateToken);

// @route   PUT api/user/categories/income
// @desc    Update user's custom income categories
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
      { customIncomeCategories: validCategories },
      { new: true }
    ).select('-password');

    res.json({ user });
  } catch (err) {
    console.error('Error in PUT /api/user/categories/income:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/user/categories/expense
// @desc    Update user's custom expense categories
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
      { customExpenseCategories: validCategories },
      { new: true }
    ).select('-password');

    res.json({ user });
  } catch (err) {
    console.error('Error in PUT /api/user/categories/expense:', err.message);
    res.status(500).send('Server Error');
  }
});

export default router;