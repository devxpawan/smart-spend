import { AnimatePresence, motion } from "framer-motion";
import { Edit, Landmark, PlusCircle, Trash2, X, ArrowUp, ArrowDown } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  createBankAccount,
  deleteBankAccount,
  getBankAccounts,
  updateBankAccount,
} from "../api/bankAccounts";
import ConfirmModal from "../components/ConfirmModal";
import CustomSelect from "../components/CustomSelect";
import { useAuth } from "../contexts/auth-exports";
import BankAccountInterface from "../types/BankAccountInterface";
import banksData from "../lib/banks.json"; // Import the banks data
import toast from "react-hot-toast"; // Import react-hot-toast
import { AxiosError } from "axios";

interface BankAccountFormState {
  bankName: string;
  accountName: string;
  accountType: "Checking" | "Savings" | "Credit Card" | "Investment" | "Other";
  initialBalance: number;
}

const accountTypeOptions = [
  { value: "Checking", label: "Checking" },
  { value: "Savings", label: "Savings" },
  { value: "Credit Card", label: "Credit Card" },
  { value: "Investment", label: "Investment" },
  { value: "Other", label: "Other" },
];

// Format bank names for CustomSelect
const bankNameOptions = banksData.map((bank) => ({
  value: bank.name,
  label: bank.name,
}));

interface BankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BankAccountFormState, id?: string) => Promise<string | undefined>; // Now returns a promise of an error message
  initialData?: BankAccountInterface;
  isLoading: boolean;
}

