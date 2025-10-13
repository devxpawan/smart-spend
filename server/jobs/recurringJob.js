/**
 * This file sets up a scheduled job to process recurring transactions daily.
 * In a production environment, this would typically be run via a cron job or
 * a dedicated job scheduler like node-cron or a cloud service.
 */

import cron from 'node-cron';
import { processRecurringTransactions } from '../utils/recurringProcessor.js';

// Schedule the job to run daily at midnight (00:00)
// You can adjust the schedule as needed:
// - '* * * * *' = every minute (for testing)
// - '0 0 * * *' = every day at midnight
// - '0 0 * * 0' = every Sunday at midnight
// - '0 0 1 * *' = every first day of the month at midnight

const schedule = process.env.RECURRING_PROCESSOR_SCHEDULE || '0 0 * * *'; // Default: daily at midnight

console.log(`Scheduling recurring transaction processor with cron: ${schedule}`);

// Schedule the job
const job = cron.schedule(schedule, async () => {
  console.log('Running scheduled recurring transaction processor...');
  try {
    await processRecurringTransactions();
    console.log('Recurring transaction processor completed successfully.');
  } catch (error) {
    console.error('Error in recurring transaction processor:', error);
  }
});

// Export the job so it can be controlled programmatically if needed
export default job;