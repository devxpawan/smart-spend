import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, Sparkles, User } from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import OTPVerificationModal from "../components/OTPVerificationModal";
import PasswordStrengthIndicator from "../components/PasswordStrengthIndicator";
import ResetPasswordModal from "../components/ResetPasswordModal";
import { useAuth } from "../contexts/auth-exports";
import { useWebAuthn } from "../contexts/webauthn-exports";
import { Fingerprint } from "lucide-react";
import { validatePassword } from "../utils/passwordValidation";

// Types
type TabType = "login" | "register";

type FormState = {
  name: string;
  email: string;
  password: string;
  showPassword: boolean;
  passwordValidation: ReturnType<typeof validatePassword>;
};

// ---------- Reusable FormField ----------
const FormField: React.FC<{
  label: string;
  type: string;
  icon: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  error?: boolean;
}> = ({
  label,
  type,
  icon,
  value,
  onChange,
  placeholder,
  required,
  showPasswordToggle,
  showPassword,
  onTogglePassword,
  error,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-800 mb-2">
      {label}
    </label>
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {icon}
      </div>
      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full pl-10 pr-10 py-3 border rounded-lg text-gray-900 placeholder-gray-400 text-sm transition
          ${
            error
              ? "border-red-300 focus:ring-red-500"
              : "border-gray-300 focus:ring-indigo-500"
          }
          focus:border-indigo-500 focus:ring-2`}
      />
      {showPasswordToggle && (
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  </div>
);

// ---------- TabSwitcher ----------
const TabSwitcher: React.FC<{
  tab: TabType;
  onTabChange: (tab: TabType) => void;
}> = ({ tab, onTabChange }) => (
  <div className="flex border-b border-gray-200 mb-6">
    {(["login", "register"] as TabType[]).map((t) => (
      <button
        key={t}
        onClick={() => onTabChange(t)}
        className={`flex-1 py-3 text-sm font-semibold transition-colors ${
          tab === t
            ? "text-indigo-600 border-b-2 border-indigo-600"
            : "text-gray-500 hover:text-gray-800"
        }`}
      >
        {t === "login" ? "Sign In" : "Create Account"}
      </button>
    ))}
  </div>
);

// ---------- Login Form ----------
const LoginForm: React.FC<{
  formState: FormState;
  onFormChange: (s: Partial<FormState>) => void;
  onForgotPassword: () => void;
}> = ({ formState, onFormChange, onForgotPassword }) => (
  <motion.div
    key="login"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.2 }}
    className="space-y-4"
  >
    <FormField
      label="Email"
      type="email"
      icon={<Mail className="w-4 h-4" />}
      value={formState.email}
      onChange={(e) => onFormChange({ email: e.target.value })}
      placeholder="you@example.com"
      required
    />
    <FormField
      label="Password"
      type={formState.showPassword ? "text" : "password"}
      icon={<Lock className="w-4 h-4" />}
      value={formState.password}
      onChange={(e) => onFormChange({ password: e.target.value })}
      placeholder="Your password"
      required
      showPasswordToggle
      showPassword={formState.showPassword}
      onTogglePassword={() =>
        onFormChange({ showPassword: !formState.showPassword })
      }
    />
    <div className="text-right">
      <button
        type="button"
        onClick={onForgotPassword}
        className="text-xs text-indigo-600 hover:underline"
      >
        Forgot password?
      </button>
    </div>
  </motion.div>
);

// ---------- Register Form ----------
const RegisterForm: React.FC<{
  formState: FormState;
  onFormChange: (s: Partial<FormState>) => void;
}> = ({ formState, onFormChange }) => (
  <motion.div
    key="register"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.2 }}
    className="space-y-4"
  >
    <FormField
      label="Full Name"
      type="text"
      icon={<User className="w-4 h-4" />}
      value={formState.name}
      onChange={(e) => onFormChange({ name: e.target.value })}
      placeholder="Jane Doe"
      required
    />
    <FormField
      label="Email"
      type="email"
      icon={<Mail className="w-4 h-4" />}
      value={formState.email}
      onChange={(e) => onFormChange({ email: e.target.value })}
      placeholder="you@example.com"
      required
    />
    <FormField
      label="Password"
      type={formState.showPassword ? "text" : "password"}
      icon={<Lock className="w-4 h-4" />}
      value={formState.password}
      onChange={(e) => {
        const pwd = e.target.value;
        onFormChange({
          password: pwd,
          passwordValidation: validatePassword(pwd),
        });
      }}
      placeholder="Create a password"
      required
      showPasswordToggle
      showPassword={formState.showPassword}
      onTogglePassword={() =>
        onFormChange({ showPassword: !formState.showPassword })
      }
      error={!!(formState.password && !formState.passwordValidation.isValid)}
    />
    {formState.password && (
      <PasswordStrengthIndicator
        password={formState.password}
        showRequirements
      />
    )}
  </motion.div>
);

// ---------- Main Component ----------
const LoginRegister: React.FC = () => {
  const { authenticate, isWebAuthnSupported } = useWebAuthn();
  const [tab, setTab] = useState<TabType>("login");
  const [formState, setFormState] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    showPassword: false,
    passwordValidation: validatePassword(""),
  });
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] =
    useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] =
    useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [emailForWebAuthn, setEmailForWebAuthn] = useState("");

  const { login, register, googleLogin, loading, error, user, clearError } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const showOtpModal = location.state?.showOtpModal;
  const otpEmail = location.state?.email;

  if (user) return <Navigate to="/" replace />;

  const handleTabChange = (t: TabType) => {
    setTab(t);
    setFormState({
      name: "",
      email: "",
      password: "",
      showPassword: false,
      passwordValidation: validatePassword(""),
    });
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "register" && !formState.passwordValidation.isValid) return;

    if (tab === "login") {
      await login(formState.email, formState.password);
    } else {
      const success = await register(
        formState.name,
        formState.email,
        formState.password
      );
      if (success) {
        navigate("/auth", {
          state: { showOtpModal: true, email: formState.email },
        });
      }
    }
  };

  const handleFingerprintLogin = async () => {
    if (!emailForWebAuthn) {
      toast.error("Please enter your email first");
      return;
    }
    
    try {
      const success = await authenticate(emailForWebAuthn);
      if (success) {
        // User is logged in automatically by the authenticate function
      }
    } catch (error) {
      console.error("Error during fingerprint authentication:", error);
      toast.error("Fingerprint authentication failed. Please try again.");
    }
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID!}>
      <div className="relative min-h-screen bg-neutral-50">
        <div className="relative z-10 grid lg:grid-cols-2 min-h-screen">
          {/* LEFT BRANDING */}
          <motion.div
            className="hidden lg:flex flex-col justify-center h-full relative px-16 bg-gradient-to-br from-gray-900 via-indigo-950 to-black overflow-hidden" // DARK MODE: Deep, dark gradient
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* --- BACKGROUND BLOBS --- */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* HIGHER CONTRAST: Brighter colors and higher opacity pop against the dark bg */}
              <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-600/50 to-pink-600/50 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-600/40 to-indigo-600/40 rounded-full blur-3xl animate-pulse delay-1000"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-gradient-to-br from-indigo-500/30 to-purple-500/30 rounded-full blur-3xl animate-pulse delay-500"></div>
            </div>

            {/* --- CONTENT --- */}
            <div className="relative z-10 max-w-lg space-y-8">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img
                    src="https://i.postimg.cc/CLV2pkZr/logo.png"
                    alt="SmartSpend"
                    className="w-16 h-16"
                  />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50">
                    {" "}
                    {/* Added colored shadow */}
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  {/* BRIGHTER TEXT: The same gradient now looks much brighter */}
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    SmartSpend
                  </h1>
                  <p className="text-gray-400 text-sm">
                    {" "}
                    {/* Light text for dark bg */}
                    Financial Intelligence
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-5xl font-extrabold text-gray-100 leading-tight">
                  {" "}
                  {/* Light text */}
                  Take Control of Your
                  {/* BRIGHTER SPAN: -500 level colors are very vibrant on dark */}
                  <span className="block bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent mt-1">
                    Financial Future
                  </span>
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed">
                  {" "}
                  {/* Light text */}
                  Join thousands of users who trust SmartSpend to manage their
                  finances intelligently and securely.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  "🔒 Bank‑level security",
                  "📊 Real‑time analytics",
                  "🎯 Smart budgeting tools",
                  "📱 Mobile‑first design",
                ].map((feature, i) => (
                  <motion.div
                    key={feature}
                    className="flex items-center space-x-3 text-gray-200" // Light text
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  >
                    <span className="text-lg">{feature.split(" ")[0]}</span>
                    <span className="font-medium">{feature.substring(2)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* RIGHT FORM */}
          <div className="flex items-center justify-center p-8">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full max-w-md bg-white rounded-xl shadow-md border border-gray-100 p-8"
            >
              {/* Mobile branding header */}
              <div className="lg:hidden text-center mb-6">
                <div className="inline-flex items-center space-x-2">
                  <img
                    src="https://i.postimg.cc/CLV2pkZr/logo.png"
                    alt="SmartSpend"
                    className="w-10 h-10"
                  />
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    SmartSpend
                  </h1>
                </div>
              </div>

              <TabSwitcher tab={tab} onTabChange={handleTabChange} />

              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence mode="wait">
                  {tab === "login" ? (
                    <LoginForm
                      formState={formState}
                      onFormChange={(s) => setFormState({ ...formState, ...s })}
                      onForgotPassword={() =>
                        setIsForgotPasswordModalOpen(true)
                      }
                    />
                  ) : (
                    <RegisterForm
                      formState={formState}
                      onFormChange={(s) => setFormState({ ...formState, ...s })}
                    />
                  )}
                </AnimatePresence>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-100">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    (tab === "register" &&
                      !formState.passwordValidation.isValid)
                  }
                  className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading
                    ? tab === "login"
                      ? "Signing in..."
                      : "Creating account..."
                    : tab === "login"
                    ? "Sign In"
                    : "Create Account"}
                </button>

                {tab === "login" && isWebAuthnSupported && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400">or use biometrics</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-2">
                          Email for Biometric Login
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            type="email"
                            value={emailForWebAuthn}
                            onChange={(e) => setEmailForWebAuthn(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleFingerprintLogin}
                        className="w-full py-3 bg-indigo-100 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition flex items-center justify-center gap-2"
                      >
                        <Fingerprint className="w-5 h-5" />
                        Login with Fingerprint
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={(res) => {
                      if (res.credential) googleLogin(res.credential);
                    }}
                    onError={() => console.error("Google login failed")}
                    theme="outline"
                    size="large"
                    text={tab === "login" ? "signin_with" : "signup_with"}
                  />
                </div>

                <p className="text-center text-sm text-gray-600">
                  {tab === "login" ? (
                    <>
                      Don’t have an account?{" "}
                      <button
                        type="button"
                        onClick={() => handleTabChange("register")}
                        className="text-indigo-600 font-semibold hover:text-indigo-700"
                      >
                        Create one
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => handleTabChange("login")}
                        className="text-indigo-600 font-semibold hover:text-indigo-700"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </form>
            </motion.div>
          </div>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {showOtpModal && (
            <OTPVerificationModal
              isOpen={showOtpModal}
              onClose={() =>
                navigate("/auth", { state: { showOtpModal: false } })
              }
              email={otpEmail}
            />
          )}
          {isForgotPasswordModalOpen && (
            <ForgotPasswordModal
              isOpen={isForgotPasswordModalOpen}
              onClose={() => setIsForgotPasswordModalOpen(false)}
              onEmailSubmitted={async (email) => {
                try {
                  const { data } = await axios.post(
                    "/api/auth/check-google-user",
                    { email }
                  );

                  if (data.isGoogleUser) {
                    return true;
                  } else {
                    await axios.post("/api/auth/forgot-password", { email });
                    toast.success("Password reset OTP sent to your email.");
                    setResetEmail(email);
                    setIsForgotPasswordModalOpen(false);
                    setIsResetPasswordModalOpen(true);
                    return false;
                  }
                } catch (err) {
                  const axiosError = err as {
                    response?: { data?: { message?: string } };
                  };
                  throw new Error(
                    axiosError.response?.data?.message || "An error occurred."
                  );
                }
              }}
            />
          )}
          {isResetPasswordModalOpen && (
            <ResetPasswordModal
              isOpen={isResetPasswordModalOpen}
              onClose={() => setIsResetPasswordModalOpen(false)}
              email={resetEmail}
            />
          )}
        </AnimatePresence>
      </div>
    </GoogleOAuthProvider>
  );
};

export default LoginRegister;
