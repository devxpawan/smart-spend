import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js";
import Goal from "./models/Goal.js";
import { createAchievement, checkMilestoneAchievements } from "./utils/achievements.js";

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

// Test the achievement system
const testAchievements = async () => {
  await connectDB();
  
  try {
    // Find a sample user for testing
    const user = await User.findOne({ isVerified: true });
    if (!user) {
      console.log("No verified user found for testing");
      return;
    }
    
    console.log("Testing achievement creation...");
    
    // Test creating a goal completed achievement
    const goalAchievement = await createAchievement(user._id, "GOAL_COMPLETED");
    console.log("Goal achievement created:", goalAchievement.title);
    
    // Test creating a first contribution achievement
    const firstContributionAchievement = await createAchievement(user._id, "FIRST_CONTRIBUTION");
    console.log("First contribution achievement created:", firstContributionAchievement.title);
    
    // Test milestone achievements
    console.log("Testing milestone achievements...");
    await checkMilestoneAchievements(user._id, 3);
    await checkMilestoneAchievements(user._id, 5);
    await checkMilestoneAchievements(user._id, 10);
    
    console.log("All achievement tests completed successfully!");
  } catch (error) {
    console.error("Test error:", error);
  } finally {
    mongoose.connection.close();
    console.log("Database connection closed");
  }
};

testAchievements();