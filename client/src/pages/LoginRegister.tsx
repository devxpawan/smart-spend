import React, { useState } from "react";
import logo from "/logo.webp";
import { Navigate, useNavigate, useLocation, Link } from "react-router-dom";
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import PasswordStrengthIndicator from "../components/PasswordStrengthIndicator";
import { validatePassword } from "../utils/passwordValidation";
import OTPVerificationModal from "../components/OTPVerificationModal";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import ResetPasswordModal from "../components/ResetPasswordModal";

const LoginRegister: React.FC = () => {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState(
    validatePassword("")
  );
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const { login, register, googleLogin, loading, error, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const showOtpModal = location.state?.showOtpModal;
  const otpEmail = location.state?.email;

  if (user) return <Navigate to="/" replace />;

  // Clear form fields when switching tabs
  const handleTabChange = (newTab: "login" | "register") => {
    setTab(newTab);
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setPasswordValidation(validatePassword(""));
  };

  // Handle password change with validation
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordValidation(validatePassword(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For registration, check password validation
    if (tab === "register" && !passwordValidation.isValid) {
      return; // Don't submit if password is invalid
    }

    if (tab === "login") {
      await login(email, password);
    } else {
      const success = await register(name, email, password);
      if (success) {
        navigate("/auth", { state: { showOtpModal: true, email: email } });
      }
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      await googleLogin(credentialResponse.credential);
    }
  };

  const handleGoogleError = () => {
    console.error("Google login failed");
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID!}>
      {/* Full-screen container with gradient background */}
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
        {/* Animated background elements - Optimized for mobile */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Smaller background elements for mobile */}
          <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-2xl sm:blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-20 -left-20 sm:-bottom-40 sm:-left-40 w-40 h-40 sm:w-80 sm:h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-2xl sm:blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-96 sm:h-96 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-2xl sm:blur-3xl animate-pulse delay-500"></div>
        </div>

        {/* Main content container - Optimized for mobile */}
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-6 sm:p-6 lg:p-8">
          <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-start lg:items-center">
            {/* Left side - Branding and illustration - Aligned to center */}
            <motion.div
              className="hidden lg:flex flex-col justify-center h-full"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="space-y-8">
                {/* Logo and brand */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img
                        src={logo}
                        alt="SmartSpend"
                        className="w-16 h-16"
                      />
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        SmartSpend
                      </h1>
                      <p className="text-gray-600 text-sm">
                        Financial Intelligence
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-4xl xl:text-5xl font-bold text-gray-900 leading-tight">
                      Take Control of Your
                      <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Financial Future
                      </span>
                    </h2>
                    <p className="text-xl text-gray-600 leading-relaxed">
                      Join thousands of users who trust SmartSpend to
                      manage their finances intelligently and securely.
                    </p>
                  </div>
                </div>

                {/* Feature highlights */}
                <div className="space-y-4">
                  {[
                    "🔒 Bank-level security",
                    "📊 Real-time analytics",
                    "🎯 Smart budgeting tools",
                    "📱 Mobile-first design",
                  ].map((feature, index) => (
                    <motion.div
                      key={feature}
                      className="flex items-center space-x-3 text-gray-700"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                    >
                      <span className="text-lg">
                        {feature.split(" ")[0]}
                      </span>
                      <span className="font-medium">
                        {feature.substring(2)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Right side - Form - Optimized for mobile */}
            <motion.div
              className="w-full max-w-sm mx-auto sm:max-w-md lg:max-w-lg flex flex-col justify-center h-full"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            >
              {/* Mobile logo - Better spacing */}
              <div className="lg:hidden text-center mb-4 sm:mb-6">
                <div className="inline-flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                  <img
                    src={logo}
                    alt="SmartSpend"
                    className="w-8 h-8 sm:w-10 sm:h-10"
                  />
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    SmartSpend
                  </h1>
                </div>
              </div>

              {/* Form card - Better mobile padding */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-5 md:p-6 lg:p-8">
                {/* Tab switcher - Mobile optimized */}
                <div className="mb-5 sm:mb-6">
                  <div className="flex bg-gray-100 rounded-xl sm:rounded-2xl p-1 mb-3 sm:mb-4">
                    {["login", "register"].map((t) => (
                      <button
                        key={t}
                        onClick={() =>
                          handleTabChange(t as "login" | "register")
                        }
                        className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-300 ${
                          tab === t
                            ? "bg-white text-indigo-600 shadow-md transform scale-[0.98]"
                            : "text-gray-600 hover:text-gray-800"
                        }`}
                      >
                        {t === "login" ? "Welcome Back" : "Get Started"}
                      </button>
                    ))}
                  </div>

                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1">
                      {tab === "login"
                        ? "Sign in to your account"
                        : "Create your account"}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {tab === "login"
                        ? "Welcome back! Please enter your details."
                        : "Start your financial journey with us today."}
                    </p>
                  </div>
                </div>

                {/* Form */}
                <form
                  key={tab}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {/* Mobile-optimized form layout for register */}
                  {tab === "register" ? (
                    <>
                      {/* Name and Email - Stack on mobile, side by side on larger screens */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                            Full Name
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm"
                              placeholder="Your name"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                            Email Address
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm"
                              placeholder="Your email"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Password field */}
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) =>
                              handlePasswordChange(e.target.value)
                            }
                            className={`w-full pl-9 pr-10 py-2.5 sm:py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm ${
                              password && !passwordValidation.isValid
                                ? "border-red-300 focus:ring-red-500"
                                : "border-gray-200 focus:ring-indigo-500"
                            }`}
                            placeholder="Create password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {/* Password Strength Indicator */}
                        {password && (
                          <PasswordStrengthIndicator
                            password={password}
                            showRequirements={true}
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Login form - Mobile optimized */}
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-9 pr-10 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm"
                            placeholder="Enter your email"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-9 pr-10 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm"
                            placeholder="Enter your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                            ) : (
                              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                            )}
                          </button>
                        </div>
                        <div className="text-right mt-2">
                          <Link to="#" onClick={() => setIsForgotPasswordModalOpen(true)}>
                            <span className="text-xs sm:text-sm text-indigo-600 hover:underline">
                              Forgot Password?
                            </span>
                          </Link>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Error message - Mobile optimized */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm flex items-center space-x-2"
                    >
                      <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {/* Submit button - Mobile optimized */}
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      (tab === "register" && !passwordValidation.isValid)
                    }
                    className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg sm:rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 group text-sm sm:text-base min-h-[44px]"
                  >
                    <span>
                      {loading
                        ? tab === "login"
                          ? "Signing in..."
                          : "Creating account..."
                        : tab === "login"
                        ? "Sign In"
                        : "Create Account"}
                    </span>
                    {!loading && (
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    )}
                  </button>

                  {/* Mobile-optimized divider */}
                  <div className="relative my-3 sm:my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs sm:text-sm">
                      <span className="px-2 sm:px-3 bg-white text-gray-500 font-medium">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  {/* Google login - Simple centered approach */}
                  <div className="w-full">
                    <div className="flex justify-center">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        theme="outline"
                        size="medium"
                        text={
                          tab === "login" ? "signin_with" : "signup_with"
                        }
                        shape="rectangular"
                      />
                    </div>
                  </div>

                  {/* Switch tab - Mobile optimized */}
                  <p className="text-center text-gray-600 text-xs sm:text-sm pt-2 sm:pt-3">
                    {tab === "login" ? (
                      <>
                        Don't have an account?{" "}
                        <button
                          type="button"
                          onClick={() => handleTabChange("register")}
                          className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors min-h-[44px] inline-flex items-center"
                        >
                          Sign up for free
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => handleTabChange("login")}
                          className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors min-h-[44px] inline-flex items-center"
                        >
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                </form>
              </div>
            </motion.div>
          </div>
        </div>

        <OTPVerificationModal
          isOpen={showOtpModal}
          onClose={() => navigate("/auth", { state: { showOtpModal: false } })}
          email={otpEmail}
        />

        <ForgotPasswordModal
          isOpen={isForgotPasswordModalOpen}
          onClose={() => setIsForgotPasswordModalOpen(false)}
          onEmailSubmitted={(email) => {
            setResetEmail(email);
            setIsForgotPasswordModalOpen(false);
            setIsResetPasswordModalOpen(true);
          }}
        />

        <ResetPasswordModal
          isOpen={isResetPasswordModalOpen}
          onClose={() => setIsResetPasswordModalOpen(false)}
          email={resetEmail}
        />
      </div>
    </GoogleOAuthProvider>
  );
};

export default LoginRegister;
