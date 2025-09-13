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
          iconContainerClasses: "bg-red-500/10",
          iconClasses: "text-red-400",
          confirmButtonClasses:
            "bg-red-600 hover:bg-red-700 focus:ring-red-500",
        };
      case "warning":
        return {
          Icon: AlertTriangle,
          iconContainerClasses: "bg-amber-500/10",
          iconClasses: "text-amber-400",
          confirmButtonClasses:
            "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
        };
      case "info":
      default:
        return {
          Icon: Check,
          iconContainerClasses: "bg-blue-500/10",
          iconClasses: "text-blue-400",
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
            className="bg-slate-800/90 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-sm border border-white/10 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div
                  className={`mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full sm:mx-0 ${iconContainerClasses}`}
                >
                  <Icon className={`h-5 w-5 ${iconClasses}`} aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h2
                    id="confirm-modal-title"
                    className="text-lg font-bold text-slate-100"
                  >
                    {title}
                  </h2>
                  <p
                    id="confirm-modal-description"
                    className="text-sm text-slate-400 mt-1"
                  >
                    {message}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  ref={cancelButtonRef}
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-semibold text-slate-300 bg-white/5 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white/50 transition-colors duration-150 disabled:opacity-50"
                  disabled={loading}
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className={`inline-flex items-center justify-center px-4 py-2 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 transition-colors duration-150 text-sm disabled:opacity-60 ${confirmButtonClasses}`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    confirmText
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