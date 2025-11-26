import mongoose from "mongoose";

const goalSchema = new mongoose.Schema({
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
  targetAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  savedAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  targetDate: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  monthlyContribution: { // Add this field
    type: Number,
    default: 0,
    min: 0,
  },
  contributions: [
    {
      amount: {
        type: Number,
        required: true,
      },
      date: {
        type: Date,
        default: Date.now,
      },
      description: {
        type: String,
        default: "",
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster querying
goalSchema.index({ user: 1 });
goalSchema.index({ targetDate: 1 });

const Goal = mongoose.model("Goal", goalSchema);

export default Goal;