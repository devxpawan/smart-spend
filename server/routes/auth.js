import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { authenticateToken } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/avatars";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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

// @route   POST /api/auth/register
router.post("/register", async (req, res) => {
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
});

// @route   POST /api/auth/login
router.post("/login", async (req, res) => {
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

      // Handle avatar update
      if (req.file) {
        // Delete old avatar
        if (user.avatar) deleteAvatarFile(user.avatar);

        // Set new avatar
        user.avatar = `/${req.file.path.replace(/\\/g, "/")}`;
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

    // Delete avatar file and remove from user
    if (user.avatar) {
      deleteAvatarFile(user.avatar);
      user.avatar = undefined;
      await user.save();
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

    // Delete avatar file
    if (user.avatar) deleteAvatarFile(user.avatar);

    // Delete user
    await User.findByIdAndDelete(req.user.id);

    // TODO: Delete related data (expenses, bills, warranties)

    res.json({ message: "User profile deleted successfully" });
  } catch (error) {
    console.error("Delete profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
