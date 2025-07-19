import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Calendar,
  Receipt,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import ExpenseInterface from "../types/ExpenseInterface";
import BillInterface from "../types/BillInterface";

interface MonthlyData {
  expenses: {
    expenses: ExpenseInterface[];
    summary: {
      totalAmount: number;
      totalCount: number;
      categoryBreakdown: Array<{
        category: string;
        total: number;
        count: number;
      }>;
      averageAmount: number;
    };
  };
  bills: {
    bills: BillInterface[];
    summary: {
      totalAmount: number;
      paidAmount: number;
      unpaidAmount: number;
      totalCount: number;
      paidCount: number;
      unpaidCount: number;
    };
  };
}

const MonthlyBreakdown: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [activeTab, setActiveTab] = useState<"expenses" | "bills">(
    "expenses"
  );

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth() + 1;

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      setError("");

      const [expensesRes, billsRes] = await Promise.all([
        axios.get(`/api/expenses/monthly/${currentYear}/${currentMonth}`),
        axios.get(`/api/bills/monthly/${currentYear}/${currentMonth}`),
      ]);

      setMonthlyData({
        expenses: expensesRes.data,
        bills: billsRes.data,
      });
    } catch (err: any) {
      console.error("Error fetching monthly data:", err);
      setError(
        err.response?.data?.message || "Failed to fetch monthly data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
  }, [currentYear, currentMonth]);

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const formatCurrency = (amount: number) => {
    return `${user?.preferences?.currency || "USD"} ${amount.toFixed(2)}`;
  };

  const getBillStatus = (dueDate: string, isPaid: boolean) => {
    if (isPaid) {
      return {
        text: "Paid",
        color: "bg-green-100 text-green-800 border-green-200",
        icon: <CheckCircle className="w-4 h-4 mr-1.5" />,
      };
    }

    try {
      const parsedDate = parseISO(dueDate);
      if (!isValid(parsedDate)) throw new Error("Invalid date");

      const today = new Date();
      if (parsedDate < today) {
        return {
          text: "Overdue",
          color: "bg-red-100 text-red-800 border-red-200",
          icon: <XCircle className="w-4 h-4 mr-1.5" />,
        };
      }
      return {
        text: "Pending",
        color: "bg-amber-100 text-amber-800 border-amber-200",
        icon: <Clock className="w-4 h-4 mr-1.5" />,
      };
    } catch (err) {
      return {
        text: "Invalid Date",
        color: "bg-gray-100 text-gray-800 border-gray-200",
        icon: <XCircle className="w-4 h-4 mr-1.5" />,
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64 sm:min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
        <p className="text-red-800 text-sm sm:text-base">{error}</p>
        <button
          onClick={fetchMonthlyData}
          className="mt-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm sm:text-base min-h-[44px] flex items-center justify-center"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile-optimized Header with Month Navigation */}
      <header className="flex flex-col gap-4 sm:gap-6">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Monthly Breakdown
            </h1>
            <p className="text-slate-600 mt-0.5 sm:mt-1 text-sm sm:text-base">
              Detailed view of your monthly expenses and bills
            </p>
          </div>
        </div>

        {/* Mobile-optimized Month Navigation */}
        <div className="flex items-center justify-center space-x-3 sm:space-x-4">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-2 sm:p-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex items-center space-x-2 bg-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-300 flex-1 sm:flex-none justify-center">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
            <span className="font-semibold text-base sm:text-lg">
              {monthNames[currentMonth - 1]} {currentYear}
            </span>
          </div>

          <button
            onClick={() => navigateMonth("next")}
            className="p-2 sm:p-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Mobile-optimized Summary Cards */}
      {monthlyData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {/* Expenses Summary */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-green-200 shadow-lg">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-green-700">
                Expenses
              </span>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-800 break-words">
                {formatCurrency(monthlyData.expenses.summary.totalAmount)}
              </p>
              <p className="text-xs sm:text-sm text-green-600">
                {monthlyData.expenses.summary.totalCount} transactions
              </p>
            </div>
          </div>

          {/* Bills Total */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-blue-200 shadow-lg">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
                <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-blue-700">
                Bills Total
              </span>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-800 break-words">
                {formatCurrency(monthlyData.bills.summary.totalAmount)}
              </p>
              <p className="text-xs sm:text-sm text-blue-600">
                {monthlyData.bills.summary.totalCount} bills
              </p>
            </div>
          </div>

          {/* Bills Paid */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-emerald-200 shadow-lg">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-emerald-700">
                Bills Paid
              </span>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-800 break-words">
                {formatCurrency(monthlyData.bills.summary.paidAmount)}
              </p>
              <p className="text-xs sm:text-sm text-emerald-600">
                {monthlyData.bills.summary.paidCount} paid
              </p>
            </div>
          </div>

          {/* Bills Unpaid */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-red-200 shadow-lg">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-600">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-red-700">
                Bills Unpaid
              </span>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-800 break-words">
                {formatCurrency(monthlyData.bills.summary.unpaidAmount)}
              </p>
              <p className="text-xs sm:text-sm text-red-600">
                {monthlyData.bills.summary.unpaidCount} pending
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-optimized Tabs */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/50 shadow-lg">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
              activeTab === "expenses"
                ? "text-green-600 border-b-2 border-green-600 bg-green-50"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Expenses</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("bills")}
            className={`flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
              activeTab === "bills"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
              <Receipt className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Bills</span>
            </div>
          </button>
        </div>

        <div className="p-3 sm:p-4 lg:p-6">
          {activeTab === "expenses" && monthlyData && (
            <div className="space-y-4 sm:space-y-6">
              {/* Mobile-optimized Category Breakdown */}
              {monthlyData.expenses.summary.categoryBreakdown.length >
                0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 sm:p-5 lg:p-6 rounded-lg sm:rounded-xl border border-green-200">
                  <h3 className="text-base sm:text-lg font-semibold text-green-800 mb-3 sm:mb-4 flex items-center">
                    <PieChart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Category Breakdown
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {monthlyData.expenses.summary.categoryBreakdown.map(
                      (category, index) => (
                        <div
                          key={index}
                          className="bg-white p-3 sm:p-4 rounded-lg border border-green-200"
                        >
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 space-y-1 sm:space-y-0">
                            <span className="font-medium text-slate-800 text-sm sm:text-base">
                              {category.category}
                            </span>
                            <span className="text-xs sm:text-sm text-slate-600">
                              {category.count} items
                            </span>
                          </div>
                          <p className="text-base sm:text-lg font-bold text-green-600 break-words">
                            {formatCurrency(category.total)}
                          </p>
                          <div className="mt-2 bg-green-100 rounded-full h-1.5 sm:h-2">
                            <div
                              className="bg-green-500 h-1.5 sm:h-2 rounded-full"
                              style={{
                                width: `${
                                  (category.total /
                                    monthlyData.expenses.summary
                                      .totalAmount) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Mobile-optimized Expenses List */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 sm:mb-4 flex items-center">
                  <ArrowUpDown className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Expense Transactions
                </h3>
                {monthlyData.expenses.expenses.length > 0 ? (
                  <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 overflow-hidden">
                    {/* Mobile Card View */}
                    <div className="block sm:hidden">
                      <div className="divide-y divide-slate-200">
                        {monthlyData.expenses.expenses.map((expense) => (
                          <div
                            key={expense._id}
                            className="p-4 hover:bg-slate-50"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">
                                  {expense.description}
                                </p>
                                <p className="text-xs text-slate-600 mt-1">
                                  {format(
                                    parseISO(expense.date),
                                    "MMM d, yyyy"
                                  )}
                                </p>
                              </div>
                              <p className="text-sm font-bold text-slate-800 ml-2">
                                {formatCurrency(expense.amount)}
                              </p>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {expense.category}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {monthlyData.expenses.expenses.map((expense) => (
                            <tr
                              key={expense._id}
                              className="hover:bg-slate-50"
                            >
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                {format(
                                  parseISO(expense.date),
                                  "MMM d, yyyy"
                                )}
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-sm text-slate-800">
                                {expense.description}
                              </td>
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {expense.category}
                                </span>
                              </td>
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-800">
                                {formatCurrency(expense.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-6 sm:p-8 text-center">
                    <TrendingDown className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 mx-auto mb-3 sm:mb-4" />
                    <p className="text-slate-600 text-sm sm:text-base">
                      No expenses found for this month
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "bills" && monthlyData && (
            <div className="space-y-4 sm:space-y-6">
              {/* Mobile-optimized Bills List */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 sm:mb-4 flex items-center">
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Bills for {monthNames[currentMonth - 1]} {currentYear}
                </h3>
                {monthlyData.bills.bills.length > 0 ? (
                  <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 overflow-hidden">
                    {/* Mobile Card View */}
                    <div className="block lg:hidden">
                      <div className="divide-y divide-slate-200">
                        {monthlyData.bills.bills.map((bill) => {
                          const status = getBillStatus(
                            bill.dueDate,
                            bill.isPaid
                          );
                          return (
                            <div
                              key={bill._id}
                              className="p-4 hover:bg-slate-50"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">
                                    {bill.name}
                                  </p>
                                  <p className="text-xs text-slate-600 mt-1">
                                    Due:{" "}
                                    {format(
                                      parseISO(bill.dueDate),
                                      "MMM d, yyyy"
                                    )}
                                  </p>
                                </div>
                                <p className="text-sm font-bold text-slate-800 ml-2">
                                  {formatCurrency(bill.amount)}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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
                          );
                        })}
                      </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Bill Name
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Due Date
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {monthlyData.bills.bills.map((bill) => {
                            const status = getBillStatus(
                              bill.dueDate,
                              bill.isPaid
                            );
                            return (
                              <tr
                                key={bill._id}
                                className="hover:bg-slate-50"
                              >
                                <td className="px-4 sm:px-6 py-4 text-sm font-medium text-slate-800">
                                  {bill.name}
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                  {format(
                                    parseISO(bill.dueDate),
                                    "MMM d, yyyy"
                                  )}
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {bill.category}
                                  </span>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center text-xs px-3 py-1.5 rounded-full font-semibold border ${status.color} shadow-sm`}
                                  >
                                    {status.icon}
                                    {status.text}
                                  </span>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-800">
                                  {formatCurrency(bill.amount)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-6 sm:p-8 text-center">
                    <Receipt className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 mx-auto mb-3 sm:mb-4" />
                    <p className="text-slate-600 text-sm sm:text-base">
                      No bills found for this month
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyBreakdown;
