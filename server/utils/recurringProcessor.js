/**
 * This is a conceptual script for processing recurring transactions.
 * In a production environment, this would be run as a scheduled job (e.g., daily via cron).
 * 
 * The script would:
 * 1. Find all recurring transactions that are due today
 * 2. Create new transaction records for each
 * 3. Update the nextRecurringDate for each recurring transaction
 * 4. Send notifications to users
 */

import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import Notification from '../models/Notification.js'; // Add Notification model

// Function to process recurring transactions
export async function processRecurringTransactions() {
  try {
    console.log('Processing recurring transactions...');
    
    // Get current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Process recurring expenses
    await processRecurringExpenses(today);
    
    // Process recurring incomes
    await processRecurringIncomes(today);
    
    console.log('Recurring transactions processed successfully.');
  } catch (error) {
    console.error('Error processing recurring transactions:', error);
  }
}

// Process recurring expenses
async function processRecurringExpenses(today) {
  // Find all recurring expenses due today or before today
  const dueExpenses = await Expense.find({
    isRecurring: true,
    nextRecurringDate: { $lte: today },
    $or: [
      { recurringEndDate: { $exists: false } },
      { recurringEndDate: { $gte: today } }
    ]
  });
  
  console.log(`Found ${dueExpenses.length} recurring expenses due today.`);
  
  for (const expense of dueExpenses) {
    try {
      // Create a new expense record
      const newExpense = new Expense({
        user: expense.user,
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        date: today,
        paymentMethod: expense.paymentMethod,
        bankAccount: expense.bankAccount,
        isRecurring: false, // New expense is not recurring
      });
      
      await newExpense.save();
      console.log(`Created new expense record for: ${expense.description}`);
      
      // Create notification for the user
      await createNotification({
        user: expense.user,
        title: "Recurring Expense Processed",
        message: `Your recurring expense "${expense.description}" of ${expense.amount} has been processed.`,
        type: "success",
        relatedTransaction: newExpense._id,
        relatedTransactionType: "Expense"
      });
      
      // Update the next recurring date
      const nextDate = calculateNextRecurringDate(today, expense.recurringInterval);
      
      // Check if we've reached the end date
      if (expense.recurringEndDate && nextDate > expense.recurringEndDate) {
        // Remove recurring flags
        expense.isRecurring = false;
        expense.recurringInterval = undefined;
        expense.recurringEndDate = undefined;
        expense.nextRecurringDate = undefined;
        console.log(`Recurring expense ended: ${expense.description}`);
      } else {
        // Update next recurring date
        expense.nextRecurringDate = nextDate;
      }
      
      await expense.save();
    } catch (error) {
      console.error(`Error processing expense ${expense._id}:`, error);
      
      // Create error notification
      await createNotification({
        user: expense.user,
        title: "Recurring Expense Error",
        message: `There was an error processing your recurring expense "${expense.description}". Please check your records.`,
        type: "error",
        relatedTransaction: expense._id,
        relatedTransactionType: "Expense"
      });
    }
  }
}

// Process recurring incomes
async function processRecurringIncomes(today) {
  // Find all recurring incomes due today or before today
  const dueIncomes = await Income.find({
    isRecurring: true,
    nextRecurringDate: { $lte: today },
    $or: [
      { recurringEndDate: { $exists: false } },
      { recurringEndDate: { $gte: today } }
    ]
  });
  
  console.log(`Found ${dueIncomes.length} recurring incomes due today.`);
  
  for (const income of dueIncomes) {
    try {
      // Create a new income record
      const newIncome = new Income({
        user: income.user,
        amount: income.amount,
        description: income.description,
        category: income.category,
        date: today,
        bankAccount: income.bankAccount,
        isRecurring: false, // New income is not recurring
      });
      
      await newIncome.save();
      console.log(`Created new income record for: ${income.description}`);
      
      // Create notification for the user
      await createNotification({
        user: income.user,
        title: "Recurring Income Processed",
        message: `Your recurring income "${income.description}" of ${income.amount} has been processed.`,
        type: "success",
        relatedTransaction: newIncome._id,
        relatedTransactionType: "Income"
      });
      
      // Update the next recurring date
      const nextDate = calculateNextRecurringDate(today, income.recurringInterval);
      
      // Check if we've reached the end date
      if (income.recurringEndDate && nextDate > income.recurringEndDate) {
        // Remove recurring flags
        income.isRecurring = false;
        income.recurringInterval = undefined;
        income.recurringEndDate = undefined;
        income.nextRecurringDate = undefined;
        console.log(`Recurring income ended: ${income.description}`);
      } else {
        // Update next recurring date
        income.nextRecurringDate = nextDate;
      }
      
      await income.save();
    } catch (error) {
      console.error(`Error processing income ${income._id}:`, error);
      
      // Create error notification
      await createNotification({
        user: income.user,
        title: "Recurring Income Error",
        message: `There was an error processing your recurring income "${income.description}". Please check your records.`,
        type: "error",
        relatedTransaction: income._id,
        relatedTransactionType: "Income"
      });
    }
  }
}

// Calculate the next recurring date based on interval
function calculateNextRecurringDate(currentDate, interval) {
  const nextDate = new Date(currentDate);
  
  switch (interval) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      throw new Error(`Invalid interval: ${interval}`);
  }
  
  return nextDate;
}

// Create a notification
async function createNotification(notificationData) {
  try {
    const notification = new Notification(notificationData);
    await notification.save();
    console.log(`Notification created: ${notification.title}`);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}