import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios, { AxiosResponse } from "axios";
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowDownAZ,
  ArrowUpZA,
  Receipt,
  Edit3,
  Calendar,
  DollarSign,
  Filter,
  Search,
  RefreshCw,
} from "lucide-react";
import {
  format,
  parseISO,
  isPast,
  addDays,
  isValid,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import ConfirmModal from "../components/ConfirmModal";
import BillInterface from "../types/BillInterface";
import { useAuth } from "../contexts/AuthContext";
import BillModal from "../components/BillModal";
import BillFormData from "../types/BillFormData";

// Types
interface SortConfig {
  key: "dueDate" | "amount" | "status" | "name";
  direction: "asc" | "desc";
}

interface FilterConfig {
  status: "all" | "paid" | "unpaid" | "overdue" | "upcoming";
  searchTerm: string;
  dateRange: "all" | "thisMonth" | "lastMonth" | "custom";
  customMonth?: number;
  customYear?: number;
}

const Bills: React.FC = () => {
  const [bills, setBills] = useState<BillInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    id: string | null;
  }>({
    open: false,
    id: null,
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editBillData, setEditBillData] = useState<BillInterface | null>(
    null
  );

  // Enhanced filtering and sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "dueDate",
    direction: "asc",
  });
  const [filters, setFilters] = useState<FilterConfig>({
    status: "all",
    searchTerm: "",
    dateRange: "all",
    customMonth: new Date().getMonth() + 1,
    customYear: new Date().getFullYear(),
  });

  const { user } = useAuth();

  useEffect(() => {
    fetchBills();
  }, []);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response: AxiosResponse<{ bills: BillInterface[] }> =
        await axios.get("/api/bills");
      const data = Array.isArray(response.data.bills)
        ? response.data.bills
        : response.data.bills || [];
      setBills(
        data.map((bill: BillInterface) => ({
          ...bill,
          isPaid: bill.isPaid ?? false,
        }))
      );
      setError("");
    } catch (err) {
      setError("Failed to fetch bills");
      console.error("Error fetching bills:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmModal.id) return;
    try {
      await axios.delete(`/api/bills/${confirmModal.id}`);
      setBills((prev) =>
        prev.filter((bill) => bill._id !== confirmModal.id)
      );
      setError("");
    } catch (err) {
      setError("Failed to delete bill");
      console.error("Error deleting bill:", err);
    } finally {
      setConfirmModal({ open: false, id: null });
    }
  };

  const handleTogglePaid = async (id: string, currentStatus: boolean) => {
    try {
      setTogglingId(id);
      let response: AxiosResponse<BillInterface>;
      if (!currentStatus) {
        response = await axios.put(`/api/bills/${id}/pay`);
        await fetchBills();
      } else {
        response = await axios.put(`/api/bills/${id}`, { isPaid: false });
        setBills((prevBills) =>
          prevBills.map((bill) =>
            bill._id === id
              ? { ...bill, isPaid: response.data.isPaid }
              : bill
          )
        );
      }
      setError("");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Failed to update bill status";
      setError(errorMessage);
      console.error("Error updating bill status:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const getBillStatus = useCallback((dueDate: string, isPaid: boolean) => {
    if (isPaid) {
      return {
        text: "Paid",
        color: "bg-emerald-100 text-emerald-800 border-emerald-200",
        icon: <CheckCircle className="w-4 h-4 mr-1.5" />,
        priority: 4,
      };
    }
    try {
      const parsedDate = parseISO(dueDate);
      if (!isValid(parsedDate)) throw new Error("Invalid date");

      if (isPast(parsedDate)) {
        return {
          text: "Overdue",
          color: "bg-red-100 text-red-800 border-red-200",
          icon: <XCircle className="w-4 h-4 mr-1.5" />,
          priority: 1,
        };
      }
      if (isPast(addDays(parsedDate, -3))) {
        return {
          text: "Due Soon",
          color: "bg-amber-100 text-amber-800 border-amber-200",
          icon: <Clock className="w-4 h-4 mr-1.5" />,
          priority: 2,
        };
      }
      return {
        text: "Upcoming",
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: <Clock className="w-4 h-4 mr-1.5" />,
        priority: 3,
      };
    } catch (err) {
      console.error("Invalid dueDate:", dueDate);
      return {
        text: "Invalid Date",
        color: "bg-gray-100 text-gray-800 border-gray-200",
        icon: <AlertCircle className="w-4 h-4 mr-1.5" />,
        priority: 0,
      };
    }
  }, []);

  // Memoized filtered and sorted bills
  const { filteredBills, totalAmount, overdueCount } = useMemo(() => {
    let filtered = bills.filter((bill) => {
      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (
          !bill.name.toLowerCase().includes(searchLower) &&
          !bill.category.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== "all") {
        const status = getBillStatus(bill.dueDate, bill.isPaid);
        switch (filters.status) {
          case "paid":
            if (!bill.isPaid) return false;
            break;
          case "unpaid":
            if (bill.isPaid) return false;
            break;
          case "overdue":
            if (bill.isPaid || status.text !== "Overdue") return false;
            break;
          case "upcoming":
            if (
              bill.isPaid ||
              (status.text !== "Upcoming" && status.text !== "Due Soon")
            )
              return false;
            break;
        }
      }

      // Date range filter
      if (filters.dateRange !== "all") {
        const billDate = parseISO(bill.dueDate);
        if (!isValid(billDate)) return false;

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

        if (!isWithinInterval(billDate, dateRange)) {
          return false;
        }
      }

      return true;
    });

    // Sort bills
    filtered.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (sortConfig.key) {
        case "dueDate":
          valueA = new Date(a.dueDate).getTime();
          valueB = new Date(b.dueDate).getTime();
          break;
        case "amount":
          valueA = a.amount;
          valueB = b.amount;
          break;
        case "status":
          valueA = getBillStatus(a.dueDate, a.isPaid).priority;
          valueB = getBillStatus(b.dueDate, b.isPaid).priority;
          break;
        case "name":
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
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
      (sum, bill) => sum + (bill.amount || 0),
      0
    );
    const overdue = filtered.filter(
      (bill) =>
        !bill.isPaid &&
        getBillStatus(bill.dueDate, bill.isPaid).text === "Overdue"
    ).length;

    return {
      filteredBills: filtered,
      totalAmount: total,
      overdueCount: overdue,
    };
  }, [bills, filters, sortConfig, getBillStatus]);

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  const handleSubmit = useCallback(
    async (data: BillFormData) => {
      try {
        setLoading(true);
        if (editBillData) {
          await axios.put(`/api/bills/${editBillData._id}`, data);
        } else {
          await axios.post("/api/bills", data);
        }
        await fetchBills();
      } catch (err) {
        console.error("Error submitting bill:", err);
        setError("Failed to submit bill");
      } finally {
        setLoading(false);
        setIsAddModalOpen(false);
        setEditBillData(null);
      }
    },
    [editBillData, fetchBills]
  );

  if (loading && bills.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-slate-600 font-medium">
            Loading your bills...
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
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-orange-500 flex items-center justify-center">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Bills Management
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Track and manage your upcoming bills and payments
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 text-sm font-semibold transform hover:scale-[1.02] w-full sm:w-auto"
          >
            <Plus className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
            Add New Bill
          </button>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <span className="text-gray-500">
            {filteredBills.length} bills
          </span>
          <span className="text-gray-500 hidden sm:inline">•</span>
          <span className="text-gray-500">
            Total: {user?.preferences?.currency || "USD"}{" "}
            {totalAmount.toFixed(2)}
          </span>
          {overdueCount > 0 && (
            <>
              <span className="text-gray-500 hidden sm:inline">•</span>
              <span className="text-red-600 font-medium">
                {overdueCount} overdue
              </span>
            </>
          )}
        </div>
      </header>

      {/* Simplified Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm space-y-3 sm:space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search bills..."
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
          {/* First Row - Status and Period Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Status Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700">
                Status:
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: e.target.value as FilterConfig["status"],
                  }))
                }
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-md focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
              >
                <option value="all">All Bills</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="upcoming">Upcoming</option>
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
                className="form-select px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex-1"
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
                className="form-select px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex-1"
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
              <Filter className="w-4 h-4 text-slate-500" />
              <label className="text-xs sm:text-sm font-medium text-slate-700">
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
                className="form-select px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex-1 sm:flex-none"
              >
                <option value="dueDate">Due Date</option>
                <option value="amount">Amount</option>
                <option value="status">Status</option>
                <option value="name">Name</option>
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
                className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors flex-1 sm:flex-none"
                title="Toggle sort order"
              >
                {sortConfig.direction === "asc" ? (
                  <ArrowDownAZ className="w-4 h-4 sm:mr-1.5" />
                ) : (
                  <ArrowUpZA className="w-4 h-4 sm:mr-1.5" />
                )}
                <span className="hidden sm:inline">
                  {sortConfig.direction === "asc" ? "Asc" : "Desc"}
                </span>
              </button>

              <button
                onClick={fetchBills}
                className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                title="Refresh bills"
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

      {/* Bills Table or Empty State */}
      {filteredBills.length === 0 && !loading && !error ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {bills.length === 0 ? "No Bills Yet" : "No Bills Found"}
            </h3>
            <p className="text-gray-600 mb-4">
              {bills.length === 0
                ? "Start managing your finances by adding your first bill."
                : "Try adjusting your search or filter criteria."}
            </p>
            {bills.length === 0 && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-6 py-3 rounded-xl bg-orange-500 text-white  hover:bg-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 text-sm font-semibold transform hover:scale-[1.02]"
              >
                <Plus className="mr-2 w-5 h-5" />
                Add Your First Bill
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
                {filteredBills.map((bill) => {
                  const status = getBillStatus(bill.dueDate, bill.isPaid);
                  return (
                    <div key={bill._id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => setEditBillData(bill)}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 flex items-center space-x-1 group"
                          >
                            <span className="truncate">{bill.name}</span>
                            <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </button>
                          <div className="mt-1 flex items-center space-x-2">
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded font-medium">
                              {bill.category}
                            </span>
                            <span
                              className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-semibold border ${status.color} shadow-sm`}
                            >
                              {status.icon}
                              {status.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <div className="text-gray-600">
                            Due:{" "}
                            {format(parseISO(bill.dueDate), "MMM d, yyyy")}
                          </div>
                          <div className="font-semibold text-gray-900">
                            {user?.preferences?.currency || "USD"}{" "}
                            {bill?.amount?.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-2">
                        <button
                          onClick={(e) =>
                            handleActionClick(e, () =>
                              handleTogglePaid(bill._id, bill.isPaid)
                            )
                          }
                          className={`flex-1 text-xs px-3 py-2 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 shadow-sm ${
                            bill.isPaid
                              ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 focus:ring-slate-400"
                              : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 focus:ring-emerald-500 shadow-md hover:shadow-lg"
                          } ${
                            togglingId === bill._id
                              ? "opacity-60 cursor-not-allowed"
                              : ""
                          }`}
                          disabled={togglingId === bill._id}
                        >
                          {togglingId === bill._id ? (
                            <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                          ) : bill.isPaid ? (
                            "Mark Unpaid"
                          ) : (
                            "Mark Paid"
                          )}
                        </button>
                        <button
                          onClick={(e) =>
                            handleActionClick(e, () =>
                              setConfirmModal({
                                open: true,
                                id: bill._id,
                              })
                            )
                          }
                          className="text-rose-600 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 transition-all duration-200 p-2 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-500"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      <div className="flex items-center space-x-1">
                        <Receipt className="w-4 h-4" />
                        <span>Bill Name</span>
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      Category
                    </th>
                    <th
                      scope="col"
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Due Date</span>
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-4 lg:px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      <div className="flex items-center justify-end space-x-2">
                        <DollarSign className="w-4 h-4" />
                        <span>Amount</span>
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-4 lg:px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-4 lg:px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-slate-200">
                  {filteredBills.map((bill) => {
                    const status = getBillStatus(
                      bill.dueDate,
                      bill.isPaid
                    );
                    return (
                      <tr key={bill._id} className="hover:bg-gray-50">
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setEditBillData(bill)}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 flex items-center space-x-1 group"
                          >
                            <span>{bill.name}</span>
                            <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded font-medium">
                            {bill.category}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {format(parseISO(bill.dueDate), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {user?.preferences?.currency || "USD"}{" "}
                            {bill?.amount?.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center text-xs px-3 py-1.5 rounded-full font-semibold border ${status.color} shadow-sm`}
                          >
                            {status.icon}
                            {status.text}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={(e) =>
                                handleActionClick(e, () =>
                                  handleTogglePaid(bill._id, bill.isPaid)
                                )
                              }
                              className={`text-xs px-3 lg:px-4 py-2 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 shadow-sm ${
                                bill.isPaid
                                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 focus:ring-slate-400"
                                  : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 focus:ring-emerald-500 shadow-md hover:shadow-lg"
                              } ${
                                togglingId === bill._id
                                  ? "opacity-60 cursor-not-allowed"
                                  : "transform hover:scale-105"
                              }`}
                              disabled={togglingId === bill._id}
                              title={
                                bill.isPaid
                                  ? "Mark as Unpaid"
                                  : "Mark as Paid"
                              }
                            >
                              {togglingId === bill._id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : bill.isPaid ? (
                                "Mark Unpaid"
                              ) : (
                                "Mark Paid"
                              )}
                            </button>
                            <button
                              onClick={(e) =>
                                handleActionClick(e, () =>
                                  setConfirmModal({
                                    open: true,
                                    id: bill._id,
                                  })
                                )
                              }
                              className="text-rose-600 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 transition-all duration-200 p-2 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-500 transform hover:scale-105"
                              title="Delete Bill"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      <ConfirmModal
        isOpen={confirmModal.open}
        onCancel={() => setConfirmModal({ open: false, id: null })}
        onConfirm={handleDeleteConfirmed}
        message="This action cannot be undone. Do you really want to delete this bill?"
      />

      {(isAddModalOpen || editBillData) && (
        <BillModal
          isOpen={isAddModalOpen || !!editBillData}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditBillData(null);
          }}
          onSubmit={handleSubmit}
          initialData={
            editBillData
              ? {
                  name: editBillData.name,
                  amount: editBillData.amount,
                  dueDate: editBillData.dueDate,
                  category: editBillData.category,
                  isPaid: editBillData.isPaid,
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

export default Bills;
