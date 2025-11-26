import Achievement from "../models/Achievement.js";
import Notification from "../models/Notification.js";
import sendEmail from "./sendEmail.js";

// Achievement definitions
const ACHIEVEMENTS = {
  GOAL_COMPLETED: {
    title: "Goal Achieved!",
    description: "You've successfully completed a financial goal",
    type: "goal_completed",
    icon: "🏆"
  },
  FIRST_CONTRIBUTION: {
    title: "First Step!",
    description: "You've made your first contribution to a goal",
    type: "first_contribution",
    icon: "👣"
  },
  THREE_GOALS: {
    title: "Triple Threat!",
    description: "You've completed 3 financial goals",
    type: "milestone",
    icon: "⭐"
  },
  FIVE_GOALS: {
    title: "High Five!",
    description: "You've completed 5 financial goals",
    type: "milestone",
    icon: "✋"
  },
  TEN_GOALS: {
    title: "Goal Master!",
    description: "You've completed 10 financial goals",
    type: "milestone",
    icon: "👑"
  }
};

/**
 * Create an achievement for a user
 * @param {string} userId - The user ID
 * @param {string} achievementType - The type of achievement
 * @param {number} value - Optional value associated with the achievement
 * @returns {Promise<Object>} The created achievement
 */
export const createAchievement = async (userId, achievementType, value = 0) => {
  try {
    const achievementDef = ACHIEVEMENTS[achievementType];
    if (!achievementDef) {
      throw new Error(`Unknown achievement type: ${achievementType}`);
    }

    // Check if achievement already exists
    const existingAchievement = await Achievement.findOne({
      user: userId,
      type: achievementType,
      ...(value > 0 && { value })
    });

    if (existingAchievement) {
      return existingAchievement;
    }

    // Create the achievement
    const achievement = new Achievement({
      user: userId,
      title: achievementDef.title,
      description: achievementDef.description,
      type: achievementDef.type,
      icon: achievementDef.icon,
      value
    });

    await achievement.save();

    // Create notification
    const notification = new Notification({
      user: userId,
      title: "New Achievement Unlocked!",
      message: achievementDef.title,
      type: "success"
    });

    await notification.save();

    console.log(`Achievement created: ${achievement.title} for user ${userId}`);
    return achievement;
  } catch (error) {
    console.error("Error creating achievement:", error);
    throw error;
  }
};

/**
 * Check and award milestone achievements based on completed goals
 * @param {string} userId - The user ID
 * @param {number} completedGoalsCount - The number of completed goals
 */
export const checkMilestoneAchievements = async (userId, completedGoalsCount) => {
  try {
    if (completedGoalsCount >= 10) {
      await createAchievement(userId, "TEN_GOALS", completedGoalsCount);
    } else if (completedGoalsCount >= 5) {
      await createAchievement(userId, "FIVE_GOALS", completedGoalsCount);
    } else if (completedGoalsCount >= 3) {
      await createAchievement(userId, "THREE_GOALS", completedGoalsCount);
    }
  } catch (error) {
    console.error("Error checking milestone achievements:", error);
  }
};

export default {
  createAchievement,
  checkMilestoneAchievements,
  ACHIEVEMENTS
};