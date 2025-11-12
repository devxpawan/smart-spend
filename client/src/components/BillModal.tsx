import React, { useState, useEffect, useRef, useCallback } from "react";
import BillFormData from "../types/BillFormData";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useAuth } from "../contexts/auth-exports";
import CustomSelect from "./CustomSelect";
import {
  X,
  AlertCircle,
  Calendar,
  Receipt,
} from "lucide-react";

import { getBankAccounts } from "../api/bankAccounts";
import BankAccountInterface from "../types/BankAccountInterface";

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BillFormData & { _id?: string }) => void;
  initialData?: BillFormData & { _id?: string };
}

interface FormErrors {
  name?: string;
  amount?: string;
  dueDate?: string;
  reminderDate?: string;
  category?: string;
  duplicateName?: string;
  bankAccount?: string;
}

const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<BillFormData>({
    name: "",
    amount: "",
    dueDate: new Date().toISOString().split("T")[0],
    reminderDate: new Date().toISOString().split("T")[0],
    category: "",
    bankAccount: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isDuplicateCheckComplete, setIsDuplicateCheckComplete] =
    useState(false);
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccountInterface[]>([]);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(true);

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

  // Function to check for duplicate bill names
  const checkForDuplicateName = useCallback(
    async (name: string) => {
      if (!user || !name.trim()) return false;

      setIsCheckingDuplicate(true);
      try {
        const response = await fetch("/api/bills/check-name", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            userId: user.id,
            billId: initialData?._id,
          }),
        });

        const data = await response.json();
        return data.error === "Duplicate bill name";
      } catch (error) {
        console.error("Error checking for duplicate bill name:", error);
        return false;
      } finally {
        setIsCheckingDuplicate(false);
      }
    },
    [user, initialData?._id]
  );

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    "Rent / Mortgage",
    "Electricity",
    "Water",
    "Internet",
    "Mobile Phone",
    "Streaming Services",
    "Credit Card Payments",
    "Loan Payments",
    "Insurance (Health/Auto/Home)",
    "Gym Membership",
    "School Tuition / Fees",
    "Cloud / SaaS Services",
    "Taxes",
    "Security / Alarm Services",
    "Other Utilities",
  ];

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        amount: initialData.amount,
        dueDate: initialData.dueDate
          ? new Date(initialData.dueDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        reminderDate: initialData.reminderDate
          ? new Date(initialData.reminderDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        category: initialData.category,
        isPaid: initialData.isPaid,
        bankAccount: initialData.bankAccount || "",
      });
    } else {
      setFormData({
        name: "",
        amount: "",
        dueDate: new Date().toISOString().split("T")[0],
        reminderDate: new Date().toISOString().split("T")[0],
        category: "",
        bankAccount: "",
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Form validation
  const validateForm = useCallback(async (): Promise<boolean> => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Bill name is required";
    } else if (!initialData) {
      // Only check for duplicates when creating a new bill, not when editing
      const isDuplicate = await checkForDuplicateName(formData.name);
      if (isDuplicate) {
        newErrors.duplicateName = "A bill with this name already exists";
      }
    }

    // Validate that the bill name contains at least one alphabetic character and no symbols
    const nameRegex = /(?=.*[a-zA-Z]).*/;
    if (!nameRegex.test(formData.name)) {
      newErrors.name = "Bill name must contain at least one alphabetic character";
    }

    if (!formData.amount || parseFloat(formData.amount as string) <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }

    if (!formData.dueDate) {
      newErrors.dueDate = "Due date is required";
    } else {
      const dueDate = new Date(formData.dueDate);
      if (isNaN(dueDate.getTime())) {
        newErrors.dueDate = "Please enter a valid date";
      }
    }

    if (!formData.reminderDate) {
      newErrors.reminderDate = "Reminder date is required";
    } else {
      const reminderDate = new Date(formData.reminderDate);
      if (isNaN(reminderDate.getTime())) {
        newErrors.reminderDate = "Please enter a valid date";
      }
    }

    if (!formData.category) {
      newErrors.category = "Please select a category";
    }

    if (!formData.bankAccount) {
      newErrors.bankAccount = "Please select a bank account";
    } else {
      const selectedAccount = bankAccounts.find(acc => acc._id === formData.bankAccount);
      const amount = parseFloat(formData.amount as string) || 0;
      if (selectedAccount && selectedAccount.currentBalance < amount) {
        newErrors.bankAccount = "Insufficient balance in the selected account.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, checkForDuplicateName, initialData, bankAccounts]);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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

  // Debounced duplicate name check
  useEffect(() => {
    if (!initialData && formData.name.trim()) {
      setIsDuplicateCheckComplete(false);
      const timer = setTimeout(async () => {
        const isDuplicate = await checkForDuplicateName(formData.name);
        if (isDuplicate) {
          setErrors((prev) => ({
            ...prev,
            duplicateName: "A bill with this name already exists",
          }));
        } else {
          setErrors((prev) => ({
            ...prev,
            duplicateName: undefined,
          }));
        }
        setIsDuplicateCheckComplete(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [formData.name, checkForDuplicateName, initialData]);



  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    try {
      setLoading(true);
      const submissionData = {
        ...formData,
        amount: parseFloat(formData.amount as string),
        _id: initialData?._id,
      };
      if (!initialData) {
        submissionData.isPaid = markAsPaid;
      }
      await onSubmit(submissionData);
      console.log("Bill submitted successfully");
      console.log(submissionData);
      onClose();
    } catch (err: unknown) {
      console.error("Error submitting bill:", err);
      if (err instanceof Error && err.message.includes("Duplicate bill name")) {
        setErrors({
          duplicateName: "A bill with this name already exists",
        });
      } else {
        setErrors({ name: "Failed to submit bill. Please try again." });
      }
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

          // If editing, check for duplicate name when opening
          if (initialData && formData.name.trim()) {
            checkForDuplicateName(formData.name);
          }
        }
      }, 100);
    }

    return () => {
      document.removeEventListener("keydown", trapFocus);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, trapFocus, handleEscape, formData.name, checkForDuplicateName, initialData]);

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
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Receipt className="w-5 h-5 text-white dark:text-gray-300" />
              </div>
              <h2
                id="modal-title"
                className="text-xl font-bold text-slate-800 dark:text-white"
              >
                {initialData ? "Edit Bill" : "Add New Bill"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-600/50 focus:outline-none focus:ring-2 focus:ring-amber-500"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bill Name */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Bill Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Receipt className="h-5 w-5 text-slate-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g., Monthly Electricity Bill"
                      className={`form-input block w-full pl-8 pr-2 py-2 sm:pl-10 sm:pr-3 sm:py-3 border rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent text-sm transition duration-150 ease-in-out ${errors.name
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 dark:border-gray-600 focus:ring-amber-500"
                        }`}
                      required
                      ref={firstInputRef}
                      aria-invalid={errors.name ? "true" : "false"}
                      aria-describedby={
                        errors.name ? "name-error" : undefined
                      }
                    />
                  </div>
                  {errors.name && (
                    <div
                      id="name-error"
                      className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.name}</span>
                    </div>
                  )}
                  {errors.duplicateName && (
                    <div
                      id="duplicate-name-error"
                      className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">
                        {errors.duplicateName}
                      </span>
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
                      <p className="h-6 w-5 text-slate-400 dark:text-gray-500">Rs.</p>
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
                      className={`form-input block w-full pl-8 pr-2 py-2 sm:pl-10 sm:pr-3 sm:py-3 border rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent text-sm transition duration-150 ease-in-out ${errors.amount
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 dark:border-gray-600 focus:ring-amber-500"
                        }`}
                      required
                      aria-invalid={errors.amount ? "true" : "false"}
                      aria-describedby={
                        errors.amount ? "amount-error" : undefined
                      }
                      disabled={!!errors.duplicateName}
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

                {/* Due Date */}
                <div>
                  <label
                    htmlFor="dueDate"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Due Date *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-slate-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="date"
                      name="dueDate"
                      id="dueDate"
                      value={formData.dueDate}
                      onChange={handleChange}
                      className={`form-input block w-full pl-10 pr-3 py-2 sm:py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent text-sm transition duration-150 ease-in-out bg-white dark:bg-gray-700 text-slate-900 dark:text-white ${errors.dueDate
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 dark:border-gray-600 focus:ring-amber-500"
                        }`}
                      required
                      aria-invalid={errors.dueDate ? "true" : "false"}
                      aria-describedby={
                        errors.dueDate ? "dueDate-error" : undefined
                      }
                      disabled={!!errors.duplicateName}
                    />
                  </div>
                  {errors.dueDate && (
                    <div
                      id="dueDate-error"
                      className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.dueDate}</span>
                    </div>
                  )}
                </div>

                {/* Reminder date */}
                <div>
                  <label
                    htmlFor="reminderDate"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Reminder Date *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-slate-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="date"
                      name="reminderDate"
                      id="reminderDate"
                      value={formData.reminderDate}
                      onChange={handleChange}
                      className={`form-input block w-full pl-10 pr-3 py-2 sm:py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent text-sm transition duration-150 ease-in-out bg-white dark:bg-gray-700 text-slate-900 dark:text-white ${errors.dueDate
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 dark:border-gray-600 focus:ring-amber-500"
                        }`}
                      required
                      aria-invalid={errors.reminderDate ? "true" : "false"}
                      aria-describedby={
                        errors.reminderDate ? "reminderDate-error" : undefined
                      }
                      disabled={!!errors.duplicateName}
                    />
                  </div>
                  {errors.reminderDate && (
                    <div
                      id="dueDate-error"
                      className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.reminderDate}</span>
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
                    options={categories.map((cat) => ({
                      value: cat,
                      label: cat,
                    }))}
                    value={formData.category}
                    onChange={(value) =>
                      handleChange({
                        target: { name: "category", value },
                      } as React.ChangeEvent<HTMLSelectElement>)
                    }
                    className={`${errors.category
                        ? "border-red-300 focus:ring-red-500"
                        : "border-slate-300 dark:border-gray-600 focus:ring-amber-500"
                      }`}
                    disabled={!!errors.duplicateName}
                    openDirection="top"
                    isSearchable={true}
                    placeholder="Select a category"
                  />
                  {
                    errors.category && (
                      <div
                        id="category-error"
                        className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{errors.category}</span>
                      </div>
                    )
                  }
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
                    options={bankAccounts.map((account) => {
                      const amount = parseFloat(formData.amount as string) || 0;
                      const disabled = account.currentBalance < amount;
                      return {
                        value: account._id,
                        label: `${account.accountName} (${account.bankName}) - Balance: ${account.currentBalance}`,
                        disabled,
                      };
                    })}
                    value={formData.bankAccount || ""}
                    onChange={(value) =>
                      handleChange({
                        target: { name: "bankAccount", value },
                      } as React.ChangeEvent<HTMLSelectElement>)
                    }
                    className={`${errors.bankAccount
                      ? "border-red-300 focus:ring-red-500"
                      : "border-slate-300 dark:border-gray-600 focus:ring-amber-500"
                      }`}
                    openDirection="top"
                    isSearchable={true}
                    disabled={bankAccountsLoading}
                    placeholder="Select a bank account"
                  />

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

                {!initialData && (
                  <div className="md:col-span-2">
                    <label
                      htmlFor="markAsPaid"
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        id="markAsPaid"
                        name="markAsPaid"
                        checked={markAsPaid}
                        onChange={(e) => setMarkAsPaid(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Mark as Paid
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors duration-150 ease-in-out shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !!errors.duplicateName ||
                    (isCheckingDuplicate && !isDuplicateCheckComplete) ||
                    !!errors.duplicateName
                  }
                  className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-150 ease-in-out shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed text-sm transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      {initialData ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Receipt className="w-4 h-4 mr-2" />
                      {initialData ? "Update Bill" : "Create Bill"}
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

export default BillModal;
