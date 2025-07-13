import express from "express";
import { check, validationResult } from "express-validator";
import Warranty from "../models/Warranty.js";
import multer from "multer";
import cloudinary from "../cloudinary.js";
import {
  generateAndUploadQRCode,
  generateWarrantyQRCodeURL,
  deleteQRCodeFromCloudinary,
} from "../utils/qrCodeGenerator.js";

const router = express.Router();

// Helper function to delete images from Cloudinary
const deleteCloudinaryImages = async (images) => {
  if (!images || images.length === 0) return;

  const deletePromises = images.map(async (image) => {
    try {
      await cloudinary.uploader.destroy(image.publicId);
      console.log(`Deleted image from Cloudinary: ${image.publicId}`);
    } catch (error) {
      console.error(`Failed to delete image ${image.publicId}:`, error);
    }
  });

  await Promise.allSettled(deletePromises);
};

// Configure multer for warranty image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for warranty cards
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf)$/i)) {
      return cb(
        new Error(
          "Only image files (JPG, JPEG, PNG, GIF) and PDF files are allowed!"
        ),
        false
      );
    }
    cb(null, true);
  },
});

// Helper function to get Cloudinary public ID from URL
const getCloudinaryPublicId = (url) => {
  const parts = url.split("/");
  const filename = parts[parts.length - 1];
  return filename.split(".")[0];
};

