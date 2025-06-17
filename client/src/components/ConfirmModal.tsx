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
          icon: <AlertTriangle className="w-6 h-6 mt-1 shrink-0" />,
          iconColor: "text-red-500",
          confirmButton: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
          headerBg: "from-red-50 to-rose-50",
          borderColor: "border-red-200",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-6 h-6 mt-1 shrink-0" />,
          iconColor: "text-amber-500",
          confirmButton: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
          headerBg: "from-amber-50 to-yellow-50",
          borderColor: "border-amber-200",
        };
      case "info":
        return {
          icon: <AlertTriangle className="w-6 h-6 mt-1 shrink-0" />,
          iconColor: "text-blue-500",
          confirmButton: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
          headerBg: "from-blue-50 to-indigo-50",
          borderColor: "border-blue-200",
        };
      default:
        return {
          icon: <AlertTriangle className="w-6 h-6 mt-1 shrink-0" />,
          iconColor: "text-red-500",
          confirmButton: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
          headerBg: "from-red-50 to-rose-50",
          borderColor: "border-red-200",
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
    const lastFocusableElement = focusableElements[focusableElements.length - 1] as HTMLElement;

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
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
  }, [onCancel]);

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="confirm-modal-title"
          aria-describedby="confirm-modal-description"
          onClick={onCancel}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${styles.headerBg} border-b ${styles.borderColor} p-6`}>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className={styles.iconColor}>
                    {styles.icon}
                  </div>
                  <div>
                    <h2 
                      id="confirm-modal-title"
                      className="text-xl font-bold text-slate-800"
                    >
                      {title}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={onCancel}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  aria-label="Close dialog"
                  disabled={loading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p 
                id="confirm-modal-description"
                className="text-slate-600 leading-relaxed mb-6"
              >
                {message}
              </p>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={onCancel}
                  className="px-6 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-150 ease-in-out shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  ref={cancelButtonRef}
                  disabled={loading}
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className={`inline-flex items-center justify-center px-6 py-3 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150 ease-in-out shadow-lg hover:shadow-xl text-sm transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none ${styles.confirmButton}`}
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
