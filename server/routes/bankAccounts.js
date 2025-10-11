import express from 'express';
import { check, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import BankAccount from '../models/BankAccount.js';
import mongoose from 'mongoose';

const router = express.Router();

// @route   GET /api/bank-accounts
// @desc    Get all bank accounts for the authenticated user
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const bankAccounts = await BankAccount.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(bankAccounts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/bank-accounts
// @desc    Create a new bank account
// @access  Private
router.post(
  '/',
  [authenticateToken, [
    check('bankName', 'Bank name is required').not().isEmpty(),
    check('accountName', 'Account name is required').not().isEmpty(),
    check('accountType', 'Account type is required').isIn(['Checking', 'Savings', 'Credit Card', 'Investment', 'Other']),
    check('initialBalance', 'Initial balance must be a number').isNumeric(),
  ]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bankName, accountName, accountType, initialBalance } = req.body;

    try {
      // Check if an account with the same name already exists for the user and bankName
      let existingBankAccount = await BankAccount.findOne({ user: req.user.id, bankName, accountName });
      if (existingBankAccount) {
        return res.status(409).json({ msg: 'An account with this name already exists.' });
      }

      const newBankAccount = new BankAccount({
        user: req.user.id,
        bankName,
        accountName,
        accountType,
        initialBalance,
        currentBalance: initialBalance, // Initial balance is also the current balance on creation
      });

      const bankAccount = await newBankAccount.save();
      res.status(201).json(bankAccount);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT /api/bank-accounts/:id
// @desc    Update an existing bank account
// @access  Private
router.put(
  '/:id',
  [authenticateToken, [
    check('bankName', 'Bank name is required').optional().not().isEmpty(),
    check('accountName', 'Account name is required').optional().not().isEmpty(),
    check('accountType', 'Account type is required').optional().isIn(['Checking', 'Savings', 'Credit Card', 'Investment', 'Other']),
    check('initialBalance', 'Initial balance must be a number').optional().isNumeric(),
  ]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bankName, accountName, accountType, initialBalance } = req.body;

    // Build bank account object
    const bankAccountFields = {};
    if (bankName) bankAccountFields.bankName = bankName;
    if (accountName) bankAccountFields.accountName = accountName;
    if (accountType) bankAccountFields.accountType = accountType;
    if (initialBalance !== undefined) {
      bankAccountFields.initialBalance = initialBalance;
      // If initial balance is updated, current balance should also be updated to reflect the change
      // This logic might need to be more complex if transactions are already recorded
      bankAccountFields.currentBalance = initialBalance;
    }

    try {
      let bankAccount = await BankAccount.findById(req.params.id);

      if (!bankAccount) return res.status(404).json({ msg: 'Bank account not found' });

      // Make sure user owns bank account
      if (bankAccount.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
      }

      // Check if an account with the same name already exists for the user and bankName (excluding the current account)
      if (accountName) {
        const existingBankAccount = await BankAccount.findOne({
          user: req.user.id,
          bankName,
          accountName,
          _id: { $ne: req.params.id } // Exclude the current bank account being updated
        });
        if (existingBankAccount) {
          return res.status(409).json({ msg: 'An account with this name already exists.' });
        }
      }

      bankAccount = await BankAccount.findByIdAndUpdate(
        req.params.id,
        { $set: bankAccountFields },
        { new: true }
      );

      res.json(bankAccount);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Bank account not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE /api/bank-accounts/:id
// @desc    Delete a bank account
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Check for valid ObjectId to prevent casting errors
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ msg: 'Bank account not found' });
    }

    let bankAccount = await BankAccount.findById(req.params.id);

    if (!bankAccount) return res.status(404).json({ msg: 'Bank account not found' });

    // Make sure user owns bank account
    if (bankAccount.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await BankAccount.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Bank account removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

export default router;
