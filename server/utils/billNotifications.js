import Notification from "../models/Notification.js";
import sendEmail from "./sendEmail.js";

// Send in-app + email reminder for a bill
export const sendBillReminderNotification = async (bill, user) => {
  try {
    const dueDate = bill.dueDate ? new Date(bill.dueDate) : null;
    const reminderDate = bill.reminderDate ? new Date(bill.reminderDate) : null;

    // In-app notification
    const notification = new Notification({
      user: user._id,
      title: "Bill Reminder",
      message: `${bill.name} is due on ${dueDate ? dueDate.toLocaleDateString() : "soon"}. Amount: Rs ${bill.amount}`,
      type: "warning",
    });
    await notification.save();

    // Email (respect opt-out flag if present)
    if (user.email && user.preferences?.emailNotifications !== false) {
      const subject = "Bill Reminder - SmartSpend";
      const emailText = `Hello ${user.name},\n\nThis is a reminder for your bill:\n- Name: ${bill.name}\n- Amount: Rs ${bill.amount}\n- Due on: ${dueDate ? dueDate.toLocaleDateString() : "(no date)"}\n- Reminder set for: ${reminderDate ? reminderDate.toLocaleDateString() : "(none)"}\n\nPlease make sure to pay on time to avoid penalties.\n\nBest regards,\nSmartSpend Team`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f0ad4e;">Bill Reminder</h2>
          <p>Hello ${user.name},</p>
          <p>This is a reminder for your bill:</p>
          <ul>
            <li><strong>Name:</strong> ${bill.name}</li>
            <li><strong>Amount:</strong> Rs ${bill.amount}</li>
            <li><strong>Due on:</strong> ${dueDate ? dueDate.toLocaleDateString() : "(no date)"}</li>
            <li><strong>Reminder set for:</strong> ${reminderDate ? reminderDate.toLocaleDateString() : "(none)"}</li>
          </ul>
          <p>Please make sure to pay on time to avoid penalties.</p>
          <p style="margin-top: 24px;">Best regards,<br/><strong>SmartSpend Team</strong></p>
        </div>
      `;

      await sendEmail(user.email, subject, emailText, emailHtml);
    }
  } catch (error) {
    console.error("Error sending bill reminder notification:", error);
  }
};

export default {
  sendBillReminderNotification,
};
