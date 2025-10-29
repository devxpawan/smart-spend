import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  DollarSign,
  Receipt,
  Repeat,
  TrendingDown,
  X,
  Upload,
  Camera,
  Loader2,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../contexts/auth-exports";
import ExpenseFormData from "../types/ExpenseFormData";
import BankAccountInterface from "../types/BankAccountInterface";
import CustomSelect from "./CustomSelect";
import { getBankAccounts } from "../api/bankAccounts";
import { expenseCategories } from "../lib/expenseCategories";
import { analyzeReceipt, isErrorResponse } from "../api/gemini";
import ScanResultCard from "./ScanResultCard";
import { set } from "date-fns";

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
  bankAccount?: string;
  recurringInterval?: string;
  recurringEndDate?: string;
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
    category: "",
    bankAccount: "",
    isRecurring: false,
    recurringInterval: "monthly",
    recurringEndDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [bankAccounts, setBankAccounts] = useState<BankAccountInterface[]>([]);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(true);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanResult, setScanResult] = useState<{
    show: boolean;
    data?: {
      description: string;
      amount: string;
      category: string;
      date: string;
    };
  }>({ show: false });
  const [scanError, setScanError] = useState<{
    show: boolean;
    message: string;
    type?: string;
  }>({ show: false, message: '' });

  // Create a key that changes when categories change to force re-render
  const categoryKey = JSON.stringify(user?.customExpenseCategories || []);

  // Determine which categories to use: custom if available, otherwise default
  const categoriesToUse = user?.customExpenseCategories && user.customExpenseCategories.length > 0
    ? user.customExpenseCategories
    : expenseCategories;

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
        bankAccount: initialData.bankAccount || "",
        isRecurring: initialData.isRecurring || false,
        recurringInterval: initialData.recurringInterval || "monthly",
        recurringEndDate: initialData.recurringEndDate
          ? new Date(initialData.recurringEndDate).toISOString().split("T")[0]
          : "",
      });
    } else {
      setFormData({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        category: "",
        bankAccount: "",
        isRecurring: false,
        recurringInterval: "monthly",
        recurringEndDate: "",
      });
    }
    setErrors({});
    setReceiptPreview(null);
    setScanResult({ show: false });
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
      newErrors.description =
        "Description must contain at least one alphabetic character";
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


    if (!formData.bankAccount) {
      newErrors.bankAccount = "Please select a bank account";
    } else {
      const selectedAccount = bankAccounts.find(acc => acc._id === formData.bankAccount);
      const amount = parseFloat(formData.amount as string) || 0;
      if (selectedAccount && selectedAccount.currentBalance < amount) {
        newErrors.bankAccount = "Insufficient balance in the selected account.";
      }
    }

    // Validate recurring fields if recurring is enabled
    if (formData.isRecurring) {
      if (!formData.recurringInterval) {
        newErrors.recurringInterval = "Please select a recurring interval";
      }

      if (formData.recurringEndDate) {
        const endDate = new Date(formData.recurringEndDate);
        const startDate = new Date(formData.date);
        if (isNaN(endDate.getTime())) {
          newErrors.recurringEndDate = "Please enter a valid end date";
        } else if (endDate < startDate) {
          newErrors.recurringEndDate = "End date must be after the start date";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, bankAccounts]);

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset previous errors
    setScanError({ show: false, message: '' });
    setScanResult({ show: false });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setScanError({ show: true, message: 'Please upload a valid image file.', type: 'invalid_file' });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setScanError({ show: true, message: 'File size exceeds 10MB limit.', type: 'file_too_large' });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setReceiptPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Analyze receipt
    setScanningReceipt(true);
    try {
      const result = await analyzeReceipt(file);

      //check if result is an error using type guard
      if (isErrorResponse(result)) {
        setScanError({
          show: true,
          message: result.message,
          type: result.type
        });
        setReceiptPreview(null);

        // Handle partial data if available
        if (result.partialData && result.type === 'incomplete_data') {
          // Optionally pre-fill whatever data was extracted
          setFormData((prev) => ({
            ...prev,
            description: result.partialData?.expenseDescription || prev.description,
            amount: result.partialData?.amount || prev.amount,
          }));
        }

        return;
      }

      // Helper function for date formatting
      const formatDate = (dateString: string): string => {
        try {
          const [month, day, year] = dateString.split('/');
          if (month && day && year) {
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        } catch (e) {
          console.error('Date parsing error:', e);
        }
        return new Date().toISOString().split("T")[0];
      };


      // Parse and format the date (MM/DD/YYYY to YYYY-MM-DD)
      const formattedDate = formatDate(result.date);

      setFormData((prev) => ({
        ...prev,
        description: result.expenseDescription,
        amount: result.amount,
        date: formattedDate,
        category: result.suggestedCategory,
      }));

      setScanResult({
        show: true,
        data: {
          description: result.expenseDescription,
          amount: result.amount,
          category: result.suggestedCategory,
          date: formattedDate,
        }
      });

      // Auto-hide after 8 seconds
      setTimeout(() => setScanResult({ show: false }), 8000);
    } finally{
      setScanningReceipt(false);
      if(fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Trigger file input click
  const handleScanReceiptClick = () => {
    fileInputRef.current?.click();
  };

  // Remove receipt preview
  const handleRemoveReceipt = () => {
    setReceiptPreview(null);
    setScanError({ show: false, message: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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
        isRecurring: formData.isRecurring,
        recurringInterval: formData.isRecurring ? formData.recurringInterval : undefined,
        recurringEndDate: formData.isRecurring && formData.recurringEndDate ? formData.recurringEndDate : undefined,
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
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
              <h2
                id="modal-title"
                className="text-xl font-bold text-slate-800 dark:text-white"
              >
                {initialData ? "Edit Expense" : "Add New Expense"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-600/50 focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Receipt Scanner Section */}
            {/* Receipt Scanner Section */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Smart Receipt Scanner
                    </h3>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                    Upload a photo of your receipt and we'll automatically extract the details for you
                  </p>

                  {/* Error Message Display */}
                  {scanError.show && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                            {scanError.message}
                          </p>
                        </div>
                        <button
                          onClick={() => setScanError({ show: false, message: '' })}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={handleScanReceiptClick}
                    disabled={scanningReceipt}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors duration-150 shadow-sm"
                  >
                    {scanningReceipt ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scanning Receipt...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Scan Receipt
                      </>
                    )}
                  </button>
                </div>

                {/* Receipt Preview */}
                {receiptPreview && (
                  <div className="ml-4 relative">
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="w-20 h-20 object-cover rounded-lg border-2 border-blue-300 dark:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveReceipt}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Success Result Card */}
            <ScanResultCard
              show={scanResult.show}
              data={scanResult.data}
              onClose={() => setScanResult({ show: false })}
            />
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Description */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="description"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Expense Description *
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
                      placeholder="e.g., Groceries, Dinner with friends"
                      className={`form-input block w-full pl-8 pr-2 py-2 sm:pl-10 sm:pr-3 sm:py-3 border rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent text-sm transition duration-150 ease-in-out ${errors.description
                        ? "border-red-300 focus:ring-red-500"
                        : "border-slate-300 dark:border-gray-600 focus:ring-green-500"
                        }`}
                      required
                      ref={firstInputRef}
                      aria-invalid={errors.description ? "true" : "false"}
                      aria-describedby={
                        errors.description ? "description-error" : undefined
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
                      className={`form-input block w-full pl-8 pr-2 py-2 sm:pl-10 sm:pr-3 sm:py-3 border rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent text-sm transition duration-150 ease-in-out ${errors.amount
                        ? "border-red-300 focus:ring-red-500"
                        : "border-slate-300 dark:border-gray-600 focus:ring-green-500"
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
                      className={`form-input block w-full pl-10 pr-3 py-2 sm:py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent text-sm transition duration-150 ease-in-out bg-white dark:bg-gray-700 text-slate-900 dark:text-white ${errors.date
                        ? "border-red-300 focus:ring-red-500"
                        : "border-slate-300 dark:border-gray-600 focus:ring-green-500"
                        }`}
                      required
                      aria-invalid={errors.date ? "true" : "false"}
                      aria-describedby={errors.date ? "date-error" : undefined}
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
                    options={categoriesToUse.map((cat) => ({
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
                      : "border-slate-300 dark:border-gray-600 focus:ring-green-500"
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
                      : "border-slate-300 dark:border-gray-600 focus:ring-green-500"
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

                {/* Recurring Section */}
                <div className="md:col-span-2 pt-4 border-t border-slate-200 dark:border-gray-700">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      name="isRecurring"
                      checked={formData.isRecurring || false}
                      onChange={handleChange}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-slate-300 rounded"
                    />
                    <label
                      htmlFor="isRecurring"
                      className="ml-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      <div className="flex items-center">
                        <Repeat className="w-4 h-4 mr-2" />
                        Make this a recurring expense
                      </div>
                    </label>
                  </div>

                  {formData.isRecurring && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                      {/* Recurring Interval */}
                      <div>
                        <label
                          htmlFor="recurringInterval"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                          Recurring Interval
                        </label>
                        <CustomSelect
                          options={[
                            { value: "daily", label: "Daily" },
                            { value: "weekly", label: "Weekly" },
                            { value: "monthly", label: "Monthly" },
                            { value: "yearly", label: "Yearly" },
                          ]}
                          value={formData.recurringInterval || "monthly"}
                          onChange={(value) =>
                            handleChange({
                              target: { name: "recurringInterval", value },
                            } as React.ChangeEvent<HTMLSelectElement>)
                          }
                          className={`${errors.recurringInterval
                            ? "border-red-300 focus:ring-red-500"
                            : "border-slate-300 dark:border-gray-600 focus:ring-green-500"
                            }`}
                          openDirection="top"
                        />
                        {errors.recurringInterval && (
                          <div className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">{errors.recurringInterval}</span>
                          </div>
                        )}
                      </div>

                      {/* Recurring End Date */}
                      <div>
                        <label
                          htmlFor="recurringEndDate"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                          End Date (Optional)
                        </label>
                        <input
                          type="date"
                          name="recurringEndDate"
                          id="recurringEndDate"
                          value={formData.recurringEndDate || ""}
                          onChange={handleChange}
                          min={formData.date}
                          className={`form-input block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent text-sm transition duration-150 ease-in-out bg-white dark:bg-gray-700 text-slate-900 dark:text-white ${errors.recurringEndDate
                            ? "border-red-300 focus:ring-red-500"
                            : "border-slate-300 dark:border-gray-600 focus:ring-green-500"
                            }`}
                        />
                        {errors.recurringEndDate && (
                          <div className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">{errors.recurringEndDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150 ease-in-out shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || scanningReceipt}
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