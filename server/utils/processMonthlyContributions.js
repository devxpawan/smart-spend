import Goal from "../models/Goal.js";
import { sendMonthlyContributionNotification } from "./goalNotifications.js";
import { createAchievement, checkMilestoneAchievements } from "./achievements.js"; // Add this line

/**
 * Process monthly contributions for all goals that have a fixed monthly contribution amount
 * This function can be called manually for testing or triggered by an admin endpoint
 */
export const processMonthlyContributions = async () => {
  try {
    console.log("Processing monthly contributions...");
    
    // Find all goals with a monthly contribution amount set
    const goalsWithContributions = await Goal.find({
      monthlyContribution: { $gt: 0 }
    }).populate("user");
    
    console.log(`Found ${goalsWithContributions.length} goals with monthly contributions`);
    
    let processedCount = 0;
    
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
            description: "Manual monthly contribution"
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
          processedCount++;
        }
      } catch (error) {
        console.error(`Error processing goal ${goal._id}:`, error);
      }
    }
    
    console.log(`Processed monthly contributions for ${processedCount} goals`);
    return { success: true, processedCount };
  } catch (error) {
    console.error("Error processing monthly contributions:", error);
    return { success: false, error: error.message };
  }
};

export default { processMonthlyContributions };