// @route   GET /api/warranties/public/:id
// @desc    Get warranty details publicly (for QR code access)
// @access  Public (no auth required)
router.get("/public/:id", async (req, res) => {
  try {
    const warranty = await Warranty.findById(req.params.id).select(
      "productName purchaseDate expirationDate retailer category notes createdAt qrCode"
    );

    if (!warranty) {
      return res.status(404).json({ message: "Warranty not found" });
    }

    // Return only essential warranty information for public access
    const publicWarrantyData = {
      id: warranty._id,
      productName: warranty.productName,
      purchaseDate: warranty.purchaseDate,
      expirationDate: warranty.expirationDate,
      retailer: warranty.retailer,
      category: warranty.category,
      notes: warranty.notes,
      createdAt: warranty.createdAt,
      // Calculate warranty status
      isExpired: new Date() > new Date(warranty.expirationDate),
      daysUntilExpiry: Math.ceil(
        (new Date(warranty.expirationDate) - new Date()) /
          (1000 * 60 * 60 * 24)
      ),
    };

    res.json(publicWarrantyData);
  } catch (error) {
    console.error("Get public warranty error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid warranty ID" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/warranties/expiring/soon
// @desc    Get warranties expiring soon
// @access  Private
// IMPORTANT: This must come BEFORE the /:id route
router.get("/expiring/soon", async (req, res) => {
  try {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const expiringWarranties = await Warranty.find({
      user: req.user.id,
      expirationDate: { $gte: today, $lte: nextMonth },
    }).sort({ expirationDate: 1 });

    res.json(expiringWarranties);
  } catch (error) {
    console.error("Get expiring warranties error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/warranties
// @desc    Get all warranties for a user
// @access  Private
router.get("/", async (req, res) => {
  try {
    const { category, expired, limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { user: req.user.id };

    if (category) {
      filter.category = category;
    }

    const today = new Date();
    if (expired === "true") {
      filter.expirationDate = { $lt: today };
    } else if (expired === "false") {
      filter.expirationDate = { $gte: today };
    }

    const total = await Warranty.countDocuments(filter);

    const warranties = await Warranty.find(filter)
      .sort({ expirationDate: 1 })
      .limit(parseInt(limit))
      .skip(skip);

    res.json({
      warranties,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get warranties error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/warranties
// @desc    Create a new warranty
// @access  Private
router.post(
  "/",
  [
    check("productName", "Product name is required").trim().notEmpty(),
    check("expirationDate", "Expiration date is required").notEmpty(),
    check("category", "Category is required").notEmpty(),
    check("purchasePrice", "Purchase price must be a number")
      .optional()
      .isNumeric(),
    check("retailer", "Retailer name is invalid").optional().trim(),
    check("notes", "Notes are invalid").optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        productName,
        purchaseDate,
        expirationDate,
        retailer,
        purchasePrice,
        category,
        documentUrls,
        notes,
        reminderDate,
        currency,
        warrantyCardImages,
      } = req.body;

      // Validate dates
      const expDate = new Date(expirationDate);
      if (isNaN(expDate.getTime())) {
        return res
          .status(400)
          .json({ message: "Invalid expiration date format" });
      }

      if (purchaseDate) {
        const purDate = new Date(purchaseDate);
        if (isNaN(purDate.getTime())) {
          return res
            .status(400)
            .json({ message: "Invalid purchase date format" });
        }
      }

      const newWarranty = new Warranty({
        user: req.user.id,
        productName: productName.trim(),
        purchaseDate: purchaseDate || null,
        expirationDate: expDate,
        retailer: retailer?.trim() || null,
        purchasePrice: purchasePrice || null,
        category,
        documentUrls: documentUrls || [],
        notes: notes?.trim() || null,

        currency: currency || "USD",
        warrantyCardImages: warrantyCardImages || [],
      });

      const warranty = await newWarranty.save();

      // Generate QR code after warranty is saved
      try {
        const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
        const qrCodeURL = generateWarrantyQRCodeURL(warranty._id, baseUrl);

        const qrCodeResult = await generateAndUploadQRCode(
          qrCodeURL,
          warranty._id.toString()
        );

        // Update warranty with QR code information
        warranty.qrCode = {
          url: qrCodeResult.url,
          publicId: qrCodeResult.publicId,
          generatedAt: new Date(),
        };

        await warranty.save();

        console.log(`QR code generated for warranty ${warranty._id}`);
      } catch (qrError) {
        console.error("QR code generation failed:", qrError);
        // Don't fail the warranty creation if QR code generation fails
      }

      res.status(201).json(warranty);
    } catch (error) {
      console.error("Create warranty error:", error);

      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "Invalid data provided",
          details: error.message,
        });
      }

      if (error.code === 11000) {
        return res
          .status(409)
          .json({ message: "Duplicate warranty entry" });
      }

      res.status(500).json({ message: "Server error creating warranty" });
    }
  }
);

// @route   PUT /api/warranties/:id
// @desc    Update warranty
// @access  Private
router.put(
  "/:id",
  [
    check("productName", "Product name is required")
      .optional()
      .trim()
      .notEmpty(),
    check("expirationDate", "Invalid expiration date")
      .optional()
      .isISO8601(),
    check("category", "Category is required").optional().notEmpty(),
    check("purchasePrice", "Purchase price must be a number")
      .optional()
      .isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        productName,
        purchaseDate,
        expirationDate,
        retailer,
        purchasePrice,
        category,
        documentUrls,
        notes,
        reminderDate,
        currency,
        warrantyCardImages,
      } = req.body;

      const warranty = await Warranty.findOne({
        _id: req.params.id,
        user: req.user.id,
      });

      if (!warranty) {
        return res.status(404).json({ message: "Warranty not found" });
      }

      // Update fields
      if (productName !== undefined)
        warranty.productName = productName.trim();
      if (purchaseDate !== undefined) warranty.purchaseDate = purchaseDate;
      if (expirationDate !== undefined)
        warranty.expirationDate = expirationDate;
      if (retailer !== undefined)
        warranty.retailer = retailer?.trim() || null;
      if (purchasePrice !== undefined)
        warranty.purchasePrice = purchasePrice;
      if (category !== undefined) warranty.category = category;
      if (documentUrls !== undefined) warranty.documentUrls = documentUrls;
      if (notes !== undefined) warranty.notes = notes?.trim() || null;

      if (currency !== undefined) warranty.currency = currency;
      // Handle warranty card images with Cloudinary cleanup
      if (warrantyCardImages !== undefined) {
        // Find images that were removed (exist in current warranty but not in new data)
        const currentImages = warranty.warrantyCardImages || [];
        const newImages = warrantyCardImages || [];

        const currentPublicIds = currentImages.map((img) => img.publicId);
        const newPublicIds = newImages.map((img) => img.publicId);

        const imagesToDelete = currentImages.filter(
          (img) => !newPublicIds.includes(img.publicId)
        );

        // Delete removed images from Cloudinary
        await deleteCloudinaryImages(imagesToDelete);

        warranty.warrantyCardImages = warrantyCardImages;
      }

      const updatedWarranty = await warranty.save();
      res.json(updatedWarranty);
    } catch (error) {
      console.error("Update warranty error:", error);
      if (error.name === "CastError") {
        return res.status(400).json({ message: "Invalid warranty ID" });
      }
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   DELETE /api/warranties/:warrantyId/delete-image
// @desc    Delete warranty card image from warranty and Cloudinary
// @access  Private
router.delete("/:warrantyId/delete-image", async (req, res) => {
  try {
    console.log("DELETE image route hit:", req.query);
    const { warrantyId } = req.params;
    // Get publicId from query parameter
    const publicId = req.query.publicId;

    if (!publicId) {
      return res.status(400).json({ message: "Public ID is required" });
    }

    // Find the warranty
    const warranty = await Warranty.findOne({
      _id: warrantyId,
      user: req.user.id,
    });

    if (!warranty) {
      return res.status(404).json({ message: "Warranty not found" });
    }

    // Find the image in the warranty
    const imageIndex = warranty.warrantyCardImages.findIndex(
      (img) => img.publicId === publicId
    );

    if (imageIndex === -1) {
      return res
        .status(404)
        .json({ message: "Image not found in warranty" });
    }

    // Remove the image from the warranty
    const imageToDelete = warranty.warrantyCardImages[imageIndex];
    warranty.warrantyCardImages.splice(imageIndex, 1);

    // Save the warranty first
    await warranty.save();

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted image from Cloudinary: ${publicId}`);
    } catch (cloudinaryError) {
      console.error(
        `Failed to delete image from Cloudinary: ${publicId}`,
        cloudinaryError
      );
      // Continue even if Cloudinary deletion fails
    }

    res.json({
      message: "Image deleted successfully",
      warranty: warranty,
    });
  } catch (error) {
    console.error("Image deletion error:", error);
    res.status(500).json({
      message: "Failed to delete image",
      error: error.message,
    });
  }
});

// @route   DELETE /api/warranties/:id
// @desc    Delete warranty
// @access  Private
router.delete("/:id", async (req, res) => {
  try {
    const warranty = await Warranty.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!warranty) {
      return res.status(404).json({ message: "Warranty not found" });
    }

    // Delete all associated images from Cloudinary before deleting warranty
    await deleteCloudinaryImages(warranty.warrantyCardImages);

    // Delete QR code from Cloudinary if it exists
    if (warranty.qrCode && warranty.qrCode.publicId) {
      try {
        await deleteQRCodeFromCloudinary(warranty.qrCode.publicId);
      } catch (qrError) {
        console.error("Failed to delete QR code:", qrError);
        // Don't fail the warranty deletion if QR code deletion fails
      }
    }

    await warranty.deleteOne();
    res.json({ message: "Warranty removed" });
  } catch (error) {
    console.error("Delete warranty error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid warranty ID" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/warranties/upload-image
// @desc    Upload warranty card image
// @access  Private
router.post(
  "/upload-image",
  upload.single("warrantyImage"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "warranty-cards",
              resource_type: "auto", // Handles both images and PDFs
              transformation: [
                { width: 1200, height: 1200, crop: "limit" }, // Limit size while maintaining aspect ratio
                { quality: "auto" }, // Automatic quality optimization
                { fetch_format: "auto" }, // Automatic format optimization
              ],
            },
            (error, result) => {
              if (error) {
                console.error("Cloudinary upload error:", error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          )
          .end(req.file.buffer);
      });

      res.json({
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
      });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({
        message: "Failed to upload image",
        error: error.message,
      });
    }
  }
);

// @route   DELETE /api/warranties/delete-image/:publicId
// @desc    Delete warranty card image from Cloudinary only (legacy route)
// @access  Private
router.delete("/delete-image/:publicId", async (req, res) => {
  try {
    const publicId = decodeURIComponent(req.params.publicId);

    if (!publicId) {
      return res.status(400).json({ message: "Public ID is required" });
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      res.json({ message: "Image deleted successfully" });
    } else {
      res
        .status(404)
        .json({ message: "Image not found or already deleted" });
    }
  } catch (error) {
    console.error("Image deletion error:", error);
    res.status(500).json({
      message: "Failed to delete image",
      error: error.message,
    });
  }
});

export default router;
