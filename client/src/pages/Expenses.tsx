import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import ExpenseInterface from "../types/ExpenseInterface";
import ExpenseModal from "../components/ExpenseModal";
import ExpenseFormData from "../types/ExpenseFormData";
import {
  Plus,
  Trash2,
  AlertCircle,
  ArrowDownAZ,
  ArrowUpZA,
  DollarSign,
  Edit3,
  Calendar,
  Filter,
  TrendingDown,
  Receipt,
  Search,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  format,
  parseISO,
  isValid,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../contexts/AuthContext";

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

  const { user } = useAuth();

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchExpenses = async () => {
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
  };

  const openConfirmModal = (id: string) => {
    setSelectedId(id);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      await axios.delete(`/api/expenses/${selectedId}`);
      setExpenses((prev) =>
        prev.filter((expense) => expense._id !== selectedId)
      );
      setIsModalOpen(false);
      setSelectedId(null);
    } catch (err) {
      setError("Failed to delete expense");
      console.error("Error deleting expense:", err);
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  // Memoized filtered and sorted expenses
  const { filteredExpenses, totalAmount, categories, monthlyTotal } =
    useMemo(() => {
      let filtered = expenses.filter((expense) => {
        // Search filter
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          if (
            !expense.description.toLowerCase().includes(searchLower) &&
            !expense.category.toLowerCase().includes(searchLower)
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
            case "lastMonth":
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
            case "custom":
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
        let valueA: any;
        let valueB: any;

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

        if (valueA < valueB)
          return sortConfig.direction === "asc" ? -1 : 1;
        if (valueA > valueB)
          return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });

      const total = filtered.reduce(
        (sum, expense) => sum + (expense.amount || 0),
        0
      );
      const uniqueCategories = [
        ...new Set(expenses.map((expense) => expense.category)),
      ].sort();

      // Calculate this month's total
      const now = new Date();
      const thisMonthExpenses = expenses.filter((expense) => {
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

      return {
        filteredExpenses: filtered,
        totalAmount: total,
        categories: uniqueCategories,
        monthlyTotal,
      };
    }, [expenses, filters, sortConfig]);

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
          console.error(
            "Detailed error from server:",
            error.response.data
          );
        }
      } finally {
        setLoading(false);
        setIsAddModalOpen(false);
        setEditExpenseData(null);
      }
    },
    [editExpenseData, fetchExpenses]
  );

  if (loading && expenses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
          <p className="text-slate-600 font-medium">
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
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Expenses Tracker
              </h1>
              <p className="text-slate-600 mt-1 text-sm sm:text-base">
                Monitor and manage your daily spending habits
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm font-semibold transform hover:scale-[1.02] w-full sm:w-auto"
          >
            <Plus className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
            Add New Expense
          </button>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <span className="text-slate-500">
            {filteredExpenses.length} expenses
          </span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="text-slate-500">
            Total: {user?.preferences?.currency || "USD"}{" "}
            {totalAmount.toFixed(2)}
          </span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="text-slate-500">
            This month: {user?.preferences?.currency || "USD"}{" "}
            {monthlyTotal.toFixed(2)}
          </span>
        </div>
      </header>

      {/* Simplified Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm space-y-3 sm:space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={filters.searchTerm}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                searchTerm: e.target.value,
              }))
            }
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          />
        </div>

        {/* Filters and Sort */}
        <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
          {/* First Row - Category and Period Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Category Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700">
                Category:
              </label>
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-md focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700">
                Period:
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    dateRange: e.target.value as FilterConfig["dateRange"],
                  }))
                }
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-md focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
              >
                <option value="all">All Time</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="custom">Custom Month</option>
              </select>
            </div>
          </div>

          {/* Custom Month/Year Selection */}
          {filters.dateRange === "custom" && (
            <div className="flex gap-2">
              <select
                value={filters.customMonth}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    customMonth: parseInt(e.target.value),
                  }))
                }
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-md focus:ring-2 focus:ring-blue-500 flex-1"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2025, i, 1).toLocaleString("default", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
              <select
                value={filters.customYear}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    customYear: parseInt(e.target.value),
                  }))
                }
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-md focus:ring-2 focus:ring-blue-500 flex-1"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 sm:ml-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <label className="text-xs sm:text-sm font-medium text-gray-700">
                Sort by:
              </label>
              <select
                value={sortConfig.key}
                onChange={(e) =>
                  setSortConfig((prev) => ({
                    ...prev,
                    key: e.target.value as SortConfig["key"],
                  }))
                }
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-md focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="description">Description</option>
                <option value="category">Category</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setSortConfig((prev) => ({
                    ...prev,
                    direction: prev.direction === "asc" ? "desc" : "asc",
                  }))
                }
                className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md text-xs sm:text-sm text-gray-700 bg-white hover:bg-gray-50 flex-1 sm:flex-none"
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
                className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md text-xs sm:text-sm text-gray-700 bg-white hover:bg-gray-50"
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
        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Error Occurred
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-600"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Expenses Table or Empty State */}
      {filteredExpenses.length === 0 && !loading && !error ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-white " />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {expenses.length === 0
                ? "No Expenses Yet"
                : "No Expenses Found"}
            </h3>
            <p className="text-gray-600 mb-4">
              {expenses.length === 0
                ? "Start tracking your spending by adding your first expense."
                : "Try adjusting your search or filter criteria."}
            </p>
            {expenses.length === 0 && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm font-semibold transform hover:scale-[1.02]"
              >
                <Plus className="mr-2 w-4 h-4" />
                Add Your First Expense
              </button>
            )}
          </div>
        </div>
      ) : (
        !loading &&
        !error && (
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            {/* Mobile Card View */}
            <div className="block sm:hidden">
              <div className="divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <div key={expense._id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => setEditExpenseData(expense)}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 flex items-center space-x-1 group"
                        >
                          <span className="truncate">
                            {expense.description}
                          </span>
                          <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </button>
                        <div className="mt-1 flex items-center space-x-2">
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded font-medium">
                            {expense.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <div className="text-gray-600">
                          Date:{" "}
                          {format(parseISO(expense.date), "MMM d, yyyy")}
                        </div>
                        <div className="font-semibold text-gray-900">
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
                        className="text-rose-600 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 transition-all duration-200 p-2 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-500"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <div className="flex items-center space-x-1">
                        <Receipt className="w-4 h-4" />
                        <span>Description</span>
                      </div>
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Date</span>
                      </div>
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      <div className="flex items-center justify-end space-x-1">
                        <DollarSign className="w-4 h-4" />
                        <span>Amount</span>
                      </div>
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense._id} className="hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setEditExpenseData(expense)}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 flex items-center space-x-1 group"
                        >
                          <span>{expense.description}</span>
                          <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded font-medium">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {format(parseISO(expense.date), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-gray-900">
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
                          className="text-rose-600 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 transition-all duration-200 p-2 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-500 transform hover:scale-105"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      <ConfirmModal
        isOpen={isModalOpen}
        onConfirm={handleDelete}
        onCancel={() => setIsModalOpen(false)}
        title="Delete Expense?"
        message="Are you sure you want to delete this expense?"
      />

      {(isAddModalOpen || editExpenseData) && (
        <ExpenseModal
          isOpen={isAddModalOpen || !!editExpenseData}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditExpenseData(null);
          }}
          onSubmit={handleSubmit}
          initialData={
            editExpenseData
              ? {
                  description: editExpenseData.description,
                  amount: editExpenseData.amount,
                  date: editExpenseData.date,
                  category: editExpenseData.category,
                  notes: editExpenseData.notes,
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

export default Expenses;
