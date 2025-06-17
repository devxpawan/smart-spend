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
  dateRange: "all" | "thisMonth" | "lastMonth";
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
    <div className="space-y-6">
      {/* Enhanced Header with Stats */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <TrendingDown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Expenses Tracker
            </h1>
            <p className="text-slate-600 mt-1">
              Monitor and manage your daily spending habits
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-slate-500">
                {filteredExpenses.length} expenses
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-500">
                Total: {user?.preferences?.currency || "USD"}{" "}
                {totalAmount.toFixed(2)}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-500">
                This month: {user?.preferences?.currency || "USD"}{" "}
                {monthlyTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm font-semibold transform hover:scale-[1.02]"
        >
          <Plus className="mr-2 w-5 h-5" />
          Add New Expense
        </button>
      </header>

      {/* Enhanced Filters */}
      <div className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-white/50 shadow-lg space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
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
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/80 backdrop-blur-sm"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">
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
              className="form-select px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
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
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">
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
              className="form-select px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="all">All Time</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2 ml-auto">
            <Filter className="w-4 h-4 text-slate-500" />
            <label className="text-sm font-medium text-slate-700">
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
              className="form-select px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="description">Description</option>
              <option value="category">Category</option>
            </select>

            <button
              onClick={() =>
                setSortConfig((prev) => ({
                  ...prev,
                  direction: prev.direction === "asc" ? "desc" : "asc",
                }))
              }
              className="flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              title="Toggle sort order"
            >
              {sortConfig.direction === "asc" ? (
                <ArrowDownAZ className="w-4 h-4 mr-1.5" />
              ) : (
                <ArrowUpZA className="w-4 h-4 mr-1.5" />
              )}
              {sortConfig.direction === "asc" ? "Asc" : "Desc"}
            </button>

            <button
              onClick={fetchExpenses}
              className="flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
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

      {/* Error Display */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-400 p-6 rounded-xl shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="text-red-600 w-5 h-5 flex-shrink-0" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-800">
                  Error Occurred
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-600 focus:outline-none"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Expenses Table or Empty State */}
      {filteredExpenses.length === 0 && !loading && !error ? (
        <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-xl border border-slate-200">
          <div className="max-w-md mx-auto">
            <div className="h-20 w-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <DollarSign className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">
              {expenses.length === 0
                ? "No Expenses Yet"
                : "No Expenses Found"}
            </h3>
            <p className="text-slate-600 mb-6 leading-relaxed">
              {expenses.length === 0
                ? "Start tracking your spending by adding your first expense. Keep control of your finances and identify spending patterns."
                : "Try adjusting your search or filter criteria to find the expenses you're looking for."}
            </p>
            {expenses.length === 0 && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm font-semibold transform hover:scale-[1.02]"
              >
                <Plus className="mr-2 w-5 h-5" />
                Add Your First Expense
              </button>
            )}
          </div>
        </div>
      ) : (
        !loading &&
        !error && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <Receipt className="w-4 h-4" />
                        <span>Description</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>Date</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <div className="flex items-center justify-end space-x-2">
                        <DollarSign className="w-4 h-4" />
                        <span>Amount</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-slate-200">
                  {filteredExpenses.map((expense) => (
                    <tr
                      key={expense._id}
                      className="hover:bg-white/80 transition-all duration-200 group"
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <button
                          onClick={() => setEditExpenseData(expense)}
                          className="text-sm font-semibold text-slate-900 hover:text-green-600 transition-colors duration-200 flex items-center space-x-2 group focus:outline-none focus:ring-2 focus:ring-green-500 rounded p-1"
                        >
                          <span>{expense.description}</span>
                          <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-medium">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600 font-medium">
                        {format(parseISO(expense.date), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-slate-800">
                          {user?.preferences?.currency || "USD"}{" "}
                          {typeof expense.amount === "number"
                            ? expense.amount.toFixed(2)
                            : "0.00"}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
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
