import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["info", "success", "warning", "error"],
    default: "info",
  },
  read: {
    type: Boolean,
    default: false,
  },
  relatedTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "relatedTransactionType",
  },
  relatedTransactionType: {
    type: String,
    enum: ["Expense", "Income"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster querying
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;