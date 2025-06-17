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
import { format, parseISO, isPast, addDays, isValid } from "date-fns";
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
  const [editBillData, setEditBillData] = useState<BillInterface | null>(null);

  // Enhanced filtering and sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "dueDate",
    direction: "asc",
  });
  const [filters, setFilters] = useState<FilterConfig>({
    status: "all",
    searchTerm: "",
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
        if (!bill.name.toLowerCase().includes(searchLower) &&
            !bill.category.toLowerCase().includes(searchLower)) {
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
            if (bill.isPaid || (status.text !== "Upcoming" && status.text !== "Due Soon")) return false;
            break;
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

    const total = filtered.reduce((sum, bill) => sum + (bill.amount || 0), 0);
    const overdue = filtered.filter(bill => 
      !bill.isPaid && getBillStatus(bill.dueDate, bill.isPaid).text === "Overdue"
    ).length;

    return { 
      filteredBills: filtered, 
      totalAmount: total, 
      overdueCount: overdue 
    };
  }, [bills, filters, sortConfig, getBillStatus]);

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  const handleSubmit = useCallback(async (data: BillFormData) => {
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
  }, [editBillData, fetchBills]);

  if (loading && bills.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-slate-600 font-medium">Loading your bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Stats */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Bills Management
            </h1>
            <p className="text-slate-600 mt-1">
              Track and manage your upcoming bills and payments
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-slate-500">{filteredBills.length} bills</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-500">
                Total: {user?.preferences?.currency || "USD"} {totalAmount.toFixed(2)}
              </span>
              {overdueCount > 0 && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-red-600 font-medium">{overdueCount} overdue</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm font-semibold transform hover:scale-[1.02]"
        >
          <Plus className="mr-2 w-5 h-5" />
          Add New Bill
        </button>
      </header>

      {/* Enhanced Filters */}
      <div className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-white/50 shadow-lg space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search bills..."
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80 backdrop-blur-sm"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Status:</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                status: e.target.value as FilterConfig['status'] 
              }))}
              className="form-select px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Bills</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2 ml-auto">
            <Filter className="w-4 h-4 text-slate-500" />
            <label className="text-sm font-medium text-slate-700">Sort by:</label>
            <select
              value={sortConfig.key}
              onChange={(e) => setSortConfig(prev => ({ 
                ...prev, 
                key: e.target.value as SortConfig['key'] 
              }))}
              className="form-select px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="dueDate">Due Date</option>
              <option value="amount">Amount</option>
              <option value="status">Status</option>
              <option value="name">Name</option>
            </select>
            
            <button
              onClick={() => setSortConfig(prev => ({ 
                ...prev, 
                direction: prev.direction === "asc" ? "desc" : "asc" 
              }))}
              className="flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
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
              onClick={fetchBills}
              className="flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              title="Refresh bills"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
                <h3 className="text-sm font-bold text-red-800">Error Occurred</h3>
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

      {/* Bills Table or Empty State */}
      {filteredBills.length === 0 && !loading && !error ? (
        <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-xl border border-slate-200">
          <div className="max-w-md mx-auto">
            <div className="h-20 w-20 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Receipt className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">
              {bills.length === 0 ? "No Bills Yet" : "No Bills Found"}
            </h3>
            <p className="text-slate-600 mb-6 leading-relaxed">
              {bills.length === 0 
                ? "Start managing your finances by adding your first bill. Keep track of due dates and never miss a payment again."
                : "Try adjusting your search or filter criteria to find the bills you're looking for."
              }
            </p>
            {bills.length === 0 && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm font-semibold transform hover:scale-[1.02]"
              >
                <Plus className="mr-2 w-5 h-5" />
                Add Your First Bill
              </button>
            )}
          </div>
        </div>
      ) : (
        !loading && !error && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <Receipt className="w-4 h-4" />
                        <span>Bill Name</span>
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>Due Date</span>
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <div className="flex items-center justify-end space-x-2">
                        <DollarSign className="w-4 h-4" />
                        <span>Amount</span>
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-slate-200">
                  {filteredBills.map((bill) => {
                    const status = getBillStatus(bill.dueDate, bill.isPaid);
                    return (
                      <tr
                        key={bill._id}
                        className="hover:bg-white/80 transition-all duration-200 group"
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <button
                            onClick={() => setEditBillData(bill)}
                            className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors duration-200 flex items-center space-x-2 group focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1"
                          >
                            <span>{bill.name}</span>
                            <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-medium">
                            {bill.category}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600 font-medium">
                          {format(parseISO(bill.dueDate), "MMM d, yyyy")}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right">
                          <span className="text-sm font-bold text-slate-800">
                            {user?.preferences?.currency || "USD"} {bill?.amount?.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center text-xs px-3 py-1.5 rounded-full font-semibold border ${status.color} shadow-sm`}
                          >
                            {status.icon}
                            {status.text}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={(e) =>
                                handleActionClick(e, () =>
                                  handleTogglePaid(bill._id, bill.isPaid)
                                )
                              }
                              className={`text-xs px-4 py-2 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 shadow-sm ${
                                bill.isPaid
                                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 focus:ring-slate-400"
                                  : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 focus:ring-emerald-500 shadow-md hover:shadow-lg"
                              } ${
                                togglingId === bill._id
                                  ? "opacity-60 cursor-not-allowed"
                                  : "transform hover:scale-105"
                              }`}
                              disabled={togglingId === bill._id}
                              title={bill.isPaid ? "Mark as Unpaid" : "Mark as Paid"}
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
