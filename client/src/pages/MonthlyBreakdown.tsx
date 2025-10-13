import React, { useState, useEffect, useCallback, Fragment } from "react";
import axios from "axios";
import {
  Calendar,
  Receipt,
  TrendingDown,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { useAuth } from "../contexts/auth-exports";
import ExpenseInterface from "../types/ExpenseInterface";
import BillInterface from "../types/BillInterface";
import IncomeInterface from "../types/IncomeInterface";
import ExportButton from "../components/ExportButton";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "framer-motion";
import { Menu, Transition } from "@headlessui/react";
// Force recompile workaround

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
  incomes: {
    incomes: IncomeInterface[];
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
}

const MonthlyBreakdown: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [activeTab, setActiveTab] = useState<"incomes" | "expenses" | "bills">(
    "incomes"
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

  const fetchMonthlyData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [expensesRes, billsRes, incomesRes] = await Promise.all([
        axios.get(`/api/expenses/monthly/${currentYear}/${currentMonth}`),
        axios.get(`/api/bills/monthly/${currentYear}/${currentMonth}`),
        axios.get(`/api/incomes/monthly/${currentYear}/${currentMonth}`),
      ]);

      setMonthlyData({
        expenses: expensesRes.data,
        bills: billsRes.data,
        incomes: incomesRes.data,
      });
    } catch (err: unknown) {
      console.error("Error fetching monthly data:", err);
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(
        axiosError.response?.data?.message || "Failed to fetch monthly data"
      );
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, setLoading, setError, setMonthlyData]);

  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const handleExportCsv = () => {
    if (!monthlyData) return;

    const { incomes, expenses, bills } = monthlyData;

    const incomeHeader = "Type,Date,Description,Category,Amount,Status\n";
    const incomeRows = incomes.incomes
      .map((row) =>
        [
          "Income",
          format(parseISO(row.date), "yyyy-MM-dd"),
          `"${row.description.replace(/"/g, '""')}"`,
          row.category,
          row.amount,
          "N/A",
        ].join(",")
      )
      .join("\n");
    const incomeTotal = incomes.incomes.reduce((sum, item) => sum + item.amount, 0);

    const expenseHeader = "Type,Date,Description,Category,Amount,Status\n";
    const expenseRows = expenses.expenses
      .map((row) =>
        [
          "Expense",
          format(parseISO(row.date), "yyyy-MM-dd"),
          `"${row.description.replace(/"/g, '""')}"`,
          row.category,
          row.amount,
          "N/A",
        ].join(",")
      )
      .join("\n");
    const expenseTotal = expenses.expenses.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const paidBills = bills.bills.filter((bill) => bill.isPaid);
    const unpaidBills = bills.bills.filter((bill) => !bill.isPaid);

    const billHeader = "Type,Date,Description,Category,Amount,Status\n";

    const paidBillRows = paidBills
      .map((row) =>
        [
          "Bill",
          format(parseISO(row.dueDate), "yyyy-MM-dd"),
          `"${row.name.replace(/"/g, '""')}"`,
          row.category,
          row.amount,
          "Paid",
        ].join(",")
      )
      .join("\n");
    const paidBillsTotal = paidBills.reduce((sum, item) => sum + item.amount, 0);

    const unpaidBillRows = unpaidBills
      .map((row) =>
        [
          "Bill",
          format(parseISO(row.dueDate), "yyyy-MM-dd"),
          `"${row.name.replace(/"/g, '""')}"`,
          row.category,
          row.amount,
          "Unpaid",
        ].join(",")
      )
      .join("\n");
    const unpaidBillsTotal = unpaidBills.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    let csvString = "";
    if (incomes.incomes.length > 0) {
      const incomeTotalRow = `\n,,Total,,${incomeTotal.toFixed(2)},\n\n`;
      csvString +=
        "Incomes\n" + incomeHeader + incomeRows + incomeTotalRow;
    }
    if (expenses.expenses.length > 0) {
      const expenseTotalRow = `\n,,Total,,${expenseTotal.toFixed(2)},\n\n`;
      csvString +=
        "Expenses\n" + expenseHeader + expenseRows + expenseTotalRow;
    }
    if (paidBills.length > 0) {
      const paidBillsTotalRow = `\n,,Total,,${paidBillsTotal.toFixed(
        2
      )},\n\n`;
      csvString +=
        "Paid Bills\n" + billHeader + paidBillRows + paidBillsTotalRow;
    }
    if (unpaidBills.length > 0) {
      const unpaidBillsTotalRow = `\n,,Total,,${unpaidBillsTotal.toFixed(
        2
      )},\n\n`;
      csvString +=
        "Unpaid Bills\n" + billHeader + unpaidBillRows + unpaidBillsTotalRow;
    }

    if (csvString.length === 0) {
      console.log("No data to export");
      return;
    }

    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const monthName = monthNames[currentMonth - 1];
    link.setAttribute(
      "download",
      `Monthly_Breakdown_${currentYear}_${monthName}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPdf = () => {
    if (!monthlyData) return;

    const { incomes, expenses, bills } = monthlyData;
    const doc = new jsPDF();

    const monthName = monthNames[currentMonth - 1];

    // Header
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("SmartSpend", pageWidth / 2, 22, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Monthly Breakdown for ${monthName} ${currentYear}`,
      pageWidth / 2,
      30,
      { align: "center" }
    );

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(
      `Generated on: ${format(new Date(), "yyyy-MM-dd")}`,
      pageWidth / 2,
      36,
      { align: "center" }
    );

    // Summary Info
    let summaryY = 45;
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(
      `Total Income: ${formatCurrency(incomes.summary.totalAmount)}`,
      14,
      summaryY
    );
    summaryY += 7;
    doc.text(
      `Total Expenses: ${formatCurrency(expenses.summary.totalAmount)}`,
      14,
      summaryY
    );
    summaryY += 7;
    doc.text(
      `Total Bills: ${formatCurrency(bills.summary.totalAmount)}`,
      14,
      summaryY
    );

    let startY = summaryY + 10;

    const drawTable = (
      title: string,
      head: string[],
      body: string[][],
      foot: string[],
      color: [number, number, number],
      currentY: number,
      recordCount: number
    ): number => {
      const tableTitle = `${title} (${recordCount})`;
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text(tableTitle, 14, currentY);
      currentY += 8;
      autoTable(doc, {
        head: [head],
        body: body,
        foot: [foot],
        startY: currentY,
        headStyles: { fillColor: color, textColor: [255, 255, 255] },
        footStyles: {
          fontStyle: "bold",
          fillColor: [230, 230, 230],
          textColor: [0, 0, 0],
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        tableLineColor: [189, 195, 199],
        tableLineWidth: 0.1,
      });
      return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    };

    if (incomes.incomes.length > 0) {
      const total = incomes.incomes.reduce((sum, item) => sum + item.amount, 0);
      startY = drawTable(
        "Incomes",
        ["Date", "Description", "Category", "Amount"],
        incomes.incomes.map((item) => [
          format(parseISO(item.date), "yyyy-MM-dd"),
          item.description.toString(),
          item.category.toString(),
          formatCurrency(item.amount),
        ]),
        ["", "", "Total", formatCurrency(total)],
        [0, 150, 199], // Cyan
        startY,
        incomes.incomes.length
      );
    }

    if (expenses.expenses.length > 0) {
      const total = expenses.expenses.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      startY = drawTable(
        "Expenses",
        ["Date", "Description", "Category", "Amount"],
        expenses.expenses.map((item) => [
          format(parseISO(item.date), "yyyy-MM-dd"),
          item.description.toString(),
          item.category.toString(),
          formatCurrency(item.amount),
        ]),
        ["", "", "Total", formatCurrency(total)],
        [34, 139, 34], // Green
        startY,
        expenses.expenses.length
      );
    }

    const paidBills = bills.bills.filter((bill) => bill.isPaid);
    const unpaidBills = bills.bills.filter((bill) => !bill.isPaid);

    if (paidBills.length > 0) {
      const total = paidBills.reduce((sum, item) => sum + item.amount, 0);
      startY = drawTable(
        "Paid Bills",
        ["Due Date", "Name", "Category", "Amount"],
        paidBills.map((item) => [
          format(parseISO(item.dueDate), "yyyy-MM-dd"),
          item.name.toString(),
          item.category.toString(),
          formatCurrency(item.amount),
        ]),
        ["", "", "Total", formatCurrency(total)],
        [46, 139, 87], // SeaGreen
        startY,
        paidBills.length
      );
    }

    if (unpaidBills.length > 0) {
      const total = unpaidBills.reduce((sum, item) => sum + item.amount, 0);
      startY = drawTable(
        "Unpaid Bills",
        ["Due Date", "Name", "Category", "Amount"],
        unpaidBills.map((item) => [
          format(parseISO(item.dueDate), "yyyy-MM-dd"),
          item.name.toString(),
          item.category.toString(),
          formatCurrency(item.amount),
        ]),
        ["", "", "Total", formatCurrency(total)],
        [220, 20, 60], // Crimson
        startY,
        unpaidBills.length
      );
    }

    if (
      incomes.incomes.length === 0 &&
      expenses.expenses.length === 0 &&
      bills.bills.length === 0
    ) {
      doc.text("No data to export for this month.", 14, startY);
    }

    const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Page Border
      doc.setDrawColor(0);
      doc.rect(
        10,
        10,
        doc.internal.pageSize.width - 20,
        doc.internal.pageSize.height - 20
      );

      // Footer
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 15,
        { align: "center" }
      );
    }

    doc.save(`Monthly_Breakdown_${currentYear}_${monthName}.pdf`);
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
    } catch {
      return {
        text: "Invalid Date",
        color: "bg-gray-100 text-gray-800 border-gray-200",
        icon: <XCircle className="w-4 h-4 mr-1.5" />,
      };
    }
  };

  const isDataEmpty = !monthlyData || (monthlyData.incomes.incomes.length === 0 && monthlyData.expenses.expenses.length === 0 && monthlyData.bills.bills.length === 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-red-500"></div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Loading your Monthly Data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 sm:p-4">
        <p className="text-red-800 dark:text-red-200 text-sm sm:text-base">{error}</p>
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
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white">
              Monthly Breakdown
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5 sm:mt-1 text-sm sm:text-base">
              Detailed view of your monthly incomes, expenses and bills
            </p>
          </div>
        </div>

        {/* Mobile-optimized Month Navigation */}
        <div className="flex items-center justify-center space-x-3 sm:space-x-4">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-300 dark:border-gray-700 flex-1 sm:flex-none justify-center">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-gray-400" />
            <span className="font-semibold text-base sm:text-lg">
              {monthNames[currentMonth - 1]} {currentYear}
            </span>
          </div>

          <button
            onClick={() => navigateMonth("next")}
            className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <ExportButton
            onExportCsv={handleExportCsv}
            onExportPdf={handleExportPdf}
            disabled={isDataEmpty}
            className="hidden sm:inline-flex"
          />
        </div>
      </header>

      {/* Floating Action Button for Mobile Export */}
      <motion.div
        className="sm:hidden fixed bottom-6 right-6 z-40"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Menu as="div" className="relative">
          <Menu.Button
            className="flex items-center justify-center p-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none transition-all duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Export options"
            disabled={isDataEmpty}
          >
            <Download className="w-6 h-6" />
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 bottom-full mb-2 w-56 origin-bottom-right bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="px-1 py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleExportCsv}
                      className={`${
                        active
                          ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          : "text-slate-700 dark:text-slate-300"
                      } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                    >
                      <FileSpreadsheet className="w-5 h-5 mr-2" />
                      Export as CSV
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleExportPdf}
                      className={`${
                        active
                          ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          : "text-slate-700 dark:text-slate-300"
                      } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Export as PDF
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </motion.div>

      {/* Mobile-optimized Summary Cards */}
      {monthlyData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {/* Incomes Summary */}
          <div className="bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-900/50 dark:to-sky-900/50 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-cyan-200 dark:border-cyan-800 shadow-lg">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-600">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-cyan-700 dark:text-cyan-300">
                Incomes
              </span>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-cyan-800 dark:text-cyan-200 break-words">
                {formatCurrency(monthlyData.incomes.summary.totalAmount)}
              </p>
              <p className="text-xs sm:text-sm text-cyan-600 dark:text-cyan-400">
                {monthlyData.incomes.summary.totalCount} transactions
              </p>
            </div>
          </div>

          {/* Expenses Summary */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/50 dark:to-emerald-900/50 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-green-200 dark:border-green-800 shadow-lg">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">
                Expenses
              </span>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-800 dark:text-green-200 break-words">
                {formatCurrency(monthlyData.expenses.summary.totalAmount)}
              </p>
              <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                {monthlyData.expenses.summary.totalCount} transactions
              </p>
            </div>
          </div>

          {/* Bills Total */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/50 dark:to-indigo-900/50 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-blue-200 dark:border-blue-800 shadow-lg">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
                <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">
                Bills Total
              </span>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-800 dark:text-blue-200 break-words">
                {formatCurrency(monthlyData.bills.summary.totalAmount)}
              </p>
              <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                {monthlyData.bills.summary.totalCount} bills
              </p>
            </div>
          </div>

          {/* Bills Paid */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/50 dark:to-teal-900/50 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-lg">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Bills Paid
              </span>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-800 dark:text-emerald-200 break-words">
                {formatCurrency(monthlyData.bills.summary.paidAmount)}
              </p>
              <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                {monthlyData.bills.summary.paidCount} paid
              </p>
            </div>
          </div>

          {/* Bills Unpaid */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/50 dark:to-rose-900/50 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-red-200 dark:border-red-800 shadow-lg">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-600">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300">
                Bills Unpaid
              </span>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-800 dark:text-red-200 break-words">
                {formatCurrency(monthlyData.bills.summary.unpaidAmount)}
              </p>
              <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                {monthlyData.bills.summary.unpaidCount} pending
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-optimized Tabs */}
      <div className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex border-b border-slate-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("incomes")}
            className={`flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
              activeTab === "incomes"
                ? "text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50 dark:bg-cyan-900/30"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Incomes</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
              activeTab === "expenses"
                ? "text-green-600 border-b-2 border-green-600 bg-green-50 dark:bg-green-900/30"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
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
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
              <Receipt className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Bills</span>
            </div>
          </button>
        </div>

        <div className="p-3 sm:p-4 lg:p-6">
          {activeTab === "incomes" && monthlyData && (
            <div className="space-y-4 sm:space-y-6">
              {/* Mobile-optimized Category Breakdown */}
              {monthlyData.incomes.summary.categoryBreakdown.length > 0 && (
                <div className="bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-900/50 dark:to-sky-900/50 p-4 sm:p-5 lg:p-6 rounded-lg sm:rounded-xl border border-cyan-200 dark:border-cyan-800">
                  <h3 className="text-base sm:text-lg font-semibold text-cyan-800 dark:text-cyan-200 mb-3 sm:mb-4 flex items-center">
                    <PieChart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Category Breakdown
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {monthlyData.incomes.summary.categoryBreakdown.map(
                      (category, index) => (
                        <div
                          key={index}
                          className="bg-white dark:bg-gray-700/50 p-3 sm:p-4 rounded-lg border border-cyan-200 dark:border-cyan-800"
                        >
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 space-y-1 sm:space-y-0">
                            <span className="font-medium text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                              {category.category}
                            </span>
                            <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                              {category.count} items
                            </span>
                          </div>
                          <p className="text-base sm:text-lg font-bold text-cyan-600 break-words">
                            {formatCurrency(category.total)}
                          </p>
                          <div className="mt-2 bg-cyan-100 dark:bg-cyan-900/50 rounded-full h-1.5 sm:h-2">
                            <div
                              className="bg-cyan-500 h-1.5 sm:h-2 rounded-full"
                              style={{
                                width: `${(category.total /monthlyData.incomes.summary.totalAmount) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Mobile-optimized Incomes List */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 sm:mb-4 flex items-center">
                  <ArrowUpDown className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Income Transactions
                </h3>
                {monthlyData.incomes.incomes.length > 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-gray-700 overflow-hidden">
                    {/* Mobile Card View */}
                    <div className="block sm:hidden">
                      <div className="divide-y divide-slate-200 dark:divide-gray-700">
                        {monthlyData.incomes.incomes.map((income) => (
                          <div
                            key={income._id}
                            className="p-4 hover:bg-slate-50 dark:hover:bg-gray-700/50"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {income.description}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                  {format(
                                    parseISO(income.date),
                                    "MMM d, yyyy"
                                  )}
                                </p>
                              </div>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 ml-2">
                                {formatCurrency(income.amount)}
                              </p>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                              {income.category}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
                        <thead className="bg-slate-50 dark:bg-gray-700/50">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-slate-200 dark:divide-gray-700">
                          {monthlyData.incomes.incomes.map((income) => (
                            <tr
                              key={income._id}
                              className="hover:bg-slate-50 dark:hover:bg-gray-700/50"
                            >
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                {format(
                                  parseISO(income.date),
                                  "MMM d, yyyy"
                                )}
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-sm text-slate-800 dark:text-slate-200">
                                {income.description}
                              </td>
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                                  {income.category}
                                </span>
                              </td>
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-800 dark:text-slate-200">
                                {formatCurrency(income.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg sm:rounded-xl border border-slate-200 dark:border-gray-700 p-6 sm:p-8 text-center">
                    <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3 sm:mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
                      No incomes found for this month
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === "expenses" && monthlyData && (
            <div className="space-y-4 sm:space-y-6">
              {/* Mobile-optimized Category Breakdown */}
              {monthlyData.expenses.summary.categoryBreakdown.length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/50 dark:to-emerald-900/50 p-4 sm:p-5 lg:p-6 rounded-lg sm:rounded-xl border border-green-200 dark:border-green-800">
                  <h3 className="text-base sm:text-lg font-semibold text-green-800 dark:text-green-200 mb-3 sm:mb-4 flex items-center">
                    <PieChart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Category Breakdown
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {monthlyData.expenses.summary.categoryBreakdown.map(
                      (category, index) => (
                        <div
                          key={index}
                          className="bg-white dark:bg-gray-700/50 p-3 sm:p-4 rounded-lg border border-green-200 dark:border-green-800"
                        >
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 space-y-1 sm:space-y-0">
                            <span className="font-medium text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                              {category.category}
                            </span>
                            <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                              {category.count} items
                            </span>
                          </div>
                          <p className="text-base sm:text-lg font-bold text-green-600 break-words">
                            {formatCurrency(category.total)}
                          </p>
                          <div className="mt-2 bg-green-100 dark:bg-green-900/50 rounded-full h-1.5 sm:h-2">
                            <div
                              className="bg-green-500 h-1.5 sm:h-2 rounded-full"
                              style={{
                                width: `${(category.total /monthlyData.expenses.summary.totalAmount) * 100}%`,
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
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 sm:mb-4 flex items-center">
                  <ArrowUpDown className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Expense Transactions
                </h3>
                {monthlyData.expenses.expenses.length > 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-gray-700 overflow-hidden">
                    {/* Mobile Card View */}
                    <div className="block sm:hidden">
                      <div className="divide-y divide-slate-200 dark:divide-gray-700">
                        {monthlyData.expenses.expenses.map((expense) => (
                          <div
                            key={expense._id}
                            className="p-4 hover:bg-slate-50 dark:hover:bg-gray-700/50"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {expense.description}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                  {format(
                                    parseISO(expense.date),
                                    "MMM d, yyyy"
                                  )}
                                </p>
                              </div>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 ml-2">
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
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
                        <thead className="bg-slate-50 dark:bg-gray-700/50">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-slate-200 dark:divide-gray-700">
                          {monthlyData.expenses.expenses.map((expense) => (
                            <tr
                              key={expense._id}
                              className="hover:bg-slate-50 dark:hover:bg-gray-700/50"
                            >
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                {format(
                                  parseISO(expense.date),
                                  "MMM d, yyyy"
                                )}
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-sm text-slate-800 dark:text-slate-200">
                                {expense.description}
                              </td>
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {expense.category}
                                </span>
                              </td>
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-800 dark:text-slate-200">
                                {formatCurrency(expense.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg sm:rounded-xl border border-slate-200 dark:border-gray-700 p-6 sm:p-8 text-center">
                    <TrendingDown className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3 sm:mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
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
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 sm:mb-4 flex items-center">
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Bills for {monthNames[currentMonth - 1]} {currentYear}
                </h3>
                {monthlyData.bills.bills.length > 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-gray-700 overflow-hidden">
                    {/* Mobile Card View */}
                    <div className="block sm:hidden">
                      <div className="divide-y divide-slate-200 dark:divide-gray-700">
                        {monthlyData.bills.bills.map((bill) => {
                          const status = getBillStatus(
                            bill.dueDate,
                            bill.isPaid
                          );
                          return (
                            <div
                              key={bill._id}
                              className="p-4 hover:bg-slate-50 dark:hover:bg-gray-700/50"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                    {bill.name}
                                  </p>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                    Due:{" "}
                                    {format(
                                      parseISO(bill.dueDate),
                                      "MMM d, yyyy"
                                    )}
                                  </p>
                                </div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 ml-2">
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
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
                        <thead className="bg-slate-50 dark:bg-gray-700/50">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                              Bill Name
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                              Due Date
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-slate-200 dark:divide-gray-700">
                          {monthlyData.bills.bills.map((bill) => {
                            const status = getBillStatus(
                              bill.dueDate,
                              bill.isPaid
                            );
                            return (
                              <tr
                                key={bill._id}
                                className="hover:bg-slate-50 dark:hover:bg-gray-700/50"
                              >
                                <td className="px-4 sm:px-6 py-4 text-sm font-medium text-slate-800 dark:text-slate-200">
                                  {bill.name}
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
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
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-800 dark:text-slate-200">
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
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg sm:rounded-xl border border-slate-200 dark:border-gray-700 p-6 sm:p-8 text-center">
                    <Receipt className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3 sm:mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
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