import cron from "node-cron";
import insightsService from "../services/insightsService.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

// Job to run insights analysis and create notifications for unusual spending
const insightsNotificationJob = cron.schedule("0 9 * * *", async () => {
  console.log("Running insights notification job...");
  
  try {
    // Get all active users
    const users = await User.find({ isActive: true });
    
    for (const user of users) {
      try {
        // Analyze spending patterns for each user
        const insights = await insightsService.analyzeSpendingPatterns(user._id, 2);
        
        // Check for high severity unusual spending patterns
        const highSeverityPatterns = insights.unusualSpending.filter(
          pattern => pattern.severity === "high"
        );
        
        // Create notifications for high severity patterns
        for (const pattern of highSeverityPatterns) {
          // Check if notification already exists for this pattern
          const existingNotification = await Notification.findOne({
            user: user._id,
            title: { $regex: pattern.category, $options: "i" },
            message: { $regex: "unusual spending", $options: "i" },
            createdAt: { 
              $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          });
          
          if (!existingNotification) {
            await Notification.create({
              user: user._id,
              title: `Unusual Spending Alert: ${pattern.category}`,
              message: pattern.message,
              type: "warning",
              relatedTransaction: null,
              relatedTransactionType: null
            });
            
            console.log(`Created insights notification for user ${user._id}`);
          }
        }
        
        // Create notification for new savings tips (weekly)
        const today = new Date();
        const dayOfWeek = today.getDay();
        
        // Only create savings tips notification on Monday (day 1)
        if (dayOfWeek === 1 && insights.insights.savingsTips?.length > 0) {
          const existingTipsNotification = await Notification.findOne({
            user: user._id,
            title: { $regex: "Weekly Savings Tips", $options: "i" },
            createdAt: { 
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          });
          
          if (!existingTipsNotification) {
            const topTip = insights.insights.savingsTips[0];
            await Notification.create({
              user: user._id,
              title: "Weekly Savings Tips",
              message: `${topTip.tip} 💰 Potential savings: ${topTip.potentialSavings}`,
              type: "info",
              relatedTransaction: null,
              relatedTransactionType: null
            });
            
            console.log(`Created weekly savings tips notification for user ${user._id}`);
          }
        }
        
      } catch (error) {
        console.error(`Error processing insights for user ${user._id}:`, error);
      }
    }
    
    console.log("Insights notification job completed successfully");
  } catch (error) {
    console.error("Error in insights notification job:", error);
  }
}, {
  scheduled: false, // Don't start automatically
  timezone: "America/New_York" // Adjust timezone as needed
});

export default insightsNotificationJob;