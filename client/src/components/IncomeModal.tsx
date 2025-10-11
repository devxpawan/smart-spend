import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  Receipt,
  TrendingUp,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../contexts/auth-exports";
import IncomeFormData from "../types/IncomeFormData";
import BankAccountInterface from "../types/BankAccountInterface";
import CustomSelect from "./CustomSelect";
import { incomeCategories } from "../lib/incomeCategories";
import { getBankAccounts } from "../api/bankAccounts";


interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: IncomeFormData) => void;
  initialData?: IncomeFormData;
}

interface FormErrors {
  description?: string;
  amount?: string;
  date?: string;
  category?: string;
  notes?: string;
  bankAccount?: string;
}

const IncomeModal: React.FC<IncomeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<IncomeFormData>({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "",
    notes: "",
    bankAccount: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [bankAccounts, setBankAccounts] = useState<BankAccountInterface[]>([]);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(true);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

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
        bankAccount: initialData.bankAccount || "",
      });
    } else {
      setFormData({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        category: "",
        notes: "",
        bankAccount: "",
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  useEffect(() => {
    const fetchBankAccounts = async () => {
      try {
        setBankAccountsLoading(true);
        const accounts = await getBankAccounts();
        setBankAccounts(accounts);
      } catch (error) {
        console.error("Failed to fetch bank accounts:", error);
      } finally {
        setBankAccountsLoading(false);
      }
    };

    if (isOpen) {
      fetchBankAccounts();
    }
  }, [isOpen]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (!/[a-zA-Z]/.test(formData.description)) {
      newErrors.description = "Description must contain at least one alphabetic character";
    }

    if (!formData.amount || parseFloat(formData.amount as string) <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
    } else {
      const incomeDate = new Date(formData.date);
      const today = new Date();
      if (isNaN(incomeDate.getTime())) {
        newErrors.date = "Please enter a valid date";
      } else if (incomeDate > today) {
        newErrors.date = "Income date cannot be in the future";
      }
    }

    if (!formData.category) {
      newErrors.category = "Please select a category";
    }

    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = "Notes must be less than 500 characters";
    }

    if (!formData.bankAccount) {
      newErrors.bankAccount = "Please select a bank account";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, bankAccounts]);

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
        bankAccount: formData.bankAccount || undefined,
      });
      onClose();
    } catch (err) {
      console.error("Error submitting income:", err);
      setErrors({
        description: "Failed to submit income. Please try again.",
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

      // Focus first input after animation, but not on mobile
      setTimeout(() => {
        if (firstInputRef.current && window.innerWidth >= 768) {
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2"
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
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 w-full max-w-lg sm:max-w-2xl max-h-[90vh] overflow-hidden mx-auto"
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-700 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h2
                id="modal-title"
                className="text-xl font-bold text-slate-800 dark:text-white"
              >
                {initialData ? "Edit Income" : "Add New Income"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-600/50 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Income Description *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Receipt className="h-5 w-5 text-slate-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="text"
                      name="description"
                      id="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="e.g., Salary, Freelance Payment"
                      className={`form-input block w-full pl-8 pr-2 py-2 sm:pl-10 sm:pr-3 sm:py-3 border rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent text-sm transition duration-150 ease-in-out ${
                        errors.description
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 dark:border-gray-600 focus:ring-sky-500"
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
                      className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400"
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
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Amount *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-slate-400 dark:text-gray-500" />
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
                      className={`form-input block w-full pl-8 pr-2 py-2 sm:pl-10 sm:pr-3 sm:py-3 border rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent text-sm transition duration-150 ease-in-out ${
                        errors.amount
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 dark:border-gray-600 focus:ring-sky-500"
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
                      className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.amount}</span>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Currency: {user?.preferences?.currency || "USD"}
                  </p>
                </div>

                {/* Date */}
                <div>
                  <label
                    htmlFor="date"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Date *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-slate-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="date"
                      name="date"
                      id="date"
                      value={formData.date}
                      onChange={handleChange}
                      max={new Date().toISOString().split("T")[0]}
                      className={`form-input block w-full pl-10 pr-3 py-2 sm:py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent text-sm transition duration-150 ease-in-out bg-white dark:bg-gray-700 text-slate-900 dark:text-white ${
                        errors.date
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 dark:border-gray-600 focus:ring-sky-500"
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
                      className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.date}</span>
                    </div>
                  )}
                </div>

                {/* Category */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="category"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Category *
                  </label>
                  <CustomSelect
                    options={incomeCategories.map((cat) => ({
                      value: cat,
                      label: cat,
                    }))}
                    value={formData.category}
                    onChange={(value) =>
                      handleChange({
                        target: { name: "category", value },
                      } as React.ChangeEvent<HTMLSelectElement>)
                    }
                    className={`${
                      errors.category
                        ? "border-red-300 focus:ring-red-500"
                        : "border-slate-300 dark:border-gray-600 focus:ring-sky-500"
                    }`}
                    openDirection="top"
                    isSearchable={true}
                    placeholder="Select a category"
                  />
                  {errors.category && (
                    <div
                      id="category-error"
                      className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.category}</span>
                    </div>
                  )}
                </div>

                {/* Bank Account */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="bankAccount"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Bank Account *
                  </label>
                  <CustomSelect
                    options={[
                      { value: "", label: "Select a bank account" },
                      ...bankAccounts.map((account) => ({
                        value: account._id,
                        label: `${account.accountName} (${account.bankName})`,
                      })),
                    ]}
                    value={formData.bankAccount || ""}
                    onChange={(value) =>
                      handleChange({
                        target: { name: "bankAccount", value },
                      } as React.ChangeEvent<HTMLSelectElement>)
                    }
                    className={`${
                      errors.bankAccount
                        ? "border-red-300 focus:ring-red-500"
                        : "border-slate-300 dark:border-gray-600 focus:ring-sky-500"
                    }`}
                    openDirection="top"
                    isSearchable={true}
                    disabled={bankAccountsLoading}
                    placeholder="Select a bank account"
                  />
                  {bankAccountsLoading && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Loading bank accounts...</p>
                  )}
                  {errors.bankAccount && (
                    <div
                      id="bankAccount-error"
                      className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.bankAccount}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="notes"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Notes (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <FileText className="h-5 w-5 text-slate-400 dark:text-gray-500" />
                    </div>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      maxLength={500}
                      className={`form-textarea block w-full pl-8 pr-2 py-2 sm:pl-10 sm:pr-3 sm:py-3 border rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent text-sm transition duration-150 ease-in-out resize-none ${
                        errors.notes
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 dark:border-gray-600 focus:ring-sky-500"
                      }`}
                      placeholder="Additional details about this income..."
                      aria-invalid={errors.notes ? "true" : "false"}
                      aria-describedby={
                        errors.notes ? "notes-error" : "notes-help"
                      }
                    />
                  </div>
                  {errors.notes && (
                    <div
                      id="notes-error"
                      className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.notes}</span>
                    </div>
                  )}
                  <p
                    id="notes-help"
                    className="mt-1 text-xs text-slate-500 dark:text-slate-400"
                  >
                    {formData.notes?.length || 0}/500 characters
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors duration-150 ease-in-out shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-sky-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-sky-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-150 ease-in-out shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed text-sm transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      {initialData ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {initialData ? "Update Income" : "Create Income"}
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

export default IncomeModal;
