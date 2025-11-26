import cron from "node-cron";
import Goal from "../models/Goal.js";
import User from "../models/User.js";

// This job runs on the first day of each month at midnight
const monthlyContributionJob = cron.schedule("0 0 1 * *", async () => {
  try {
    console.log("Running monthly contribution job...");
    
    // Find all goals with a monthly contribution amount set
    const goalsWithContributions = await Goal.find({
      monthlyContribution: { $gt: 0 }
    }).populate("user");
    
    console.log(`Found ${goalsWithContributions.length} goals with monthly contributions`);
    
    // Process each goal
    for (const goal of goalsWithContributions) {
      try {
        // Check if the goal is not yet completed
        if (goal.savedAmount < goal.targetAmount) {
          // Add the monthly contribution to the goal
          const contributionAmount = Math.min(
            goal.monthlyContribution,
            goal.targetAmount - goal.savedAmount
          );
          
          // Add contribution to the goal
          const contribution = {
            amount: contributionAmount,
            date: new Date(),
            description: "Monthly automatic contribution"
          };
          
          goal.contributions.unshift(contribution);
          goal.savedAmount += contributionAmount;
          goal.updatedAt = Date.now();
          
          await goal.save();
          
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