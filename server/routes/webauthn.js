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
  
console.log("WebAuthn RP ID:", rpID);

// The origin of our website (protocol + domain + port)
const origin = process.env.NODE_ENV === "production" 
  ? process.env.CLIENT_URL 
  : "http://localhost:5173";

console.log("WebAuthn Origin:", origin);

// Helper function to convert string to Uint8Array
function stringToUint8Array(str) {
  return new Uint8Array(str.split('').map(char => char.charCodeAt(0)));
}

// @route   GET /api/webauthn/register-options
// @desc    Generate registration options for WebAuthn
// @access  Private
router.get("/register-options", authenticateToken, async (req, res) => {
  try {
    console.log("WebAuthn registration options request received");
    console.log("User ID from token:", req.user.id);
    
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log("WebAuthn registration options error: User not found");
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Generating registration options for user:", user.email);

    // Retrieve any of the user's previously-registered credentials
    const userCredentials = user.webauthnCredentials.map(cred => ({
      id: isoBase64URL.toBuffer(cred.id),
      type: "public-key",
      transports: cred.transports,
    }));

    console.log("User credentials for exclusion:", userCredentials.length);
    console.log("RP Name:", rpName);
    console.log("RP ID:", rpID);
    console.log("User ID (Uint8Array):", stringToUint8Array(user.id));
    console.log("User email:", user.email);

    const options = await generateRegistrationOptions({
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
        // Allow both platform and cross-platform authenticators
        // Remove the restriction to platform authenticators only
        // authenticatorAttachment: "platform", // This line was causing issues
      },
    });

    console.log("Generated registration options keys:", Object.keys(options));
    console.log("Challenge exists:", !!options.challenge);

    // Check if options were generated successfully
    if (!options || !options.challenge) {
      console.error("Failed to generate valid registration options");
      return res.status(500).json({ message: "Failed to generate registration options. Please try again." });
    }

    // Store the challenge in the user's document for verification later
    user.currentChallenge = options.challenge;
    await user.save();
    
    console.log("Stored challenge for user:", user.email);

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
    
    // Log the incoming request body for debugging
    console.log("Registration request body:", JSON.stringify(body, null, 2));

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
    
    // Log verification result for debugging
    console.log("Verification result:", { verified, registrationInfo });
    
    // Check if registrationInfo exists
    if (!registrationInfo) {
      console.error("Registration info is missing from verification result");
      return res.status(500).json({ 
        success: false, 
        message: "Registration verification failed. Please try again." 
      });
    }

    if (verified && registrationInfo) {
      // Log the entire registrationInfo object to understand its structure
      console.log("Full registration info:", JSON.stringify(registrationInfo, null, 2));
      
      const { credentialID, credentialPublicKey, counter } = registrationInfo;
      
      // Log registration info for debugging
      console.log("Registration info details:", { credentialID, credentialPublicKey, counter });
      
      // Validate required fields
      if (!credentialID) {
        console.error("Missing credential ID", { credentialID });
        return res.status(500).json({ 
          success: false, 
          message: "Missing credential ID. Please try again." 
        });
      }
      
      if (!credentialPublicKey) {
        console.error("Missing credential public key", { credentialPublicKey });
        return res.status(500).json({ 
          success: false, 
          message: "Missing credential public key. Please try again." 
        });
      }
      
      if (counter === undefined) {
        console.error("Missing counter", { counter });
        return res.status(500).json({ 
          success: false, 
          message: "Missing counter value. Please try again." 
        });
      }
      
      // Additional validation
      if (typeof counter !== 'number') {
        console.error("Invalid counter type", { counter, type: typeof counter });
        return res.status(500).json({ 
          success: false, 
          message: "Invalid counter value. Please try again." 
        });
      }

      // Check if this credential is already registered
      const existingCredential = user.webauthnCredentials.find(
        (cred) => cred.id === isoBase64URL.fromBuffer(credentialID)
      );

      if (existingCredential) {
        return res.status(400).json({ 
          success: false, 
          message: "This biometric credential is already registered." 
        });
      }

      // Save the credential to the user's account
      // Ensure publicKey is stored as a Buffer
      
      // Handle different possible formats of publicKey
      let publicKeyBuffer;
      if (Buffer.isBuffer(credentialPublicKey)) {
        publicKeyBuffer = credentialPublicKey;
      } else if (credentialPublicKey instanceof Uint8Array) {
        publicKeyBuffer = Buffer.from(credentialPublicKey);
      } else if (typeof credentialPublicKey === 'string') {
        // If it's a base64 string, decode it
        publicKeyBuffer = Buffer.from(credentialPublicKey, 'base64');
      } else if (credentialPublicKey && typeof credentialPublicKey === 'object') {
        // If it's an object, try to convert it
        publicKeyBuffer = Buffer.from(credentialPublicKey);
      } else {
        // Last resort - try to convert whatever we have
        try {
          publicKeyBuffer = Buffer.from(credentialPublicKey);
        } catch (bufferError) {
          console.error("Failed to convert publicKey to Buffer:", bufferError);
          return res.status(500).json({ 
            success: false, 
            message: "Failed to process credential data. Please try again." 
          });
        }
      }
      
      // Handle credentialID
      if (!credentialID) {
        console.error("Missing credentialID in registration info");
        return res.status(500).json({ 
          success: false, 
          message: "Missing credential ID. Please try again." 
        });
      }
      
      let credentialIdString;
      if (credentialID instanceof Uint8Array) {
        credentialIdString = isoBase64URL.fromBuffer(credentialID);
      } else if (Buffer.isBuffer(credentialID)) {
        credentialIdString = isoBase64URL.fromBuffer(credentialID);
      } else {
        console.error("Unexpected credentialID type:", typeof credentialID, credentialID);
        return res.status(500).json({ 
          success: false, 
          message: "Invalid credential ID format. Please try again." 
        });
      }
      
      user.webauthnCredentials.push({
        id: credentialIdString,
        publicKey: publicKeyBuffer,
        counter,
        transports: body.response.transports || [],
      });

      // Clear the challenge
      user.currentChallenge = undefined;
      
      // Save the user
      await user.save();

      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: "Verification failed. The biometric data could not be verified." });
    }
  } catch (error) {
    console.error("WebAuthn registration error:", error);
    
    // Handle specific errors
    if (error.message && error.message.includes("challenge")) {
      return res.status(400).json({ 
        success: false, 
        message: "Challenge verification failed. Please try again." 
      });
    }
    
    // Provide more detailed error information
    if (error.code === 'ERR_INVALID_ARG_TYPE') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid data format received. Please try again with a different biometric method." 
      });
    }
    
    // Handle other specific error types
    if (error.name === 'TypeError') {
      return res.status(400).json({ 
        success: false, 
        message: `Data type error: ${error.message}. Please try again.` 
      });
    }
    
    if (error.name === 'DataError') {
      return res.status(400).json({ 
        success: false, 
        message: "Data validation error. Please try again with a different biometric method." 
      });
    }
    
    res.status(500).json({ success: false, message: `Failed to register fingerprint: ${error.message}. Please try again.` });
  }
});

