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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="flex flex-col items-center space-y-4">
      <div
        className={`relative group cursor-pointer ${
          dragOver ? "scale-105" : ""
        } transition-transform duration-200`}
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
        <div
          className={`relative overflow-hidden rounded-full ring-4 transition-all duration-300 ${
            dragOver
              ? "ring-indigo-500 ring-offset-4"
              : "ring-slate-200 group-hover:ring-indigo-400"
          }`}
        >
          <img
            src={avatarUrl}
            alt={`${name}'s avatar`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                name || "User"
              )}&background=EEE&color=888&size=256`;
            }}
            className="w-32 h-32 object-cover shadow-lg"
          />

          {/* Overlay */}
          <div
            className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
              dragOver ? "opacity-100" : ""
            }`}
          >
            <div className="text-white text-center">
              <Upload className="w-6 h-6 mx-auto mb-1" />
              <p className="text-xs font-medium">
                {dragOver ? "Drop image" : "Change photo"}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="absolute -bottom-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="bg-white hover:bg-slate-100 p-2 rounded-full shadow-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-150"
            title="Upload new image"
            aria-label="Upload new avatar image"
          >
            <Camera className="w-4 h-4 text-slate-600" />
          </button>

          {hasAvatar && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveAvatar();
              }}
              className="bg-white hover:bg-slate-100 p-2 rounded-full shadow-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors duration-150"
              title="Remove image"
              aria-label="Remove avatar image"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
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
        <div className="flex items-center gap-2 text-sm text-indigo-600">
          <LoadingSpinner size="sm" />
          <span>Updating avatar...</span>
        </div>
      )}

      <p className="text-xs text-slate-500 text-center max-w-xs">
        Click or drag to upload a new photo. Max 5MB. Supports JPEG, PNG,
        WebP.
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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            id="delete-modal-title"
            className="text-lg font-semibold text-red-600 flex items-center"
          >
            <AlertTriangle className="w-5 h-5 mr-2" />
            Confirm Account Deletion
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 rounded p-1"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800 font-medium mb-1">
              ⚠️ This action cannot be undone
            </p>
            <p className="text-sm text-red-700">
              This will permanently delete your account and all associated
              data including:
            </p>
            <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
              <li>All expenses and financial records</li>
              <li>Bills and warranties</li>
              <li>Profile information and preferences</li>
            </ul>
          </div>

          <div>
            <label
              htmlFor="delete-confirmation"
              className="block text-sm text-slate-700 mb-2"
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
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-sm"
              aria-describedby="delete-help"
            />
            <p id="delete-help" className="text-xs text-slate-500 mt-1">
              This confirmation helps prevent accidental deletions
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting || deleteInput !== requiredText}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
          >
            {deleting ? (
              <>
                <LoadingSpinner size="sm" />
                Deleting...
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
      <div className="max-w-2xl mx-auto py-1 px-2 sm:px-6 lg:px-8">
        <header className="mb-5 text-center">
          <h1 className="text-3xl font-bold text-slate-800">
            Profile Settings
          </h1>
          <p className="text-md text-slate-600 mt-0">
            Manage your personal information and preferences.
          </p>
        </header>

        <motion.div
          className={`bg-white rounded-xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-8 relative transition-all duration-300 ${
            saveSuccess ? "ring-2 ring-emerald-500 ring-opacity-50" : ""
          }`}
          layout
        >
          {/* Success Overlay */}
          <SuccessOverlay show={saveSuccess} />

          {/* Avatar Section */}
          <AvatarUpload
            avatarUrl={avatarUrl}
            name={name}
            loading={loading}
            onImageChange={handleImageChange}
            onRemoveAvatar={handleRemoveAvatar}
            hasAvatar={!!(user?.avatar || avatar)}
          />

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveAllChanges();
            }}
            className="space-y-6"
            noValidate
          >
            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block mb-1.5 text-sm font-medium text-slate-700"
              >
                Full Name *
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User
                    className="h-5 w-5 text-slate-400"
                    aria-hidden="true"
                  />
                </div>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="form-input block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                  placeholder="e.g. Jane Doe"
                  aria-describedby="name-help"
                />
              </div>
              <p id="name-help" className="text-xs text-slate-500 mt-1">
                This name will be displayed throughout the application
              </p>
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block mb-1.5 text-sm font-medium text-slate-700"
              >
                Email Address
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail
                    className="h-5 w-5 text-slate-400"
                    aria-hidden="true"
                  />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className="form-input block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg bg-slate-100 cursor-not-allowed text-slate-500 sm:text-sm focus:ring-0 focus:border-slate-300"
                  placeholder="you@example.com"
                  aria-describedby="email-help"
                />
              </div>
              <p id="email-help" className="text-xs text-slate-500 mt-1">
                Email cannot be changed for security reasons
              </p>
            </div>

            {/* Currency Field */}
            <div>
              <label
                htmlFor="currency"
                className="block mb-1.5 text-sm font-medium text-slate-700"
              >
                Preferred Currency
              </label>
              <div className="relative rounded-md shadow-sm">
                <select
                  id="currency"
                  value={pendingCurrency || selectedCurrency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="form-select block w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                  aria-describedby="currency-help"
                >
                  {CURRENCY_OPTIONS.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.name} ({currency.code})
                    </option>
                  ))}
                </select>
              </div>
              <p
                id="currency-help"
                className="text-xs text-slate-500 mt-1"
              >
                This will be used for displaying amounts throughout the app
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-wrap gap-3 justify-end border-t border-slate-200">
              <AnimatePresence>
                {hasChanges && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    type="button"
                    onClick={handleRevertChanges}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors duration-150 ease-in-out shadow-md hover:shadow-lg text-sm"
                  >
                    <X className="w-4 h-4" />
                    Revert
                  </motion.button>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading || !hasChanges}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-150 ease-in-out shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed text-sm"
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-150 ease-in-out shadow-md hover:shadow-lg text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          </form>
        </motion.div>
      </div>

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
    </>
  );
};

// Set display names for better debugging
Profile.displayName = "Profile";

export default Profile;
