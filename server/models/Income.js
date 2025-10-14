import mongoose from "mongoose";

const incomeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      "Salary",
      "Freelance/ Side Jobs",
      "Business Income",
      "Rental Income",
      "Interest / Dividends",
      "Gifts / Donations",
      "Pension / Retirement",
      "Scholarships / Grants",
      "Refunds / Cashbacks",
      "Other Income",
    ],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BankAccount",
  },
  // Recurring fields
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurringInterval: {
    type: String,
    enum: ["daily", "weekly", "monthly", "yearly"],
  },
  recurringEndDate: {
    type: Date,
  },
  nextRecurringDate: {
    type: Date,
  },
});

// Index for faster querying
incomeSchema.index({ user: 1, date: -1 });
incomeSchema.index({ user: 1, category: 1 });
incomeSchema.index({ user: 1, isRecurring: 1, nextRecurringDate: 1 });

const Income = mongoose.model("Income", incomeSchema);

export default Income;