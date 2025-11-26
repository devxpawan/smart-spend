import dotenv from "dotenv";
import mongoose from "mongoose";
import Goal from "./models/Goal.js";
import User from "./models/User.js";
import { 
  sendGoalExpiringSoonNotification, 
  sendGoalExpiredNotification,
  sendMonthlyContributionNotification
} from "./utils/goalNotifications.js";

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

// Test the goal notifications
const testGoalNotifications = async () => {
  await connectDB();
  
  try {
    // Find a sample user and goal for testing
    const user = await User.findOne({ isVerified: true });
    if (!user) {
      console.log("No verified user found for testing");
      return;
    }
    
    const goal = await Goal.findOne({ user: user._id });
    if (!goal) {
      console.log("No goal found for testing");
      return;
    }
    
    console.log("Testing goal expiring soon notification...");
    await sendGoalExpiringSoonNotification(goal, user);
    
    console.log("Testing goal expired notification...");
    await sendGoalExpiredNotification(goal, user);
    
    console.log("Testing monthly contribution notification...");
    await sendMonthlyContributionNotification(goal, user, 1000);
    
    console.log("All notifications sent successfully!");
  } catch (error) {
    console.error("Test error:", error);
  } finally {
    mongoose.connection.close();
    console.log("Database connection closed");
  }
};

testGoalNotifications();