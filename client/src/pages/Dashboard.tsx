import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  DollarSign,
  Receipt,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Target,
  AlertCircle,
  User,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import FinancialHealthScore from "../components/FinancialHealthScore";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { motion, AnimatePresence } from "framer-motion";

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

interface DashboardData {
  totalExpenses: number;
  upcomingBills: BillInterface[];
  expiringWarranties: WarrantyInterface[];
  categoryData: ExpenseSummary[];
  monthlyData: any[];
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalExpenses: 0,
    upcomingBills: [],
    expiringWarranties: [],
    categoryData: [],
    monthlyData: [],
  });

  // Get current time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [monthlyRes, categoryRes, billsRes, warrantiesRes] =
        await Promise.all([
          axios.get("/api/expenses/summary/monthly"),
          axios.get("/api/expenses/summary/category"),
          axios.get("/api/bills/upcoming/reminders"),
          axios.get("/api/warranties/expiring/soon"),
        ]);

      const currentYearTotal = monthlyRes.data.reduce(
        (sum: number, month: any) => sum + month.total,
        0
      );

      setDashboardData({
        totalExpenses: currentYearTotal,
        upcomingBills: billsRes.data,
        expiringWarranties: warrantiesRes.data,
        categoryData: categoryRes.data,
        monthlyData: monthlyRes.data,
      });
    } catch (error: any) {
      console.error("Dashboard fetch error:", error);
      setError(
        error.response?.data?.message ||
          "Failed to load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const categoryChartData = useMemo(
    () => ({
      labels: dashboardData.categoryData.map((cat) => cat._id),
      datasets: [
        {
          data: dashboardData.categoryData.map((cat) => cat.total),
          backgroundColor: [
            "#3B82F6", // Keep original colors
            "#10B981",
            "#F59E0B",
            "#8B5CF6",
            "#EF4444",
            "#6366F1",
            "#14B8A6",
            "#F97316",
            "#EC4899",
            "#84CC16",
            "#06B6D4",
            "#8B5A2B",
          ],
          borderColor: "#FFFFFF",
          borderWidth: 2, // Thinner borders for professional look
          hoverBorderWidth: 3,
          hoverOffset: 4, // Reduced hover effect
        },
      ],
    }),
    [dashboardData.categoryData]
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
          data: dashboardData.monthlyData.map((month) => month.total),
          borderColor: "#3B82F6", // Keep original blue color
          backgroundColor: "rgba(59, 130, 246, 0.1)", // Keep original blue fill
          pointBackgroundColor: "#3B82F6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4, // Smaller, more professional points
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#3B82F6",
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 2,
          tension: 0.1, // Less curved, more business-like
          fill: true,
          borderWidth: 2, // Thinner line for professional look
        },
      ],
    }),
    [dashboardData.monthlyData]
  );

  const formatCurrency = (amount: number) => {
    return `${
      user?.preferences?.currency || "USD"
    } ${amount.toLocaleString()}`;
  };

  const statsCards = useMemo(
    () => [
      {
        icon: <DollarSign className="w-7 h-7" />,
        title: "Total Expenses",
        subtitle: "This Year",
        value: formatCurrency(dashboardData.totalExpenses),
        rawValue: dashboardData.totalExpenses,
        link: "/expenses",
        gradient: "from-blue-500 to-indigo-600",
        bgGradient: "from-blue-50 to-indigo-50",
        borderColor: "border-blue-200",
      },
      {
        icon: <Receipt className="w-7 h-7" />,
        title: "Upcoming Bills",
        subtitle: "Due Soon",
        value: dashboardData.upcomingBills.length,
        rawValue: dashboardData.upcomingBills.length,
        link: "/bills",
        gradient: "from-amber-500 to-orange-600",
        bgGradient: "from-amber-50 to-orange-50",
        borderColor: "border-amber-200",
        urgent: dashboardData.upcomingBills.some((bill) => {
          const dueDate = new Date(bill.dueDate);
          const today = new Date();
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 3 && diffDays >= 0;
        }),
      },
      {
        icon: <ShieldCheck className="w-7 h-7" />,
        title: "Warranties",
        subtitle: "Expiring Soon",
        value: dashboardData.expiringWarranties.length,
        rawValue: dashboardData.expiringWarranties.length,
        link: "/warranties",
        gradient: "from-emerald-500 to-teal-600",
        bgGradient: "from-emerald-50 to-teal-50",
        borderColor: "border-emerald-200",
      },
    ],
    [dashboardData, user?.preferences?.currency]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-slate-600 font-medium">
            Loading your dashboard...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Welcome Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                {greeting}, {user?.name || "User"}!
              </h1>
              <p className="text-lg text-slate-600 mt-1">
                Here's your financial snapshot for today.
              </p>
            </div>
          </div>

          {/* Current date and time */}
          <div className="text-sm text-slate-500 font-medium">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </motion.header>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">
                    Error Loading Dashboard
                  </h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <button
                    onClick={() => fetchDashboardData()}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Stats Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {statsCards.map((item, idx) => (
            <Link
              to={item.link}
              key={idx}
              className={`group relative p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ease-out bg-gradient-to-br ${
                item.bgGradient
              } border ${
                item.borderColor
              } hover:scale-[1.02] overflow-hidden ${
                item.urgent ? "ring-2 ring-red-400 ring-opacity-50" : ""
              }`}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`}
                ></div>
              </div>

              {/* Urgent indicator */}
              {item.urgent && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                </div>
              )}

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                        {item.title}
                      </h3>
                      <span className="text-xs text-slate-500 font-medium">
                        {item.subtitle}
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">
                      {item.value}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-xl bg-gradient-to-r ${item.gradient} shadow-lg`}
                  >
                    <span className="text-white">{item.icon}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium group-hover:text-slate-800 transition-colors flex items-center">
                    View Details
                    <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-200" />
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

        {/* Enhanced Charts Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-5 gap-6"
        >
          {/* Monthly Expenses Chart */}
          <div className="lg:col-span-3 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Monthly Expenses
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Expense trends over time
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {new Date().getFullYear()}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Year to date
                </div>
              </div>
            </div>
            <div className="h-80">
              {dashboardData.monthlyData.length > 0 ? (
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
                          color: "#f1f5f9",
                          lineWidth: 1,
                          drawTicks: false,
                        },
                        border: {
                          display: true,
                          color: "#e2e8f0",
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
                          color: "#6b7280",
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
                          color: "#e2e8f0",
                          width: 1,
                        },
                        ticks: {
                          font: {
                            size: 11,
                            family: "Inter, sans-serif",
                            weight: 500,
                          },
                          color: "#6b7280",
                          padding: 8,
                        },
                      },
                    },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        enabled: true,
                        backgroundColor: "#ffffff",
                        titleColor: "#1f2937",
                        bodyColor: "#374151",
                        borderColor: "#e5e7eb",
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
                        displayColors: false,
                        caretSize: 6,
                        caretPadding: 8,
                        callbacks: {
                          title: (context) => {
                            return `${
                              context[0].label
                            } ${new Date().getFullYear()}`;
                          },
                          label: (context) => {
                            const value = context.parsed.y;
                            return `Expenses: ${
                              user?.preferences?.currency || "USD"
                            }${value.toLocaleString()}`;
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
                    <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">
                      No expense data available
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category Chart */}
          <div className="lg:col-span-2 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-violet-600">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Expense Categories
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Spending distribution by category
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  Current Period
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Total breakdown
                </div>
              </div>
            </div>
            <div className="h-80 flex items-center justify-center">
              {dashboardData.categoryData.length > 0 ? (
                <Doughnut
                  data={categoryChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "65%", // Slightly larger cutout for modern look
                    layout: {
                      padding: {
                        top: 10,
                        bottom: 20,
                        left: 10,
                        right: 10,
                      },
                    },
                    plugins: {
                      legend: {
                        position: "bottom" as const,
                        align: "start" as const,
                        labels: {
                          font: {
                            size: 11,
                            family: "Inter, sans-serif",
                            weight: 500,
                          },
                          color: "#6B7280",
                          boxWidth: 10,
                          boxHeight: 10,
                          padding: 12,
                          usePointStyle: false,
                          generateLabels: (chart) => {
                            const data = chart.data;
                            if (data.labels && data.datasets.length) {
                              return data.labels.map((label, i) => {
                                const dataset = data.datasets[0];
                                const value = dataset.data[i] as number;
                                const total = (
                                  dataset.data as number[]
                                ).reduce((a, b) => a + b, 0);
                                const percentage = (
                                  (value / total) *
                                  100
                                ).toFixed(1);

                                return {
                                  text: `${label} (${percentage}%)`,
                                  fillStyle: Array.isArray(
                                    dataset.backgroundColor
                                  )
                                    ? dataset.backgroundColor[i] || "#000"
                                    : dataset.backgroundColor || "#000",
                                  strokeStyle:
                                    dataset.borderColor as string,
                                  lineWidth: 1,
                                  hidden: false,
                                  index: i,
                                };
                              });
                            }
                            return [];
                          },
                        },
                      },
                      tooltip: {
                        enabled: true,
                        backgroundColor: "#ffffff",
                        titleColor: "#1f2937",
                        bodyColor: "#374151",
                        borderColor: "#e5e7eb",
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
                            return context[0].label || "";
                          },
                          label: (context) => {
                            const value = context.parsed;
                            const total = (
                              context.dataset.data as number[]
                            ).reduce((a, b) => a + b, 0);
                            const percentage = (
                              (value / total) *
                              100
                            ).toFixed(1);
                            return [
                              `Amount: ${
                                user?.preferences?.currency || "USD"
                              }${value.toLocaleString()}`,
                              `Percentage: ${percentage}%`,
                            ];
                          },
                        },
                      },
                    },
                    elements: {
                      arc: {
                        borderWidth: 2,
                        borderColor: "#ffffff",
                      },
                    },
                  }}
                />
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Target className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">
                    No category data available
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Financial Health Score Section */}
        <FinancialHealthScore />
      </div>
    </div>
  );
};

export default Dashboard;
