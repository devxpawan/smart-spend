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
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
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

      const [monthlyRes, categoryRes, billsRes, warrantiesRes] = await Promise.all([
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

  const categoryChartData = useMemo(() => ({
    labels: dashboardData.categoryData.map((cat) => cat._id),
    datasets: [
      {
        data: dashboardData.categoryData.map((cat) => cat.total),
        backgroundColor: [
          "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6",
          "#EF4444", "#6366F1", "#14B8A6", "#F97316",
          "#EC4899", "#84CC16", "#06B6D4", "#8B5A2B",
        ],
        borderColor: "#FFFFFF",
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverOffset: 8,
      },
    ],
  }), [dashboardData.categoryData]);

  const monthlyChartData = useMemo(() => ({
    labels: [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ],
    datasets: [
      {
        label: "Monthly Expenses",
        data: dashboardData.monthlyData.map((month) => month.total),
        borderColor: "#3B82F6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        pointBackgroundColor: "#3B82F6",
        pointBorderColor: "#FFFFFF",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: true,
        borderWidth: 3,
      },
    ],
  }), [dashboardData.monthlyData]);

  const formatCurrency = (amount: number) => {
    return `${user?.preferences?.currency || "USD"} ${amount.toLocaleString()}`;
  };

  const statsCards = useMemo(() => [
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
      urgent: dashboardData.upcomingBills.some(bill => {
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
  ], [dashboardData, user?.preferences?.currency]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-slate-600 font-medium">Loading your dashboard...</p>
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
              <TrendingUp className="w-6 h-6 text-white" />
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
                  <h3 className="text-sm font-semibold text-red-800">Error Loading Dashboard</h3>
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
              className={`group relative p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ease-out bg-gradient-to-br ${item.bgGradient} border ${item.borderColor} hover:scale-[1.02] overflow-hidden ${
                item.urgent ? 'ring-2 ring-red-400 ring-opacity-50' : ''
              }`}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`}></div>
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
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${item.gradient} shadow-lg`}>
                    <span className="text-white">{item.icon}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium group-hover:text-slate-800 transition-colors flex items-center">
                    View Details
                    <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-200" />
                  </span>
                  {item.urgent && (
                    <span className="text-xs text-red-600 font-semibold">URGENT</span>
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
          <div className="lg:col-span-3 bg-white/70 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Monthly Expenses Trend</h3>
              </div>
              <div className="text-sm text-slate-500">
                {new Date().getFullYear()}
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
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: { color: "#e2e8f0" },
                        border: { display: false },
                        ticks: {
                          callback: (value) => `${user?.preferences?.currency || 'USD'}${value}`,
                          font: { size: 12, family: "Inter, sans-serif" },
                          color: "#64748b",
                          padding: 10,
                        },
                      },
                      x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                          font: { size: 12, family: "Inter, sans-serif" },
                          color: "#64748b",
                          padding: 10,
                        },
                      },
                    },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        titleFont: { size: 14, family: "Inter, sans-serif", weight: "bold" as const },
                        bodyFont: { size: 13, family: "Inter, sans-serif" },
                        padding: 12,
                        cornerRadius: 12,
                        displayColors: false,
                        callbacks: {
                          label: (context) => `${user?.preferences?.currency || 'USD'}${context.parsed.y.toLocaleString()}`,
                        },
                      },
                    },
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No expense data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category Chart */}
          <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/50">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-violet-600">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Category Breakdown</h3>
            </div>
            <div className="h-80 flex items-center justify-center">
              {dashboardData.categoryData.length > 0 ? (
                <Doughnut
                  data={categoryChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "60%",
                    plugins: {
                      legend: {
                        position: "bottom" as const,
                        labels: {
                          font: { size: 11, family: "Inter, sans-serif", weight: "normal" as const },
                          color: "#475569",
                          boxWidth: 12,
                          padding: 15,
                          usePointStyle: true,
                          pointStyle: "circle" as const,
                        },
                      },
                      tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        titleFont: { size: 14, family: "Inter, sans-serif", weight: "bold" as const },
                        bodyFont: { size: 13, family: "Inter, sans-serif" },
                        padding: 12,
                        cornerRadius: 12,
                        displayColors: true,
                        callbacks: {
                          label: (context) => `${user?.preferences?.currency || 'USD'}${context.parsed.toLocaleString()}`,
                        },
                      },
                    },
                  }}
                />
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Target className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">No category data available</p>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Enhanced Tips Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-emerald-50 to-teal-50 p-8 rounded-2xl shadow-xl border border-emerald-200"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800">Smart Savings Tips</h3>
              <p className="text-slate-600 mt-1">Actionable insights to optimize your finances</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Set clear monthly spending limits and track your progress regularly.",
              "Use category tracking to identify areas where you can cut unnecessary expenses.",
              "Automate bill payments to avoid late fees and maintain good credit.",
              "Review warranties before expiration to make claims on defective items.",
              "Build an emergency fund covering 3-6 months of essential expenses.",
              "Compare prices and read reviews before making significant purchases.",
              "Consider using the 50/30/20 rule: 50% needs, 30% wants, 20% savings.",
              "Review and cancel unused subscriptions to reduce recurring expenses.",
            ].map((tip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="flex items-start space-x-3 p-4 bg-white/60 rounded-xl border border-emerald-100 hover:bg-white/80 transition-colors duration-200"
              >
                <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-slate-700 font-medium leading-relaxed text-sm">
                  {tip}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Dashboard;
