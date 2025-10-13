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
});

// Index for faster querying
incomeSchema.index({ user: 1, date: -1 });
incomeSchema.index({ user: 1, category: 1 });

const Income = mongoose.model("Income", incomeSchema);

export default Income;
