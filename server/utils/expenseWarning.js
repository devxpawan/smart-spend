import User from "../models/User.js";
import BankAccount from "../models/BankAccount.js";
import Expense from "../models/Expense.js";
import Notification from "../models/Notification.js";
import { io } from "../index.js";
import sendEmail from "./sendEmail.js";

/**
 * @description Calculate the total expenses and bank account balance for a user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<{totalExpenses: number, totalBankAccountBalance: number}>} - The total expenses and bank account balance.
 */
export const calculateExpenseBankAccountRatio = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const bankAccounts = await BankAccount.find({ user: userId });
  const totalBankAccountBalance = bankAccounts.reduce(
    (acc, account) => acc + account.currentBalance,
    0
  );

  const expenses = await Expense.find({ user: userId });
  const totalExpenses = expenses.reduce((acc, expense) => acc + expense.amount, 0);

  return { totalExpenses, totalBankAccountBalance };
};

/**
 * @description Check if the user's expenses exceed 90% of their bank account balance and create a notification if they do.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<boolean>} - Whether a warning notification was created.
 */
export const checkAndSendExpenseWarning = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const { totalExpenses, totalBankAccountBalance } = await calculateExpenseBankAccountRatio(userId);

    // Check if expenses are 90% or more of the bank balance
  if (totalBankAccountBalance > 0 && totalExpenses >= totalBankAccountBalance * 0.9) {
  

    const notification = await Notification.create({
        user: userId,
        title: "⚠ Expense Warning",
        message: `You have used ${totalExpenses} of your total bank balance.`,
        type: "warning",
    });

    io.emit("new-notification", notification);

    // Send email to user
await sendEmail(
  user.email,
  "⚠ Expense Warning",
  null,
  `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #333; margin: 0;">SmartSpend</h1>
    </div>
    
    <div style="background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <h2 style="color: #d9534f; margin-top: 0;">⚠ Expense Warning</h2>
      
      <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
        Dear ${user.name || 'User'},
      </p>
      
      <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
        You have used ${totalExpenses} of your total bank balance. 
        This exceeds the 90% threshold we recommend for maintaining healthy financial management.
      </p>
      
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0;">
        <p style="color: #856404; margin: 0; font-weight: bold;">
          Current Status: ${totalBankAccountBalance} of bank balance Remaining
        </p>
      </div>
      
      <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
        We recommend reviewing your expenses and considering ways to optimize your spending.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://smart-spend-frontend-rosy.vercel.app.dashboard'}" 
           style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">
          View Your Dashboard
        </a>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 14px; margin-bottom: 10px;">
        Thank you for using SmartSpend!
      </p>
      <p style="color: #999; font-size: 14px; margin-bottom: 5px;">
        Best regards,<br>The SmartSpend Team
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px;">
        [email, please do not reply.]
      </p>
      <p style="color: #999; font-size: 12px; margin: 5px 0;">
        © 2025 SmartSpend. All rights reserved.
      </p>
    </div>
  </div>
  `
);

    return true;
  }

  return false;
};