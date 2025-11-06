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

  if (totalBankAccountBalance > 0 && totalExpenses / totalBankAccountBalance >= 0.9) {
    const expensePercentage = Math.round((totalExpenses / totalBankAccountBalance) * 100);
    
    const notification = await Notification.create({
        user: userId,
        title: "⚠ Expense Warning",
        message: `You have used 90% of your total bank balance.`,
        type: "warning",
    });

    io.emit("new-notification", notification);

    // Send email to user
    await sendEmail(
      user.email,
      "⚠Expense Warning",
      null,
      `<p>You have used 90% of your total bank balance.</p>`
    );

    return true;
  }

  return false;
};