# WebAuthn Biometric Authentication Guide

## Overview

This guide explains how to use the biometric authentication feature in the SmartSpend application. The feature allows users to log in using fingerprint or face recognition instead of typing their password.

## How It Works

1. **Registration**: Users enable biometric login by registering their fingerprint or face with the system.
2. **Authentication**: Users can then log in using their biometric data instead of a password.

## Technical Implementation

### Frontend

The frontend uses the `@simplewebauthn/browser` library to interact with the WebAuthn API. The implementation is located in:

- `client/src/contexts/WebAuthnContext.tsx` - Main context for WebAuthn operations
- `client/src/components/BiometricAuthButton.tsx` - Reusable button component for biometric authentication
- `client/src/pages/LoginRegister.tsx` - Login page with biometric authentication option
- `client/src/pages/Profile.tsx` - Profile page with option to enable biometric authentication

### Backend

The backend uses the `@simplewebauthn/server` library to handle WebAuthn operations. The implementation is located in:

- `server/routes/webauthn.js` - Routes for WebAuthn registration and authentication
- `server/models/User.js` - User model with WebAuthn credentials storage

## User Flow

### Enabling Biometric Login

1. Log in to the application
2. Go to the Profile page
3. Click the "Enable Fingerprint Login" button
4. Follow the browser prompts to register your biometric data

### Using Biometric Login

1. Go to the login page
2. Enter your email address in the biometric login section
3. Click the "Login with Biometrics" button
4. Follow the browser prompts to authenticate with your biometric data

## Troubleshooting

### Common Issues

1. **"Biometric authentication is not supported in your browser"**
   - Make sure you're using a modern browser (Chrome, Edge, Safari, Firefox)
   - Ensure you're accessing the application over HTTPS (or localhost for development)

2. **"Biometric authentication requires a secure context"**
   - The WebAuthn API only works in secure contexts (HTTPS or localhost)
   - Make sure you're not accessing the application over HTTP in production

3. **"No registered biometric found"**
   - You need to enable biometric login first before you can use it
   - Go to your Profile page and enable biometric authentication

### Browser Support

The biometric authentication feature works with the following browsers:

- Chrome 67+
- Edge 18+
- Safari 13+
- Firefox 60+

## Security Considerations

1. **Credential Storage**: Biometric credentials are stored securely on the user's device, not on the server
2. **Challenge-Response**: Each authentication attempt uses a unique challenge to prevent replay attacks
3. **Counter Verification**: The system tracks credential usage counter to detect potential cloning attempts

## Development Notes

### Adding New Features

To extend the biometric authentication functionality:

1. Add new routes in `server/routes/webauthn.js`
2. Update the frontend context in `client/src/contexts/WebAuthnContext.tsx`
3. Modify the UI components as needed

### Testing

To test the WebAuthn implementation:

1. Run the test script: `node server/test-webauthn.js`
2. Use browser developer tools to monitor WebAuthn API calls
3. Check server logs for authentication events

## API Endpoints

### Registration

- `GET /api/webauthn/register-options` - Get registration options
- `POST /api/webauthn/register` - Verify and store new credential

### Authentication

- `GET /api/webauthn/login-options` - Get authentication options
- `POST /api/webauthn/login` - Verify authentication response