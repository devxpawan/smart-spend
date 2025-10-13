import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  DollarSign,
  Edit3,
  Filter,
  Plus,
  RefreshCw,
  Repeat,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/auth-exports";
import RecurringInterface from "../types/RecurringInterface";
import {
  deleteRecurringTransaction,
  getRecurringTransactions,
  updateRecurringTransaction,
} from "../api/recurring";
import CustomSelect from "../components/CustomSelect";
import ConfirmModal from "../components/ConfirmModal";
import RecurringInfo from "../components/RecurringInfo";

interface FilterConfig {
  type: "all" | "expense" | "income";
  interval: "all" | "daily" | "weekly" | "monthly" | "yearly";
  searchTerm: string;
}

// Define the type for our edit form
interface EditFormData {
  _id: string;
  type: "expense" | "income";
  description: string;
  amount: number;
  category: string;
  recurringInterval: "daily" | "weekly" | "monthly" | "yearly";
  nextRecurringDate: string;
  recurringEndDate?: string;
}

const Recurring: React.FC = () => {
  const [recurringTransactions, setRecurringTransactions] = useState<
    RecurringInterface[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<FilterConfig>({
    type: "all",
    interval: "all",
    searchTerm: "",
  });
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    id: string | null;
    type: "expense" | "income" | null;
  }>({
    open: false,
    id: null,
    type: null,
  });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // State for edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null);

  const { user } = useAuth();

  const fetchRecurringTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const { expenses, incomes } = await getRecurringTransactions();

      // Combine expenses and incomes with type information
      const combinedTransactions: RecurringInterface[] = [
        ...expenses.map((exp) => ({ ...exp, type: "expense" as const })),
        ...incomes.map((inc) => ({ ...inc, type: "income" as const })),
      ];

      setRecurringTransactions(combinedTransactions);
    } catch (err: any) {
      console.error("Error fetching recurring transactions:", err);
      // Provide user-friendly error messages
      if (err.message.includes("Network error")) {
        setError("Unable to connect to the server. Please check your internet connection.");
      } else if (err.message.includes("Server Error")) {
        setError(`Server error: ${err.message.replace("Server Error: ", "")}`);
      } else {
        setError(err.message || "Failed to fetch recurring transactions. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecurringTransactions();
  }, [fetchRecurringTransactions]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return recurringTransactions
      .filter((transaction) => {
        // Type filter
        if (filters.type !== "all" && transaction.type !== filters.type) {
          return false;
        }

        // Interval filter
        if (
          filters.interval !== "all" &&
          transaction.recurringInterval !== filters.interval
        ) {
          return false;
        }

        // Search filter
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          if (
            !transaction.description.toLowerCase().includes(searchLower) &&
            !transaction.category.toLowerCase().includes(searchLower)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by next recurring date
        const dateA = a.nextRecurringDate
          ? new Date(a.nextRecurringDate).getTime()
          : 0;
        const dateB = b.nextRecurringDate
          ? new Date(b.nextRecurringDate).getTime()
          : 0;
        return dateA - dateB;
      });
  }, [recurringTransactions, filters]);

  const handleDeleteRecurring = async () => {
    if (!confirmModal.id || !confirmModal.type) return;

    try {
      setUpdatingId(confirmModal.id);
      await deleteRecurringTransaction(confirmModal.id, confirmModal.type);
      await fetchRecurringTransactions();
      setConfirmModal({ open: false, id: null, type: null });
    } catch (err: any) {
      console.error("Error removing recurring transaction:", err);
      if (err.message.includes("Network error")) {
        setError("Unable to connect to the server. Please check your internet connection.");
      } else if (err.message.includes("Server Error")) {
        setError(`Server error: ${err.message.replace("Server Error: ", "")}`);
      } else {
        setError(err.message || "Failed to remove recurring transaction. Please try again.");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleRecurring = async (
    id: string,
    type: "expense" | "income",
    isRecurring: boolean
  ) => {
    try {
      setUpdatingId(id);
      await updateRecurringTransaction(id, type, { isRecurring });
      await fetchRecurringTransactions();
    } catch (err: any) {
      console.error("Error updating recurring transaction:", err);
      if (err.message.includes("Network error")) {
        setError("Unable to connect to the server. Please check your internet connection.");
      } else if (err.message.includes("Server Error")) {
        setError(`Server error: ${err.message.replace("Server Error: ", "")}`);
      } else {
        setError(err.message || "Failed to update recurring transaction. Please try again.");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // Open edit modal with transaction data
  const openEditModal = (transaction: RecurringInterface) => {
    setEditFormData({
      _id: transaction._id,
      type: transaction.type,
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      recurringInterval: transaction.recurringInterval as "daily" | "weekly" | "monthly" | "yearly",
      nextRecurringDate: transaction.nextRecurringDate 
        ? new Date(transaction.nextRecurringDate).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0],
      recurringEndDate: transaction.recurringEndDate 
        ? new Date(transaction.recurringEndDate).toISOString().split('T')[0] 
        : undefined
    });
    setEditModalOpen(true);
  };

  // Handle form input changes
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editFormData) return;
    
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    });
  };

  // Handle form submission
  const handleEditFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData) return;

    try {
      setUpdatingId(editFormData._id);
      setEditModalOpen(false);
      
      // Prepare data for update
      const updateData = {
        description: editFormData.description,
        amount: editFormData.amount,
        category: editFormData.category,
        recurringInterval: editFormData.recurringInterval,
        nextRecurringDate: editFormData.nextRecurringDate,
        recurringEndDate: editFormData.recurringEndDate,
        isRecurring: true
      };
      
      await updateRecurringTransaction(editFormData._id, editFormData.type, updateData);
      await fetchRecurringTransactions();
      
      // Reset form data
      setEditFormData(null);
    } catch (err: any) {
      console.error("Error updating recurring transaction:", err);
      if (err.message.includes("Network error")) {
        setError("Unable to connect to the server. Please check your internet connection.");
      } else if (err.message.includes("Server Error")) {
        setError(`Server error: ${err.message.replace("Server Error: ", "")}`);
      } else {
        setError(err.message || "Failed to update recurring transaction. Please try again.");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const formatCurrency = useCallback(
    (amount: number) => {
      return `${user?.preferences?.currency || "USD"} ${amount.toFixed(2)}`;
    },
    [user?.preferences?.currency]
  );

  const getIntervalLabel = (interval: string) => {
    switch (interval) {
      case "daily":
        return "Daily";
      case "weekly":
        return "Weekly";
      case "monthly":
        return "Monthly";
      case "yearly":
        return "Yearly";
      default:
        return interval;
    }
  };

  const getTypeIcon = (type: "expense" | "income") => {
    return type === "expense" ? (
      <TrendingDown className="w-4 h-4" />
    ) : (
      <TrendingUp className="w-4 h-4" />
    );
  };

  const getTypeColor = (type: "expense" | "income") => {
    return type === "expense"
      ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
      : "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-slate-600 dark:text-gray-300 font-medium">
            Loading your recurring transactions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Repeat className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-gray-200">
                Recurring Transactions
              </h1>
              <p className="text-slate-600 dark:text-gray-300 mt-1 text-sm sm:text-base">
                Manage your recurring incomes and expenses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm sm:text-base">
            <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm border dark:border-gray-700">
              <span className="text-slate-600 dark:text-gray-300">
                Total Recurring:{" "}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {filteredTransactions.length}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Recurring Incomes
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {
                    filteredTransactions.filter((t) => t.type === "income")
                      .length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Recurring Expenses
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {
                    filteredTransactions.filter((t) => t.type === "expense")
                      .length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Info Section */}
      <RecurringInfo />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border dark:border-gray-700 shadow-sm space-y-3 sm:space-y-4">
        {/* Search */}
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search recurring transactions..."
            value={filters.searchTerm}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))
            }
            className="w-full pl-12 pr-10 py-3 bg-slate-100 dark:bg-gray-700 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition-all duration-300 shadow-sm dark:text-white"
          />
          {filters.searchTerm && (
            <button
              type="button"
              onClick={() =>
                setFilters((prev) => ({ ...prev, searchTerm: "" }))
              }
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Type and Interval Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Type Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              Type:
            </label>
            <CustomSelect
              options={[
                { value: "all", label: "All Types" },
                { value: "income", label: "Income" },
                { value: "expense", label: "Expense" },
              ]}
              value={filters.type}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  type: value as FilterConfig["type"],
                }))
              }
              className="w-full sm:w-40"
            />
          </div>

          {/* Interval Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              Interval:
            </label>
            <CustomSelect
              options={[
                { value: "all", label: "All Intervals" },
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
              value={filters.interval}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  interval: value as FilterConfig["interval"],
                }))
              }
              className="w-full sm:w-40"
            />
          </div>

          {/* Refresh Button */}
          <div className="sm:ml-auto">
            <button
              onClick={fetchRecurringTransactions}
              className="flex items-center justify-center px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm text-slate-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-slate-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              title="Refresh transactions"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline sm:ml-2">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-700 p-4 rounded-md">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              <div className="text-red-500 dark:text-red-400 w-5 h-5 flex-shrink-0 mt-0.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error Occurred
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
            </div>
            <button
              onClick={() => setError("")}
              className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 overflow-hidden">
        {filteredTransactions.length === 0 && !error ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Repeat className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                No Recurring Transactions Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You don't have any recurring transactions yet. Create recurring
                incomes or expenses in their respective sections.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Description
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Type
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Category
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4" />
                      <span>Amount</span>
                    </div>
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Interval</span>
                    </div>
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Next Date</span>
                    </div>
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransactions.map((transaction) => (
                  <motion.tr
                    key={`${transaction._id}-${transaction.type}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className={`p-2 rounded-lg mr-3 ${getTypeColor(
                            transaction.type
                          )}`}
                        >
                          {getTypeIcon(transaction.type)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {transaction.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(
                          transaction.type
                        )}`}
                      >
                        {transaction.type === "expense" ? "Expense" : "Income"}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-medium">
                        {transaction.category}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {transaction.recurringInterval
                        ? getIntervalLabel(transaction.recurringInterval)
                        : "N/A"}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {transaction.nextRecurringDate
                        ? new Date(transaction.nextRecurringDate).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(transaction)}
                          className={`text-blue-600 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-600 transition-all duration-200 p-2 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${
                            updatingId === transaction._id
                              ? "opacity-60 cursor-not-allowed"
                              : ""
                          }`}
                          title="Edit Transaction"
                          disabled={updatingId === transaction._id}
                        >
                          {updatingId === transaction._id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Edit3 className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            handleToggleRecurring(
                              transaction._id,
                              transaction.type,
                              false
                            )
                          }
                          className={`text-rose-600 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 transition-all duration-200 p-2 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-500 ${
                            updatingId === transaction._id
                              ? "opacity-60 cursor-not-allowed"
                              : ""
                          }`}
                          title="Remove Recurring"
                          disabled={updatingId === transaction._id}
                        >
                          {updatingId === transaction._id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.open}
        title="Remove Recurring Transaction"
        message="Are you sure you want to remove this recurring transaction? This will not delete the transaction itself, but only remove its recurring status."
        onConfirm={handleDeleteRecurring}
        onCancel={() => setConfirmModal({ open: false, id: null, type: null })}
        confirmText="Remove"
        cancelText="Cancel"
        variant="warning"
      />
      
      {/* Edit Modal */}
      {editModalOpen && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Edit Recurring Transaction
                </h3>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleEditFormSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      name="description"
                      value={editFormData.description}
                      onChange={handleEditFormChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={editFormData.amount}
                      onChange={handleEditFormChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      name="category"
                      value={editFormData.category}
                      onChange={handleEditFormChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Interval
                    </label>
                    <select
                      name="recurringInterval"
                      value={editFormData.recurringInterval}
                      onChange={handleEditFormChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Next Recurring Date
                    </label>
                    <input
                      type="date"
                      name="nextRecurringDate"
                      value={editFormData.nextRecurringDate}
                      onChange={handleEditFormChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      name="recurringEndDate"
                      value={editFormData.recurringEndDate || ""}
                      onChange={handleEditFormChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recurring;