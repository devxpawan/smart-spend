import mongoose from "mongoose";
import cloudinary from "../cloudinary.js";

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
  warrantyCardImages: [
    {
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        required: true,
      },
      format: {
        type: String,
      },
      bytes: {
        type: Number,
      },
      width: {
        type: Number,
      },
      height: {
        type: Number,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  notes: {
    type: String,
    trim: true,
  },
  qrCode: {
    url: {
      type: String,
    },
    publicId: {
      type: String,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster querying
warrantySchema.index({ user: 1, expirationDate: 1 });

// Pre-hook to clean up Cloudinary images before warranty deletion
warrantySchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function () {
    try {
      if (this.warrantyCardImages && this.warrantyCardImages.length > 0) {
        const deletePromises = this.warrantyCardImages.map(
          async (image) => {
            try {
              await cloudinary.uploader.destroy(image.publicId);
              console.log(
                `Pre-hook: Deleted image from Cloudinary: ${image.publicId}`
              );
            } catch (error) {
              console.error(
                `Pre-hook: Failed to delete image ${image.publicId}:`,
                error
              );
            }
          }
        );

        await Promise.allSettled(deletePromises);
      }
    } catch (error) {
      console.error("Pre-hook: Error cleaning up warranty images:", error);
    }
  }
);

// Pre-hook for findOneAndDelete
warrantySchema.pre("findOneAndDelete", async function () {
  try {
    const warranty = await this.model.findOne(this.getQuery());
    if (
      warranty &&
      warranty.warrantyCardImages &&
      warranty.warrantyCardImages.length > 0
    ) {
      const deletePromises = warranty.warrantyCardImages.map(
        async (image) => {
          try {
            await cloudinary.uploader.destroy(image.publicId);
            console.log(
              `Pre-hook: Deleted image from Cloudinary: ${image.publicId}`
            );
          } catch (error) {
            console.error(
              `Pre-hook: Failed to delete image ${image.publicId}:`,
              error
            );
          }
        }
      );

      await Promise.allSettled(deletePromises);
    }
  } catch (error) {
    console.error("Pre-hook: Error cleaning up warranty images:", error);
  }
});

const Warranty = mongoose.model("Warranty", warrantySchema);

export default Warranty;
