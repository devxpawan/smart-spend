// Test to verify WebAuthn database storage
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env file');
  process.exit(1);
}

console.log('Testing WebAuthn database storage...');

async function testWebAuthnDB() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Create a test user with a unique email
    const timestamp = Date.now();
    const testUser = new User({
      name: 'Test User',
      email: `test${timestamp}@example.com`,
      password: 'testpassword',
    });
    
    await testUser.save();
    console.log('Test user created');
    
    // Test storing WebAuthn credentials
    const testCredential = {
      id: 'test-credential-id',
      publicKey: Buffer.from('test-public-key'),
      counter: 0,
      transports: ['internal'],
    };
    
    testUser.webauthnCredentials.push(testCredential);
    testUser.currentChallenge = 'test-challenge';
    
    await testUser.save();
    console.log('WebAuthn credentials stored successfully');
    
    // Retrieve and verify
    const retrievedUser = await User.findById(testUser._id);
    console.log('Retrieved user with WebAuthn credentials:', retrievedUser.webauthnCredentials.length);
    
    if (retrievedUser.webauthnCredentials.length > 0) {
      const credential = retrievedUser.webauthnCredentials[0];
      console.log('Credential ID:', credential.id);
      console.log('Public Key type:', typeof credential.publicKey);
      console.log('Public Key length:', credential.publicKey.length);
      console.log('Counter:', credential.counter);
      console.log('Transports:', credential.transports);
    }
    
    // Clean up
    await User.findByIdAndDelete(testUser._id);
    console.log('Test user deleted');
    
    console.log('WebAuthn database test completed successfully');
  } catch (error) {
    console.error('WebAuthn database test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

testWebAuthnDB();