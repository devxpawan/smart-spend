import {
  GoogleOAuthProvider,
  GoogleLogin,
  CredentialResponse,
} from "@react-oauth/google";
import axios from "axios";

/**
 * Google OAuth Configuration:
 * - Authorized JavaScript origins: http://localhost:5173
 * - Authorized redirect URIs: http://localhost:5000/api/google/callback
 */

interface GoogleLoginButtonProps {
  onLogin?: (sessionToken: string) => void;
}

function GoogleLoginButton({ onLogin }: GoogleLoginButtonProps) {
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    const token = credentialResponse.credential;
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/google-login`,
      { token }
    );
    if (res.data.success) {
      localStorage.setItem("sessionToken", res.data.sessionToken);
      onLogin && onLogin(res.data.sessionToken);
    }
  };

  if (!clientId) {
    console.error("VITE_GOOGLE_CLIENT_ID environment variable is not set");
    return <div>Google login configuration error</div>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleLogin onSuccess={handleSuccess} onError={() => {}} />
    </GoogleOAuthProvider>
  );
}

export default GoogleLoginButton;
