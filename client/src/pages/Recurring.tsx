import { motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  Clock,
  DollarSign,
  Filter,
  RefreshCw,
  Repeat,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/auth-exports";
import RecurringInterface from "../types/RecurringInterface";
import {
  deleteRecurringTransaction,
  getRecurringTransactions,
} from "../api/recurring";
import { retryWithBackoff } from "../utils/retry";
import CustomSelect from "../components/CustomSelect";
import ConfirmModal from "../components/ConfirmModal";

interface FilterConfig {
  type: "all" | "expense" | "income";
  interval: "all" | "daily" | "weekly" | "monthly" | "yearly";
  searchTerm: string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 12;

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
        setError(
          "Unable to connect to the server. Please check your internet connection."
        );
      } else if (err.message.includes("Server Error")) {
        setError(`Server error: ${err.message.replace("Server Error: ", "")}`);
      } else {
        setError(
          err.message ||
            "Failed to fetch recurring transactions. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecurringTransactions();
  }, [fetchRecurringTransactions]);

  // Filter and sort transactions
  const { paginatedTransactions, nPages, currentRecords } = useMemo(() => {
    const filtered = recurringTransactions
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

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filtered.slice(
      indexOfFirstRecord,
      indexOfLastRecord
    );
    const nPages = Math.ceil(filtered.length / recordsPerPage);

    return {
      paginatedTransactions: filtered,
      nPages,
      currentRecords,
    };
  }, [recurringTransactions, filters, currentPage]);

  useEffect(() => {
    if (nPages === 0 && currentPage !== 1) {
      setCurrentPage(1); // If no records, ensure we are on page 1
    } else if (currentPage > nPages && nPages > 0) {
      setCurrentPage(nPages); // If current page is out of bounds, go to the last valid page
    }
  }, [nPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleDeleteRecurring = async () => {
    if (!confirmModal.id || !confirmModal.type) return;

    const apiCall = () => deleteRecurringTransaction(confirmModal.id!, confirmModal.type!);

    try {
      setUpdatingId(confirmModal.id);
      await retryWithBackoff(apiCall);
      await fetchRecurringTransactions();
      setConfirmModal({ open: false, id: null, type: null });
    } catch (err: any) {
      console.error("Error removing recurring transaction:", err);
      if (err.message.includes("Network error")) {
        setError(
          "Unable to connect to the server. Please check your internet connection."
        );
      } else if (err.message.includes("Server Error")) {
        setError(`Server error: ${err.message.replace("Server Error: ", "")}`);
      } else {
        setError(
          err.message ||
            "Failed to remove recurring transaction. Please try again."
        );
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
    <div className="min-h-screen max-w-7xl mx-auto space-y-6 sm:space-y-8 p-4 sm:p-0">
      {/* Header with improved design */}
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
                Monitor and manage your recurring incomes and expenses
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg shadow-sm border dark:border-gray-700">
            <span className="text-slate-600 dark:text-gray-400 mr-2">
              Total Recurring:
            </span>
            <span className="font-semibold text-slate-900 dark:text-white text-lg">
              {paginatedTransactions.length}
            </span>
          </div>
        </div>

        {/* Enhanced Stats Cards with better design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="relative p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ease-out bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 border border-green-200 dark:border-gray-700 hover:scale-[1.02] overflow-hidden min-h-[120px] sm:min-h-[140px]">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600"></div>
            </div>
            <div className="relative z-10 h-full flex flex-col">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wider">
                    Recurring Incomes
                  </h3>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white break-words">
                    {
                      paginatedTransactions.filter((t) => t.type === "income")
                        .length
                    }
                  </p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg flex-shrink-0 ml-2">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="relative p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ease-out bg-gradient-to-br from-rose-50 to-red-50 dark:from-gray-800 dark:to-gray-700 border border-rose-200 dark:border-gray-700 hover:scale-[1.02] overflow-hidden min-h-[120px] sm:min-h-[140px]">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-red-600"></div>
            </div>
            <div className="relative z-10 h-full flex flex-col">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wider">
                    Recurring Expenses
                  </h3>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white break-words">
                    {
                      paginatedTransactions.filter((t) => t.type === "expense")
                        .length
                    }
                  </p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-rose-500 to-red-600 shadow-lg flex-shrink-0 ml-2">
                  <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Filters with improved design */}
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
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Transaction Type
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
              className="w-full"
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Interval
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
              className="w-full"
            />
          </div>
          <div className="flex justify-end sm:justify-start sm:ml-auto">
            <button
              onClick={fetchRecurringTransactions}
              disabled={loading}
              className="flex items-center px-3 py-2 border dark:border-gray-600 rounded-md text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              title="Refresh recurring transactions"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="ml-2">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border dark:border-red-800 border-red-200 p-4 rounded-md">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              <AlertCircle className="text-red-500 dark:text-red-400 w-5 h-5 flex-shrink-0 mt-0.5" />
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
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="relative min-h-[600px]">
        {paginatedTransactions.length === 0 && !error ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Repeat className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                No Recurring Transactions Found
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                You don't have any recurring transactions yet. Create recurring
                incomes or expenses in their respective sections.
              </p>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/30 rounded-xl p-6 mb-6">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center justify-center">
                  <span className="mr-2">
                    How to create recurring transactions
                  </span>
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          1
                        </span>
                      </div>
                    </div>
                    <p className="text-blue-700 dark:text-blue-300 text-sm text-left">
                      Go to Expenses or Incomes section
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          2
                        </span>
                      </div>
                    </div>
                    <p className="text-blue-700 dark:text-blue-300 text-sm text-left">
                      Create a new transaction
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          3
                        </span>
                      </div>
                    </div>
                    <p className="text-blue-700 dark:text-blue-300 text-sm text-left">
                      Check "Make this a recurring transaction"
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          4
                        </span>
                      </div>
                    </div>
                    <p className="text-blue-700 dark:text-blue-300 text-sm text-left">
                      Set the interval and optionally an end date
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
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
                  {currentRecords.map((transaction) => (
                    <motion.tr
                      key={`${transaction._id}-${transaction.type}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center">
                          <div
                            className={`p-2 rounded-lg mr-3 ${getTypeColor(
                              transaction.type
                            )}`}
                          >
                            {getTypeIcon(transaction.type)}
                          </div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {transaction.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getTypeColor(
                            transaction.type
                          )}`}
                        >
                          {transaction.type === "expense"
                            ? "Expense"
                            : "Income"}
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
                          ? new Date(
                              transaction.nextRecurringDate
                            ).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() =>
                              setConfirmModal({
                                open: true,
                                id: transaction._id,
                                type: transaction.type,
                              })
                            }
                            className={`text-rose-600 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 transition-all duration-200 p-2 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-500 ${
                              updatingId === transaction._id
                                ? "opacity-60 cursor-not-allowed"
                                : "transform hover:scale-105"
                            }`}
                            title="Remove Recurring"
                            disabled={updatingId === transaction._id}
                          >
                            {updatingId === transaction._id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {nPages > 1 && (
        <nav className="flex justify-center mt-6 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <ul className="flex items-center space-x-1 h-10 text-base">
            <li>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center justify-center px-4 h-10 font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-800 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                Previous
              </button>
            </li>
            {(() => {
              const pageNumbers = [];
              const maxPagesToShow = 5;
              const ellipsis = (
                <li
                  key="ellipsis"
                  className="px-2 text-gray-500 dark:text-gray-400"
                >
                  ...
                </li>
              );

              let startPage = Math.max(
                1,
                currentPage - Math.floor(maxPagesToShow / 2)
              );
              const endPage = Math.min(nPages, startPage + maxPagesToShow - 1);

              if (endPage - startPage + 1 < maxPagesToShow) {
                startPage = Math.max(1, endPage - maxPagesToShow + 1);
              }

              if (startPage > 1) {
                pageNumbers.push(
                  <li key={1}>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className={`flex items-center justify-center px-4 h-10 font-semibold border dark:border-gray-600 transition-colors duration-150 ${
                        currentPage === 1
                          ? "text-white bg-sky-500 hover:bg-sky-600"
                          : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      1
                    </button>
                  </li>
                );
                if (startPage > 2) {
                  pageNumbers.push(ellipsis);
                }
              }

              for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(
                  <li key={i}>
                    <button
                      onClick={() => setCurrentPage(i)}
                      className={`flex items-center justify-center px-4 h-10 font-semibold border dark:border-gray-600 transition-colors duration-150 ${
                        currentPage === i
                          ? "text-white bg-sky-500 hover:bg-sky-600"
                          : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      {i}
                    </button>
                  </li>
                );
              }

              if (endPage < nPages) {
                if (endPage < nPages - 1) {
                  pageNumbers.push(ellipsis);
                }
                pageNumbers.push(
                  <li key={nPages}>
                    <button
                      onClick={() => setCurrentPage(nPages)}
                      className={`flex items-center justify-center px-4 h-10 font-semibold border dark:border-gray-600 transition-colors duration-150 ${
                        currentPage === nPages
                          ? "text-white bg-sky-500 hover:bg-sky-600"
                          : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      {nPages}
                    </button>
                  </li>
                );
              }
              return pageNumbers;
            })()}
            <li>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, nPages))
                }
                disabled={currentPage === nPages}
                className="flex items-center justify-center px-4 h-10 font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-800 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.open}
        title="Delete Recurring Transaction"
        message="Are you sure you want to delete this recurring transaction? This action cannot be undone."
        onConfirm={handleDeleteRecurring}
        onCancel={() => setConfirmModal({ open: false, id: null, type: null })}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Recurring;
