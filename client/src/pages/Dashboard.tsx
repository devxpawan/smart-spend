import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  TooltipItem,
} from "chart.js";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  DollarSign,
  Receipt,
  ShieldCheck,
  Target,
  TrendingUp,
  User,
  CreditCard,
  AlarmClock,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Doughnut, Line } from "react-chartjs-2";
import { Link } from "react-router-dom";
import api from "../api/api";
import FinancialHealthScore from "../components/FinancialHealthScore";
import NotificationBell from "../components/NotificationBell"; // Import NotificationBell
import {
  SkeletonCard,
  SkeletonChart,
  SkeletonDoughnut,
} from "../components/SkeletonLoaders";
import { useAuth } from "../contexts/auth-exports";
import { useTheme } from "../contexts/theme-exports";
import { retryWithBackoff } from "../utils/retry";
import BankAccountInterface from "../types/BankAccountInterface";
import { getBankAccounts } from "../api/bankAccounts";
import { getCustomRemindersCount } from "../api/billApi";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

interface ExpenseSummary {
  _id: string;
  total: number;
}

interface BillInterface {
  _id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  isPaid?: boolean;
}

interface WarrantyInterface {
  _id: string;
  productName: string;
  expirationDate: string;
  category: string;
}

interface MonthlyData {
  total: number;
  month: number;
  year: number;
}

interface DashboardData {
  totalExpenses: number;
  totalIncomes: number;
  upcomingBills: BillInterface[];
  expiringWarranties: WarrantyInterface[];
  categoryData: ExpenseSummary[];
  incomeCategoryData: ExpenseSummary[];
  monthlyExpenseData: MonthlyData[];
  monthlyIncomeData: MonthlyData[];
  activeGoalsCount: number;
  totalGoalsTarget: number;
  totalGoalsSaved: number;
}

interface ErrorState {
  stats: string;
  charts: string;
}

