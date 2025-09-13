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
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import ClearRecordsModal from "../components/ClearRecordsModal";
import CurrencySelect from "../components/CurrencySelect";
import axios from "axios";

// Types
interface Message {
  type: "success" | "error" | "info" | "";
  text: string;
}

interface ProfileStatsData {
  bills: number;
  expenses: number;
  warranties: number;
  incomes: number;
  total: number;
}

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
  const [nameError, setNameError] = useState("");
  const [isNameTouched, setIsNameTouched] = useState(false);
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearRecordsModal, setShowClearRecordsModal] = useState(false);
  const [isClearingRecords, setIsClearingRecords] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isAvatarPendingDeletion, setIsAvatarPendingDeletion] = useState(false);
  const [stats, setStats] = useState<ProfileStatsData>({
    bills: 0,
    expenses: 0,
    warranties: 0,
    incomes: 0,
    total: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await axios.get("/api/auth/profile/stats");
      const data = response.data;

      if (data.activity) {
        setStats({
          bills: data.activity.bills || 0,
          expenses: data.activity.expenses || 0,
          warranties: data.activity.warranties || 0,
          incomes: data.activity.incomes || 0,
          total: data.activity.total || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching profile stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

  // Real-time name validation
  useEffect(() => {
    if (!isNameTouched) return;

    if (name.trim() === "") {
      setNameError("Full name is required.");
    } else if (name.length < 3) {
      setNameError("Full name must be at least 3 characters long.");
    } else if (name.length > 50) {
      setNameError("Full name must be less than 50 characters long.");
    } else {
      setNameError("");
    }
  }, [name, isNameTouched]);

  // Computed values
  const hasNameChanged = name !== (user?.name || "");
  const hasCurrencyChanged =
    pendingCurrency && pendingCurrency !== selectedCurrency;
  const hasChanges = hasNameChanged || hasCurrencyChanged || avatar || isAvatarPendingDeletion;

  const avatarUrl = isAvatarPendingDeletion
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name || "User"
      )}&background=EEE&color=888&size=256`
    : avatar
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
        text: `File too large: ${(file.size / 1024 / 1024).toFixed(
          1
        )}MB (max 5MB)`,
      });
      return;
    }

    setAvatar(file);
    setMessage({
      type: "info",
      text: "Avatar selected. Click 'Save Changes' to update.",
    });
  }, []);

  const handleRemoveAvatar = useCallback(() => {
    setIsAvatarPendingDeletion(true);
    setAvatar(null); // Also clear any newly selected avatar
    setMessage({
      type: "info",
      text: "Avatar marked for removal. Click 'Save Changes' to confirm.",
    });
  }, []);

  const handleSaveAllChanges = useCallback(async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const promises = [];

      // Handle avatar removal
      if (isAvatarPendingDeletion) {
        promises.push(removeAvatar());
      }

      // Save profile changes
      if (hasNameChanged || avatar) {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("email", email);
        if (avatar) formData.append("avatar", avatar);

        const config = {
          onUploadProgress: (progressEvent: any) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
        };

        promises.push(updateProfile(formData, config));
      }

      // Save currency changes
      if (hasCurrencyChanged && pendingCurrency) {
        promises.push(updateCurrency(pendingCurrency));
      }

      await Promise.all(promises);

      // Reset local state instead of reloading page
      setAvatar(null);
      setPendingCurrency(undefined);
      setIsAvatarPendingDeletion(false);

      // Show success animation
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

      setMessage({ type: "success", text: "Changes saved successfully!" });
      setUploadProgress(0); // Reset progress
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to save changes. Please check your connection and try again.",
      });
      setUploadProgress(0); // Reset progress
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
    isAvatarPendingDeletion,
    removeAvatar,
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

  const handleClearRecords = useCallback(async (recordsToClear: string[]) => {
    setIsClearingRecords(true);
    setMessage({ type: "", text: "" });

    try {
      await axios.delete("/api/user/records", {
        data: { records: recordsToClear },
      });
      setMessage({
        type: "success",
        text: "Selected records have been cleared.",
      });
      setShowClearRecordsModal(false);
      fetchStats(); // Refresh stats after clearing
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to clear records. Please try again.",
      });
    } finally {
      setIsClearingRecords(false);
    }
  }, [fetchStats]);

  const handleCurrencyChange = useCallback((currency: string) => {
    setPendingCurrency(currency);
  }, []);

  const handleRevertChanges = useCallback(() => {
    setName(user?.name || "");
    setPendingCurrency(undefined);
    setAvatar(null);
    setIsAvatarPendingDeletion(false);
    setUploadProgress(0); // Reset progress
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
                  className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover cursor-pointer transition-all duration-300 hover:shadow-lg border-4 ${isAvatarPendingDeletion ? "border-red-500" : "border-white"} shadow-lg`}
                  onClick={() => fileInputRef.current?.click()}
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      name || "User"
                    )}&background=6366f1&color=ffffff&size=256`;
                  }}
                />

                {/* Upload Progress Bar */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                    <div className="w-24 h-24">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          className="text-slate-200"
                          strokeWidth="10"
                          stroke="currentColor"
                          fill="transparent"
                          r="45"
                          cx="50"
                          cy="50"
                        />
                        <motion.circle
                          className="text-indigo-600"
                          strokeWidth="10"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r="45"
                          cx="50"
                          cy="50"
                          initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                          animate={{
                            strokeDashoffset: 2 * Math.PI * 45 * (1 - uploadProgress / 100),
                          }}
                          transition={{ duration: 0.3 }}
                        />
                        <text
                          x="50%"
                          y="50%"
                          textAnchor="middle"
                          dy=".3em"
                          className="text-lg font-semibold text-white"
                        >
                          {`${uploadProgress}%`}
                        </text>
                      </svg>
                    </div>
                  </div>
                )}

                {/* Upload overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons - Mobile friendly */}
              <div className="flex sm:absolute sm:-bottom-1 sm:-right-1 sm:gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity mt-4 sm:mt-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 p-2 sm:p-2 rounded-lg sm:rounded-full shadow-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  title="Upload new image"
                  aria-label="Upload new avatar image"
                >
                  <Camera className="w-4 h-4 sm:w-3 sm:h-3 text-indigo-600" />
                  <span className="sm:hidden text-sm font-medium text-indigo-600">Change</span>
                </button>

                {(user?.avatar || avatar) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAvatar();
                    }}
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 p-2 sm:p-2 rounded-lg sm:rounded-full shadow-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors transform hover:scale-105"
                    title="Remove image"
                    aria-label="Remove avatar image"
                  >
                    <Trash2 className="w-4 h-4 sm:w-3 sm:h-3 text-red-600" />
                    <span className="sm:hidden text-sm font-medium text-red-600">Remove</span>
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

            <div className="text-center relative">
              <p className="text-sm text-slate-600 mb-2">
                Click to change photo
              </p>
              <div className="group relative inline-block">
                <button
                  type="button"
                  className="text-xs text-slate-400 flex items-center gap-1 cursor-pointer"
                >
                  <Info className="w-3 h-3" />
                  <span>Requirements</span>
                </button>
                <div className="absolute bottom-full mb-2 w-48 bg-slate-800 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <p className="font-semibold">Avatar Requirements:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Max 5MB</li>
                    <li>JPEG, PNG, or WebP</li>
                  </ul>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                </div>
              </div>
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
                <div className="relative flex flex-col items-center justify-center py-10 bg-slate-50 rounded-lg">
                  <div className="absolute inset-0 bg-white bg-opacity-50 backdrop-blur-sm"></div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 flex items-center gap-3 text-sm text-slate-600"
                  >
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="font-medium">Loading activity stats...</span>
                  </motion.div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-center"
                  >
                    <div className="flex items-center justify-center mb-2">
                      <div className="p-2 rounded-lg bg-cyan-50">
                        <TrendingUp className="w-4 h-4 text-cyan-600" />
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      {stats.incomes}
                    </div>
                    <div className="text-xs text-slate-500">Incomes</div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
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
                    transition={{ delay: 0.3 }}
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
                    transition={{ delay: 0.4 }}
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
                  onBlur={() => setIsNameTouched(true)}
                  required
                  className={`block w-full pl-12 pr-4 py-3 text-slate-900 placeholder-slate-400 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 sm:text-sm hover:bg-slate-100 ${
                    nameError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-slate-200 focus:ring-slate-900"
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {nameError && (
                <p className="text-sm text-red-600 mt-2">{nameError}</p>
              )}
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
              <CurrencySelect
                selectedCurrency={pendingCurrency || selectedCurrency}
                onCurrencyChange={handleCurrencyChange}
              />
              {hasCurrencyChanged && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-indigo-600 bg-indigo-50 p-3 rounded-lg mt-2 flex items-center gap-2"
                >
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>Currency change will be applied after saving.</span>
                </motion.div>
              )}
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
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-slate-600 font-semibold border-2 border-slate-300 rounded-lg hover:bg-slate-100 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-300 ease-in-out text-sm min-h-[44px] transform hover:-translate-y-0.5"
              >
                <X className="w-5 h-5" />
                Revert Changes
              </motion.button>
            )}

            <motion.button
              type="submit"
              disabled={loading || !hasChanges || !!nameError}
              whileHover={{ scale: hasChanges && !nameError ? 1.02 : 1 }}
              whileTap={{ scale: hasChanges && !nameError ? 0.98 : 1 }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[44px] transform hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Changes</span>
                  {hasChanges && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 rounded-full bg-indigo-400 ml-1"
                    ></motion.div>
                  )}
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
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  Permanently clear your financial records. This action is irreversible.
                </p>
                <motion.button
                  type="button"
                  onClick={() => setShowClearRecordsModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-100 text-amber-700 font-semibold border border-amber-200 rounded-lg hover:bg-amber-200 hover:text-amber-800 hover:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-300 ease-in-out text-sm min-h-[44px] transform hover:-translate-y-0.5"
                >
                  <Trash2 className="w-5 h-5" />
                  Clear Records
                </motion.button>
              </div>
              <div className="h-px bg-slate-200 my-4"></div>
              <p className="text-sm text-slate-600">
                Once you delete your account, there is no going back.
                Please be certain.
              </p>
              <motion.button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-100 text-red-700 font-semibold border border-red-200 rounded-lg hover:bg-red-200 hover:text-red-800 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 ease-in-out text-sm min-h-[44px] transform hover:-translate-y-0.5"
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

      {/* Clear Records Modal */}
      <ClearRecordsModal
        isOpen={showClearRecordsModal}
        onClose={() => setShowClearRecordsModal(false)}
        onConfirm={handleClearRecords}
        clearing={isClearingRecords}
        recordStats={stats}
      />
    </div>
  );
};

// Set display names for better debugging
Profile.displayName = "Profile";

export default Profile;
