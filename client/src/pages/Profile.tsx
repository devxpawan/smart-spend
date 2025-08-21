import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  User,
  Mail,
  Save,
  Camera,
  Trash2,
  AlertTriangle,
  X,
  Check,
  RefreshCw,
  Info,
  CheckCircle,
  CreditCard,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import axios from "axios";

// Types
interface Message {
  type: "success" | "error" | "info" | "";
  text: string;
}

interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

interface ProfileStatsData {
  bills: number;
  expenses: number;
  warranties: number;
  total: number;
}

// Constants - Fixed Sri Lankan Rupee code
const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "Rs", name: "Sri Lankan Rupee", symbol: "Rs" },
  { code: "USD", name: "United States Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Sub-components

const Toast: React.FC<{ message: Message; onClose: () => void }> = ({
  message,
  onClose,
}) => (
  <AnimatePresence>
    {message.text && (
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.95 }}
        className={`fixed top-4 right-4 z-50 max-w-md rounded-lg p-4 shadow-lg border-l-4 ${
          message.type === "success"
            ? "bg-emerald-50 text-emerald-700 border-emerald-500"
            : message.type === "error"
            ? "bg-red-50 text-red-700 border-red-500"
            : "bg-blue-50 text-blue-700 border-blue-500"
        }`}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            {message.type === "success" && (
              <Check className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            )}
            {message.type === "error" && (
              <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            )}
            {message.type === "info" && (
              <Info className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium text-sm">
                {message.type === "success"
                  ? "Success"
                  : message.type === "error"
                  ? "Error"
                  : "Info"}
              </p>
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-current opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2 rounded"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Success Animation Component

// Main Component
const Profile: React.FC = () => {
  const {
    user,
    updateProfile,
    removeAvatar,
    updateCurrency,
    deleteProfile,
  } = useAuth();

  // Form state
  const [name, setName] = useState(user?.name || "");
  const [email] = useState(user?.email || "");
  const [selectedCurrency, setSelectedCurrency] = useState(
    user?.preferences?.currency || "USD"
  );
  const [pendingCurrency, setPendingCurrency] = useState<
    string | undefined
  >(undefined);

  // UI state
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<Message>({ type: "", text: "" });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [stats, setStats] = useState<ProfileStatsData>({
    bills: 0,
    expenses: 0,
    warranties: 0,
    total: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const response = await axios.get("/api/auth/profile/stats");
        const data = response.data;

        if (data.activity) {
          setStats({
            bills: data.activity.bills || 0,
            expenses: data.activity.expenses || 0,
            warranties: data.activity.warranties || 0,
            total: data.activity.total || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching profile stats:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Auto-clear messages
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message.text]);

  // Sync with user data
  useEffect(() => {
    setName(user?.name || "");
    setSelectedCurrency(user?.preferences?.currency || "USD");
  }, [user?.name, user?.preferences?.currency]);

  // Computed values
  const hasNameChanged = name !== (user?.name || "");
  const hasCurrencyChanged =
    pendingCurrency && pendingCurrency !== selectedCurrency;
  const hasChanges = hasNameChanged || hasCurrencyChanged || avatar;

  const avatarUrl = avatar
    ? URL.createObjectURL(avatar)
    : user?.avatar && user.avatar !== ""
    ? user.avatar.split("=")[0]
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name || "User"
      )}&background=EEE&color=888&size=256`;

  // Cleanup object URL when component unmounts or avatar changes
  useEffect(() => {
    return () => {
      if (avatar) {
        URL.revokeObjectURL(avatarUrl);
      }
    };
  }, [avatar, avatarUrl]);

  // Handlers
  const handleFileSelect = useCallback((file: File) => {
    // Validate file
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setMessage({
        type: "error",
        text: "Please select a valid image file (JPEG, PNG, or WebP)",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setMessage({
        type: "error",
        text: "File size must be less than 5MB",
      });
      return;
    }

    setAvatar(file);
    setMessage({
      type: "info",
      text: "Avatar selected. Click 'Save Changes' to update.",
    });
  }, []);

  const handleRemoveAvatar = useCallback(async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await removeAvatar();
      setAvatar(null);
      setMessage({
        type: "success",
        text: "Avatar removed successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to remove avatar. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [removeAvatar]);

  const handleSaveAllChanges = useCallback(async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const promises = [];

      // Save profile changes
      if (hasNameChanged || avatar) {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("email", email);
        if (avatar) formData.append("avatar", avatar);
        promises.push(updateProfile(formData));
      }

      // Save currency changes
      if (hasCurrencyChanged && pendingCurrency) {
        promises.push(updateCurrency(pendingCurrency));
      }

      await Promise.all(promises);

      // Reset local state instead of reloading page
      setAvatar(null);
      setPendingCurrency(undefined);

      // Show success animation
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

      setMessage({ type: "success", text: "Changes saved successfully!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to save changes. Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [
    hasNameChanged,
    avatar,
    hasCurrencyChanged,
    pendingCurrency,
    name,
    email,
    updateProfile,
    updateCurrency,
  ]);

  const handleDeleteProfile = useCallback(async () => {
    const requiredText = `${user?.name}/delete`;
    if (deleteInput !== requiredText) {
      setMessage({
        type: "error",
        text: `Please type '${requiredText}' exactly to confirm deletion.`,
      });
      return;
    }

    setDeleting(true);
    setMessage({ type: "", text: "" });

    try {
      await deleteProfile();
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to delete profile. Please try again.",
      });
      setDeleting(false);
    }
  }, [deleteProfile, deleteInput, user?.name]);

  const handleCurrencyChange = useCallback((currency: string) => {
    setPendingCurrency(currency);
  }, []);

  const handleRevertChanges = useCallback(() => {
    setName(user?.name || "");
    setPendingCurrency(undefined);
    setAvatar(null);
    setMessage({ type: "info", text: "Changes reverted." });
  }, [user?.name]);

  const handleCloseDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setDeleteInput("");
    setMessage({ type: "", text: "" });
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Profile Settings
        </h1>
        <p className="text-slate-600 text-sm">
          Manage your account information
        </p>
      </header>

      {/* Main Content - Desktop: Side by side, Mobile: Stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
        {/* Avatar Section - Left side on desktop */}
        <div className="lg:col-span-1">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative group">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <img
                  src={avatarUrl}
                  alt={`${name}'s avatar`}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover cursor-pointer transition-all duration-300 hover:shadow-lg border-4 border-white shadow-lg"
                  onClick={() => fileInputRef.current?.click()}
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      name || "User"
                    )}&background=6366f1&color=ffffff&size=256`;
                  }}
                />

                {/* Upload overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
              </motion.div>

              {/* Small Action Buttons - Positioned like before */}
              <div className="absolute -bottom-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="bg-white hover:bg-slate-50 p-2 rounded-full shadow-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  title="Upload new image"
                  aria-label="Upload new avatar image"
                >
                  <Camera className="w-3 h-3 text-indigo-600" />
                </button>

                {(user?.avatar || avatar) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAvatar();
                    }}
                    className="bg-white hover:bg-slate-50 p-2 rounded-full shadow-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                    title="Remove image"
                    aria-label="Remove avatar image"
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                className="hidden"
              />
            </div>

            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">
                Click to change photo
              </p>
              <p className="text-xs text-slate-400">
                Max 5MB • JPEG, PNG, WebP
              </p>
            </div>

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-slate-600"
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Updating avatar...</span>
              </motion.div>
            )}

            {/* Compact Stats */}
            <div className="mt-8 space-y-4">
              <div className="h-px bg-slate-200"></div>

              {statsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-center"
                  >
                    <div className="flex items-center justify-center mb-2">
                      <div className="p-2 rounded-lg bg-blue-50">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      {stats.bills}
                    </div>
                    <div className="text-xs text-slate-500">Bills</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center"
                  >
                    <div className="flex items-center justify-center mb-2">
                      <div className="p-2 rounded-lg bg-green-50">
                        <FileText className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      {stats.expenses}
                    </div>
                    <div className="text-xs text-slate-500">Expenses</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center"
                  >
                    <div className="flex items-center justify-center mb-2">
                      <div className="p-2 rounded-lg bg-purple-50">
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      {stats.warranties}
                    </div>
                    <div className="text-xs text-slate-500">
                      Warranties
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Section - Right side on desktop */}
        <div className="lg:col-span-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveAllChanges();
            }}
            className="space-y-8"
          >
            {/* Name Field */}
            <div className="space-y-3">
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-slate-900"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="block w-full pl-12 pr-4 py-3 text-slate-900 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 sm:text-sm hover:bg-slate-100"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Horizontal separator */}
            <div className="h-px bg-slate-200"></div>

            {/* Email Field */}
            <div className="space-y-3">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-900"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className="block w-full pl-12 pr-4 py-3 text-slate-500 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed sm:text-sm"
                />
              </div>
              <p className="text-sm text-slate-500">
                Email cannot be changed for security reasons
              </p>
            </div>

            {/* Horizontal separator */}
            <div className="h-px bg-slate-200"></div>

            {/* Currency Field */}
            <div className="space-y-3">
              <label
                htmlFor="currency"
                className="block text-sm font-semibold text-slate-900"
              >
                Preferred Currency
              </label>
              <div className="relative">
                <select
                  id="currency"
                  value={pendingCurrency || selectedCurrency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="block w-full pl-4 pr-10 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 sm:text-sm appearance-none hover:bg-slate-100 cursor-pointer"
                >
                  {CURRENCY_OPTIONS.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.name} ({currency.code})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-slate-500">
                This will be used for displaying amounts throughout the app
              </p>
            </div>

            {/* Horizontal separator */}
            <div className="h-px bg-slate-200"></div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {hasChanges && (
                <motion.button
                  type="button"
                  onClick={handleRevertChanges}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 text-slate-700 font-semibold border-2 border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all duration-200 text-sm rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  <X className="w-5 h-5" />
                  Revert Changes
                </motion.button>
              )}

              <motion.button
                type="submit"
                disabled={loading || !hasChanges}
                whileHover={{ scale: hasChanges ? 1.02 : 1 }}
                whileTap={{ scale: hasChanges ? 0.98 : 1 }}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 bg-slate-900 text-white font-semibold hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </motion.button>
            </div>

            {/* Horizontal separator */}
            <div className="h-px bg-slate-200"></div>

            {/* Delete Account Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900">
                Danger Zone
              </h3>
              <p className="text-sm text-slate-600">
                Once you delete your account, there is no going back.
                Please be certain.
              </p>
              <motion.button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 bg-red-600 text-white font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 text-sm rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                <Trash2 className="w-5 h-5" />
                Delete Account
              </motion.button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Animation Overlay */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-emerald-50 bg-opacity-90 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="bg-white rounded-full p-8 shadow-lg"
            >
              <CheckCircle className="w-16 h-16 text-emerald-600" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <Toast
        message={message}
        onClose={() => setMessage({ type: "", text: "" })}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteProfile}
        userName={user?.name || "User"}
        deleteInput={deleteInput}
        setDeleteInput={setDeleteInput}
        deleting={deleting}
      />
    </div>
  );
};

// Set display names for better debugging
Profile.displayName = "Profile";

export default Profile;
