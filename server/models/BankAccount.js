import mongoose from 'mongoose';

const BankAccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bankName: {
    type: String,
    required: true,
    trim: true,
  },
  accountName: {
    type: String,
    required: true,
    trim: true,
  },
  accountType: {
    type: String,
    required: true,
    enum: ['Checking', 'Savings', 'Credit Card', 'Investment', 'Other'],
  },
  initialBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  currentBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update `updatedAt` field on save
BankAccountSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const BankAccount = mongoose.model('BankAccount', BankAccountSchema);

export default BankAccount;
