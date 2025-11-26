import cron from "node-cron";
import Goal from "../models/Goal.js";
import User from "../models/User.js";
import { 
  sendGoalExpiringSoonNotification, 
  sendGoalExpiredNotification 
} from "../utils/goalNotifications.js";

// This job runs daily at 9 AM to check for expiring goals
const goalExpirationJob = cron.schedule("0 9 * * *", async () => {
  try {
    console.log("Running goal expiration job...");
    
    // Get today's date and tomorrow's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Find goals expiring tomorrow (expiring soon)
    const expiringGoals = await Goal.find({
      targetDate: {
        $gte: tomorrow,
        $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate("user");
    
    console.log(`Found ${expiringGoals.length} goals expiring tomorrow`);
    
    // Send notifications for expiring goals
    for (const goal of expiringGoals) {
      try {
        if (goal.user && goal.user.isVerified) {
          await sendGoalExpiringSoonNotification(goal, goal.user);
        }
      } catch (error) {
        console.error(`Error sending expiring soon notification for goal ${goal._id}:`, error);
      }
    }
    
    // Find goals that expired yesterday
    const expiredGoals = await Goal.find({
      targetDate: {
        $gte: yesterday,
        $lt: today
      }
    }).populate("user");
    
    console.log(`Found ${expiredGoals.length} goals that expired yesterday`);
    
    // Send notifications for expired goals
    for (const goal of expiredGoals) {
      try {
        if (goal.user && goal.user.isVerified) {
          await sendGoalExpiredNotification(goal, goal.user);
        }
      } catch (error) {
        console.error(`Error sending expired notification for goal ${goal._id}:`, error);
      }
    }
    
    console.log("Goal expiration job completed");
  } catch (error) {
    console.error("Error in goal expiration job:", error);
  }
});

export default goalExpirationJob;