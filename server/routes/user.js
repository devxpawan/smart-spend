import express from 'express';
import Bill from '../models/Bill.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import Warranty from '../models/Warranty.js';

const router = express.Router();

// @route   DELETE api/user/records
// @desc    Clear user records
// @access  Private
router.delete('/records', async (req, res) => {
  try {
    const { records } = req.body;
    const userId = req.user.id;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ msg: 'Invalid request' });
    }

    const promises = [];

    if (records.includes('bills')) {
      promises.push(Bill.deleteMany({ user: userId }));
    }
    if (records.includes('expenses')) {
      promises.push(Expense.deleteMany({ user: userId }));
    }
    if (records.includes('incomes')) {
      promises.push(Income.deleteMany({ user: userId }));
    }
    if (records.includes('warranties')) {
      promises.push(Warranty.deleteMany({ user: userId }));
    }

    await Promise.all(promises);

    res.json({ msg: 'Records cleared successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

export default router;