// import React from "react";
// import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
// import axios from "axios";

// const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// function GoogleLoginButton({ onLogin }) {
//   const handleSuccess = async (credentialResponse) => {
//     const token = credentialResponse.credential;
//     const res = await axios.post(
//       "http://localhost:5000/api/google-login",
//       { token }
//     );
//     if (res.data.success) {
//       localStorage.setItem("sessionToken", res.data.sessionToken);
//       onLogin && onLogin(res.data.sessionToken);
//     }
//   };

//   return (
//     <GoogleOAuthProvider clientId={clientId}>
//       <GoogleLogin onSuccess={handleSuccess} onError={() => {}} />
//     </GoogleOAuthProvider>
//   );
// }

// export default GoogleLoginButton;

import {
  GoogleOAuthProvider,
  GoogleLogin,
  CredentialResponse,
} from "@react-oauth/google";
import axios from "axios";

interface GoogleLoginButtonProps {
  onLogin?: (sessionToken: string) => void;
}

function GoogleLoginButton({ onLogin }: GoogleLoginButtonProps) {
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    const token = credentialResponse.credential;
    const res = await axios.post(
      "http://localhost:5000/api/google-login",
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
