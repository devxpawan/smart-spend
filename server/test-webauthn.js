// Simple test to verify WebAuthn setup
import * as SimpleWebAuthnServer from '@simplewebauthn/server';

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
    console.log('Full registration options:', registrationOptions);
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
    console.log('Full authentication options:', authenticationOptions);
  } catch (error) {
    console.error('Error generating authentication options:', error);
  }

  console.log('WebAuthn test completed.');
}

testWebAuthn();