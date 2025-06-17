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
    reminderDaysBefore: {
      type: Number,
      default: 3,
    },
    theme: {
      type: String,
      default: "light",
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

export default User;
