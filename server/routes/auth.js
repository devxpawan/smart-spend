import bcrypt from "bcryptjs";
import express from "express";
import fs from "fs";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import cloudinary from "../cloudinary.js";
import { authenticateToken } from "../middleware/auth.js";
import { authValidation, validate } from "../middleware/validator.js";
import Bill from "../models/Bill.js";
import Expense from "../models/Expense.js";
import Income from "../models/Income.js";
import User from "../models/User.js";
import Warranty from "../models/Warranty.js";
import generateOTP from "../utils/otpGenerator.js";
import sendEmail from "../utils/sendEmail.js";

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
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

// Helper function to generate JWT
const generateVerificationEmailHtml = (otp, expiresMinutes) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
      <div style="background-color: #4CAF50; color: #ffffff; padding: 25px 20px; text-align: center;">
        <h1 style="font-size: 28px; margin: 0; font-weight: 600;">SmartSpend</h1>
        <p style="font-size: 16px; margin: 5px 0 0;">Email Verification</p>
      </div>
      <div style="padding: 30px 25px;">
        <p style="font-size: 16px; color: #555;">Dear User,</p>
        <p style="font-size: 16px; color: #555;">Thank you for registering with SmartSpend. To complete your registration, please use the following One-Time Password (OTP):</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; background-color: #e0e0e0; color: #333; font-size: 32px; font-weight: bold; padding: 15px 30px; border-radius: 8px; letter-spacing: 2px;">${otp}</span>
        </div>
        <p style="font-size: 15px; color: #777;">This OTP is valid for <strong style="color: #333;">${expiresMinutes} minutes</strong>. Please do not share this code with anyone.</p>
        <p style="font-size: 15px; color: #777;">If you did not request this, please ignore this email.</p>
        <p style="font-size: 16px; color: #555; margin-top: 30px;">Best regards,</p>
        <p style="font-size: 16px; color: #555; margin: 0;">The SmartSpend Team</p>
      </div>
      <div style="background-color: #f0f0f0; padding: 20px 25px; text-align: center; font-size: 12px; color: #777;">
        <p style="margin: 0;">This is an automated email, please do not reply.</p>
        <p style="margin: 5px 0 0;">&copy; ${new Date().getFullYear()} SmartSpend. All rights reserved.</p>
      </div>
    </div>
  </div>
`;

const generatePasswordResetEmailHtml = (otp, expiresMinutes) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
      <div style="background-color: #FF6347; color: #ffffff; padding: 25px 20px; text-align: center;">
        <h1 style="font-size: 28px; margin: 0; font-weight: 600;">SmartSpend</h1>
        <p style="font-size: 16px; margin: 5px 0 0;">Password Reset Request</p>
      </div>
      <div style="padding: 30px 25px;">
        <p style="font-size: 16px; color: #555;">Dear User,</p>
        <p style="font-size: 16px; color: #555;">We received a request to reset your password. Please use the following One-Time Password (OTP) to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; background-color: #e0e0e0; color: #333; font-size: 32px; font-weight: bold; padding: 15px 30px; border-radius: 8px; letter-spacing: 2px;">${otp}</span>
        </div>
        <p style="font-size: 15px; color: #777;">This OTP is valid for <strong style="color: #333;">${expiresMinutes} minutes</strong>. Please do not share this code with anyone.</p>
        <p style="font-size: 15px; color: #777;">If you did not request a password reset, please ignore this email.</p>
        <p style="font-size: 16px; color: #555; margin-top: 30px;">Best regards,</p>
        <p style="font-size: 16px; color: #555; margin: 0;">The SmartSpend Team</p>
      </div>
      <div style="background-color: #f0f0f0; padding: 20px 25px; text-align: center; font-size: 12px; color: #777;">
        <p style="margin: 0;">This is an automated email, please do not reply.</p>
        <p style="margin: 5px 0 0;">&copy; ${new Date().getFullYear()} SmartSpend. All rights reserved.</p>
      </div>
    </div>
  </div>
`;

