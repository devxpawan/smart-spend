// Test to verify WebAuthn credential storage fix
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import User from './models/User.js';

dotenv.config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env file');
  process.exit(1);
}

console.log('Testing WebAuthn credential storage fix...');

async function testWebAuthnStorage() {
  let testUser = null;
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Create a test user with a unique email
    const timestamp = Date.now();
    testUser = new User({
      name: 'Test User',
      email: `storage-test${timestamp}@example.com`,
      password: 'testpassword',
    });
    
    await testUser.save();
    console.log('Test user created');
    
    // Test storing WebAuthn credentials with proper Buffer conversion
    console.log('\n--- Testing Credential Storage ---');
    
    // Create a mock credential similar to what we get from WebAuthn verification
    const mockCredentialInfo = {
      credentialID: Uint8Array.from([1, 2, 3, 4, 5]),
      credentialPublicKey: Uint8Array.from([6, 7, 8, 9, 10]),
      counter: 0,
    };
    
    // Store the credential properly
    testUser.webauthnCredentials.push({
      id: isoBase64URL.fromBuffer(Buffer.from(mockCredentialInfo.credentialID)),
      publicKey: Buffer.from(mockCredentialInfo.credentialPublicKey), // Convert to Buffer
      counter: mockCredentialInfo.counter,
      transports: ['internal'],
    });
    
    // Set a challenge
    testUser.currentChallenge = 'test-challenge-string';
    
    // Save the user - this should work without validation errors
    await testUser.save();
    console.log('WebAuthn credentials stored successfully');
    
    // Retrieve and verify
    const retrievedUser = await User.findById(testUser._id);
    console.log('Retrieved user with WebAuthn credentials:', retrievedUser.webauthnCredentials.length);
    
    if (retrievedUser.webauthnCredentials.length > 0) {
      const credential = retrievedUser.webauthnCredentials[0];
      console.log('Credential ID:', credential.id);
      console.log('Public Key type:', typeof credential.publicKey);
      console.log('Public Key is Buffer:', Buffer.isBuffer(credential.publicKey));
      console.log('Public Key length:', credential.publicKey.length);
      console.log('Counter:', credential.counter);
      console.log('Transports:', credential.transports);
      console.log('Current Challenge:', retrievedUser.currentChallenge);
    }
    
    console.log('\n--- Test Completed Successfully ---');
    console.log('WebAuthn credential storage fix verified!');
    
  } catch (error) {
    console.error('WebAuthn credential storage test failed:', error);
  } finally {
    // Clean up
    if (testUser) {
      try {
        await User.findByIdAndDelete(testUser._id);
        console.log('Test user deleted');
      } catch (cleanupError) {
        console.error('Error cleaning up test user:', cleanupError);
      }
    }
    
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

testWebAuthnStorage();