import mongoose from "mongoose";

const billSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      "Rent / Mortgage",
      "Electricity",
      "Water",
      "Internet",
      "Mobile Phone",
      "Streaming Services",
      "Credit Card Payments",
      "Loan Payments",
      "Insurance (Health/Auto/Home)",
      "Gym Membership",
      "School Tuition / Fees",
      "Cloud / SaaS Services",
      "Taxes",
      "Security / Alarm Services",
      "Other Utilities",
    ],
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurringPeriod: {
    type: String,
    enum: ["Weekly", "Monthly", "Quarterly", "Annually"],
    default: "Monthly",
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  reminderDate: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster querying
billSchema.index({ user: 1, dueDate: 1 });
billSchema.index({ user: 1, isPaid: 1 });

const Bill = mongoose.model("Bill", billSchema);

export default Bill;