const BankAccountModal: React.FC<BankAccountModalProps> = ({
  isOpen, onClose, onSave, initialData, isLoading
}) => {
  const [formData, setFormData] = useState<BankAccountFormState>({
    bankName: "",
    accountName: "",
    accountType: "Checking",
    initialBalance: 0,
  });
  const [accountNameError, setAccountNameError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (initialData) {
      setFormData({
        bankName: initialData.bankName,
        accountName: initialData.accountName,
        accountType: initialData.accountType,
        initialBalance: initialData.initialBalance,
      });
    } else {
      setFormData({
        bankName: "",
        accountName: "",
        accountType: "Checking",
        initialBalance: 0,
      });
    }
    setAccountNameError(undefined); // Reset error when modal opens or data changes
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "initialBalance" ? parseFloat(value) : value,
    }));
    if (name === "accountName") {
      setAccountNameError(undefined); // Clear error when user types
    }
  };

  const handleSelectChange = (value: string, name: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === "bankName") {
      setAccountNameError(undefined); // Clear error when bank name changes
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountNameError(undefined); // Clear previous error before new submission
    const error = await onSave(formData, initialData?._id);
    if (error) {
      setAccountNameError(error);
    }
  };

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
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 w-full max-w-lg sm:max-w-2xl max-h-[80vh] sm:max-h-[90vh] overflow-hidden mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Landmark className="w-5 h-5 text-white" />
              </div>
              <h2
                id="modal-title"
                className="text-xl font-bold text-slate-800 dark:text-white"
              >
                {initialData ? "Edit Bank Account" : "Add New Bank Account"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-600/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="bankName"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                >
                  Bank Name
                </label>
                <CustomSelect
                  options={bankNameOptions}
                  value={formData.bankName}
                  onChange={(value) => handleSelectChange(value, "bankName")}
                  className="w-full"
                  placeholder="Select Bank"
                  isSearchable={true}
                />
              </div>
              <div>
                <label
                  htmlFor="accountName"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                >
                  Account Name
                </label>
                <input
                  type="text"
                  name="accountName"
                  id="accountName"
                  value={formData.accountName}
                  onChange={handleChange}
                  placeholder="e.g., My Savings Account"
                  className={`form-input block w-full px-3 py-1.5 sm:py-2 border rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 text-sm transition duration-150 ease-in-out
                    ${accountNameError ? "border-red-500 focus:ring-red-500" : "border-slate-300 dark:border-gray-600 focus:ring-indigo-500"}
                  `}
                  required
                />
                {accountNameError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{accountNameError}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="accountType"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                >
                  Account Type
                </label>
                <CustomSelect
                  options={accountTypeOptions}
                  value={formData.accountType}
                  onChange={(value) => handleSelectChange(value, "accountType")}
                  className="w-full"
                />
              </div>
              <div>
                <label
                  htmlFor="initialBalance"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                >
                  Initial Balance
                </label>
                <input
                  type="number"
                  name="initialBalance"
                  id="initialBalance"
                  value={isNaN(formData.initialBalance) ? "" : formData.initialBalance}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="form-input block w-full px-3 py-1.5 sm:py-2 border border-slate-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition duration-150 ease-in-out"
                  required
                  step="0.01"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150 ease-in-out shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150 ease-in-out shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed text-sm transform hover:scale-[1.02]"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      {initialData ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Landmark className="w-4 h-4 mr-2" />
                      {initialData ? "Update Account" : "Create Account"}
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

const BankAccounts: React.FC = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccountInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<
    BankAccountInterface | undefined
  >(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [accountToDeleteId, setAccountToDeleteId] = useState<string | null>(
    null
  );

  const { user } = useAuth();

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      setLoading(true);
      const data = await getBankAccounts();
      setBankAccounts(data);
    } catch (err) {
      setError("Failed to fetch bank accounts.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccount = async (data: BankAccountFormState, id?: string): Promise<string | undefined> => {
    try {
      setIsSaving(true);
      if (id) {
        await updateBankAccount(id, data);
      } else {
        await createBankAccount(data);
      }
      setIsModalOpen(false);
      setEditingAccount(undefined);
      fetchBankAccounts();
      toast.success(`Bank account ${id ? "updated" : "created"} successfully!`);
      return undefined; // No error
    } catch (err: unknown) {
      const errorMessage = (err instanceof AxiosError && err.response?.data?.msg) || "Failed to save bank account.";
      console.error(err);
      if (err instanceof AxiosError && err.response && err.response.status === 409) {
        return errorMessage; // Return error message for 409 conflict
      } else {
        toast.error(errorMessage); // Show toast for other errors
        return undefined; // Don't return error to modal for non-409 errors
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = (id: string) => {
    setAccountToDeleteId(id);
    setIsConfirmModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!accountToDeleteId) return;
    try {
      setLoading(true);
      await deleteBankAccount(accountToDeleteId);
      fetchBankAccounts();
    } catch (err) {
      setError("Failed to delete bank account.");
      console.error(err);
    } finally {
      setLoading(false);
      setIsConfirmModalOpen(false);
      setAccountToDeleteId(null);
    }
  };

  const openAddModal = () => {
    setEditingAccount(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (account: BankAccountInterface) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-slate-600 font-medium dark:text-slate-300">Loading bank accounts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 dark:text-red-400">
        Error: {error}
      </div>
    );
  }


  const formatCurrency = (amount: number) => {
    return `${user?.preferences?.currency || "USD"} ${amount.toLocaleString(
      undefined,
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )}`;
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 p-4">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-200/20 dark:shadow-gray-900/20 backdrop-blur-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Landmark className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    Bank Accounts
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm sm:text-base">
                    Manage your financial accounts and track balances
                  </p>
                </div>
              </div>

            <button
              onClick={openAddModal}
              className="hidden sm:inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm font-semibold transform hover:scale-[1.02] w-full sm:w-auto"
            >
              <PlusCircle className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
              Add New Account
            </button>
          </div>
        </div>
        </header>

        {/* Floating Action Button for Mobile */}
        <motion.button
          className="sm:hidden fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-110"
          onClick={openAddModal}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.3 }}
          aria-label="Add New Account"
        >
          <PlusCircle className="w-6 h-6" />
        </motion.button>


        {bankAccounts.length === 0 ? ( 
          <div className="text-center py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <Landmark className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              No bank accounts found
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Get started by adding your first bank account to track your
              finances.
            </p>
            <div className="mt-6">
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusCircle className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Add New Account
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map((account) => (
              <motion.div
                key={account._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="group relative p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ease-out bg-white/50 dark:bg-gray-800/50 border border-indigo-200 dark:border-gray-700 hover:scale-[1.02] overflow-hidden min-h-[180px] flex flex-col backdrop-blur-lg"
              >
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 opacity-20 dark:opacity-10 group-hover:opacity-30 dark:group-hover:opacity-20 transition-opacity duration-300"></div>

                <div className="relative z-10 flex-grow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wider">
                        {account.bankName}
                      </h3>
                      <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white break-words">
                        {account.accountName}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg flex-shrink-0 ml-2">
                      <Landmark className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {account.accountType}
                  </p>
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mt-2">
                    {formatCurrency(account.currentBalance)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Initial: {formatCurrency(account.initialBalance)}
                  </p>
                  {account.initialBalance !== undefined &&
                    account.currentBalance !== undefined && (
                      <div className="mt-2 flex items-center text-sm">
                        {(() => {
                          const deltaAmount = account.currentBalance - account.initialBalance;
                          const deltaPercentage = account.initialBalance === 0
                              ? 0
                              : (deltaAmount / account.initialBalance) * 100;

                          const isPositive = deltaAmount > 0;
                          const isNegative = deltaAmount < 0;

                          const textColorClass = isPositive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isNegative
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-500 dark:text-gray-400";

                          const icon = isPositive ? (
                            <ArrowUp className="w-4 h-4 mr-1" />
                          ) : isNegative ? (
                            <ArrowDown className="w-4 h-4 mr-1" />
                          ) : null;

                          return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${textColorClass} bg-opacity-10 ${isPositive ? 'bg-emerald-100 dark:bg-emerald-900' : isNegative ? 'bg-red-100 dark:bg-red-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
                              {icon}
                              {formatCurrency(Math.abs(deltaAmount))} ({deltaPercentage.toFixed(2)}%)
                            </span>
                          );
                        })()}
                      </div>
                    )}
                </div>

                <div className="relative z-10 flex justify-end space-x-3 mt-4">
                  <button
                    onClick={() => openEditModal(account)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-2 rounded-full hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors"
                    title="Edit Account"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(account._id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
                    title="Delete Account"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <BankAccountModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveAccount}
          initialData={editingAccount}
          isLoading={isSaving}
        />

        <ConfirmModal
          isOpen={isConfirmModalOpen}
          onConfirm={confirmDelete}
          onCancel={() => setIsConfirmModalOpen(false)}
          title="Delete Bank Account?"
          message="Are you sure you want to delete this bank account? All associated income, expense, and bill records will also be permanently deleted. This action cannot be undone."
        />
      </div>
    </div>
  );
};

export default BankAccounts
