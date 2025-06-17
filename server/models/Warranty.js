import mongoose from "mongoose";

const warrantySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  purchaseDate: {
    type: Date,
    required: true,
  },
  expirationDate: {
    type: Date,
    required: true,
  },
  retailer: {
    type: String,
    trim: true,
  },
  purchasePrice: {
    type: Number,
  },
  currency: {
    type: String,
    default: "USD",
  },
  category: {
    type: String,
    enum: [
      "Electronics (Phones, Laptops, TVs)",
      "Home Appliances (Washer, Fridge, etc.)",
      "Furniture",
      "Automobiles",
      "Power Tools",
      "Jewelry & Watches",
      "Sports Equipment",
      "Kitchenware",
      "Clothing & Footwear",
      "Smart Devices (Smartwatch, Home Assistants)",
      "Musical Instruments",
      "Office Equipment",
    ],
    default: "Other",
  },
  documentUrls: [
    {
      type: String,
    },
  ],
  notes: {
    type: String,
    trim: true,
  },
  reminderDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster querying
warrantySchema.index({ user: 1, expirationDate: 1 });

const Warranty = mongoose.model("Warranty", warrantySchema);

export default Warranty;
