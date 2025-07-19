// components/ConfirmModal.tsx
import React, { useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Trash2, Check } from "lucide-react";
import { createPortal } from "react-dom";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = "Are you sure?",
  message,
  onConfirm,
  onCancel,
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Get variant-specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: <Trash2 className="w-8 h-8" />,
          iconBg: "bg-gradient-to-br from-red-500 to-red-600",
          confirmButton:
            "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500",
          backgroundGradient:
            "from-red-50/80 via-rose-50/60 to-pink-50/80",
          accentLine: "from-red-500 to-red-600",
          focusRing: "focus:ring-red-500",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-8 h-8" />,
          iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
          confirmButton:
            "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 focus:ring-amber-500",
          backgroundGradient:
            "from-amber-50/80 via-orange-50/60 to-yellow-50/80",
          accentLine: "from-amber-500 to-orange-600",
          focusRing: "focus:ring-amber-500",
        };
      case "info":
        return {
          icon: <Check className="w-8 h-8" />,
          iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600",
          confirmButton:
            "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500",
          backgroundGradient:
            "from-blue-50/80 via-indigo-50/60 to-purple-50/80",
          accentLine: "from-blue-500 to-indigo-600",
          focusRing: "focus:ring-blue-500",
        };
      default:
        return {
          icon: <Trash2 className="w-8 h-8" />,
          iconBg: "bg-gradient-to-br from-red-500 to-red-600",
          confirmButton:
            "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500",
          backgroundGradient:
            "from-red-50/80 via-rose-50/60 to-pink-50/80",
          accentLine: "from-red-500 to-red-600",
          focusRing: "focus:ring-red-500",
        };
    }
  };

  const styles = getVariantStyles();

  // Focus trap for accessibility
  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (!modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusableElement = focusableElements[0] as HTMLElement;
    const lastFocusableElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    if (e.key === "Tab") {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusableElement) {
          lastFocusableElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusableElement) {
          firstFocusableElement.focus();
          e.preventDefault();
        }
      }
    }
  }, []);

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    },
    [onCancel]
  );

  // Setup event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", trapFocus);
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";

      // Focus cancel button after animation
      setTimeout(() => {
        if (cancelButtonRef.current) {
          cancelButtonRef.current.focus();
        }
      }, 100);
    }

    return () => {
      document.removeEventListener("keydown", trapFocus);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, trapFocus, handleEscape]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="confirm-modal-title"
          aria-describedby="confirm-modal-description"
          onClick={onCancel}
        >
          <motion.div
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md border border-white/20 overflow-hidden relative"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient Background */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${styles.backgroundGradient} rounded-2xl`}
            ></div>

            {/* Close Button */}
            <button
              onClick={onCancel}
              className={`absolute top-4 right-4 z-20 text-slate-400 hover:text-slate-600 transition-all duration-200 p-2 rounded-full hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.focusRing}`}
              aria-label="Close dialog"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content Container */}
            <div className="relative z-10 p-6">
              {/* Icon and Title */}
              <div className="text-center mb-5">
                <div
                  className={`mx-auto w-12 h-12 ${styles.iconBg} rounded-full flex items-center justify-center mb-3 shadow-lg text-white`}
                >
                  {styles.icon}
                </div>
                <h2
                  id="confirm-modal-title"
                  className="text-xl font-bold text-slate-800 mb-2"
                >
                  {title}
                </h2>
                <div
                  className={`w-10 h-0.5 bg-gradient-to-r ${styles.accentLine} rounded-full mx-auto`}
                ></div>
              </div>

              {/* Message */}
              <div className="text-center mb-6">
                <p
                  id="confirm-modal-description"
                  className="text-slate-600 leading-relaxed"
                >
                  {message}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg hover:bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  ref={cancelButtonRef}
                  disabled={loading}
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className={`flex-1 inline-flex items-center justify-center px-4 py-2.5 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ease-in-out shadow-lg hover:shadow-xl text-sm transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none ${styles.confirmButton}`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      {variant === "danger" ? (
                        <Trash2 className="w-4 h-4 mr-2" />
                      ) : variant === "warning" ? (
                        <AlertTriangle className="w-4 h-4 mr-2" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      {confirmText}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ConfirmModal;
