import { motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailSubmitted: (email: string) => Promise<boolean>;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onEmailSubmitted,
}) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setEmail("");
      setIsGoogleUser(false);
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setErrorMessage("");
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    try {
      const isGoogle = await onEmailSubmitted(email);
      if (isGoogle) {
        setIsGoogleUser(true);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        const axiosError = err as { response?: { data?: { message?: string } } };
        const message =
          axiosError.response?.data?.message || "An error occurred.";
        setErrorMessage(message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.3 }}
        // Force light look even in dark mode + light native controls
        className="bg-white text-gray-900 p-8 rounded-lg shadow-md w-full max-w-md relative
                   dark:bg-white dark:text-gray-900 [color-scheme:light] dark:[color-scheme:light]"
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-700"
          aria-label="Close"
        >
          &times;
        </button>

        {isGoogleUser ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold text-center mb-4">Google Account</h2>
            <p className="text-gray-600 mb-6">
              This email is associated with a Google account. Please use Google to log in.
            </p>
            <button
              onClick={() => {
                // This is a bit of a hack, but it's the easiest way to trigger the Google login
                // without a major refactor of the LoginRegister page.
                const googleLoginButton = document.querySelector(
                  'div[role="button"][aria-labelledby="button-label"]'
                ) as HTMLElement;
                if (googleLoginButton) {
                  googleLoginButton.click();
                }
                onClose();
              }}
              className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Log in with Google
            </button>
          </motion.div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-center mb-6">Forgot Password</h2>

            <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-700"
            >
              Email Address
            </label>
            <input
              ref={emailInputRef}
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              className="mt-1 block w-full px-3 py-2 rounded-md shadow-sm
                         border border-gray-300 placeholder-gray-400
                         bg-white text-gray-900
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                         dark:border-gray-300 dark:placeholder-gray-400 dark:bg-white dark:text-gray-900
                         dark:focus:ring-indigo-500 dark:focus:border-indigo-500"
              required
            />

            {errorMessage && (
              <div
                className="mt-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded-md text-center text-sm
                              dark:bg-red-100 dark:text-red-700 dark:border-red-400"
              >
                {errorMessage}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium
                       text-white bg-indigo-600 hover:bg-indigo-700
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                       dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:text-white"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPasswordModal;