// @route   GET /api/webauthn/login-options
// @desc    Generate authentication options for WebAuthn
// @access  Public
router.get("/login-options", async (req, res) => {
  try {
    console.log("WebAuthn login options request received");
    
    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID,
      // Do not prompt for user verification if not necessary
      userVerification: "preferred",
      // AllowCredentials is optional but can improve security by limiting which credentials can be used
      // We'll leave it out for now to support any registered credential
    });

    console.log("Generated login options keys:", Object.keys(options));
    console.log("Challenge exists:", !!options.challenge);

    // Check if options were generated successfully
    if (!options || !options.challenge) {
      console.error("Failed to generate valid login options");
      return res.status(500).json({ message: "Failed to generate login options. Please try again." });
    }

    // Store the challenge in the session for verification later
    req.session.currentChallenge = options.challenge;
    
    // Save session explicitly to ensure it's stored
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Failed to save session. Please try again." });
      }
      
      console.log("Login options sent successfully");
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
    
    // Log the incoming request body for debugging
    console.log("Authentication request body:", JSON.stringify(body, null, 2));

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
    
    // Validate credential data
    if (!credential.publicKey || credential.counter === undefined) {
      console.error("Invalid credential data:", credential);
      return res.status(500).json({ 
        success: false, 
        message: "Invalid credential data. Please re-register your biometric." 
      });
    }

    // Check if currentChallenge exists in session
    if (!req.session.currentChallenge) {
      return res.status(400).json({ message: "No authentication challenge found. Please try again." });
    }

    // Verify the authentication response
    // Log credential data for debugging
    console.log("Credential data for verification:", {
      id: credential.id,
      publicKeyType: typeof credential.publicKey,
      publicKeyIsBuffer: Buffer.isBuffer(credential.publicKey),
      counter: credential.counter
    });
    
    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: req.session.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: isoBase64URL.toBuffer(credential.id),
        // Ensure publicKey is a Buffer
        publicKey: Buffer.isBuffer(credential.publicKey) ? credential.publicKey : Buffer.from(credential.publicKey),
        counter: credential.counter,
      },
    });

    const { verified, authenticationInfo } = verification;

    if (verified) {
      // Update the counter to prevent replay attacks
      credential.counter = authenticationInfo.newCounter;
      
      // Clear the challenge
      req.session.currentChallenge = undefined;
      
      // Save the updated user
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
      res.status(400).json({ success: false, message: "Authentication failed. The biometric data could not be verified." });
    }
  } catch (error) {
    console.error("WebAuthn login error:", error);
    
    // Handle specific errors
    if (error.message && error.message.includes("challenge")) {
      return res.status(400).json({ 
        success: false, 
        message: "Challenge verification failed. Please try again." 
      });
    } else if (error.message && error.message.includes("origin")) {
      return res.status(400).json({ 
        success: false, 
        message: "Origin verification failed. Please ensure you're using the correct domain." 
      });
    } else if (error.message && error.message.includes("rpId")) {
      return res.status(400).json({ 
        success: false, 
        message: "RP ID verification failed. Please ensure you're using the correct domain." 
      });
    }
    
    res.status(500).json({ success: false, message: "Failed to authenticate. Please try again." });
  }
});

export default router;