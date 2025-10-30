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
    res.status(500).json({ message: "Server error" });
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

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = registrationInfo;

      // Save the credential to the user's account
      user.webauthnCredentials.push({
        id: isoBase64URL.fromBuffer(credentialID),
        publicKey: credentialPublicKey,
        counter,
        transports: body.response.transports,
      });

      await user.save();

      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: "Verification failed" });
    }
  } catch (error) {
    console.error("WebAuthn registration error:", error);
    res.status(500).json({ message: "Server error" });
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

    res.json(options);
  } catch (error) {
    console.error("WebAuthn login options error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/webauthn/login
// @desc    Verify WebAuthn authentication
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { body } = req;
    const { email } = body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Find the credential matching the credential ID
    const credential = user.webauthnCredentials.find(
      (cred) => cred.id === body.id
    );

    if (!credential) {
      return res.status(400).json({ message: "Credential not found" });
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
      res.status(400).json({ success: false, message: "Verification failed" });
    }
  } catch (error) {
    console.error("WebAuthn login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;