import cron from "node-cron";
import Goal from "../models/Goal.js";
import User from "../models/User.js";
import { sendMonthlyContributionNotification } from "../utils/goalNotifications.js";
import { createAchievement, checkMilestoneAchievements } from "../utils/achievements.js";

// Process contributions based on frequency
const processContributionsByFrequency = async (frequency) => {
  try {
    console.log(`Running ${frequency} contribution job...`);
    
    // Find all goals with a contribution amount set for this frequency
    const goalsWithContributions = await Goal.find({
      monthlyContribution: { $gt: 0 },
      contributionFrequency: frequency
    }).populate("user");
    
    console.log(`Found ${goalsWithContributions.length} goals with ${frequency} contributions`);
    
    // Process each goal
    for (const goal of goalsWithContributions) {
      try {
        // Check if the goal is not yet completed
        if (goal.savedAmount < goal.targetAmount && goal.user && goal.user.isVerified) {
          // Add the contribution to the goal
          const contributionAmount = Math.min(
            goal.monthlyContribution,
            goal.targetAmount - goal.savedAmount
          );
          
          // Add contribution to the goal
          const contribution = {
            amount: contributionAmount,
            date: new Date(),
            description: `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} automatic contribution`
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
    
    console.log(`${frequency} contribution job completed`);
  } catch (error) {
    console.error(`Error in ${frequency} contribution job:`, error);
  }
};

// Daily contribution job - runs every day at midnight
const dailyContributionJob = cron.schedule("0 0 * * *", async () => {
  await processContributionsByFrequency("daily");
});

// Weekly contribution job - runs every Sunday at midnight
const weeklyContributionJob = cron.schedule("0 0 * * 0", async () => {
  await processContributionsByFrequency("weekly");
});

// Monthly contribution job - runs on the first day of each month at midnight
const monthlyContributionJob = cron.schedule("0 0 1 * *", async () => {
  await processContributionsByFrequency("monthly");
});

export { dailyContributionJob, weeklyContributionJob, monthlyContributionJob };