import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  DollarSign,
  Filter,
  Plus,
  RefreshCw,
  Repeat,
  Trash2,
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
  const recordsPerPage = 10;




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

    try {
      setUpdatingId(confirmModal.id);
      await deleteRecurringTransaction(confirmModal.id, confirmModal.type);
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
        setError(
          "Unable to connect to the server. Please check your internet connection."
        );
      } else if (err.message.includes("Server Error")) {
        setError(`Server error: ${err.message.replace("Server Error: ", "")}`);
      } else {
        setError(
          err.message ||
            "Failed to update recurring transaction. Please try again."
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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header with improved design */}
      <header className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Repeat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-gray-200">
                Recurring Transactions
              </h1>
              <p className="text-slate-600 dark:text-gray-400 mt-1">
                Manage your recurring incomes and expenses
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <div className="bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg shadow-sm border dark:border-gray-700">
              <span className="text-slate-600 dark:text-gray-400 mr-2">
                Total Recurring: 
              </span>
              <span className="font-semibold text-slate-900 dark:text-white text-lg">
                {paginatedTransactions.length}
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards with better design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-5 rounded-xl border border-green-200 dark:border-green-800/30 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-gray-400">
                  Recurring Incomes
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {
                    paginatedTransactions.filter((t) => t.type === "income")
                      .length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 p-5 rounded-xl border border-rose-200 dark:border-rose-800/30 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                <TrendingDown className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-gray-400">
                  Recurring Expenses
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {
                    paginatedTransactions.filter((t) => t.type === "expense")
                      .length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Filters with improved design */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border dark:border-gray-700 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-slate-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Search recurring transactions..."
              value={filters.searchTerm}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))
              }
              className="block w-full pl-10 pr-3 py-2.5 bg-slate-100 dark:bg-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition-all duration-300 shadow-sm dark:text-white"
            />
            {filters.searchTerm && (
              <button
                type="button"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, searchTerm: "" }))
                }
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-5 w-5 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200" />
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <div className="flex justify-end">
            <button
              onClick={fetchRecurringTransactions}
              disabled={loading}
              className="flex items-center px-4 py-2.5 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Type and Interval Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
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

      {/* Transactions List with improved design */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border dark:border-gray-700 overflow-hidden">
        {paginatedTransactions.length === 0 && !error ? (
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
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/30 rounded-xl p-6 mb-6">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center justify-center">
                  <span className="mr-2">How to create recurring transactions</span>
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
                      </div>
                    </div>
                    <p className="text-blue-700 dark:text-blue-300 text-sm text-left">
                      Go to Expenses or Incomes section
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">2</span>
                      </div>
                    </div>
                    <p className="text-blue-700 dark:text-blue-300 text-sm text-left">
                      Create a new transaction
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">3</span>
                      </div>
                    </div>
                    <p className="text-blue-700 dark:text-blue-300 text-sm text-left">
                      Check "Make this a recurring transaction"
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">4</span>
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4" />
                      <span>Amount</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Interval</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Next Date</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getTypeColor(
                          transaction.type
                        )}`}
                      >
                        {transaction.type === "expense" ? "Expense" : "Income"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded">
                        {transaction.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {transaction.recurringInterval
                        ? getIntervalLabel(transaction.recurringInterval)
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {transaction.nextRecurringDate
                        ? new Date(
                            transaction.nextRecurringDate
                          ).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">

                        <button
                          onClick={() =>
                            setConfirmModal({ 
                              open: true, 
                              id: transaction._id, 
                              type: transaction.type 
                            })
                          }
                          className={`text-rose-600 hover:text-white hover:bg-rose-600 transition-all duration-200 p-2 rounded-lg ${
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
              const ellipsis = <li key="ellipsis" className="px-2 text-gray-500 dark:text-gray-400">...</li>;

              let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
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
                          ? "text-white bg-indigo-500 hover:bg-indigo-600"
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
                          ? "text-white bg-indigo-500 hover:bg-indigo-600"
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
                          ? "text-white bg-indigo-500 hover:bg-indigo-600"
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
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, nPages))}
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
