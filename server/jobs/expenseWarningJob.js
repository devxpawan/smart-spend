import cron from 'node-cron';
import User from '../models/User.js';
import { checkAndSendExpenseWarning } from '../utils/expenseWarning.js';

// Schedule the job to run daily at 9 AM
const schedule = process.env.EXPENSE_WARNING_SCHEDULE || '0 9 * * *';

console.log(`Scheduling expense warning job with cron: ${schedule}`);

const job = cron.schedule(schedule, async () => {
  console.log('Running scheduled expense warning check...');
  try {
    const users = await User.find({ isVerified: true });
    for (const user of users) {
      await checkAndSendExpenseWarning(user._id);
    }
    console.log('Expense warning check completed successfully.');
  } catch (error) {
    console.error('Error in expense warning job:', error);
  }
});

export default job;