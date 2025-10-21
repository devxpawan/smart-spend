import axios, { AxiosError, AxiosProgressEvent } from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle,
  CreditCard,
  FileText,
  Info,
  Mail,
  Moon,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sun,
  Trash2,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ClearRecordsModal from "../components/ClearRecordsModal";
import CurrencySelect from "../components/CurrencySelect";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";

import { useAuth } from "../contexts/auth-exports";
import { useTheme } from "../contexts/theme-exports";
import { incomeCategories } from "../lib/incomeCategories";
import { expenseCategories } from "../lib/expenseCategories";

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

// Hook: detect hover-capable devices (prevents sticky hover on touch)
function useHoverCapable() {
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return canHover;
}

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

// Category Management Component
const CategoryManager: React.FC<{
  title: string;
  categories: string[];
  defaultCategories: string[];
  onUpdate: (categories: string[]) => Promise<void>;
  setMessage: (message: Message) => void;
  // New prop to track unsaved changes
  setUnsavedChanges?: (categories: string[] | null) => void;
}> = ({ title, categories, defaultCategories, onUpdate, setMessage, setUnsavedChanges }) => {
  const [newCategory, setNewCategory] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [tempCategories, setTempCategories] = useState<string[]>(categories);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTempCategories(categories);
  }, [categories]);

  const handleAddCategory = () => {
    if (newCategory.trim() && !tempCategories.includes(newCategory.trim())) {
      const updated = [...tempCategories, newCategory.trim()];
      setTempCategories(updated);
      setNewCategory("");
    }
  };

  const handleRemoveCategory = (category: string) => {
    const updated = tempCategories.filter((cat) => cat !== category);
    setTempCategories(updated);
  };

  const handleCancel = () => {
    setTempCategories(categories);
    setIsEditing(false);
    setNewCategory("");
    // Reset unsaved changes tracking
    if (setUnsavedChanges) {
      setUnsavedChanges(null);
    }
  };

  const handleResetToDefaults = () => {
    setTempCategories([...defaultCategories]);
  };

  // When temp categories change, notify parent of unsaved changes
  useEffect(() => {
    if (isEditing && setUnsavedChanges) {
      // Check if categories have actually changed
      const hasChanges = JSON.stringify(tempCategories.sort()) !== JSON.stringify(categories.sort());
      setUnsavedChanges(hasChanges ? tempCategories : null);
    }
  }, [tempCategories, categories, isEditing, setUnsavedChanges]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          {title} Categories
        </h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
          >
            Customize
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Add new category"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              disabled={saving}
            />
            <button
              onClick={handleAddCategory}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              disabled={saving}
              type="button"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {tempCategories.map((category) => (
              <div
                key={category}
                className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-full px-3 py-1 text-sm"
              >
                <span className="mr-2">{category}</span>
                <button
                  onClick={() => handleRemoveCategory(category)}
                  className="text-slate-500 hover:text-red-500"
                  disabled={saving}
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={handleResetToDefaults}
              className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300"
              disabled={saving}
              type="button"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <span
              key={category}
              className="bg-slate-100 dark:bg-slate-700 rounded-full px-3 py-1 text-sm"
            >
              {category}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Component
const Profile: React.FC = () => {
  const {
    user,
    updateProfile,
    removeAvatar,
    updateCurrency,
    deleteProfile,
    updateCustomIncomeCategories,
    updateCustomExpenseCategories,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const canHover = useHoverCapable();

  // Form state
  const [name, setName] = useState(user?.name || "");
  const [nameError, setNameError] = useState("");
  const [isNameTouched, setIsNameTouched] = useState(false);
  const [email] = useState(user?.email || "");
  const [selectedCurrency, setSelectedCurrency] = useState(
    user?.preferences?.currency || "USD"
  );
  const [pendingCurrency, setPendingCurrency] = useState<string | undefined>(
    undefined
  );

  // Custom categories state
  const [customIncomeCategories, setCustomIncomeCategories] = useState<string[]>(
    user?.customIncomeCategories || []
  );
  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>(
    user?.customExpenseCategories || []
  );
  
  // Track if there are unsaved category changes
  const [unsavedIncomeCategories, setUnsavedIncomeCategories] = useState<string[] | null>(null);
  const [unsavedExpenseCategories, setUnsavedExpenseCategories] = useState<string[] | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<Message>({ type: "", text: "" });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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

  // Cancelable stats fetch
  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    try {
      setStatsLoading(true);
      const response = await axios.get("/api/auth/profile/stats", { signal });
      const data = response.data;

      if (data?.activity) {
        setStats({
          bills: data.activity.bills || 0,
          expenses: data.activity.expenses || 0,
          warranties: data.activity.warranties || 0,
          incomes: data.activity.incomes || 0,
          total: data.activity.total || 0,
        });
      }
    } catch (error: unknown) {
      if (error instanceof AxiosError && error?.code === "ERR_CANCELED") return;
      console.error("Error fetching profile stats:", error);
      setMessage((m) =>
        m.text ? m : { type: "error", text: "Failed to load stats." }
      );
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchStats(controller.signal);
    return () => controller.abort();
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
    setCustomIncomeCategories(user?.customIncomeCategories || []);
    setCustomExpenseCategories(user?.customExpenseCategories || []);
    // Reset unsaved changes when user data changes
    setUnsavedIncomeCategories(null);
    setUnsavedExpenseCategories(null);
  }, [user?.name, user?.preferences?.currency, user?.customIncomeCategories, user?.customExpenseCategories]);

  // Create and cleanup avatar preview URL
  useEffect(() => {
    if (!avatar) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatar);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);

  // Real-time name validation
  useEffect(() => {
    if (!isNameTouched) return;

    const trimmed = name.trim();
    if (trimmed === "") {
      setNameError("Full name is required.");
    } else if (trimmed.length < 3) {
      setNameError("Full name must be at least 3 characters long.");
    } else if (trimmed.length > 50) {
      setNameError("Full name must be less than 50 characters long.");
    } else {
      setNameError("");
    }
  }, [name, isNameTouched]);

  // Computed values
  const trimmedName = name.trim();
  const hasNameChanged = trimmedName !== (user?.name?.trim() || "");
  const hasCurrencyChanged = Boolean(
    pendingCurrency && pendingCurrency !== selectedCurrency
  );
  // Check if there are unsaved category changes
  const hasUnsavedCategoryChanges = unsavedIncomeCategories !== null || unsavedExpenseCategories !== null;
  const hasChanges =
    hasNameChanged || hasCurrencyChanged || !!avatar || isAvatarPendingDeletion || hasUnsavedCategoryChanges;

  const avatarUrl = isAvatarPendingDeletion
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
        trimmedName || "User"
      )}&background=EEE&color=888&size=256`
    : avatarPreview ||
      (user?.avatar && user.avatar !== ""
        ? user.avatar
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(
            trimmedName || "User"
          )}&background=EEE&color=888&size=256`);

  // Handlers
  const handleFileSelect = useCallback((file: File) => {
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

    setIsAvatarPendingDeletion(false);
    setAvatar(file);
    setMessage({
      type: "info",
      text: "Avatar selected. Click 'Save Changes' to update.",
    });
  }, []);

  const handleRemoveAvatar = useCallback(() => {
    setIsAvatarPendingDeletion(true);
    setAvatar(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setMessage({
      type: "info",
      text: "Avatar marked for removal. Click 'Save Changes' to confirm.",
    });
  }, []);

  const handleSaveAllChanges = useCallback(async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    const trimmed = trimmedName;
    if (trimmed.length < 3 || trimmed.length > 50) {
      setIsNameTouched(true);
      setNameError(
        trimmed.length < 3
          ? "Full name must be at least 3 characters long."
          : "Full name must be less than 50 characters long."
      );
      setLoading(false);
      return;
    }

    try {
      const promises: Promise<void>[] = [];

      if (isAvatarPendingDeletion) {
        promises.push(removeAvatar());
      }

      if (hasNameChanged || avatar) {
        const formData = new FormData();
        formData.append("name", trimmed);
        formData.append("email", email);
        if (avatar) formData.append("avatar", avatar);

        const config = {
          onUploadProgress: (e: AxiosProgressEvent) => {
            if (!e?.total) return;
            const percentCompleted = Math.round((e.loaded * 100) / e.total);
            setUploadProgress(percentCompleted);
          },
        };

        promises.push(updateProfile(formData, config));
      }

      if (hasCurrencyChanged && pendingCurrency) {
        promises.push(updateCurrency(pendingCurrency));
      }

      // Save custom categories if there are unsaved changes
      if (unsavedIncomeCategories !== null) {
        promises.push(updateCustomIncomeCategories(unsavedIncomeCategories));
      }

      if (unsavedExpenseCategories !== null) {
        promises.push(updateCustomExpenseCategories(unsavedExpenseCategories));
      }

      await Promise.all(promises);

      setAvatar(null);
      setAvatarPreview(null);
      setPendingCurrency(undefined);
      setIsAvatarPendingDeletion(false);
      // Reset unsaved category changes
      setUnsavedIncomeCategories(null);
      setUnsavedExpenseCategories(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setMessage({ type: "success", text: "Changes saved successfully!" });
      setUploadProgress(0);
    } catch (error: unknown) {
      setMessage({
        type: "error",
        text:
          (error instanceof AxiosError && error?.response?.data?.message) ||
          "Failed to save changes. Please check your connection and try again.",
      });
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  }, [
    avatar,
    email,
    hasCurrencyChanged,
    hasNameChanged,
    isAvatarPendingDeletion,
    pendingCurrency,
    removeAvatar,
    updateCurrency,
    updateProfile,
    trimmedName,
    unsavedIncomeCategories,
    unsavedExpenseCategories,
    updateCustomIncomeCategories,
    updateCustomExpenseCategories,
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
      // If your auth context doesn't redirect, do it here with your router.
    } catch (_err: unknown) {
      setMessage({
        type: "error",
        text:
          (_err instanceof AxiosError && _err?.response?.data?.message) ||
          "Failed to delete profile. Please try again.",
      });
      setDeleting(false);
    }
  }, [deleteProfile, deleteInput, user?.name]);

  const handleClearRecords = useCallback(
    async (recordsToClear: string[]) => {
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
        fetchStats();
      } catch (_err: unknown) {
        setMessage({
          type: "error",
          text:
            (_err instanceof AxiosError && _err?.response?.data?.message) ||
            "Failed to clear records. Please try again.",
        });
      } finally {
        setIsClearingRecords(false);
      }
    },
    [fetchStats]
  );

  const handleRevertChanges = useCallback(() => {
    setName(user?.name || "");
    setPendingCurrency(undefined);
    setAvatar(null);
    setAvatarPreview(null);
    setIsAvatarPendingDeletion(false);
    setUploadProgress(0);
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
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Profile Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Manage your account information
        </p>
      </header>

      {/* Main Content - Desktop: Side by side, Mobile: Stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
        {/* Avatar Section */}
        <div className="lg:col-span-1">
          <div className="flex flex-col items-center space-y-6">
            {/* Anchor container for avatar + absolute action buttons */}
            <div className="relative group">
              {/* Clipped circular wrapper to prevent shadow/scale bleed */}
              <motion.div
                className={`relative inline-block w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden transform-gpu shadow-lg ring-4 shrink-0 ${
                  isAvatarPendingDeletion
                    ? "ring-red-500"
                    : "ring-white dark:ring-slate-800"
                }`}
                whileHover={canHover ? { scale: 1.02 } : undefined}
                transition={{ duration: 0.2 }}
              >
                <img
                  src={avatarUrl}
                  alt={`${trimmedName || "User"}'s avatar`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      trimmedName || "User"
                    )}&background=6366f1&color=ffffff&size=256`;
                  }}
                />

                {/* Upload Progress Bar */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
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
                          initial={{
                            strokeDasharray: 2 * Math.PI * 45,
                            strokeDashoffset: 2 * Math.PI * 45,
                          }}
                          animate={{
                            strokeDasharray: 2 * Math.PI * 45,
                            strokeDashoffset:
                              2 * Math.PI * 45 * (1 - uploadProgress / 100),
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

                {/* Hover overlay (only on hover-capable devices) */}
                <div className="absolute inset-0 rounded-full bg-black/0 transition [@media(hover:hover)]:group-hover:bg-black/20">
                  <div className="opacity-0 transition-opacity flex items-center justify-center h-full [@media(hover:hover)]:group-hover:opacity-100">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons: icon-only on mobile; text on larger screens.
                  Absolute for all screens -> no layout shift */}
              <div className="absolute -bottom-2 -right-2 flex gap-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="h-9 w-9 sm:h-10 sm:w-auto sm:px-3 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 rounded-full shadow-md border border-slate-200 text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Upload new avatar image"
                  title="Upload new image"
                >
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm font-medium">
                    Change
                  </span>
                </button>

                {(user?.avatar || avatarPreview) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAvatar();
                    }}
                    className="h-9 w-9 sm:h-10 sm:w-auto sm:px-3 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 rounded-full shadow-md border border-slate-200 text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label="Remove avatar image"
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm font-medium">
                      Remove
                    </span>
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
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Tap the photo to change
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
            <div className="mt-8 space-y-4 w-full">
              <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

              {statsLoading ? (
                <div className="relative flex flex-col items-center justify-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"></div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300"
                  >
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="font-medium">
                      Loading activity stats...
                    </span>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Total Records
                    </span>
                    <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {stats.total}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-center"
                    >
                      <div className="flex items-center justify-center mb-2">
                        <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-900/50">
                          <TrendingUp className="w-4 h-4 text-cyan-600" />
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-200">
                        {stats.incomes}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Incomes
                      </div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-center"
                    >
                      <div className="flex items-center justify-center mb-2">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/50">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-200">
                        {stats.bills}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Bills
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-center"
                    >
                      <div className="flex items-center justify-center mb-2">
                        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/50">
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-200">
                        {stats.expenses}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Expenses
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-center"
                    >
                      <div className="flex items-center justify-center mb-2">
                        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/50">
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-200">
                        {stats.warranties}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Warranties
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Section */}
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
                className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
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
                  className={`block w-full pl-12 pr-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 bg-slate-50 dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${
                    nameError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-slate-200 dark:border-slate-700 focus:ring-slate-900 dark:focus:ring-slate-200"
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {nameError && (
                <p className="text-sm text-red-600 mt-2">{nameError}</p>
              )}
            </div>

            {/* separator */}
            <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

            {/* Email Field */}
            <div className="space-y-3">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
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
                  className="block w-full pl-12 pr-4 py-3 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-not-allowed sm:text-sm"
                />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Email cannot be changed for security reasons.
              </p>
            </div>

            {/* separator */}
            <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

            {/* Currency Field */}
            <div className="space-y-3">
              <label
                htmlFor="currency"
                className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                Preferred Currency
              </label>
              <CurrencySelect
                selectedCurrency={pendingCurrency || selectedCurrency}
                onCurrencyChange={setPendingCurrency}
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
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This will be used for displaying amounts throughout the app
              </p>
            </div>

            {/* separator */}
            <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

            {/* Custom Categories Section */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Custom Categories
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Customize your income and expense categories. These will be used in the income and expense forms.
              </p>
              
              <CategoryManager
                title="Income"
                categories={customIncomeCategories.length > 0 ? customIncomeCategories : incomeCategories}
                defaultCategories={incomeCategories}
                onUpdate={updateCustomIncomeCategories}
                setMessage={setMessage}
                // Pass the setter for unsaved changes
                setUnsavedChanges={setUnsavedIncomeCategories}
              />
              
              <CategoryManager
                title="Expense"
                categories={customExpenseCategories.length > 0 ? customExpenseCategories : expenseCategories}
                defaultCategories={expenseCategories}
                onUpdate={updateCustomExpenseCategories}
                setMessage={setMessage}
                // Pass the setter for unsaved changes
                setUnsavedChanges={setUnsavedExpenseCategories}
              />
            </div>

            {/* separator */}
            <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {hasChanges && (
                <motion.button
                  type="button"
                  onClick={handleRevertChanges}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-slate-600 dark:text-slate-300 font-semibold border-2 border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-300 ease-in-out text-sm min-h-[44px]"
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
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[44px]"
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
                      />
                    )}
                  </>
                )}
              </motion.button>
            </div>

            {/* separator */}
            <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

            {/* Theme Selection */}
            <div className="space-y-3">
              <label
                htmlFor="theme"
                className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                Theme
              </label>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Dark Mode
                </span>
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-pressed={theme === "dark"}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    theme === "dark" ? "bg-indigo-600" : "bg-gray-200"
                  }`}
                >
                  <span className="sr-only">Toggle dark mode</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      theme === "dark" ? "translate-x-5" : "translate-x-0"
                    } flex items-center justify-center`}
                  >
                    {theme === "dark" ? (
                      <Moon className="h-3.5 w-3.5 text-slate-800" />
                    ) : (
                      <Sun className="h-3.5 w-3.5 text-indigo-600" />
                    )}
                  </span>
                </button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Switch between light and dark themes.
              </p>
            </div>

            {/* separator */}
            <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

            {/* Danger Zone */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                Danger Zone
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Permanently clear your financial records. This action is
                  irreversible.
                </p>
                <motion.button
                  type="button"
                  onClick={() => setShowClearRecordsModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-100 text-amber-700 font-semibold border border-amber-200 rounded-lg hover:bg-amber-200 hover:text-amber-800 hover:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-300 ease-in-out text-sm min-h-[44px]"
                >
                  <Trash2 className="w-5 h-5" />
                  Clear Records
                </motion.button>
              </div>
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-4"></div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Once you delete your account, there is no going back. Please be
                certain.
              </p>
              <motion.button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-100 text-red-700 font-semibold border border-red-200 rounded-lg hover:bg-red-200 hover:text-red-800 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 ease-in-out text-sm min-h-[44px]"
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

Profile.displayName = "Profile";
export default Profile;