import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Expense from "../models/Expense.js";
import Bill from "../models/Bill.js";
import Warranty from "../models/Warranty.js";
import { authenticateToken } from "../middleware/auth.js";
import { validate, authValidation } from "../middleware/validator.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { OAuth2Client } from "google-auth-library";
import cloudinary from "../cloudinary.js";

/**
 * Google OAuth Configuration:
 * - Authorized JavaScript origins: http://localhost:5173
 * - Authorized redirect URIs: http://localhost:5000/api/google/callback
 */

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = express.Router();

// Configure multer for avatar uploads (using memory storage for Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

// Helper function to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Helper function to format user response
const formatUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  preferences: user.preferences,
  createdAt: user.createdAt,
});

// Helper function to delete avatar file
const deleteAvatarFile = (avatarPath) => {
  try {
    if (!avatarPath || !avatarPath.includes("/uploads/")) return;

    const fullPath = path.join(
      process.cwd(),
      avatarPath.replace(/^\//, "")
    );
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log("Avatar deleted:", fullPath);
    }
  } catch (error) {
    console.error("Error deleting avatar:", error);
  }
};

// Helper to extract Cloudinary public ID from URL
const getCloudinaryPublicId = (url) => {
  // Example: https://res.cloudinary.com/<cloud_name>/image/upload/v1234567890/avatars/avatar-123.jpg
  // Extract "avatars/avatar-123"
  if (!url) return null;
  const match = url.match(/\/avatars\/([^./]+)(\.[a-zA-Z]+)?$/);
  if (match) {
    return `avatars/${match[1]}`;
  }
  return null;
};

// @route   POST /api/auth/register
router.post(
  "/register",
  validate(authValidation.register),
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password and create user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = new User({
        name,
        email,
        password: hashedPassword,
      });

      await user.save();

      const token = generateToken(user);

      res.status(201).json({
        token,
        user: formatUserResponse(user),
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/auth/login
router.post("/login", validate(authValidation.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and check password
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/auth/google
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // Find or create user
    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email: payload.email }],
    });

    if (!user) {
      user = new User({
        name: payload.name,
        email: payload.email,
        googleId: payload.sub,
        avatar: payload.picture,
      });
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      if (payload.picture && !user.avatar) {
        user.avatar = payload.picture;
      }
    }

    await user.save();

    const jwtToken = generateToken(user);

    res.json({
      token: jwtToken,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(500).json({ message: "Google authentication failed" });
  }
});

// @route   GET /api/auth/me
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(formatUserResponse(user));
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/auth/profile
router.put(
  "/profile",
  authenticateToken,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const { name, email, preferences } = req.body;
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update basic fields
      if (name) user.name = name;
      if (email) user.email = email;
      if (preferences) {
        user.preferences = {
          ...user.preferences,
          ...JSON.parse(preferences),
        };
      }

      // Handle avatar update with Cloudinary
      if (req.file) {
        try {
          // Delete old avatar if needed
          if (user.avatar && user.avatar.startsWith("http")) {
            const publicId = getCloudinaryPublicId(user.avatar);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
            }
          }

          // Upload buffer to Cloudinary using Promise
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: "avatars",
                width: 200,
                height: 200,
                crop: "fill",
                resource_type: "image",
              },
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  resolve(result);
                }
              }
            );
            uploadStream.end(req.file.buffer);
          });

          // Update user avatar with the new URL
          user.avatar = uploadResult.secure_url;
          await user.save();

          return res.json({
            user: formatUserResponse(user),
          });
        } catch (uploadError) {
          console.error("Avatar upload error:", uploadError);
          return res
            .status(500)
            .json({ message: "Failed to upload avatar" });
        }
      }

      await user.save();

      res.json({
        user: formatUserResponse(user),
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   DELETE /api/auth/profile/avatar
router.delete("/profile/avatar", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete avatar from Cloudinary or local
    if (user.avatar) {
      try {
        if (user.avatar.startsWith("http")) {
          const publicId = getCloudinaryPublicId(user.avatar);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
            console.log(`Avatar deleted from Cloudinary: ${publicId}`);
          }
        } else if (user.avatar.startsWith("/uploads/")) {
          deleteAvatarFile(user.avatar);
        }
        user.avatar = undefined;
        await user.save();
      } catch (avatarError) {
        console.error("Error deleting avatar:", avatarError);
        // Continue with removing avatar reference even if deletion fails
        user.avatar = undefined;
        await user.save();
      }
    }

    res.json({
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Remove avatar error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/auth/currency
router.put("/currency", authenticateToken, async (req, res) => {
  try {
    const { currency } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.preferences.currency = currency;
    await user.save();

    res.json({
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Update currency error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/auth/profile
router.delete("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete avatar from Cloudinary or local
    if (user.avatar) {
      try {
        if (user.avatar.startsWith("http")) {
          const publicId = getCloudinaryPublicId(user.avatar);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
            console.log(
              `User avatar deleted from Cloudinary: ${publicId}`
            );
          }
        } else if (user.avatar.startsWith("/uploads/")) {
          deleteAvatarFile(user.avatar);
        }
      } catch (avatarError) {
        console.error("Error deleting user avatar:", avatarError);
        // Continue with user deletion even if avatar deletion fails
      }
    }

    // Delete related data first (cascade deletion)
    console.log(`Starting cascade deletion for user: ${req.user.id}`);

    try {
      // Delete all warranties and their associated Cloudinary images
      const warranties = await Warranty.find({ user: req.user.id });
      for (const warranty of warranties) {
        // Delete warranty images from Cloudinary
        if (
          warranty.warrantyCardImages &&
          warranty.warrantyCardImages.length > 0
        ) {
          const deletePromises = warranty.warrantyCardImages.map(
            async (image) => {
              try {
                await cloudinary.uploader.destroy(image.publicId);
                console.log(`Deleted warranty image: ${image.publicId}`);
              } catch (error) {
                console.error(
                  `Failed to delete warranty image ${image.publicId}:`,
                  error
                );
              }
            }
          );
          await Promise.allSettled(deletePromises);
        }
      }

      // Delete all user data
      const [deletedExpenses, deletedBills, deletedWarranties] =
        await Promise.all([
          Expense.deleteMany({ user: req.user.id }),
          Bill.deleteMany({ user: req.user.id }),
          Warranty.deleteMany({ user: req.user.id }),
        ]);

      console.log(
        `Deleted: ${deletedExpenses.deletedCount} expenses, ${deletedBills.deletedCount} bills, ${deletedWarranties.deletedCount} warranties`
      );
    } catch (cascadeError) {
      console.error("Error during cascade deletion:", cascadeError);
      // Continue with user deletion even if cascade fails
    }

    // Delete user
    await User.findByIdAndDelete(req.user.id);
    console.log(`User ${req.user.id} deleted successfully`);

    res.json({ message: "User profile deleted successfully" });
  } catch (error) {
    console.error("Delete profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/auth/profile/stats
// @desc    Get basic user profile statistics
// @access  Private
router.get("/profile/stats", authenticateToken, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Basic counts - only what the client uses
    const [billsCount, expensesCount, warrantiesCount] = await Promise.all(
      [
        Bill.countDocuments({ user: userId }),
        Expense.countDocuments({ user: userId }),
        Warranty.countDocuments({ user: userId }),
      ]
    );

    res.json({
      activity: {
        bills: billsCount,
        expenses: expensesCount,
        warranties: warrantiesCount,
        total: billsCount + expensesCount + warrantiesCount,
      },
    });
  } catch (error) {
    console.error("Get profile stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
