import Notification from "../models/Notification.js";
import User from "../models/User.js";
import sendEmail from "./sendEmail.js";

/**
 * Send notification and email for monthly contribution
 * @param {Object} goal - The goal object
 * @param {Object} user - The user object
 * @param {number} contributionAmount - The contribution amount
 */
export const sendMonthlyContributionNotification = async (goal, user, contributionAmount) => {
  try {
    // Create in-app notification
    const notification = new Notification({
      user: user._id,
      title: "Monthly Contribution Added",
      message: `₹${contributionAmount} has been automatically added to your goal "${goal.name}"`,
      type: "info",
      relatedGoal: goal._id
    });

    await notification.save();

    // Send email notification if user has email notifications enabled
    if (user.email && user.preferences?.emailNotifications !== false) {
      const emailSubject = "Monthly Contribution Added to Your Goal";
      const emailText = `Hello ${user.name},

₹${contributionAmount} has been automatically added to your goal "${goal.name}".

Your current progress: ₹${goal.savedAmount} / ₹${goal.targetAmount}

Keep up the great work on your financial journey!

Best regards,
Smart Spend Team`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Monthly Contribution Added</h2>
          <p>Hello ${user.name},</p>
          <p>₹${contributionAmount} has been automatically added to your goal <strong>"${goal.name}"</strong>.</p>
          <p>Your current progress: <strong>₹${goal.savedAmount} / ₹${goal.targetAmount}</strong></p>
          <p>Keep up the great work on your financial journey!</p>
          <br>
          <p>Best regards,<br>
          <strong>Smart Spend Team</strong></p>
        </div>
      `;

      await sendEmail(user.email, emailSubject, emailText, emailHtml);
    }

    console.log(`Notification sent for monthly contribution of ₹${contributionAmount} to goal "${goal.name}"`);
  } catch (error) {
    console.error("Error sending monthly contribution notification:", error);
  }
};

/**
 * Send notification and email for goal expiration (day before)
 * @param {Object} goal - The goal object
 * @param {Object} user - The user object
 */
export const sendGoalExpiringSoonNotification = async (goal, user) => {
  try {
    // Create notification
    const notification = new Notification({
      user: user._id,
      title: "Goal Expiring Soon",
      message: `Your goal "${goal.name}" is expiring tomorrow. Target amount: Rs ${goal.targetAmount.toLocaleString()}`,
      type: "warning"
    });
    
    await notification.save();
    
    // Send email
    const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin: 0;">SmartSpend</h1>
      </div>
      
      <div style="background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #f0ad4e; margin-top: 0;">Goal Expiring Soon</h2>
        
        <p>Hello ${user.name},</p>
        
        <p>Your goal "<strong>${goal.name}</strong>" is expiring tomorrow!</p>
        
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Goal Details:</strong></p>
          <ul>
            <li>Target Amount: Rs ${goal.targetAmount.toLocaleString()}</li>
            <li>Saved Amount: Rs ${goal.savedAmount.toLocaleString()}</li>
            <li>Target Date: ${new Date(goal.targetDate).toLocaleDateString()}</li>
          </ul>
        </div>
        
        <p>You've made great progress! Keep going to achieve your goal.</p>
        
        <p style="margin-top: 30px;">Best regards,<br/>The SmartSpend Team</p>
      </div>
    </div>
    `;
    
    await sendEmail(
      user.email,
      "Goal Expiring Soon - SmartSpend",
      null,
      emailHtml
    );
    
    console.log(`Goal expiring soon notification sent for goal: ${goal.name}`);
  } catch (error) {
    console.error("Error sending goal expiring soon notification:", error);
  }
};

/**
 * Send notification and email for goal expired (day after)
 * @param {Object} goal - The goal object
 * @param {Object} user - The user object
 */
export const sendGoalExpiredNotification = async (goal, user) => {
  try {
    // Determine if goal was achieved
    const isAchieved = goal.savedAmount >= goal.targetAmount;
    
    // Create notification
    const notification = new Notification({
      user: user._id,
      title: isAchieved ? "Goal Achieved!" : "Goal Expired",
      message: isAchieved 
        ? `Congratulations! You've achieved your goal "${goal.name}".` 
        : `Your goal "${goal.name}" has expired. Target amount: Rs ${goal.targetAmount.toLocaleString()}`,
      type: isAchieved ? "success" : "info"
    });
    
    await notification.save();
    
    // Send email
    const subject = isAchieved ? "Congratulations! Goal Achieved - SmartSpend" : "Goal Expired - SmartSpend";
    const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin: 0;">SmartSpend</h1>
      </div>
      
      <div style="background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="${isAchieved ? 'color: #5cb85c;' : 'color: #337ab7;'} margin-top: 0;">
          ${isAchieved ? "🎉 Goal Achieved!" : "Goal Expired"}
        </h2>
        
        <p>Hello ${user.name},</p>
        
        <p>${isAchieved 
          ? `Congratulations! You've successfully achieved your goal "<strong>${goal.name}</strong>".` 
          : `Your goal "<strong>${goal.name}</strong>" has expired.`}</p>
        
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Goal Details:</strong></p>
          <ul>
            <li>Target Amount: Rs ${goal.targetAmount.toLocaleString()}</li>
            <li>Saved Amount: Rs ${goal.savedAmount.toLocaleString()}</li>
            <li>${isAchieved ? '🎉 Congratulations on achieving your goal!' : 'Better luck next time!'}</li>
          </ul>
        </div>
        
        <p>${isAchieved 
          ? "You've done an amazing job reaching your financial goal. Keep up the great work!" 
          : "Don't worry, you can always create a new goal and try again."}</p>
        
        <p style="margin-top: 30px;">Best regards,<br/>The SmartSpend Team</p>
      </div>
    </div>
    `;
    
    await sendEmail(
      user.email,
      subject,
      null,
      emailHtml
    );
    
    console.log(`Goal expired notification sent for goal: ${goal.name}`);
  } catch (error) {
    console.error("Error sending goal expired notification:", error);
  }
};

export default {
  sendGoalExpiringSoonNotification,
  sendGoalExpiredNotification,
  sendMonthlyContributionNotification
};