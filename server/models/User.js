import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    // Only required for local signup
    required: function () {
      return !this.googleId;
    },
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple docs without googleId
  },
  avatar: {
    type: String,
    default: "",
  },
  preferences: {
    currency: {
      type: String,
      default: "Rs",
    },
  },
  // Custom categories for income and expenses
  customIncomeCategories: {
    type: [String],
    default: [],
  },
  customExpenseCategories: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  otp: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  passwordResetOTP: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
});

const User = mongoose.model("User", userSchema);

export default User;