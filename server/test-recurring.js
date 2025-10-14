// Simple test script to verify recurring routes are working
import express from 'express';
import mongoose from 'mongoose';
import Expense from './models/Expense.js';
import Income from './models/Income.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};

// Test function to check recurring transactions
async function testRecurringTransactions() {
  try {
    await connectDB();
    
    // Test finding recurring expenses
    console.log("Testing recurring expenses query...");
    const expenses = await Expense.find({
      isRecurring: true,
    }).limit(5);
    
    console.log("Found recurring expenses:", expenses.length);
    expenses.forEach(exp => {
      console.log(`- ${exp.description}: ${exp.amount} (${exp.recurringInterval})`);
    });
    
    // Test finding recurring incomes
    console.log("\nTesting recurring incomes query...");
    const incomes = await Income.find({
      isRecurring: true,
    }).limit(5);
    
    console.log("Found recurring incomes:", incomes.length);
    incomes.forEach(inc => {
      console.log(`- ${inc.description}: ${inc.amount} (${inc.recurringInterval})`);
    });
    
    console.log("\nTest completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testRecurringTransactions();