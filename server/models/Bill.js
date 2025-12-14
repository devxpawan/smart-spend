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
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BankAccount",
    required: false,
  },

  isPaid: {
    type: Boolean,
    default: false,
  },
  reminderSentAt: {
    type: Date,
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
billSchema.index({ user: 1, name: 1 }, { unique: true });

// Static method to check for duplicate bill names
billSchema.statics.isDuplicateName = async function(userId, name, billId = null) {
  const query = { user: userId, name };
  if (billId) {
    query._id = { $ne: billId };
  }
  return await this.findOne(query);
};

// Pre-save hook to validate bill name
billSchema.pre('save', async function(next) {
  const bill = this;
  if (bill.isModified('name')) {
    const duplicate = await Bill.isDuplicateName(bill.user, bill.name, bill._id);
    if (duplicate) {
      const error = new Error('A bill with this name already exists');
      error.name = 'DuplicateBillNameError';
      next(error);
      return;
    }
  }
  next();
});

const Bill = mongoose.model("Bill", billSchema);

export default Bill;
