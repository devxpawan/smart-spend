// components/LogoutConfirmModal.tsx
import React, { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, X } from "lucide-react";
import { createPortal } from "react-dom";

interface LogoutConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  open,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

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
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    },
    [onCancel, loading]
  );

  // Setup event listeners
  useEffect(() => {
    if (open) {
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
  }, [open, trapFocus, handleEscape]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="logout-modal-title"
          aria-describedby="logout-modal-description"
          onClick={!loading ? onCancel : undefined}
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
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/80 via-orange-50/60 to-amber-50/80 rounded-2xl"></div>

            {/* Close Button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 z-20 text-slate-400 hover:text-slate-600 transition-all duration-200 p-2 rounded-full hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              aria-label="Close dialog"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content Container */}
            <div className="relative z-10 p-6">
              {/* Icon and Title */}
              <div className="text-center mb-5">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mb-3 shadow-lg">
                  <LogOut className="w-6 h-6 text-white" />
                </div>
                <h2
                  id="logout-modal-title"
                  className="text-xl font-bold text-slate-800 mb-2"
                >
                  Sign Out
                </h2>
                <div className="w-10 h-0.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-full mx-auto"></div>
              </div>

              {/* Message */}
              <div className="text-center mb-6">
                <p
                  id="logout-modal-description"
                  className="text-slate-600 leading-relaxed"
                >
                  Are you sure you want to sign out of your account?
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  You'll need to sign in again to access your dashboard.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  ref={cancelButtonRef}
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg hover:bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  Stay Signed In
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-lg hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 ease-in-out shadow-lg hover:shadow-xl text-sm transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
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

export default LogoutConfirmModal;
