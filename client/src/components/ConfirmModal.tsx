// components/ConfirmModal.tsx
import React, { useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, Trash2 } from "lucide-react";
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
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const getVariantStyles = useCallback(() => {
    switch (variant) {
      case "danger":
        return {
          Icon: Trash2,
          iconContainerClasses: "bg-red-100 dark:bg-red-900",
          iconClasses: "text-red-600 dark:text-red-400",
          confirmButtonClasses:
            "bg-red-600 hover:bg-red-700 focus:ring-red-500",
        };
      case "warning":
        return {
          Icon: AlertTriangle,
          iconContainerClasses: "bg-amber-100 dark:bg-amber-900",
          iconClasses: "text-amber-600 dark:text-amber-400",
          confirmButtonClasses:
            "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
        };
      case "info":
      default:
        return {
          Icon: Check,
          iconContainerClasses: "bg-blue-100 dark:bg-blue-900",
          iconClasses: "text-blue-600 dark:text-blue-400",
          confirmButtonClasses:
            "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
        };
    }
  }, [variant]);

  const { Icon, iconContainerClasses, iconClasses, confirmButtonClasses } =
    getVariantStyles();

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (!modalRef.current) return;
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.key === "Tab") {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  }, []);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    },
    [onCancel, loading]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", trapFocus);
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      setTimeout(() => cancelButtonRef.current?.focus(), 100);
    } else {
      document.removeEventListener("keydown", trapFocus);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="confirm-modal-title"
          aria-describedby="confirm-modal-description"
          onClick={!loading ? onCancel : undefined}
        >
          <motion.div
            className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 text-center">
              <div
                className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${iconContainerClasses}`}
              >
                <Icon className={`h-6 w-6 ${iconClasses}`} aria-hidden="true" />
              </div>
              <div className="mt-5">
                <h2
                  id="confirm-modal-title"
                  className="text-xl font-semibold text-slate-50"
                >
                  {title}
                </h2>
                <div className="mt-2">
                  <p
                    id="confirm-modal-description"
                    className="text-sm text-slate-400"
                  >
                    {message}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/50 px-6 py-4 grid grid-cols-2 gap-4">
              <button
                ref={cancelButtonRef}
                onClick={onCancel}
                className="w-full px-4 py-2.5 text-sm font-semibold text-slate-200 bg-slate-700/50 rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-white/50 transition-colors duration-150 disabled:opacity-50"
                disabled={loading}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`w-full inline-flex items-center justify-center px-4 py-2.5 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors duration-150 text-sm disabled:opacity-60 ${confirmButtonClasses}`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-3"></div>
                    Processing...
                  </>
                ) : (
                  confirmText
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

export default ConfirmModal;