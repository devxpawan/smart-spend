import dotenv from "dotenv";
import mongoose from "mongoose";
import { processMonthlyContributions } from "./utils/processMonthlyContributions.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Test the monthly contributions processing
const testMonthlyContributions = async () => {
  await connectDB();
  
  try {
    const result = await processMonthlyContributions();
    console.log("Test result:", result);
  } catch (error) {
    console.error("Test error:", error);
  } finally {
    mongoose.connection.close();
    console.log("Database connection closed");
  }
};

testMonthlyContributions();