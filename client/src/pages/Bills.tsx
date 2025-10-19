import axios, { AxiosResponse } from "axios";
import {
  addDays,
  endOfMonth,
  format,
  isPast,
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
  CheckCircle,
  Clock,
  DollarSign,
  Edit3,
  Filter,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import BillBulkEditModal, {
  BulkEditUpdates,
} from "../components/BillBulkEditModal";
import BillModal from "../components/BillModal";
import ConfirmModal from "../components/ConfirmModal";
import CustomSelect from "../components/CustomSelect";
import { useAuth } from "../contexts/auth-exports";
import { billCategories } from "../lib/billCategories";
import BillFormData from "../types/BillFormData";
import BillInterface from "../types/BillInterface";

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
  const [deletingId, setDeletingId] = useState<string | null>(null); // For individual delete
  const [isBulkDeleting, setIsBulkDeleting] = useState(false); // For bulk delete
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editBillData, setEditBillData] = useState<BillInterface | null>(null);

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

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isBulkEditing, setIsBulkEditing] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 12;

  const { user } = useAuth();

  const fetchBills = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleDeleteConfirmed = async () => {
    if (!confirmModal.id) return;
    const idToDelete = confirmModal.id;
    setDeletingId(idToDelete);
    try {
      await axios.delete(`/api/bills/${idToDelete}`);
      setBills((prev) => prev.filter((bill) => bill._id !== idToDelete));
      setError("");
    } catch {
      setError("Failed to delete bill");
    } finally {
      setConfirmModal({ open: false, id: null });
      setDeletingId(null);
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
            bill._id === id ? { ...bill, isPaid: response.data.isPaid } : bill
          )
        );
      }
      setError("");
    } catch (_err: unknown) {
      const axiosError = _err as { response?: { data?: { message?: string } } };
      const errorMessage =
        axiosError.response?.data?.message || "Failed to update bill status";
      setError(errorMessage);
      console.error("Error updating bill status:", _err);
    } finally {
      setTogglingId(null);
    }
  };

  const getBillStatus = useCallback((dueDate: string, isPaid: boolean) => {
    if (isPaid) {
      return {
        text: "Paid",
        color:
          "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700",
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
          color:
            "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700",
          icon: <XCircle className="w-4 h-4 mr-1.5" />,
          priority: 1,
        };
      }
      if (isPast(addDays(parsedDate, -3))) {
        return {
          text: "Due Soon",
          color:
            "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700",
          icon: <Clock className="w-4 h-4 mr-1.5" />,
          priority: 2,
        };
      }
      return {
        text: "Upcoming",
        color:
          "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700",
        icon: <Clock className="w-4 h-4 mr-1.5" />,
        priority: 3,
      };
    } catch {
      console.error("Invalid dueDate:", dueDate);
      return {
        text: "Invalid Date",
        color:
          "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
        icon: <AlertCircle className="w-4 h-4 mr-1.5" />,
        priority: 0,
      };
    }
  }, []);

  // Memoized filtered and sorted bills
  // Memoized filtered and sorted bills
  const {
    filteredBills,
    totalAmount,
    overdueCount,
    currentRecords,
    nPages,
    categories,
  } = useMemo(() => {
    const filtered = bills.filter((bill) => {
      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (!bill.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== "all") {
        const status = getBillStatus(bill.dueDate, bill.isPaid);
        switch (filters.status) {
          case "paid": {
            if (!bill.isPaid) return false;
            break;
          }
          case "unpaid": {
            if (bill.isPaid) return false;
            break;
          }
          case "overdue": {
            if (bill.isPaid || status.text !== "Overdue") return false;
            break;
          }
          case "upcoming": {
            if (
              bill.isPaid ||
              (status.text !== "Upcoming" && status.text !== "Due Soon")
            )
              return false;
            break;
          }
        }
      }

      // Date range filter
      if (filters.dateRange !== "all") {
        const billDate = parseISO(bill.dueDate);
        if (!isValid(billDate)) return false;

        const now = new Date();
        let dateRange: { start: Date; end: Date };

        switch (filters.dateRange) {
          case "thisMonth": {
            dateRange = {
              start: startOfMonth(now),
              end: endOfMonth(now),
            };
            break;
          }
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

        if (!isWithinInterval(billDate, dateRange)) {
          return false;
        }
      }

      return true;
    });

    // Sort bills
    filtered.sort((a, b) => {
      let valueA: number | string;
      let valueB: number | string;

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

    const total = filtered.reduce((sum, bill) => sum + (bill.amount || 0), 0);
    const overdue = filtered.filter(
      (bill) =>
        !bill.isPaid &&
        getBillStatus(bill.dueDate, bill.isPaid).text === "Overdue"
    ).length;
    const categories = billCategories;

    // Pagination logic
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filtered.slice(
      indexOfFirstRecord,
      indexOfLastRecord
    );
    const nPages = Math.ceil(filtered.length / recordsPerPage);

    return {
      filteredBills: filtered,
      totalAmount: total,
      overdueCount: overdue,
      currentRecords,
      nPages,
      categories,
    };
  }, [bills, filters, sortConfig, getBillStatus, currentPage]);

  // Adjust current page if it becomes invalid after filtering or deletion
  useEffect(() => {
    if (nPages === 0 && currentPage !== 1) {
      setCurrentPage(1); // If no records, ensure we are on page 1
    } else if (currentPage > nPages && nPages > 0) {
      setCurrentPage(nPages); // If current page is out of bounds, go to the last valid page
    }
  }, [nPages, currentPage]);

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
      } catch (_err) {
        console.error("Error submitting bill:", _err);
        setError("Failed to submit bill");
      } finally {
        setLoading(false);
        setIsAddModalOpen(false);
        setEditBillData(null);
      }
    },
    [editBillData, fetchBills]
  );

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentPageIds = currentRecords.map((record) => record._id);
    if (e.target.checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...currentPageIds])]);
    } else {
      setSelectedIds((prev) =>
        prev.filter((id) => !currentPageIds.includes(id))
      );
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(
        selectedIds.map((id) => axios.delete(`/api/bills/${id}`))
      );
      setBills((prev) =>
        prev.filter((bill) => !selectedIds.includes(bill._id))
      );
      setSelectedIds([]);
      setError("");
    } catch {
      setError("Failed to delete selected bills");
    } finally {
      setIsBulkDeleteModalOpen(false);
      setIsBulkDeleting(false);
    }
  };

  const handleBulkEdit = async (updates: BulkEditUpdates) => {
    if (selectedIds.length === 0 || Object.keys(updates).length === 0) return;

    setIsBulkEditing(true);

    try {
      await axios.patch("/api/bills/bulk-update", { 
        ids: selectedIds, 
        updates 
      });

      // Optimistically update local state
      setBills((prevBills) =>
        prevBills.map((bill) => {
          if (selectedIds.includes(bill._id)) {
            const updatedBill: BillInterface = { ...bill };

            if (updates.amount !== undefined)
              updatedBill.amount = parseFloat(updates.amount as string);
            if (updates.dueDate !== undefined)
              updatedBill.dueDate = updates.dueDate;
            if (updates.category !== undefined)
              updatedBill.category = updates.category;
            if (updates.isPaid !== undefined)
              updatedBill.isPaid = updates.isPaid;

            return updatedBill;
          }
          return bill;
        })
      );

      setSelectedIds([]);
      setError("");
    } catch (err) {
      setError("Failed to bulk update bills. Please refresh and try again.");
      console.error("Error during bulk update:", err);
      fetchBills(); // Fallback to refetch all data on error
    } finally {
      setIsBulkEditing(false);
      setIsBulkEditModalOpen(false);
    }
  };

  if (loading && bills.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-orange-500"></div>
          <p className="text-slate-600 dark:text-gray-300 font-medium">
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Bills Management
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm sm:text-base">
                Manage your upcoming bills and payments
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="hidden sm:inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 text-sm font-semibold transform hover:scale-[1.02] w-full sm:w-auto"
          >
            <Plus className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
            Add New Bill
          </button>
        </div>

        {/* Floating Action Button for Mobile */}
        <motion.button
          className="sm:hidden fixed bottom-6 right-6 z-40 p-4 rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          onClick={() => setIsAddModalOpen(true)}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.3 }}
          aria-label="Add New Bill"
        >
          <Plus className="w-6 h-6" />
        </motion.button>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {filteredBills.length} bills
          </span>
          <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">
            •
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            Total: {user?.preferences?.currency || "USD"}{" "}
            {totalAmount.toFixed(2)}
          </span>
          {overdueCount > 0 && (
            <>
              <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">
                •
              </span>
              <span className="text-red-600 font-medium">
                {overdueCount} overdue
              </span>
            </>
          )}
        </div>
      </header>

      {/* Simplified Filters */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border dark:border-gray-700 shadow-sm space-y-3 sm:space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search bills..."
            value={filters.searchTerm}
            onChange={(e) => {
              setFilters((prev) => ({
                ...prev,
                searchTerm: e.target.value,
              }));
              setCurrentPage(1);
            }}
            className="w-full pl-12 pr-10 py-3 bg-slate-100 dark:bg-gray-700 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-gray-800 transition-all duration-300 shadow-sm dark:text-white"
          />
          {filters.searchTerm && (
            <button
              type="button"
              onClick={() => {
                setFilters((prev) => ({ ...prev, searchTerm: "" }));
                setCurrentPage(1);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-full p-1"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters and Sort */}
        <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
          {/* First Row - Status and Period Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Status Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Status:
              </label>
              <CustomSelect
                options={[
                  { value: "all", label: "All Bills" },
                  { value: "unpaid", label: "Unpaid" },
                  { value: "paid", label: "Paid" },
                  { value: "overdue", label: "Overdue" },
                  { value: "upcoming", label: "Upcoming" },
                ]}
                value={filters.status}
                onChange={(value) => {
                  setFilters((prev) => ({
                    ...prev,
                    status: value as FilterConfig["status"],
                  }));
                  setCurrentPage(1);
                }}
                className="w-full sm:w-40"
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
                className="w-full sm:w-48"
              />
            </div>
          </div>

          {/* Custom Month/Year Selection */}
          {filters.dateRange === "custom" && (
            <div className="flex gap-2">
              <CustomSelect
                options={Array.from({ length: 12 }, (_, i) => ({
                  value: (i + 1).toString(),
                  label: new Date(
                    new Date().getFullYear(),
                    i,
                    1
                  ).toLocaleString("default", {
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
              <Filter className="w-4 h-4 text-slate-500 dark:text-gray-400" />
              <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">
                Sort by:
              </label>
              <CustomSelect
                options={[
                  { value: "dueDate", label: "Due Date" },
                  { value: "amount", label: "Amount" },
                  { value: "status", label: "Status" },
                  { value: "name", label: "Name" },
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
                className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm text-slate-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-slate-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors flex-1 sm:flex-none"
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
                className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm text-slate-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-slate-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
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
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-700 p-4 rounded-md">
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
                className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
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
        {/* Bills Table or Empty State */}
        {filteredBills.length === 0 && !loading && !error ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {bills.length === 0
                  ? "No Bills to Display"
                  : "No Matching Bills Found"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {bills.length === 0
                  ? "It looks like you haven't added any bills yet. Let's get started!"
                  : "Your current filters returned no results. Try broadening your search or adjusting the criteria."}
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-6 py-3 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 text-sm font-semibold transform hover:scale-[1.02]"
              >
                <Plus className="mr-2 w-5 h-5" />
                Add New Bill
              </button>
            </div>
          </div>
        ) : (
          !loading &&
          !error && (
            <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-lg shadow border overflow-hidden">
              {/* Mobile Card View */}
              <div className="block sm:hidden">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {currentRecords.map((bill) => {
                    const status = getBillStatus(bill.dueDate, bill.isPaid);
                    return (
                      <div
                        key={bill._id}
                        className={`p-4 space-y-3 ${
                          selectedIds.includes(bill._id)
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : ""
                        }`}
                        onClick={() => handleSelect(bill._id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                                checked={selectedIds.includes(bill._id)}
                                onChange={() => handleSelect(bill._id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) =>
                                  handleActionClick(e, () =>
                                    setEditBillData(bill)
                                  )
                                }
                                className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 flex items-center space-x-1 group"
                              >
                                <span className="truncate">{bill.name}</span>
                                <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </button>
                            </div>
                            <div className="mt-1 flex items-center space-x-2 ml-7">
                              <span className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-medium">
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

                        <div className="flex items-center justify-between text-sm ml-7">
                          <div>
                            <div className="text-gray-600 dark:text-gray-400">
                              Due:{" "}
                              {format(parseISO(bill.dueDate), "MMM d, yyyy")}
                            </div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {user?.preferences?.currency || "USD"}{" "}
                              {bill?.amount?.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2 ml-7">
                          <button
                            onClick={(e) =>
                              handleActionClick(e, () =>
                                handleTogglePaid(bill._id, bill.isPaid)
                              )
                            }
                            className={`flex-1 text-xs px-3 py-2 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 shadow-sm ${
                              bill.isPaid
                                ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 focus:ring-slate-400 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:border-gray-600"
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
                            className={`text-rose-600 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 transition-all duration-200 p-2 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-500 ${
                              deletingId === bill._id
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                            }`}
                            title="Delete Bill"
                            disabled={deletingId === bill._id}
                          >
                            {deletingId === bill._id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th
                        scope="col"
                        className="p-4 flex items-center justify-center"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          onChange={handleSelectAll}
                          checked={
                            currentRecords.length > 0 &&
                            currentRecords.every((record) =>
                              selectedIds.includes(record._id)
                            )
                          }
                          ref={(el) =>
                            el &&
                            (el.indeterminate =
                              currentRecords.some((record) =>
                                selectedIds.includes(record._id)
                              ) &&
                              !currentRecords.every((record) =>
                                selectedIds.includes(record._id)
                              ))
                          }
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"
                      >
                        <div className="flex items-center space-x-1">
                          <Receipt className="w-4 h-4" />
                          <span>Bill Name</span>
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"
                      >
                        Category
                      </th>
                      <th
                        scope="col"
                        className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"
                      >
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due Date</span>
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-4 lg:px-6 py-4 text-right text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider"
                      >
                        <div className="flex items-center justify-end space-x-2">
                          <DollarSign className="w-4 h-4" />
                          <span>Amount</span>
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-4 lg:px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 lg:px-6 py-4 text-right text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 dark:bg-gray-800/50 divide-y divide-slate-200 dark:divide-slate-700">
                    {currentRecords.map((bill) => {
                      const status = getBillStatus(bill.dueDate, bill.isPaid);
                      return (
                        <tr
                          key={bill._id}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                            selectedIds.includes(bill._id)
                              ? "bg-blue-50 dark:bg-blue-900/20"
                              : ""
                          }`}
                          onClick={() => handleSelect(bill._id)}
                        >
                          <td className="p-4 flex items-center justify-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              checked={selectedIds.includes(bill._id)}
                              onChange={() => handleSelect(bill._id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={(e) =>
                                handleActionClick(e, () =>
                                  setEditBillData(bill)
                                )
                              }
                              className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 flex items-center space-x-1 group"
                            >
                              <span>{bill.name}</span>
                              <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-medium">
                              {bill.category}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {format(parseISO(bill.dueDate), "MMM d, yyyy")}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
                                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 focus:ring-slate-400 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:border-gray-600"
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
                                className={`text-rose-600 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 transition-all duration-200 p-2 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-500 ${
                                  deletingId === bill._id
                                    ? "opacity-60 cursor-not-allowed"
                                    : "transform hover:scale-105"
                                }`}
                                title="Delete Bill"
                                disabled={deletingId === bill._id}
                              >
                                {deletingId === bill._id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {nPages > 1 && (
        <nav className="flex justify-center mt-6 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <ul className="flex items-center space-x-1 h-10 text-base">
            <li>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center justify-center px-4 h-10 font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Previous
              </button>
            </li>
            {/* Page numbers */}
            {(() => {
              const pageNumbers = [];
              const maxPagesToShow = 5; // Maximum number of page buttons to display
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
                      className={`flex items-center justify-center px-4 h-10 font-semibold border border-gray-300 transition-colors duration-150 dark:border-gray-600 ${
                        currentPage === 1
                          ? "text-white bg-orange-500 hover:bg-orange-600"
                          : "text-gray-700 bg-white hover:bg-gray-100 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
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
                      className={`flex items-center justify-center px-4 h-10 font-semibold border border-gray-300 transition-colors duration-150 dark:border-gray-600 ${
                        currentPage === i
                          ? "text-white bg-orange-500 hover:bg-orange-600"
                          : "text-gray-700 bg-white hover:bg-gray-100 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
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
                      className={`flex items-center justify-center px-4 h-10 font-semibold border border-gray-300 transition-colors duration-150 dark:border-gray-600 ${
                        currentPage === nPages
                          ? "text-white bg-orange-500 hover:bg-orange-600"
                          : "text-gray-700 bg-white hover:bg-gray-100 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
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
                className="flex items-center justify-center px-4 h-10 font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
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
        isOpen={confirmModal.open}
        onCancel={() => setConfirmModal({ open: false, id: null })}
        onConfirm={handleDeleteConfirmed}
        message="This action cannot be undone. Do you really want to delete this bill?"
      />

      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        message={`This action cannot be undone. Do you really want to delete ${selectedIds.length} bill(s)?`}
      />

      <BillBulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        onConfirm={handleBulkEdit}
        categories={categories}
        isBulkEditing={isBulkEditing}
        selectedCount={selectedIds.length}
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
                  bankAccount: editBillData.bankAccount,
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

export default Bills;
