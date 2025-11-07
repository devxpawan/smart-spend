import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Trash2, RefreshCw } from "lucide-react";
import { createPortal } from "react-dom";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  deleteInput: string;
  setDeleteInput: (value: string) => void;
  deleting: boolean;
}

const LoadingSpinner: React.FC<{ size?: "sm" | "md" }> = ({
  size = "md",
}) => (
  <RefreshCw
    className={`animate-spin ${size === "sm" ? "w-4 h-4" : "w-5 h-5"}`}
  />
);

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
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

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3
                id="delete-modal-title"
                className="text-base sm:text-lg font-semibold text-red-600 dark:text-red-400 flex items-center"
              >
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="hidden sm:inline">
                  Confirm Account Deletion
                </span>
                <span className="sm:hidden">Delete Account</span>
              </h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 rounded p-1"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3">
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-700 rounded-lg p-2.5 sm:p-3">
                <p className="text-xs sm:text-sm text-red-800 dark:text-red-200 font-medium mb-1">
                  ⚠️ This action cannot be undone
                </p>
                <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">
                  This will permanently delete your account and all associated
                  data including:
                </p>
                <ul className="text-xs sm:text-sm text-red-700 dark:text-red-300 mt-1.5 sm:mt-2 ml-3 sm:ml-4 list-disc">
                  <li>All expenses and financial records</li>
                  <li>Bills and warranties</li>
                  <li>Profile information and preferences</li>
                </ul>
              </div>

              <div>
                <label
                  htmlFor="delete-confirmation"
                  className="block text-xs sm:text-sm text-slate-700 dark:text-gray-300 mb-1.5 sm:mb-2"
                >
                  To confirm, please type{" "}
                  <code className="bg-slate-100 dark:bg-gray-700 px-1 py-0.5 rounded text-red-600 dark:text-red-400 font-mono text-xs">
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
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-gray-600 dark:text-black rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-xs sm:text-sm"
                  aria-describedby="delete-help"
                />
                <p id="delete-help" className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                  This confirmation helps prevent accidental deletions
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors text-sm min-h-[44px] sm:min-h-0 mr-2"
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
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default DeleteConfirmationModal;
