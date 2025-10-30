import React, { createContext, useContext, useState } from "react";
import axios from "axios";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import { useAuth } from "./auth-exports";
import toast from "react-hot-toast";

interface WebAuthnContextType {
  registerCredential: () => Promise<boolean>;
  authenticate: (email: string) => Promise<boolean>;
  isWebAuthnSupported: boolean;
}

const WebAuthnContext = createContext<WebAuthnContextType | undefined>(undefined);

export const useWebAuthn = () => {
  const context = useContext(WebAuthnContext);
  if (!context) {
    throw new Error("useWebAuthn must be used within a WebAuthnProvider");
  }
  return context;
};

export const WebAuthnProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { loginWithToken } = useAuth();
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);

  // Check WebAuthn support
  React.useEffect(() => {
    // Check if we're in a browser environment and if PublicKeyCredential is available
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      // Additional check for platform authenticator support
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((supported) => {
          console.log("Platform authenticator support:", supported);
          setIsWebAuthnSupported(supported);
        })
        .catch((error) => {
          console.error("Error checking platform authenticator support:", error);
          // Fallback to basic WebAuthn support check
          setIsWebAuthnSupported(true);
        });
    } else {
      setIsWebAuthnSupported(false);
    }
  }, []);

  const registerCredential = async (): Promise<boolean> => {
    try {
      // Check if we're in a secure context (HTTPS or localhost)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        const errorMessage = "Biometric authentication requires a secure context (HTTPS or localhost). Please ensure you're using a secure connection.";
        console.error("WebAuthn registration error:", errorMessage);
        toast.error(errorMessage);
        return false;
      }
      
      console.log("Requesting registration options from server");
      
      // Get registration options from the server
      const optionsResponse = await axios.get("/api/webauthn/register-options");
      console.log("Received registration options response:", optionsResponse.status);
      
      const options = optionsResponse.data;
      console.log("Registration options:", Object.keys(options));
      
      // Check if options and challenge exist
      if (!options) {
        console.error("No registration options received from server");
        toast.error("Failed to get registration options from server. Please try again.");
        return false;
      }
      
      if (!options.challenge) {
        console.error("No challenge in registration options");
        toast.error("Registration options are invalid. Please try again.");
        return false;
      }

      console.log("Starting WebAuthn registration process");
      
      // Start the registration process
      const attestationResponse = await startRegistration(options);
      console.log("Received attestation response");

      // Send the response to the server for verification
      console.log("Sending attestation response to server");
      const verificationResponse = await axios.post(
        "/api/webauthn/register",
        attestationResponse
      );
      
      console.log("Received verification response:", verificationResponse.status);

      if (verificationResponse.data.success) {
        toast.success("Fingerprint login enabled successfully!");
        return true;
      } else {
        const errorMessage = verificationResponse.data.message || "Failed to enable fingerprint login";
        console.error("Registration verification failed:", errorMessage);
        toast.error(errorMessage);
        return false;
      }
    } catch (error: any) {
      console.error("WebAuthn registration error:", error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to enable fingerprint login. Please try again.";
      
      if (error?.response?.status === 404) {
        errorMessage = "User not found. Please log in again.";
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") {
        errorMessage = "This authenticator is already registered. Please use a different biometric method.";
      } else if (error?.code === "ERROR_CEREMONY_ABORTED") {
        errorMessage = "Registration was cancelled. Please try again.";
      } else if (error?.code === "ERROR_INVALID_DOMAIN") {
        errorMessage = "Invalid domain. Please ensure you're using the correct URL.";
      } else if (error?.name === "InvalidStateError") {
        errorMessage = "This authenticator is already registered. Please use a different biometric method or device.";
      } else if (error?.name === "NotAllowedError") {
        errorMessage = "Biometric authentication was denied. Please try again and ensure you're using a supported device.";
      } else if (error?.name === "AbortError") {
        errorMessage = "Biometric authentication was cancelled. Please try again.";
      } else if (error?.name === "SecurityError") {
        errorMessage = "Security error. Please ensure you're using HTTPS in production.";
      } else if (error?.name === "TypeError") {
        errorMessage = "Connection error. Please check your network connection and try again.";
      }
      
      toast.error(errorMessage);
      return false;
    }
  };

  const authenticate = async (email: string): Promise<boolean> => {
    try {
      // Check if we're in a secure context (HTTPS or localhost)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        const errorMessage = "Biometric authentication requires a secure context (HTTPS or localhost). Please ensure you're using a secure connection.";
        console.error("WebAuthn authentication error:", errorMessage);
        toast.error(errorMessage);
        return false;
      }
      
      console.log("Requesting authentication options from server");
      
      // Get authentication options from the server
      const optionsResponse = await axios.get("/api/webauthn/login-options");
      console.log("Received authentication options response:", optionsResponse.status);
      
      const options = optionsResponse.data;
      console.log("Authentication options:", Object.keys(options));
      
      // Check if options and challenge exist
      if (!options) {
        console.error("No authentication options received from server");
        toast.error("Failed to get authentication options from server. Please try again.");
        return false;
      }
      
      if (!options.challenge) {
        console.error("No challenge in authentication options");
        toast.error("Authentication options are invalid. Please try again.");
        return false;
      }

      console.log("Starting WebAuthn authentication process");
      
      // Start the authentication process
      const assertionResponse = await startAuthentication(options);
      console.log("Received assertion response");

      // Add email to the assertion response
      const responseWithEmail = {
        ...assertionResponse,
        email,
      };

      // Send the response to the server for verification
      console.log("Sending assertion response to server");
      const verificationResponse = await axios.post(
        "/api/webauthn/login",
        responseWithEmail
      );
      
      console.log("Received verification response:", verificationResponse.status);

      if (verificationResponse.data.token) {
        // Login successful, set the token and user
        loginWithToken(
          verificationResponse.data.token,
          verificationResponse.data.user
        );
        toast.success("Logged in successfully with fingerprint!");
        return true;
      } else {
        const errorMessage = verificationResponse.data.message || "Fingerprint authentication failed";
        console.error("Authentication verification failed:", errorMessage);
        toast.error(errorMessage);
        return false;
      }
    } catch (error: any) {
      console.error("WebAuthn authentication error:", error);
      
      // Provide more specific error messages
      let errorMessage = "Fingerprint authentication failed. Please try again.";
      
      if (error?.response?.status === 400) {
        errorMessage = error.response.data.message || "Invalid authentication request.";
      } else if (error?.response?.status === 404) {
        errorMessage = "User not found. Please check your email.";
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code === "ERROR_AUTHENTICATOR_NOT_FOUND") {
        errorMessage = "No registered authenticator found. Please register your biometric first.";
      } else if (error?.code === "ERROR_CEREMONY_ABORTED") {
        errorMessage = "Authentication was cancelled. Please try again.";
      } else if (error?.code === "ERROR_INVALID_DOMAIN") {
        errorMessage = "Invalid domain. Please ensure you're using the correct URL.";
      } else if (error?.name === "NotFoundError") {
        errorMessage = "No registered biometric found. Please register your fingerprint first.";
      } else if (error?.name === "NotAllowedError") {
        errorMessage = "Biometric authentication was denied. Please try again.";
      } else if (error?.name === "AbortError") {
        errorMessage = "Biometric authentication was cancelled. Please try again.";
      } else if (error?.name === "SecurityError") {
        errorMessage = "Security error. Please ensure you're using HTTPS in production.";
      } else if (error?.name === "TypeError") {
        errorMessage = "Connection error. Please check your network connection and try again.";
      }
      
      toast.error(errorMessage);
      return false;
    }
  };

  return (
    <WebAuthnContext.Provider
      value={{
        registerCredential,
        authenticate,
        isWebAuthnSupported,
      }}
    >
      {children}
    </WebAuthnContext.Provider>
  );
};