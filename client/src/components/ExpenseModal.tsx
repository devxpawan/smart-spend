import React, { useState, useEffect, useRef, useCallback } from "react";
import ExpenseFormData from "../types/ExpenseFormData";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  X,
  AlertCircle,
  DollarSign,
  Calendar,
  Receipt,
  Tag,
  FileText,
  TrendingDown,
} from "lucide-react";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => void;
  initialData?: ExpenseFormData;
}

interface FormErrors {
  description?: string;
  amount?: string;
  date?: string;
  category?: string;
  notes?: string;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<ExpenseFormData>({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "Groceries",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    "Groceries",
    "Dining Out",
    "Transportation",
    "Fuel",
    "Public Transit",
    "Shopping",
    "Entertainment",
    "Travel",
    "Health & Fitness",
    "Subscriptions",
    "Gifts & Donations",
    "Education",
    "Personal Care",
    "Utilities",
    "Rent/Housing",
    "Insurance",
    "Miscellaneous",
  ];

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData({
        description: initialData.description,
        amount: initialData.amount,
        date: initialData.date
          ? new Date(initialData.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        category: initialData.category,
        notes: initialData.notes || "",
      });
    } else {
      setFormData({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        category: "Groceries",
        notes: "",
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.amount || parseFloat(formData.amount as string) <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
    } else {
      const expenseDate = new Date(formData.date);
      const today = new Date();
      if (isNaN(expenseDate.getTime())) {
        newErrors.date = "Please enter a valid date";
      } else if (expenseDate > today) {
        newErrors.date = "Expense date cannot be in the future";
      }
    }

    if (!formData.category) {
      newErrors.category = "Please select a category";
    }

    if ((formData.notes && formData.notes?.length) || 0) {
      newErrors.notes = "Notes must be less than 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field-specific error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        ...formData,
        amount: parseFloat(formData.amount as string),
      });
      onClose();
    } catch (err) {
      console.error("Error submitting expense:", err);
      setErrors({
        description: "Failed to submit expense. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

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
        onClose();
      }
    },
    [onClose]
  );

  // Setup event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", trapFocus);
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";

      // Focus first input after animation
      setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        }
      }, 100);
    }

    return () => {
      document.removeEventListener("keydown", trapFocus);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, trapFocus, handleEscape]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        aria-modal="true"
        role="dialog"
        aria-labelledby="modal-title"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden"
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
              <h2
                id="modal-title"
                className="text-xl font-bold text-slate-800"
              >
                {initialData ? "Edit Expense" : "Add New Expense"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Description */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="description"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Expense Description *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Receipt className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      name="description"
                      id="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="e.g., Lunch at restaurant, Gas for car"
                      className={`form-input block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition duration-150 ease-in-out ${
                        errors.description
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 focus:ring-green-500"
                      }`}
                      required
                      ref={firstInputRef}
                      aria-invalid={errors.description ? "true" : "false"}
                      aria-describedby={
                        errors.description
                          ? "description-error"
                          : undefined
                      }
                    />
                  </div>
                  {errors.description && (
                    <div
                      id="description-error"
                      className="mt-1 flex items-center space-x-1 text-red-600"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.description}</span>
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label
                    htmlFor="amount"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Amount *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="number"
                      name="amount"
                      id="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className={`form-input block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition duration-150 ease-in-out ${
                        errors.amount
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 focus:ring-green-500"
                      }`}
                      required
                      aria-invalid={errors.amount ? "true" : "false"}
                      aria-describedby={
                        errors.amount ? "amount-error" : undefined
                      }
                    />
                  </div>
                  {errors.amount && (
                    <div
                      id="amount-error"
                      className="mt-1 flex items-center space-x-1 text-red-600"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.amount}</span>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    Currency: {user?.preferences?.currency || "USD"}
                  </p>
                </div>

                {/* Date */}
                <div>
                  <label
                    htmlFor="date"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Date *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="date"
                      name="date"
                      id="date"
                      value={formData.date}
                      onChange={handleChange}
                      max={new Date().toISOString().split("T")[0]}
                      className={`form-input block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition duration-150 ease-in-out ${
                        errors.date
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 focus:ring-green-500"
                      }`}
                      required
                      aria-invalid={errors.date ? "true" : "false"}
                      aria-describedby={
                        errors.date ? "date-error" : undefined
                      }
                    />
                  </div>
                  {errors.date && (
                    <div
                      id="date-error"
                      className="mt-1 flex items-center space-x-1 text-red-600"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.date}</span>
                    </div>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Category *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="h-5 w-5 text-slate-400" />
                    </div>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className={`form-select block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition duration-150 ease-in-out ${
                        errors.category
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 focus:ring-green-500"
                      }`}
                      required
                      aria-invalid={errors.category ? "true" : "false"}
                      aria-describedby={
                        errors.category ? "category-error" : undefined
                      }
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.category && (
                    <div
                      id="category-error"
                      className="mt-1 flex items-center space-x-1 text-red-600"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.category}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label
                    htmlFor="notes"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Notes (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      maxLength={500}
                      className={`form-textarea block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition duration-150 ease-in-out resize-none ${
                        errors.notes
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 focus:ring-green-500"
                      }`}
                      placeholder="Additional details about this expense..."
                      aria-invalid={errors.notes ? "true" : "false"}
                      aria-describedby={
                        errors.notes ? "notes-error" : "notes-help"
                      }
                    />
                  </div>
                  {errors.notes && (
                    <div
                      id="notes-error"
                      className="mt-1 flex items-center space-x-1 text-red-600"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.notes}</span>
                    </div>
                  )}
                  <p
                    id="notes-help"
                    className="mt-1 text-xs text-slate-500"
                  >
                    {formData.notes?.length || 0}/500 characters
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150 ease-in-out shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-150 ease-in-out shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed text-sm transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      {initialData ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 mr-2" />
                      {initialData ? "Update Expense" : "Create Expense"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default ExpenseModal;
