import mongoose from "mongoose";
import {
    DEFAULT_EXPENSE_CATEGORIES,
    DEFAULT_INCOME_CATEGORIES,
} from "../utils/constants.js";

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
  incomeCategories: {
    type: [String],
    default: DEFAULT_INCOME_CATEGORIES,
  },
  expenseCategories: {
    type: [String],
    default: DEFAULT_EXPENSE_CATEGORIES,
  },
});

const User = mongoose.model("User", userSchema);

export default User;