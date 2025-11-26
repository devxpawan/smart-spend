import mongoose from "mongoose";

const achievementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["goal_completed", "streak", "milestone", "first_contribution"],
    required: true,
  },
  value: {
    type: Number,
    default: 0,
  },
  icon: {
    type: String,
    default: "🏆",
  },
  earnedAt: {
    type: Date,
    default: Date.now,
  },
  isSeen: {
    type: Boolean,
    default: false,
  },
});

// Index for faster querying
achievementSchema.index({ user: 1, type: 1 });

const Achievement = mongoose.model("Achievement", achievementSchema);

export default Achievement;