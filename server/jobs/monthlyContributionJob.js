import cron from "node-cron";
import Goal from "../models/Goal.js";
import User from "../models/User.js";
import { sendMonthlyContributionNotification } from "../utils/goalNotifications.js";
import { createAchievement, checkMilestoneAchievements } from "../utils/achievements.js"; // Add this line

// This job runs on the first day of each month at midnight
const monthlyContributionJob = cron.schedule("0 0 1 * *", async () => {
  try {
    console.log("Running monthly contribution job...");
    
    // Find all goals with a contribution amount set
    const goalsWithContributions = await Goal.find({
      monthlyContribution: { $gt: 0 }
    }).populate("user");
    
    console.log(`Found ${goalsWithContributions.length} goals with monthly contributions`);
    
    // Process each goal
    for (const goal of goalsWithContributions) {
      try {
        // Check if the goal is not yet completed
        if (goal.savedAmount < goal.targetAmount && goal.user && goal.user.isVerified) {
          // Add the monthly contribution to the goal
          const contributionAmount = Math.min(
            goal.monthlyContribution,
            goal.targetAmount - goal.savedAmount
          );
          
          // Add contribution to the goal
          const contribution = {
            amount: contributionAmount,
            date: new Date(),
            description: `${goal.contributionFrequency.charAt(0).toUpperCase() + goal.contributionFrequency.slice(1)} automatic contribution`
          };
          
          goal.contributions.unshift(contribution);
          goal.savedAmount += contributionAmount;
          goal.updatedAt = Date.now();
          
          await goal.save();
          
          // Send notification and email
          await sendMonthlyContributionNotification(goal, goal.user, contributionAmount);
          
          // Check if goal is now completed
          if (goal.savedAmount >= goal.targetAmount) {
            // Goal completed! Award achievement
            await createAchievement(goal.user._id, "GOAL_COMPLETED");
            
            // Count total completed goals for this user
            const completedGoals = await Goal.countDocuments({
              user: goal.user._id,
              savedAmount: { $gte: goal.targetAmount }
            });
            
            // Check for milestone achievements
            await checkMilestoneAchievements(goal.user._id, completedGoals);
          }
          
          console.log(`Added Rs.${contributionAmount} to goal "${goal.name}" for user ${goal.user.email}`);
        }
      } catch (error) {
        console.error(`Error processing goal ${goal._id}:`, error);
      }
    }
    
    console.log("Monthly contribution job completed");
  } catch (error) {
    console.error("Error in monthly contribution job:", error);
  }
});

export default monthlyContributionJob;