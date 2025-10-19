import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
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
      "Groceries",
      "Transportation",
      "Rent/Housing",
      "Utilities",
      "Debit",
      "Health & Fitness",
      "Dining Out",
      "Education",
      "Insurance",
      "Other Expense",
    ],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    enum: [
      "Cash",
      "Credit Card",
      "Debit Card",
      "Bank Transfer",
      "Mobile Payment",
      "Other",
    ],
    default: "Other",
  },
  receipt: {
    type: String,
    default: "",
  },
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BankAccount",
  },
  bill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bill",
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
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, category: 1 });
expenseSchema.index({ user: 1, isRecurring: 1, nextRecurringDate: 1 });

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;