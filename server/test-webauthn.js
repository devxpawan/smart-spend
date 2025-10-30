// Simple test file to verify WebAuthn setup
import { generateRegistrationOptions } from "@simplewebauthn/server";

console.log("Testing WebAuthn setup...");

try {
  const options = generateRegistrationOptions({
    rpName: "Test App",
    rpID: "localhost",
    userID: new Uint8Array([1, 2, 3, 4]), // Use Uint8Array instead of string
    userName: "test@example.com",
  });
  
  console.log("WebAuthn setup successful!");
  console.log("Registration options generated");
} catch (error) {
  console.error("WebAuthn setup failed:", error);
}