const doughnutChartOptions = (
  theme: string,
  formatCurrency: (amount: number) => string
) => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: "70%",
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: true,
      backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
      titleColor: theme === "dark" ? "#f9fafb" : "#1f2937",
      bodyColor: theme === "dark" ? "#d1d5db" : "#374151",
      borderColor: theme === "dark" ? "#4b5563" : "#e5e7eb",
      borderWidth: 1,
      titleFont: {
        size: 13,
        family: "Inter, sans-serif",
        weight: 600,
      },
      bodyFont: {
        size: 12,
        family: "Inter, sans-serif",
        weight: 500,
      },
      padding: 12,
      cornerRadius: 8,
      displayColors: true,
      caretSize: 6,
      caretPadding: 8,
      callbacks: {
        label: (context: TooltipItem<"doughnut">) => {
          const label = context.label || "";
          const value = context.parsed;
          const total = context.dataset.data.reduce(
            (a: number, b: number) => a + b,
            0
          );
          const percentage = ((value / total) * 100).toFixed(1);
          return `${label}: ${formatCurrency(value)} (${percentage}%)`;
        },
      },
    },
  },
  animation: {
    animateRotate: true,
    animateScale: true,
  },
});

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [errors, setErrors] = useState<ErrorState>({ stats: "", charts: "" });
  const [customRemindersCount, setCustomRemindersCount] = useState(0);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalExpenses: 0,
    totalIncomes: 0,
    upcomingBills: [],
    expiringWarranties: [],
    categoryData: [],
    incomeCategoryData: [],
    monthlyExpenseData: [],
    monthlyIncomeData: [],
    activeGoalsCount: 0,
    totalGoalsTarget: 0,
    totalGoalsSaved: 0,
  });
  const [bankAccounts, setBankAccounts] = useState<BankAccountInterface[]>([]);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(true);

  // Get current time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const fetchStatsData = async () => {
    try {
      setLoadingStats(true);
      setErrors((prev) => ({ ...prev, stats: "" }));

      const fetchData = () =>
        Promise.all([
          api.get("/bills/upcoming/reminders"),
          api.get("/warranties/expiring/soon"),
          api.get("/goals"),
          getCustomRemindersCount(),
        ]);

      const [billsRes, warrantiesRes, goalsRes, customRemindersRes] =
        await retryWithBackoff(fetchData);

      // Calculate goals summary
      const activeGoals = goalsRes.data.filter((goal: any) => !goal.isAchieved);
      const totalGoalsTarget = activeGoals.reduce(
        (sum: number, goal: any) => sum + goal.targetAmount,
        0
      );
      const totalGoalsSaved = activeGoals.reduce(
        (sum: number, goal: any) => sum + goal.currentAmount,
        0
      );

      setDashboardData((prev) => ({
        ...prev,
        upcomingBills: billsRes.data,
        expiringWarranties: warrantiesRes.data,
        activeGoalsCount: activeGoals.length,
        totalGoalsTarget,
        totalGoalsSaved,
      }));
      setCustomRemindersCount(customRemindersRes);
    } catch (error: unknown) {
      console.error("Dashboard stats fetch error:", error);
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      setErrors((prev) => ({
        ...prev,
        stats:
          axiosError.response?.data?.message || "Failed to load key stats.",
      }));
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchBankAccountsData = async () => {
    try {
      setBankAccountsLoading(true);
      const data = await getBankAccounts();
      setBankAccounts(data);
    } catch (error) {
      console.error("Dashboard bank accounts fetch error:", error);
      setErrors((prev) => ({
        ...prev,
        stats: "Failed to load bank accounts.",
      }));
    } finally {
      setBankAccountsLoading(false);
    }
  };

  const fetchChartsData = async () => {
    try {
      setLoadingCharts(true);
      setErrors((prev) => ({ ...prev, charts: "" }));

      const fetchData = () =>
        Promise.all([
          api.get("/expenses/summary/monthly"),
          api.get("/incomes/summary/monthly"),
          api.get("/expenses/summary/category"),
          api.get("/incomes/summary/category"),
        ]);

      const [
        monthlyExpensesRes,
        monthlyIncomesRes,
        expenseCategoryRes,
        incomeCategoryRes,
      ] = await retryWithBackoff(fetchData);

      const currentYearTotalExpenses = monthlyExpensesRes.data.reduce(
        (sum: number, month: MonthlyData) => sum + month.total,
        0
      );

      const currentYearTotalIncomes = monthlyIncomesRes.data.reduce(
        (sum: number, month: MonthlyData) => sum + month.total,
        0
      );

      setDashboardData((prev) => ({
        ...prev,
        totalExpenses: currentYearTotalExpenses,
        totalIncomes: currentYearTotalIncomes,
        categoryData: expenseCategoryRes.data,
        incomeCategoryData: incomeCategoryRes.data,
        monthlyExpenseData: monthlyExpensesRes.data,
        monthlyIncomeData: monthlyIncomesRes.data,
      }));
    } catch (error: unknown) {
      console.error("Dashboard charts fetch error:", error);
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      setErrors((prev) => ({
        ...prev,
        charts:
          axiosError.response?.data?.message || "Failed to load chart data.",
      }));
    } finally {
      setLoadingCharts(false);
    }
  };

  useEffect(() => {
    fetchStatsData();
    fetchChartsData();
    fetchBankAccountsData();
  }, []);

  const formatCurrency = useCallback(
    (amount: number) => {
      return `${
        user?.preferences?.currency || "USD"
      } ${amount.toLocaleString()}`;
    },
    [user?.preferences?.currency]
  );

  const expenseCategoryChartData = useMemo(
    () => ({
      labels: dashboardData.categoryData.map((cat) => cat._id),
      datasets: [
        {
          data: dashboardData.categoryData.map((cat) => cat.total),
          backgroundColor: [
            "#1f77b4",
            "#ff7f0e",
            "#2ca02c",
            "#d62728",
            "#9467bd",
            "#8c564b",
            "#e377c2",
            "#7f7f7f",
            "#bcbd22",
            "#17becf",
          ],
          borderColor: theme === "dark" ? "#1f2937" : "#ffffff",
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 8,
        },
      ],
    }),
    [dashboardData.categoryData, theme]
  );

  const incomeCategoryChartData = useMemo(
    () => ({
      labels: dashboardData.incomeCategoryData.map((cat) => cat._id),
      datasets: [
        {
          data: dashboardData.incomeCategoryData.map((cat) => cat.total),
          backgroundColor: [
            "#2ca02c",
            "#1f77b4",
            "#ff7f0e",
            "#d62728",
            "#9467bd",
            "#8c564b",
            "#e377c2",
            "#7f7f7f",
            "#bcbd22",
            "#17becf",
          ],
          borderColor: theme === "dark" ? "#1f2937" : "#ffffff",
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 8,
        },
      ],
    }),
    [dashboardData.incomeCategoryData, theme]
  );

  const monthlyChartData = useMemo(
    () => ({
      labels: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      datasets: [
        {
          label: "Monthly Expenses",
          data: dashboardData.monthlyExpenseData.map(
            (month: MonthlyData) => month.total
          ),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          pointBackgroundColor: "#3B82F6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#3B82F6",
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 2,
          tension: 0.4,
          fill: true,
          borderWidth: 2,
        },
        {
          label: "Monthly Incomes",
          data: dashboardData.monthlyIncomeData.map(
            (month: MonthlyData) => month.total
          ),
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          pointBackgroundColor: "#10B981",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#10B981",
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 2,
          tension: 0.4,
          fill: true,
          borderWidth: 2,
        },
      ],
    }),
    [dashboardData.monthlyExpenseData, dashboardData.monthlyIncomeData]
  );

  const statsCards = useMemo(
    () => [
      {
        icon: <TrendingUp className="w-7 h-7" />,
        title: "Total Incomes",
        subtitle: "This Year",
        value: formatCurrency(dashboardData.totalIncomes),
        rawValue: dashboardData.totalIncomes,
        link: "/incomes",
        gradient: "from-sky-400 to-cyan-500",
        bgGradient: "from-sky-50 to-cyan-50",
        borderColor: "border-sky-200",
        darkBgGradient: "from-gray-800 to-gray-900",
        darkBorderColor: "border-gray-700",
      },
      {
        icon: <DollarSign className="w-7 h-7" />,
        title: "Total Expenses",
        subtitle: "This Year",
        value: formatCurrency(dashboardData.totalExpenses),
        rawValue: dashboardData.totalExpenses,
        link: "/expenses",
        gradient: "from-green-400 to-green-500",
        bgGradient: "from-green-50 to-green-50",
        borderColor: "border-green-200",
        darkBgGradient: "from-gray-800 to-gray-900",
        darkBorderColor: "border-gray-700",
      },
      {
        icon: <Target className="w-7 h-7" />,
        title: "Active Goals",
        subtitle: "Currently Saving",
        value: dashboardData.activeGoalsCount,
        rawValue: dashboardData.activeGoalsCount,
        link: "/goals",
        gradient: "from-emerald-400 to-teal-500",
        bgGradient: "from-emerald-50 to-teal-50",
        borderColor: "border-emerald-200",
        darkBgGradient: "from-gray-800 to-gray-900",
        darkBorderColor: "border-gray-700",
      },
      {
        icon: <Receipt className="w-7 h-7" />,
        title: "Upcoming Bills",
        subtitle: "Due Soon",
        value: dashboardData.upcomingBills.length,
        rawValue: dashboardData.upcomingBills.length,
        link: "/bills",
        gradient: "from-orange-400 to-orange-500",
        bgGradient: "from-orange-50 to-orange-50",
        borderColor: "border-orange-200",
        darkBgGradient: "from-gray-800 to-gray-900",
        darkBorderColor: "border-gray-700",
        urgent: dashboardData.upcomingBills.some((bill) => {
          const dueDate = new Date(bill.dueDate);
          const today = new Date();
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 3 && diffDays >= 0;
        }),
        customRemindersCount: customRemindersCount,
      },
      {
        icon: <ShieldCheck className="w-7 h-7" />,
        title: "Warranties",
        subtitle: "Expiring Soon",
        value: dashboardData.expiringWarranties.length,
        rawValue: dashboardData.expiringWarranties.length,
        link: "/warranties",
        gradient: "from-purple-400 to-purple-500",
        bgGradient: "from-purple-50 to-purple-50",
        borderColor: "border-purple-200",
        darkBgGradient: "from-gray-800 to-gray-900",
        darkBorderColor: "border-gray-700",
      },
    ],
    [dashboardData, formatCurrency, customRemindersCount]
  );

  console.log("Dashboard render with data:", dashboardData);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Mobile-optimized Welcome Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-6 sm:mb-8"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-200/20 dark:shadow-gray-900/20">
            <div>
              <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                <div className="relative">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 ring-2 ring-white/40">
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full border border-white shadow-sm flex items-center justify-center">
                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-white rounded-full"></div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 dark:from-white dark:via-gray-200 dark:to-white bg-clip-text text-transparent leading-tight">
                    {greeting}, {user?.name || "User"}!
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-gray-300 mt-0.5 sm:mt-1">
                    Here's your financial snapshot for today.
                  </p>
                </div>

                {/* Notification Bell - Only on Dashboard */}
                <div className="hidden sm:block">
                  <NotificationBell />
                </div>
              </div>

              {/* Mobile Notification Bell */}
              <div className="sm:hidden flex justify-end mb-2">
                <NotificationBell />
              </div>

              {/* Mobile-optimized date display */}
              <div className="flex items-center pt-2 sm:pt-3 border-t border-slate-200/50 dark:border-gray-700/50">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-gray-400 rounded-full"></div>
                  <span className="text-xs font-medium text-slate-600 dark:text-gray-300">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Error Display */}
        <AnimatePresence>
          {errors.stats && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6"
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
                    Error Loading Stats
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {errors.stats}
                  </p>
                  <button
                    onClick={() => fetchStatsData()}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {errors.charts && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6"
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
                    Error Loading Charts
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {errors.charts}
                  </p>
                  <button
                    onClick={() => fetchChartsData()}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile-optimized Stats Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6"
        >
          {loadingStats
            ? Array.from({ length: 5 }).map((_, idx) => (
                <SkeletonCard key={idx} />
              ))
            : statsCards.map((item, idx) => (
                <Link
                  to={item.link}
                  key={idx}
                  className={`group relative p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ease-out bg-white/50 dark:bg-gray-800/50 border ${
                    item.borderColor
                  } dark:${
                    item.darkBorderColor
                  } hover:scale-[1.02] overflow-hidden backdrop-blur-lg ${
                    item.urgent ? "ring-2 ring-red-400 ring-opacity-50" : ""
                  } min-h-[120px] sm:min-h-[140px]`}
                >
                  {/* Background Gradient */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-20 dark:opacity-10 group-hover:opacity-30 dark:group-hover:opacity-20 transition-opacity duration-300`}
                  ></div>

                  {/* Urgent indicator */}
                  {item.urgent && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  )}

                  <div className="relative z-10 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wider">
                            {item.title}
                          </h3>
                          {/* <span className="text-xs text-slate-500 font-medium">
                        {item.subtitle}
                      </span> */}
                        </div>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white break-words">
                          {item.value}
                        </p>
                        {/* Custom Reminders Count */}
                        {item.customRemindersCount !== undefined &&
                          item.customRemindersCount > 0 && (
                            <div className="flex items-center space-x-1.5 mt-2">
                              <AlarmClock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                Reminders: {item.customRemindersCount}
                              </span>
                            </div>
                          )}
                      </div>
                      <div
                        className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r ${item.gradient} shadow-lg flex-shrink-0 ml-2`}
                      >
                        <span className="text-white">{item.icon}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-gray-300 font-medium group-hover:text-slate-800 dark:group-hover:text-white transition-colors flex items-center">
                        View Details
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2 transform group-hover:translate-x-1 transition-transform duration-200" />
                      </span>
                      {item.urgent && (
                        <span className="text-xs text-red-600 font-semibold">
                          URGENT
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
        </motion.section>

        {/* Bank Accounts Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 p-4 sm:p-6 lg:p-8 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
            Bank Accounts
          </h2>
          {bankAccountsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 animate-pulse"
                >
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : bankAccounts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankAccounts.map((account) => (
                <div
                  key={account._id}
                  className="group relative p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ease-out bg-white/50 dark:bg-gray-800/50 border border-indigo-200 dark:border-gray-700 hover:scale-[1.02] overflow-hidden backdrop-blur-lg min-h-[120px] sm:min-h-[140px]"
                >
                  {/* Background Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 opacity-20 dark:opacity-10 group-hover:opacity-30 dark:group-hover:opacity-20 transition-opacity duration-300"></div>

                  <div className="relative z-10 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wider">
                          {account.bankName}
                        </h3>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white break-words">
                          {formatCurrency(account.currentBalance)}
                        </p>
                      </div>
                      <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg flex-shrink-0 ml-2">
                        <CreditCard className="w-7 h-7 text-white" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-gray-300 font-medium">
                        {account.accountName} ({account.accountType})
                      </span>
                      <Link
                        to="/bank-accounts"
                        className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 font-medium group-hover:text-indigo-800 dark:group-hover:text-indigo-300 transition-colors flex items-center"
                      >
                        Manage
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2 transform group-hover:translate-x-1 transition-transform duration-200" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No bank accounts added yet.
            </div>
          )}
        </motion.section>

        {/* Mobile-optimized Charts Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6"
        >
          {loadingCharts ? (
            <>
              <SkeletonChart />
              <SkeletonDoughnut />
            </>
          ) : (
            <>
              {/* Monthly Expenses Chart */}
              <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-4 sm:p-6 lg:p-8 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 lg:mb-8 space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="p-2 sm:p-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        Monthly Overview
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Income vs. Expense trends
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date().getFullYear()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Year to date
                    </div>
                  </div>
                </div>
                <div className="h-64 sm:h-72 lg:h-80">
                  {dashboardData.monthlyExpenseData.length > 0 ||
                  dashboardData.monthlyIncomeData.length > 0 ? (
                    <Line
                      data={monthlyChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                          intersect: false,
                          mode: "index" as const,
                        },
                        layout: {
                          padding: {
                            top: 20,
                            right: 20,
                            bottom: 10,
                            left: 10,
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: {
                              color:
                                theme === "dark"
                                  ? "rgba(255, 255, 255, 0.1)"
                                  : "rgba(0, 0, 0, 0.05)",
                              lineWidth: 1,
                              drawTicks: false,
                            },
                            border: {
                              display: true,
                              color: theme === "dark" ? "#4b5563" : "#e2e8f0",
                              width: 1,
                            },
                            ticks: {
                              callback: (value) => {
                                const numValue = Number(value);
                                if (numValue >= 1000000) {
                                  return `${
                                    user?.preferences?.currency || "USD"
                                  }${(numValue / 1000000).toFixed(1)}M`;
                                } else if (numValue >= 1000) {
                                  return `${
                                    user?.preferences?.currency || "USD"
                                  }${(numValue / 1000).toFixed(0)}K`;
                                }
                                return `${
                                  user?.preferences?.currency || "USD"
                                }${numValue.toLocaleString()}`;
                              },
                              font: {
                                size: 11,
                                family: "Inter, sans-serif",
                                weight: 500,
                              },
                              color: theme === "dark" ? "#9ca3af" : "#6b7280",
                              padding: 12,
                              maxTicksLimit: 6,
                            },
                          },
                          x: {
                            grid: {
                              display: false,
                            },
                            border: {
                              display: true,
                              color: theme === "dark" ? "#4b5563" : "#e2e8f0",
                              width: 1,
                            },
                            ticks: {
                              font: {
                                size: 11,
                                family: "Inter, sans-serif",
                                weight: 500,
                              },
                              color: theme === "dark" ? "#9ca3af" : "#6b7280",
                              padding: 8,
                            },
                          },
                        },
                        plugins: {
                          legend: {
                            display: true,
                            position: "top" as const,
                            align: "end" as const,
                            labels: {
                              boxWidth: 12,
                              padding: 20,
                              color: theme === "dark" ? "#9ca3af" : "#6b7280",
                              font: {
                                size: 12,
                                family: "Inter, sans-serif",
                                weight: 500,
                              },
                            },
                          },
                          tooltip: {
                            enabled: true,
                            backgroundColor:
                              theme === "dark" ? "#1f2937" : "#ffffff",
                            titleColor:
                              theme === "dark" ? "#f9fafb" : "#1f2937",
                            bodyColor: theme === "dark" ? "#d1d5db" : "#374151",
                            borderColor:
                              theme === "dark" ? "#4b5563" : "#e5e7eb",
                            borderWidth: 1,
                            titleFont: {
                              size: 13,
                              family: "Inter, sans-serif",
                              weight: 600,
                            },
                            bodyFont: {
                              size: 12,
                              family: "Inter, sans-serif",
                              weight: 500,
                            },
                            padding: 12,
                            cornerRadius: 8,
                            displayColors: true,
                            caretSize: 6,
                            caretPadding: 8,
                            callbacks: {
                              title: (context) => {
                                return `${
                                  context[0].label
                                } ${new Date().getFullYear()}`;
                              },
                              label: (context) => {
                                const label = context.dataset.label || "";
                                const value = context.parsed.y;
                                if (value !== null) {
                                  return `${label}: ${
                                    user?.preferences?.currency || "USD"
                                  }${value.toLocaleString()}`;
                                }
                                return "";
                              },
                            },
                          },
                        },
                        elements: {
                          point: {
                            hoverRadius: 6,
                            hitRadius: 8,
                          },
                          line: {
                            borderCapStyle: "round" as const,
                            borderJoinStyle: "round" as const,
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <TrendingUp className="w-16 h-16 text-slate-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-slate-500 dark:text-gray-400 font-medium">
                          No income or expense data available
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Charts */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 sm:p-6 lg:p-8 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 lg:mb-8 space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="p-2 sm:p-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-violet-600">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        Category Breakdown
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Income vs. Expense
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col items-center">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Expenses
                    </h4>
                    <div className="w-full h-48 relative">
                      {dashboardData.categoryData.length > 0 ? (
                        <>
                          <Doughnut
                            data={expenseCategoryChartData}
                            options={doughnutChartOptions(
                              theme,
                              formatCurrency
                            )}
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Total
                            </span>
                            <span className="text-lg font-bold text-gray-800 dark:text-white">
                              {formatCurrency(
                                dashboardData.categoryData.reduce(
                                  (acc, cat) => acc + cat.total,
                                  0
                                )
                              )}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex items-center justify-center text-center text-xs text-slate-500 dark:text-gray-400">
                          No expense data
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Incomes
                    </h4>
                    <div className="w-full h-48 relative">
                      {dashboardData.incomeCategoryData.length > 0 ? (
                        <>
                          <Doughnut
                            data={incomeCategoryChartData}
                            options={doughnutChartOptions(
                              theme,
                              formatCurrency
                            )}
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Total
                            </span>
                            <span className="text-lg font-bold text-gray-800 dark:text-white">
                              {formatCurrency(
                                dashboardData.incomeCategoryData.reduce(
                                  (acc, cat) => acc + cat.total,
                                  0
                                )
                              )}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex items-center justify-center text-center text-xs text-slate-500 dark:text-gray-400">
                          No income data
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.section>

        {/* Financial Health Score Section */}
        <FinancialHealthScore />
      </div>
    </div>
  );
};

export default Dashboard;
