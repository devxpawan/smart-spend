import express from "express";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

// Human-readable title for our "Relying Party" (RP)
const rpName = "SmartSpend";
// A unique identifier for our Relying Party (RP)
// Use the domain name of your website for production
const rpID = process.env.NODE_ENV === "production" 
  ? new URL(process.env.CLIENT_URL).hostname 
  : "localhost";
// The origin of our website (protocol + domain + port)
const origin = process.env.NODE_ENV === "production" 
  ? process.env.CLIENT_URL 
  : "http://localhost:5173";

// Helper function to convert string to Uint8Array
function stringToUint8Array(str) {
  return new Uint8Array(str.split('').map(char => char.charCodeAt(0)));
}

// @route   GET /api/webauthn/register-options
// @desc    Generate registration options for WebAuthn
// @access  Private
router.get("/register-options", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Retrieve any of the user's previously-registered credentials
    const userCredentials = user.webauthnCredentials.map(cred => ({
      id: isoBase64URL.toBuffer(cred.id),
      type: "public-key",
      transports: cred.transports,
    }));

    const options = generateRegistrationOptions({
      rpName,
      rpID,
      userID: stringToUint8Array(user.id), // Convert user ID to Uint8Array
      userName: user.email,
      // Don't prompt users for additional information about the credential
      attestationType: "none",
      // Prevent users from re-registering existing credentials
      excludeCredentials: userCredentials,
      // See "Guiding use of authenticators" below
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        // Defaults
        authenticatorAttachment: "platform", // Use platform authenticators (biometrics)
      },
    });

    // Store the challenge in the user's session or database for verification later
    user.currentChallenge = options.challenge;
    await user.save();

    res.json(options);
  } catch (error) {
    console.error("WebAuthn registration options error:", error);
    res.status(500).json({ message: "Failed to generate registration options. Please try again." });
  }
});

// @route   POST /api/webauthn/register
// @desc    Verify and store new WebAuthn credential
// @access  Private
router.post("/register", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { body } = req;

    // Check if currentChallenge exists
    if (!user.currentChallenge) {
      return res.status(400).json({ message: "No registration challenge found. Please try again." });
    }

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credentialID, credentialPublicKey, counter } = registrationInfo;

      // Save the credential to the user's account
      user.webauthnCredentials.push({
        id: isoBase64URL.fromBuffer(credentialID),
        publicKey: credentialPublicKey,
        counter,
        transports: body.response.transports || [],
      });

      // Clear the challenge
      user.currentChallenge = undefined;
      await user.save();

      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: "Verification failed. Please try again." });
    }
  } catch (error) {
    console.error("WebAuthn registration error:", error);
    res.status(500).json({ success: false, message: "Failed to register fingerprint. Please try again." });
  }
});

// @route   GET /api/webauthn/login-options
// @desc    Generate authentication options for WebAuthn
// @access  Public
router.get("/login-options", async (req, res) => {
  try {
    // We don't have a user yet, so we'll generate options without user-specific credentials
    const options = generateAuthenticationOptions({
      rpID,
      // Do not prompt for user verification if not necessary
      userVerification: "preferred",
    });

    // Store the challenge in the session for verification later
    req.session.currentChallenge = options.challenge;
    
    // Save session
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Failed to save session. Please try again." });
      }
      
      res.json(options);
    });
  } catch (error) {
    console.error("WebAuthn login options error:", error);
    res.status(500).json({ message: "Failed to generate login options. Please try again." });
  }
});

// @route   POST /api/webauthn/login
// @desc    Verify WebAuthn authentication
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { body } = req;
    const { email } = body;

    // Validate input
    if (!email) {
      return res.status(400).json({ message: "Email is required for authentication." });
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found. Please check your email." });
    }

    // Check if the user has any WebAuthn credentials
    if (!user.webauthnCredentials || user.webauthnCredentials.length === 0) {
      return res.status(400).json({ message: "No biometric credentials found. Please enable fingerprint login first." });
    }

    // Find the credential matching the credential ID
    const credential = user.webauthnCredentials.find(
      (cred) => cred.id === body.id
    );

    if (!credential) {
      return res.status(400).json({ message: "Credential not found. Please try again." });
    }

    // Check if currentChallenge exists in session
    if (!req.session.currentChallenge) {
      return res.status(400).json({ message: "No authentication challenge found. Please try again." });
    }

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: req.session.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: isoBase64URL.toBuffer(credential.id),
        publicKey: credential.publicKey,
        counter: credential.counter,
      },
    });

    const { verified, authenticationInfo } = verification;

    if (verified) {
      // Update the counter to prevent replay attacks
      credential.counter = authenticationInfo.newCounter;
      
      // Clear the challenge
      req.session.currentChallenge = undefined;
      
      await user.save();

      // Generate JWT token
      const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      // Format user response
      const formatUserResponse = (user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        preferences: user.preferences,
        customIncomeCategories: user.customIncomeCategories,
        customExpenseCategories: user.customExpenseCategories,
        createdAt: user.createdAt,
        isGoogleUser: !!user.googleId,
      });

      res.json({
        token,
        user: formatUserResponse(user),
      });
    } else {
      res.status(400).json({ success: false, message: "Authentication failed. Please try again." });
    }
  } catch (error) {
    console.error("WebAuthn login error:", error);
    res.status(500).json({ success: false, message: "Failed to authenticate. Please try again." });
  }
});

export default router;