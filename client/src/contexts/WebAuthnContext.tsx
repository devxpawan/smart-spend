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
    if (window.PublicKeyCredential) {
      setIsWebAuthnSupported(true);
    } else {
      setIsWebAuthnSupported(false);
    }
  }, []);

  const registerCredential = async (): Promise<boolean> => {
    try {
      // Get registration options from the server
      const optionsResponse = await axios.get("/api/webauthn/register-options");
      const options = optionsResponse.data;

      // Start the registration process
      const attestationResponse = await startRegistration(options);

      // Send the response to the server for verification
      const verificationResponse = await axios.post(
        "/api/webauthn/register",
        attestationResponse
      );

      if (verificationResponse.data.success) {
        toast.success("Fingerprint login enabled successfully!");
        return true;
      } else {
        toast.error("Failed to enable fingerprint login");
        return false;
      }
    } catch (error) {
      console.error("WebAuthn registration error:", error);
      toast.error("Failed to enable fingerprint login. Please try again.");
      return false;
    }
  };

  const authenticate = async (email: string): Promise<boolean> => {
    try {
      // Get authentication options from the server
      const optionsResponse = await axios.get("/api/webauthn/login-options");
      const options = optionsResponse.data;

      // Start the authentication process
      const assertionResponse = await startAuthentication(options);

      // Add email to the assertion response
      const responseWithEmail = {
        ...assertionResponse,
        email,
      };

      // Send the response to the server for verification
      const verificationResponse = await axios.post(
        "/api/webauthn/login",
        responseWithEmail
      );

      if (verificationResponse.data.token) {
        // Login successful, set the token and user
        loginWithToken(
          verificationResponse.data.token,
          verificationResponse.data.user
        );
        toast.success("Logged in successfully with fingerprint!");
        return true;
      } else {
        toast.error("Fingerprint authentication failed");
        return false;
      }
    } catch (error) {
      console.error("WebAuthn authentication error:", error);
      toast.error("Fingerprint authentication failed. Please try again.");
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