const generateAccountCreatedEmailHtml = (userName) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
      <div style="background-color: #4CAF50; color: #ffffff; padding: 25px 20px; text-align: center;">
        <h1 style="font-size: 28px; margin: 0; font-weight: 600;">SmartSpend</h1>
        <p style="font-size: 16px; margin: 5px 0 0;">Account Created Successfully!</p>
      </div>
      <div style="padding: 30px 25px;">
        <p style="font-size: 16px; color: #555;">Dear ${userName},</p>
        <p style="font-size: 16px; color: #555;">Welcome to SmartSpend! Your account has been successfully created and verified.</p>
        <p style="font-size: 16px; color: #555;">You can now log in and start managing your finances with ease.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${
            process.env.CLIENT_URL
          }/auth" style="display: inline-block; background-color: #4CAF50; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold;">Log In to Your Account</a>
        </div>
        <p style="font-size: 16px; color: #555; margin-top: 30px;">Thank you for joining SmartSpend!</p>
        <p style="font-size: 16px; color: #555; margin: 0;">Best regards,</p>
        <p style="font-size: 16px; color: #555; margin: 0;">The SmartSpend Team</p>
      </div>
      <div style="background-color: #f0f0f0; padding: 20px 25px; text-align: center; font-size: 12px; color: #777;">
        <p style="margin: 0;">This is an automated email, please do not reply.</p>
        <p style="margin: 5px 0 0;">&copy; ${new Date().getFullYear()} SmartSpend. All rights reserved.</p>
      </div>
    </div>
  </div>
`;

const generateAccountDeletedEmailHtml = (userName) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
      <div style="background-color: #DC3545; color: #ffffff; padding: 25px 20px; text-align: center;">
        <h1 style="font-size: 28px; margin: 0; font-weight: 600;">SmartSpend</h1>
        <p style="font-size: 16px; margin: 5px 0 0;">Account Deletion Confirmation</p>
      </div>
      <div style="padding: 30px 25px;">
        <p style="font-size: 16px; color: #555;">Dear ${userName},</p>
        <p style="font-size: 16px; color: #555;">This email confirms that your SmartSpend account has been successfully deleted.</p>
        <p style="font-size: 16px; color: #555;">We are sorry to see you go. If this was an error or you have any questions, please contact our support team.</p>
        <p style="font-size: 16px; color: #555; margin-top: 30px;">Best regards,</p>
        <p style="font-size: 16px; color: #555; margin: 0;">The SmartSpend Team</p>
      </div>
      <div style="background-color: #f0f0f0; padding: 20px 25px; text-align: center; font-size: 12px; color: #777;">
        <p style="margin: 0;">This is an automated email, please do not reply.</p>
        <p style="margin: 5px 0 0;">&copy; ${new Date().getFullYear()} SmartSpend. All rights reserved.</p>
      </div>
    </div>
  </div>
`;

const generatePasswordResetConfirmationEmailHtml = (
  userName,
  isNewPassword
) => {
  const newPasswordMessage = isNewPassword
    ? `
        <p style="font-size: 16px; color: #555;">
          Since you previously signed in using Google, we've now set a password for your account.
          You can now log in using either your Google account or your email and this new password.
        </p>
      `
    : "";

  return `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
      <div style="background-color: #4CAF50; color: #ffffff; padding: 25px 20px; text-align: center;">
        <h1 style="font-size: 28px; margin: 0; font-weight: 600;">SmartSpend</h1>
        <p style="font-size: 16px; margin: 5px 0 0;">Password Reset Successful</p>
      </div>
      <div style="padding: 30px 25px;">
        <p style="font-size: 16px; color: #555;">Dear ${userName},</p>
        <p style="font-size: 16px; color: #555;">Your password for your SmartSpend account has been successfully reset.</p>
        ${newPasswordMessage}
        <p style="font-size: 16px; color: #555;">If you did not initiate this change, please contact our support team immediately.</p>
        <p style="font-size: 16px; color: #555; margin-top: 30px;">Best regards,</p>
        <p style="font-size: 16px; color: #555; margin: 0;">The SmartSpend Team</p>
      </div>
      <div style="background-color: #f0f0f0; padding: 20px 25px; text-align: center; font-size: 12px; color: #777;">
        <p style="margin: 0;">This is an automated email, please do not reply.</p>
        <p style="margin: 5px 0 0;">&copy; ${new Date().getFullYear()} SmartSpend. All rights reserved.</p>
      </div>
    </div>
  </div>
`;
};

// Helper function to generate JWT
const generateToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Helper function to format user response
const formatUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  preferences: user.preferences,
  customIncomeCategories: user.customIncomeCategories,
  customExpenseCategories: user.customExpenseCategories,
  createdAt: user.createdAt,
  isGoogleUser: !!user.googleId, // Add this field
});

