import Notification from "../models/Notification.js";
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

export default {
  sendMonthlyContributionNotification
};