import React from "react";
import { Fingerprint } from "lucide-react";
import { useWebAuthn } from "../contexts/webauthn-exports";
import toast from "react-hot-toast";

interface BiometricAuthButtonProps {
  email: string;
  onAuthSuccess?: () => void;
}

const BiometricAuthButton: React.FC<BiometricAuthButtonProps> = ({ 
  email, 
  onAuthSuccess 
}) => {
  const { authenticate, isWebAuthnSupported } = useWebAuthn();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleBiometricAuth = async () => {
    if (!email) {
      toast.error("Please enter your email first");
      return;
    }

    if (!isWebAuthnSupported) {
      toast.error("Biometric authentication is not supported in your browser");
      return;
    }

    setIsLoading(true);
    try {
      const success = await authenticate(email);
      if (success && onAuthSuccess) {
        onAuthSuccess();
      }
    } catch (error) {
      console.error("Biometric authentication error:", error);
      toast.error("Biometric authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isWebAuthnSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleBiometricAuth}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-50"
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Authenticating...</span>
        </>
      ) : (
        <>
          <Fingerprint className="w-5 h-5" />
          <span>Login with Biometrics</span>
        </>
      )}
    </button>
  );
};

export default BiometricAuthButton;