// Helper to extract Cloudinary public ID from URL
const getCloudinaryPublicId = (url) => {
  if (!url) return null;
  // Example URL: https://res.cloudinary.com/cloud-name/image/upload/v12345/avatars/random_string.jpg
  // We want to extract "avatars/random_string"
  const match = url.match(/avatars\/([^.]+)/);
  if (match && match[1]) {
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

      let user = await User.findOne({ email });

      if (user && user.isVerified) {
        return res.status(400).json({ message: "User already exists" });
      }

      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      if (user && !user.isVerified) {
        // User exists but is not verified, update OTP
        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();
      } else {
        // New user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
          name,
          email,
          password: hashedPassword,
          otp,
          otpExpires,
        });

        await user.save();
      }

      // Send OTP email
      await sendEmail(
        email,
        "Verify your email",
        null, // text content (optional)
        generateVerificationEmailHtml(otp, 10) // html content
      );

      res.status(201).json({
        message: "OTP sent to your email. Please verify to continue.",
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user);

    // Send account creation success email
    await sendEmail(
      user.email,
      "Welcome to SmartSpend! Your Account is Ready",
      null,
      generateAccountCreatedEmailHtml(user.name)
    );

    res.json({
      token,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/auth/resend-otp
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP email
    await sendEmail(
      email,
      "Verify your email",
      null, // text content (optional)
      generateVerificationEmailHtml(otp, 10) // html content
    );

    res.json({ message: "New OTP sent to your email" });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/auth/login
router.post("/login", validate(authValidation.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and check password
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res
        .status(401)
        .json({ message: "Please verify your email to login" });
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

// @route   POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOTP();
    user.passwordResetOTP = otp;
    user.passwordResetExpires = Date.now() + 300000; // 5 minutes

    await user.save();

    await sendEmail(
      user.email,
      "Password Reset OTP",
      null, // text content (optional)
      generatePasswordResetEmailHtml(otp, 5) // html content
    );

    res.json({ message: "OTP sent to your email." });
  } catch (error) {
    console.error("Forgot password error:", error.message, error.stack);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const user = await User.findOne({
      email,
      passwordResetOTP: otp,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // If user has a password, check if the new password is the same as the old one
    if (user.password) {
      const isSamePassword = await bcrypt.compare(password, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          message: "New password cannot be the same as the old password.",
        });
      }
    }

    const isNewPassword = !user.password;
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.passwordResetOTP = undefined;
    user.passwordResetExpires = undefined;
    user.isVerified = true; // Mark user as verified

    await user.save();

    // Send password reset confirmation email
    await sendEmail(
      user.email,
      "SmartSpend Password Reset Successful",
      null,
      generatePasswordResetConfirmationEmailHtml(user.name, isNewPassword)
    );

    res.json({ message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

("");

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
        isVerified: true, // Google users are considered verified
      });
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      user.isVerified = true;
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

router.post("/check-google-user", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.googleId) {
      return res.json({ isGoogleUser: true });
    }

    res.json({ isGoogleUser: false });
  } catch (error) {
    console.error("Check google user error:", error);
    res.status(500).json({ message: "Server error" });
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
      const { name } = req.body; // Only get name, as email and preferences are not updated here
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (name) {
        user.name = name;
      }

      if (req.file) {
        // Delete old avatar if it's a cloudinary url
        if (user.avatar && user.avatar.includes("cloudinary")) {
          const publicId = getCloudinaryPublicId(user.avatar);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        }

        // Upload new avatar
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
              if (error) return reject(error);
              resolve(result);
            }
          );
          uploadStream.end(req.file.buffer);
        });

        if (uploadResult && uploadResult.secure_url) {
          user.avatar = uploadResult.secure_url;
        } else {
          // This case should be handled, maybe return an error
          // For now, just log it.
          console.error("Cloudinary upload failed, no secure_url in result");
        }
      }

      await user.save();

      res.json({
        user: formatUserResponse(user),
      });
    } catch (error) {
      console.error("Update profile error:", error);
      // Check for cloudinary errors
      if (error.http_code) {
        return res.status(error.http_code).json({ message: error.message });
      }
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
            console.log(`User avatar deleted from Cloudinary: ${publicId}`);
          }
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
    // Send account deletion confirmation email before deleting the user
    await sendEmail(
      user.email,
      "SmartSpend Account Deletion Confirmation",
      null,
      generateAccountDeletedEmailHtml(user.name)
    );
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
    const [billsCount, expensesCount, warrantiesCount, incomesCount] =
      await Promise.all([
        Bill.countDocuments({ user: userId }),
        Expense.countDocuments({ user: userId }),
        Warranty.countDocuments({ user: userId }),
        Income.countDocuments({ user: userId }),
      ]);

    res.json({
      activity: {
        bills: billsCount,
        expenses: expensesCount,
        warranties: warrantiesCount,
        incomes: incomesCount,
        total: billsCount + expensesCount + warrantiesCount + incomesCount,
      },
    });
  } catch (error) {
    console.error("Get profile stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;


