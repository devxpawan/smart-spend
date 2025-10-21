import axios from "axios";
import {
    endOfMonth,
    format,
    isValid,
    isWithinInterval,
    parseISO,
    startOfMonth,
} from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertCircle,
    ArrowDownAZ,
    ArrowUpZA,
    Calendar,
    DollarSign,
    Edit3,
    Filter,
    Plus,
    Receipt,
    RefreshCw,
    Search,
    Trash2,
    TrendingDown,
    X,
    XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmModal from "../components/ConfirmModal";
import CustomSelect from "../components/CustomSelect";
import ExpenseBulkEditModal, { BulkEditData } from "../components/ExpenseBulkEditModal";
import ExpenseModal from "../components/ExpenseModal";
import { useAuth } from "../contexts/auth-exports";
import { expenseCategories } from "../lib/expenseCategories";
import ExpenseFormData from "../types/ExpenseFormData";
import ExpenseInterface from "../types/ExpenseInterface";


// Types
interface SortConfig {
  key: "date" | "amount" | "description" | "category";
  direction: "asc" | "desc";
}

interface FilterConfig {
  category: string;
  searchTerm: string;
  dateRange: "all" | "thisMonth" | "lastMonth" | "custom";
  customMonth?: number;
  customYear?: number;
}

const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editExpenseData, setEditExpenseData] =
    useState<ExpenseInterface | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null); // For individual delete
  const [isBulkDeleting, setIsBulkDeleting] = useState(false); // For bulk delete

  // Enhanced filtering and sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "date",
    direction: "desc",
  });
  const [filters, setFilters] = useState<FilterConfig>({
    category: "",
    searchTerm: "",
    dateRange: "all",
    customMonth: new Date().getMonth() + 1,
    customYear: new Date().getFullYear(),
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isBulkEditing, setIsBulkEditing] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 12;

  const { user } = useAuth();

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/expenses");
      const data = Array.isArray(response.data)
        ? response.data
        : response.data.expenses;
      setExpenses(data || []);
      setError("");
    } catch (err) {
      setError("Failed to fetch expenses");
      console.error("Error fetching expenses:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const openConfirmModal = (id: string) => {
    setSelectedId(id);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const idToDelete = selectedId; // Capture ID before modal closes
    setDeletingId(idToDelete); // Set deleting state
    try {
      await axios.delete(`/api/expenses/${idToDelete}`);
      setExpenses((prev) =>
        prev.filter((expense) => expense._id !== idToDelete)
      );
      setIsModalOpen(false);
      setSelectedId(null);
      setError(""); // Clear any previous error
    } catch (err) {
      setError("Failed to delete expense");
      console.error("Error deleting expense:", err);
    } finally {
      setDeletingId(null); // Reset deleting state
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  // Memoized filtered and sorted expenses
  const {
    filteredExpenses,
    totalAmount,
    categories,
    monthlyTotal,
    currentRecords,
    nPages,
  } = useMemo(() => {
    const filtered = expenses.filter((expense) => {
      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (
          !expense.description.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Category filter
      if (filters.category && expense.category !== filters.category) {
        return false;
      }

      // Date range filter
      if (filters.dateRange !== "all") {
        const expenseDate = parseISO(expense.date);
        if (!isValid(expenseDate)) return false;

        const now = new Date();
        let dateRange: { start: Date; end: Date };

        switch (filters.dateRange) {
          case "thisMonth":
            dateRange = {
              start: startOfMonth(now),
              end: endOfMonth(now),
            };
            break;
          case "lastMonth": {
            const lastMonth = new Date(
              now.getFullYear(),
              now.getMonth() - 1,
              1
            );
            dateRange = {
              start: startOfMonth(lastMonth),
              end: endOfMonth(lastMonth),
            };
            break;
          }
          case "custom": {
            if (filters.customMonth && filters.customYear) {
              const customDate = new Date(
                filters.customYear,
                filters.customMonth - 1,
                1
              );
              dateRange = {
                start: startOfMonth(customDate),
                end: endOfMonth(customDate),
              };
            } else {
              return true;
            }
            break;
          }
          default:
            return true;
        }

        if (!isWithinInterval(expenseDate, dateRange)) {
          return false;
        }
      }

      return true;
    });

    // Sort expenses
    filtered.sort((a, b) => {
      let valueA: number | string;
      let valueB: number | string;

      switch (sortConfig.key) {
        case "date":
          valueA = new Date(a.date).getTime();
          valueB = new Date(b.date).getTime();
          break;
        case "amount":
          valueA = a.amount;
          valueB = b.amount;
          break;
        case "description":
          valueA = a.description.toLowerCase();
          valueB = b.description.toLowerCase();
          break;
        case "category":
          valueA = a.category.toLowerCase();
          valueB = b.category.toLowerCase();
          break;
        default:
          valueA = 0;
          valueB = 0;
      }

      if (valueA < valueB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valueA > valueB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    const total = filtered.reduce(
      (sum, expense) => sum + (expense.amount || 0),
      0
    );
    const categories = user?.customExpenseCategories && user.customExpenseCategories.length > 0 
      ? user.customExpenseCategories 
      : expenseCategories;

    // Calculate this month's total for expenses
    const now = new Date();
    const thisMonthExpenses = filtered.filter((expense) => {
      const expenseDate = parseISO(expense.date);
      return (
        isValid(expenseDate) &&
        isWithinInterval(expenseDate, {
          start: startOfMonth(now),
          end: endOfMonth(now),
        })
      );
    });
    const monthlyTotal = thisMonthExpenses.reduce(
      (sum, expense) => sum + (expense.amount || 0),
      0
    );

    // Pagination logic for expenses
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filtered.slice(
      indexOfFirstRecord,
      indexOfLastRecord
    );
    const nPages = Math.ceil(filtered.length / recordsPerPage);

    return {
      filteredExpenses: filtered,
      totalAmount: total,
      categories: categories,
      monthlyTotal,
      currentRecords,
      nPages,
    };
  }, [expenses, filters, sortConfig, currentPage]);

  // Adjust current page if it becomes invalid after filtering or deletion
  useEffect(() => {
    if (nPages === 0 && currentPage !== 1) {
      setCurrentPage(1); // If no records, ensure we are on page 1
    } else if (currentPage > nPages && nPages > 0) {
      setCurrentPage(nPages); // If current page is out of bounds, go to the last valid page
    }
  }, [nPages, currentPage]);

  const handleSubmit = useCallback(
    async (data: ExpenseFormData) => {
      try {
        setLoading(true);
        if (editExpenseData) {
          await axios.put(`/api/expenses/${editExpenseData._id}`, {
            ...data,
            amount: data.amount || 0,
          });
        } else {
          await axios.post("/api/expenses", data);
        }
        await fetchExpenses();
      } catch (error) {
        console.error("Error submitting expense:", error);
        setError("Failed to submit expense");
        if (axios.isAxiosError(error) && error.response) {
          console.error("Detailed error from server:", error.response.data);
        }
      } finally {
        setLoading(false);
        setIsAddModalOpen(false);
        setEditExpenseData(null);
      }
    },
    [editExpenseData, fetchExpenses]
  );

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentPageIds = currentRecords
      .map((record) => record._id);
    if (e.target.checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...currentPageIds])]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await axios.delete("/api/expenses/bulk-delete", {
        data: { ids: selectedIds },
      });

      setExpenses((prev) =>
        prev.filter((expense) => !selectedIds.includes(expense._id))
      );
      setSelectedIds([]);
      setError("");
    } catch (err) {
      setError("Failed to delete selected expenses. Please refresh and try again.");
      console.error("Error during bulk delete:", err);
      // Optionally, refetch to get consistent state from server
      fetchExpenses();
    } finally {
      setIsBulkDeleteModalOpen(false);
      setIsBulkDeleting(false);
    }
  };

  const handleBulkEdit = async (updates: BulkEditData) => {
    if (selectedIds.length === 0 || Object.keys(updates).length === 0) return;

    setIsBulkEditing(true);

    try {
      await axios.patch("/api/expenses/bulk-update", { 
        ids: selectedIds, 
        updates 
      });

      // Optimistically update local state
      setExpenses((prevExpenses) =>
        prevExpenses.map((expense) => {
          if (selectedIds.includes(expense._id)) {
            const updatedExpense = { ...expense };
            if (updates.description) updatedExpense.description = updates.description;
            if (updates.amount) updatedExpense.amount = parseFloat(updates.amount);
            if (updates.date) updatedExpense.date = updates.date;
            if (updates.category) updatedExpense.category = updates.category;
            return updatedExpense;
          }
          return expense;
        })
      );

      setSelectedIds([]);
      setError("");
    } catch (err) {
      setError("Failed to bulk update expenses. Please refresh and try again.");
      console.error("Error during bulk update:", err);
      fetchExpenses(); // Fallback to refetch all data on error
    } finally {
      setIsBulkEditing(false);
      setIsBulkEditModalOpen(false);
    }
  };

  const allSelectableSelected =
    currentRecords.length > 0 &&
    currentRecords.every((r) => selectedIds.includes(r._id));
  const isIndeterminate =
    currentRecords.some((r) => selectedIds.includes(r._id)) &&
    !allSelectableSelected;

  if (loading && expenses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
          <p className="text-slate-600 dark:text-gray-300 font-medium">
            Loading your expenses...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Enhanced Header with Stats */}
      <header className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-gray-200">
                Expenses Management
              </h1>
              <p className="text-slate-600 dark:text-gray-300 mt-1 text-sm sm:text-base">
                Monitor and manage your daily spending habits
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="hidden sm:inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm font-semibold transform hover:scale-[1.02] w-full sm:w-auto"
          >
            <Plus className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
            Add New Expense
          </button>
        </div>

        {/* Floating Action Button for mobile */}
        <motion.button
          className="sm:hidden fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          onClick={() => setIsAddModalOpen(true)}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.3 }}
          aria-label="Add New Expense"
        >
          <Plus className="w-6 h-6" />
        </motion.button>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <span className="text-slate-500 dark:text-gray-400">
            {filteredExpenses.length} expenses
          </span>
          <span className="text-slate-500 dark:text-gray-400 hidden sm:inline">•</span>
          <span className="text-slate-500 dark:text-gray-400">
            Total: {user?.preferences?.currency || "USD"}{" "}
            {totalAmount.toFixed(2)}
          </span>
          <span className="text-slate-500 dark:text-gray-400 hidden sm:inline">•</span>
          <span className="text-slate-500 dark:text-gray-400">
            This month: {user?.preferences?.currency || "USD"}{" "}
            {monthlyTotal.toFixed(2)}
          </span>
        </div>
      </header>

      {/* Simplified Filters */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border dark:border-gray-700 shadow-sm space-y-3 sm:space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={filters.searchTerm}
            onChange={(e) => {
              setFilters((prev) => ({
                ...prev,
                searchTerm: e.target.value,
              }));
              setCurrentPage(1);
            }}
            className="w-full pl-12 pr-10 py-3 bg-slate-100 dark:bg-gray-700 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white dark:focus:bg-gray-800 transition-all duration-300 shadow-sm dark:text-white"
          />
          {filters.searchTerm && (
            <button
              type="button"
              onClick={() => {
                setFilters((prev) => ({ ...prev, searchTerm: "" }));
                setCurrentPage(1);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-full p-1"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters and Sort */}
        <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
          {/* First Row - Category and Period Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Category Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Category:
              </label>
              <CustomSelect
                options={[
                  { value: "", label: "All Categories" },
                  ...categories.map((cat) => ({ value: cat, label: cat })),
                ]}
                value={filters.category}
                onChange={(value) => {
                  setFilters((prev) => ({
                    ...prev,
                    category: value,
                  }));
                  setCurrentPage(1);
                }}
                className="w-full sm:w-56"
              />
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Period:
              </label>
              <CustomSelect
                options={[
                  { value: "all", label: "All Time" },
                  { value: "thisMonth", label: "This Month" },
                  { value: "lastMonth", label: "Last Month" },
                  { value: "custom", label: "Custom Month" },
                ]}
                value={filters.dateRange}
                onChange={(value) => {
                  setFilters((prev) => ({
                    ...prev,
                    dateRange: value as FilterConfig["dateRange"],
                  }));
                  setCurrentPage(1);
                }}
                className="w-full sm:w-40"
              />
            </div>
          </div>

          {/* Custom Month/Year Selection */}
          {filters.dateRange === "custom" && (
            <div className="flex gap-2">
              <CustomSelect
                options={Array.from({ length: 12 }, (_, i) => ({
                  value: (i + 1).toString(),
                  label: new Date(new Date().getFullYear(), i, 1).toLocaleString("default", {
                    month: "long",
                  }),
                }))}
                value={filters.customMonth?.toString() || ""}
                onChange={(value) => {
                  setFilters((prev) => ({
                    ...prev,
                    customMonth: parseInt(value),
                  }));
                  setCurrentPage(1);
                }}
                className="flex-1"
              />
              <CustomSelect
                options={Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return { value: year.toString(), label: year.toString() };
                })}
                value={filters.customYear?.toString() || ""}
                onChange={(value) => {
                  setFilters((prev) => ({
                    ...prev,
                    customYear: parseInt(value),
                  }));
                  setCurrentPage(1);
                }}
                className="flex-1"
              />
            </div>
          )}

          {/* Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 sm:ml-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort by:
              </label>
              <CustomSelect
                options={[
                  { value: "date", label: "Date" },
                  { value: "amount", label: "Amount" },
                  { value: "description", label: "Description" },
                  { value: "category", label: "Category" },
                ]}
                value={sortConfig.key}
                onChange={(value) => {
                  setSortConfig((prev) => ({
                    ...prev,
                    key: value as SortConfig["key"],
                  }));
                  setCurrentPage(1);
                }}
                className="flex-1 sm:w-48"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSortConfig((prev) => ({
                    ...prev,
                    direction: prev.direction === "asc" ? "desc" : "asc",
                  }));
                  setCurrentPage(1);
                }}
                className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 border dark:border-gray-600 rounded-md text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 flex-1 sm:flex-none"
                title="Toggle sort order"
              >
                {sortConfig.direction === "asc" ? (
                  <ArrowDownAZ className="w-4 h-4 sm:mr-1" />
                ) : (
                  <ArrowUpZA className="w-4 h-4 sm:mr-1" />
                )}
                <span className="hidden sm:inline">
                  {sortConfig.direction === "asc" ? "Asc" : "Desc"}
                </span>
              </button>

              <button
                onClick={fetchExpenses}
                className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 border dark:border-gray-600 rounded-md text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                title="Refresh expenses"
                disabled={loading}
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-700 p-4 rounded-md">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              <AlertCircle className="text-red-500 dark:text-red-400 w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error Occurred
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
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

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-100 dark:bg-gray-800 p-3 sm:p-4 rounded-lg border dark:border-gray-700 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="text-sm font-medium text-slate-700 dark:text-gray-200">
              {selectedIds.length} item(s) selected
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBulkEditModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Bulk edit selected expenses"
              >
                Edit
              </button>
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? (
                  <RefreshCw className="w-3 h-3 animate-spin mx-auto" />
                ) : (
                  "Delete"
                )}
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-200 bg-slate-200 dark:bg-gray-700 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative min-h-[600px]">
        {/* Expenses Table or Empty State */}
        {filteredExpenses.length === 0 && !loading && !error ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                {expenses.length === 0 ? "No Expenses to Display" : "No Matching Expenses Found"}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {expenses.length === 0
                  ? "It looks like you haven't added any expenses yet. Let's get started!"
                  : "Your current filters returned no results. Try broadening your search or adjusting the criteria."}
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm font-semibold transform hover:scale-[1.02]"
              >
                <Plus className="mr-2 w-4 h-4" />
                Add New Expense
              </button>
            </div>
          </div>
        ) : (
          !loading &&
          !error && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 overflow-hidden">
              {/* Mobile Card View */}
              <div className="block sm:hidden">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {currentRecords.map((expense) => (
                    <div
                      key={expense._id}
                      className={`p-4 space-y-3 ${selectedIds.includes(expense._id) ? "bg-blue-50 dark:bg-blue-950" : ""
                        }`}
                      onClick={() => handleSelect(expense._id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                                checked={selectedIds.includes(expense._id)}
                                onChange={() => handleSelect(expense._id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            <button
                              onClick={(e) =>
                                handleActionClick(e, () => {
                                    setEditExpenseData(expense);
                                })
                              }
                              className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 group flex items-center space-x-1"
                              title="Edit expense"
                            >
                              <span className="truncate">
                                {expense.description}
                              </span>
                                <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </button>
                          </div>
                          <div className="mt-1 flex items-center space-x-2 ml-7">
                            <span className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-medium">
                              {expense.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm ml-7">
                        <div>
                          <div className="text-gray-600 dark:text-gray-300">
                            Date:{" "}
                            {format(parseISO(expense.date), "MMM d, yyyy")}
                          </div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {user?.preferences?.currency || "USD"}{" "}
                            {typeof expense.amount === "number"
                              ? expense.amount.toFixed(2)
                              : "0.00"}
                          </div>
                        </div>
                        <button
                          onClick={(e) =>
                            handleActionClick(e, () =>
                              openConfirmModal(expense._id)
                            )
                          }
                          className={`text-rose-600 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 transition-all duration-200 p-2 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-500 ${deletingId === expense._id ? 'opacity-60 cursor-not-allowed' : 'transform hover:scale-105'}`}
                          title="Delete Expense"
                          disabled={deletingId === expense._id}
                        >
                          {deletingId === expense._id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="p-4 flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          onChange={handleSelectAll}
                          checked={allSelectableSelected}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = isIndeterminate;
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        <div className="flex items-center space-x-1">
                          <Receipt className="w-4 h-4" />
                          <span>Description</span>
                        </div>
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Category
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Date</span>
                        </div>
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        <div className="flex items-center justify-end space-x-1">
                          <DollarSign className="w-4 h-4" />
                          <span>Amount</span>
                        </div>
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentRecords.map((expense) => (
                      <tr
                        key={expense._id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedIds.includes(expense._id) ? "bg-blue-50 dark:bg-blue-950" : ""
                          }`}
                        onClick={() => handleSelect(expense._id)}
                      >
                        <td className="p-4 flex items-center justify-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              checked={selectedIds.includes(expense._id)}
                              onChange={() => handleSelect(expense._id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={(e) =>
                              handleActionClick(e, () => {
                                  setEditExpenseData(expense);
                              })
                            }
                            className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 group flex items-center space-x-1"
                            title="Edit expense"
                          >
                            <span>{expense.description}</span>
                              <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-medium">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {format(parseISO(expense.date), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {user?.preferences?.currency || "USD"}{" "}
                            {typeof expense.amount === "number"
                              ? expense.amount.toFixed(2)
                              : "0.00"}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) =>
                              handleActionClick(e, () =>
                                openConfirmModal(expense._id)
                              )
                            }
                            className={`text-rose-600 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 transition-all duration-200 p-2 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-500 ${deletingId === expense._id ? 'opacity-60 cursor-not-allowed' : 'transform hover:scale-105'}`}
                            title="Delete Expense"
                            disabled={deletingId === expense._id}
                          >
                            {deletingId === expense._id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

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
            {/* Page numbers */}
            {(() => {
              const pageNumbers = [];
              const maxPagesToShow = 5; // Maximum number of page buttons to display
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
                          ? "text-white bg-green-500 hover:bg-green-600"
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
                          ? "text-white bg-green-500 hover:bg-green-600"
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
                          ? "text-white bg-green-500 hover:bg-green-600"
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
              </div>
            </div>
          )
        )}
      </div>




      <ConfirmModal
        isOpen={isModalOpen}
        onConfirm={handleDelete}
        onCancel={() => setIsModalOpen(false)}
        title="Delete Expense?"
        message="Are you sure you want to delete this expense?"
      />

      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
        title="Delete Expenses?"
        message={`Are you sure you want to delete ${selectedIds.length} expense(s)?`}
      />

      <ExpenseBulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        onConfirm={handleBulkEdit}
        categories={categories}
        isBulkEditing={isBulkEditing}
        selectedCount={selectedIds.length}
      />

      {(isAddModalOpen || editExpenseData) && (
        <ExpenseModal
          key={JSON.stringify(user?.customExpenseCategories || [])}
          isOpen={isAddModalOpen || !!editExpenseData}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditExpenseData(null);
          }}
          onSubmit={handleSubmit}
          initialData={
            editExpenseData
              ? ({
                description: editExpenseData.description,
                amount: String(editExpenseData.amount),
                date: editExpenseData.date,
                category: editExpenseData.category,
                isRecurring: editExpenseData.isRecurring,
                recurringInterval: editExpenseData.recurringInterval,
                recurringEndDate: editExpenseData.recurringEndDate,
                bankAccount: editExpenseData.bankAccount,
              } as ExpenseFormData)
              : undefined
          } 
        />
      )}
    </div>
  );
};

export default Expenses;
