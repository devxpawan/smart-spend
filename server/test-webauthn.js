// Simple test to verify WebAuthn setup
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';

console.log('Testing WebAuthn setup...');

// Helper function to convert string to Uint8Array
function stringToUint8Array(str) {
  return new Uint8Array(str.split('').map(char => char.charCodeAt(0)));
}

async function testWebAuthn() {
  // Test registration options
  try {
    const userID = stringToUint8Array('1234');
    console.log('User ID (Uint8Array):', userID);
    
    const registrationOptions = await SimpleWebAuthnServer.generateRegistrationOptions({
      rpName: 'Test App',
      rpID: 'localhost',
      userID: userID,
      userName: 'testuser@example.com',
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });
    
    console.log('Registration options generated successfully');
    console.log('Challenge exists:', !!registrationOptions.challenge);
    console.log('RP ID:', registrationOptions.rp?.id);
    console.log('User ID:', registrationOptions.user?.id);
  } catch (error) {
    console.error('Error generating registration options:', error);
  }

  // Test authentication options
  try {
    const authenticationOptions = await SimpleWebAuthnServer.generateAuthenticationOptions({
      rpID: 'localhost',
      userVerification: 'preferred',
    });
    
    console.log('Authentication options generated successfully');
    console.log('Challenge exists:', !!authenticationOptions.challenge);
    console.log('RP ID:', authenticationOptions.rpId);
  } catch (error) {
    console.error('Error generating authentication options:', error);
  }

  // Test base64 URL conversion
  try {
    const testBuffer = Buffer.from('test data');
    const base64String = isoBase64URL.fromBuffer(testBuffer);
    const convertedBuffer = isoBase64URL.toBuffer(base64String);
    
    console.log('Base64 URL conversion test:');
    console.log('Original buffer length:', testBuffer.length);
    console.log('Converted buffer length:', convertedBuffer.length);
    console.log('Buffers equal:', testBuffer.equals(convertedBuffer));
  } catch (error) {
    console.error('Error testing base64 URL conversion:', error);
  }

  console.log('WebAuthn test completed.');
}

testWebAuthn();