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
  Upload,
  RefreshCw,
  Info,
  CheckCircle,
  BarChart3,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProfileStatsSimple from "../components/ProfileStats";

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
const LoadingSpinner: React.FC<{ size?: "sm" | "md" }> = ({
  size = "md",
}) => (
  <RefreshCw
    className={`animate-spin ${size === "sm" ? "w-4 h-4" : "w-5 h-5"}`}
  />
);

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

const AvatarUpload: React.FC<{
  avatarUrl: string;
  name: string;
  loading: boolean;
  onImageChange: (file: File) => void;
  onRemoveAvatar: () => void;
  hasAvatar: boolean;
}> = ({
  avatarUrl,
  name,
  loading,
  onImageChange,
  onRemoveAvatar,
  hasAvatar,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback(
    (file: File) => {
      // Validate file
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        alert("Please select a valid image file (JPEG, PNG, or WebP)");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        alert("File size must be less than 5MB");
        return;
      }

      onImageChange(file);
    },
    [onImageChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-4">
      <div
        className="relative group cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload avatar image"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <div className="relative overflow-hidden rounded-full border-3 sm:border-4 border-slate-200 shadow-lg">
          <img
            src={avatarUrl}
            alt={`${name}'s avatar`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                name || "User"
              )}&background=6366f1&color=ffffff&size=256`;
            }}
            className="w-20 h-20 sm:w-24 sm:h-24 object-cover"
          />

          {/* Overlay */}
          <div
            className={`absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
              dragOver ? "opacity-100" : ""
            }`}
          >
            <div className="text-white text-center">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1" />
              <p className="text-xs font-medium">
                {dragOver ? "Drop image" : "Change photo"}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons - Mobile optimized */}
        <div className="absolute -bottom-0.5 sm:-bottom-1 -right-0.5 sm:-right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="bg-white hover:bg-slate-50 p-1.5 sm:p-2 rounded-full shadow-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            title="Upload new image"
            aria-label="Upload new avatar image"
          >
            <Camera className="w-3 h-3 text-indigo-600" />
          </button>

          {hasAvatar && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveAvatar();
              }}
              className="bg-white hover:bg-slate-50 p-1.5 sm:p-2 rounded-full shadow-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              title="Remove image"
              aria-label="Remove avatar image"
            >
              <Trash2 className="w-3 h-3 text-red-600" />
            </button>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelect(e.target.files[0]);
            }
          }}
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-indigo-600">
          <LoadingSpinner size="sm" />
          <span>Updating avatar...</span>
        </div>
      )}

      <p className="text-xs sm:text-sm text-slate-600 text-center max-w-xs font-medium">
        Click or drag to upload
      </p>
      <p className="text-xs text-slate-400 text-center">
        Max 5MB • JPEG, PNG, WebP
      </p>
    </div>
  );
};

const DeleteConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  deleteInput: string;
  setDeleteInput: (value: string) => void;
  deleting: boolean;
}> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  deleteInput,
  setDeleteInput,
  deleting,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requiredText = `${userName}/delete`;

  // Focus management
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-md shadow-xl"
      >
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3
            id="delete-modal-title"
            className="text-base sm:text-lg font-semibold text-red-600 flex items-center"
          >
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="hidden sm:inline">
              Confirm Account Deletion
            </span>
            <span className="sm:hidden">Delete Account</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 rounded p-1"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 sm:p-3">
            <p className="text-xs sm:text-sm text-red-800 font-medium mb-1">
              ⚠️ This action cannot be undone
            </p>
            <p className="text-xs sm:text-sm text-red-700">
              This will permanently delete your account and all associated
              data including:
            </p>
            <ul className="text-xs sm:text-sm text-red-700 mt-1.5 sm:mt-2 ml-3 sm:ml-4 list-disc">
              <li>All expenses and financial records</li>
              <li>Bills and warranties</li>
              <li>Profile information and preferences</li>
            </ul>
          </div>

          <div>
            <label
              htmlFor="delete-confirmation"
              className="block text-xs sm:text-sm text-slate-700 mb-1.5 sm:mb-2"
            >
              To confirm, please type{" "}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-red-600 font-mono text-xs">
                {requiredText}
              </code>{" "}
              below:
            </label>
            <input
              ref={inputRef}
              id="delete-confirmation"
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={`Type '${requiredText}' to confirm`}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-xs sm:text-sm"
              aria-describedby="delete-help"
            />
            <p id="delete-help" className="text-xs text-slate-500 mt-1">
              This confirmation helps prevent accidental deletions
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors text-sm min-h-[44px] sm:min-h-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting || deleteInput !== requiredText}
            className="px-4 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0"
          >
            {deleting ? (
              <>
                <LoadingSpinner size="sm" />
                Deleting....
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Account
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Success Animation Component
const SuccessOverlay: React.FC<{ show: boolean }> = ({ show }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-emerald-50 bg-opacity-90 rounded-xl flex items-center justify-center z-10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className="bg-emerald-100 rounded-full p-4"
        >
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

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
  const [activeTab, setActiveTab] = useState<"details" | "statistics">(
    "details"
  );

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
  const handleImageChange = useCallback((file: File) => {
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
    <>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
          {/* Mobile-optimized Header */}
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Profile Settings
            </h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">
              Customize your account and preferences
            </p>
          </div>

          {/* Mobile-optimized Tab Navigation */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="bg-white rounded-lg p-1 shadow-sm border border-slate-200 w-full max-w-md sm:max-w-none sm:w-auto">
              <nav className="flex space-x-1">
                <button
                  onClick={() => setActiveTab("details")}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                    activeTab === "details"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <div className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2">
                    <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">
                      Profile Details
                    </span>
                    <span className="sm:hidden">Details</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("statistics")}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                    activeTab === "statistics"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <div className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2">
                    <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Statistics</span>
                    <span className="sm:hidden">Stats</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "details" ? (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-slate-200 p-3 sm:p-4 lg:p-6 relative">
                {/* Success Overlay */}
                <SuccessOverlay show={saveSuccess} />

                {/* Mobile-optimized Profile Layout */}
                <div className="space-y-6 sm:space-y-8">
                  {/* Avatar Section - Centered */}
                  <div className="flex justify-center">
                    <AvatarUpload
                      avatarUrl={avatarUrl}
                      name={name}
                      loading={loading}
                      onImageChange={handleImageChange}
                      onRemoveAvatar={handleRemoveAvatar}
                      hasAvatar={!!(user?.avatar || avatar)}
                    />
                  </div>

                  {/* Form Section - Mobile optimized */}
                  <div className="max-w-2xl mx-auto">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveAllChanges();
                      }}
                      className="space-y-4 sm:space-y-6"
                      noValidate
                    >
                      {/* Name Field - Mobile optimized */}
                      <div className="space-y-1.5 sm:space-y-2">
                        <label
                          htmlFor="name"
                          className="block text-xs sm:text-sm font-semibold text-slate-800"
                        >
                          Full Name *
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                            <User
                              className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400"
                              aria-hidden="true"
                            />
                          </div>
                          <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="block w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 bg-white border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors"
                            placeholder="e.g. Jane Doe"
                            aria-describedby="name-help"
                          />
                        </div>
                        <p
                          id="name-help"
                          className="text-xs text-slate-500"
                        >
                          This name will be displayed throughout the
                          application
                        </p>
                      </div>

                      {/* Email Field - Mobile optimized */}
                      <div className="space-y-1.5 sm:space-y-2">
                        <label
                          htmlFor="email"
                          className="block text-xs sm:text-sm font-semibold text-slate-800"
                        >
                          Email Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                            <Mail
                              className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400"
                              aria-hidden="true"
                            />
                          </div>
                          <input
                            id="email"
                            type="email"
                            value={email}
                            readOnly
                            className="block w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg cursor-not-allowed text-slate-500 text-sm"
                            placeholder="you@example.com"
                            aria-describedby="email-help"
                          />
                        </div>
                        <p
                          id="email-help"
                          className="text-xs text-slate-500"
                        >
                          Email cannot be changed for security reasons
                        </p>
                      </div>

                      {/* Currency Field - Mobile optimized */}
                      <div className="space-y-1.5 sm:space-y-2">
                        <label
                          htmlFor="currency"
                          className="block text-xs sm:text-sm font-semibold text-slate-800"
                        >
                          Preferred Currency
                        </label>
                        <div className="relative">
                          <select
                            id="currency"
                            value={pendingCurrency || selectedCurrency}
                            onChange={(e) =>
                              handleCurrencyChange(e.target.value)
                            }
                            className="block w-full pl-3 sm:pl-4 pr-8 sm:pr-10 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors appearance-none"
                            aria-describedby="currency-help"
                          >
                            {CURRENCY_OPTIONS.map((currency) => (
                              <option
                                key={currency.code}
                                value={currency.code}
                              >
                                {currency.symbol} {currency.name} (
                                {currency.code})
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center pointer-events-none">
                            <svg
                              className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400"
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
                        <p
                          id="currency-help"
                          className="text-xs text-slate-500"
                        >
                          This will be used for displaying amounts
                          throughout the app
                        </p>
                      </div>

                      {/* Action Buttons - Mobile optimized */}
                      <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end border-t border-slate-200/50">
                        {hasChanges && (
                          <button
                            type="button"
                            onClick={handleRevertChanges}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 font-medium rounded-lg hover:bg-slate-50 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors text-sm min-h-[44px] sm:min-h-0"
                          >
                            <X className="w-4 h-4" />
                            Revert
                          </button>
                        )}

                        <button
                          type="submit"
                          disabled={loading || !hasChanges}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[44px] sm:min-h-0"
                        >
                          {loading ? (
                            <>
                              <LoadingSpinner size="sm" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save Changes
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowDeleteModal(true)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-sm min-h-[44px] sm:min-h-0"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Account
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              <ProfileStatsSimple />
            </div>
          )}

          {/* Toast Notifications */}
          <Toast
            message={message}
            onClose={() => setMessage({ type: "", text: "" })}
          />

          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {showDeleteModal && (
              <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={handleCloseDeleteModal}
                onConfirm={handleDeleteProfile}
                userName={user?.name || "User"}
                deleteInput={deleteInput}
                setDeleteInput={setDeleteInput}
                deleting={deleting}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

// Set display names for better debugging
Profile.displayName = "Profile";

export default Profile;
