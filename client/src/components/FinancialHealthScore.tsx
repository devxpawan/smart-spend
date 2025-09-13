import axios from "axios";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  Info,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface ScoreBreakdown {
  monthlyBalance: {
    amount: number;
    description: string;
  };
}

interface MonthlyComparison {
  expenses: {
    current: number;
    previous: number;
    change: number;
    changeType: string;
  };
  bills: {
    current: number;
    previous: number;
    change: number;
    changeType: string;
  };
  paymentRate: {
    current: number;
    previous: number;
    change: number;
  };
  incomes: {
    current: number;
    previous: number;
    change: number;
    changeType: string;
  };
}

interface Suggestion {
  type: string;
  title: string;
  description: string;
  impact: string;
}

interface FinancialHealthData {
  healthScore: number; // This will now be the surplus/deficit amount
  scoreBreakdown: ScoreBreakdown;
  monthlyComparison: MonthlyComparison;
  suggestions: Suggestion[];
  lastUpdated: string;
}

const FinancialHealthScore: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [healthData, setHealthData] = useState<FinancialHealthData | null>(
    null
  );

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("/api/financial-health");
      setHealthData(response.data);
    } catch (error: any) {
      console.error("Financial health fetch error:", error);
      setError(
        error.response?.data?.message ||
          "Failed to load financial health data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const formatCurrency = (amount: number) => {
    return `${
      user?.preferences?.currency || "USD"
    } ${amount.toLocaleString()}`;
  };

  const getScoreColor = (amount: number) => {
    if (amount > 0) return "text-emerald-600";
    if (amount === 0) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreGradient = (amount: number) => {
    if (amount > 0) return "from-emerald-500 to-teal-600";
    if (amount === 0) return "from-yellow-500 to-orange-600";
    return "from-red-500 to-pink-600";
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSuggestionBorderColor = (type: string) => {
    switch (type) {
      case "critical":
        return "border-red-200 bg-red-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      case "success":
        return "border-emerald-200 bg-emerald-50";
      default:
        return "border-blue-200 bg-blue-50";
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-8 rounded-2xl shadow-xl border border-emerald-200">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-pink-50 p-8 rounded-2xl shadow-xl border border-red-200">
        <div className="flex items-center space-x-3 text-red-600">
          <AlertCircle className="w-6 h-6" />
          <p className="font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!healthData) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-gradient-to-r from-emerald-50 to-teal-50 p-8 rounded-2xl shadow-xl border border-emerald-200"
    >
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg">
          <Target className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-800">
            Your Financial Health
          </h3>
          <p className="text-slate-600 mt-1">
            How well are you managing your money?
          </p>
        </div>
      </div>

      {/* Main Score Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Score Circle */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center">
          <div className="relative mb-4">
            <div className="w-44 h-44 rounded-full bg-white shadow-lg flex items-center justify-center">
              <div className="text-center">
                <div
                  className={`text-4xl font-bold ${getScoreColor(
                    healthData.healthScore
                  )}`}
                >
                  {formatCurrency(healthData.healthScore)}
                </div>
                <div className="text-sm text-slate-500 font-medium">
                  Monthly Balance
                </div>
              </div>
            </div>
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-r ${getScoreGradient(
                healthData.healthScore
              )} opacity-20`}
            ></div>
          </div>
          <div className="text-center">
            <div
              className={`text-lg font-bold ${getScoreColor(
                healthData.healthScore
              )}`}
            >
              {healthData.healthScore > 0
                ? "Healthy Surplus!"
                : healthData.healthScore === 0
                ? "Breaking Even."
                : "Running a Deficit."}
            </div>
            <div className="text-sm text-slate-600">
              {healthData.healthScore > 0
                ? "You're managing your money well."
                : healthData.healthScore === 0
                ? "Your income matches your expenses."
                : "You're spending more than you earn."}
            </div>
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="lg:col-span-2">
          <h4 className="text-lg font-bold text-slate-800 mb-4">
            This Month vs Last Month
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            <div className="bg-white/60 p-4 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Incomes
                </span>
                {healthData.monthlyComparison.incomes.changeType ===
                "increase" ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div className="text-xl font-bold text-slate-800">
                {formatCurrency(
                  healthData.monthlyComparison.incomes.current
                )}
              </div>
              <div
                className={`text-sm ${
                  healthData.monthlyComparison.incomes.changeType ===
                  "increase"
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {healthData.monthlyComparison.incomes.change > 0 ? "+" : ""}
                {Math.round(healthData.monthlyComparison.incomes.change)}% vs
                last month
              </div>
            </div>

            <div className="bg-white/60 p-4 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Expenses
                </span>
                {healthData.monthlyComparison.expenses.changeType ===
                "increase" ? (
                  <TrendingUp className="w-4 h-4 text-red-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <div className="text-xl font-bold text-slate-800">
                {formatCurrency(
                  healthData.monthlyComparison.expenses.current
                )}
              </div>
              <div
                className={`text-sm ${
                  healthData.monthlyComparison.expenses.changeType ===
                  "increase"
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                {healthData.monthlyComparison.expenses.change > 0
                  ? "+"
                  : ""}
                {Math.round(healthData.monthlyComparison.expenses.change)}%
                vs last month
              </div>
            </div>

            <div className="bg-white/60 p-4 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Bills
                </span>
                {healthData.monthlyComparison.bills.changeType ===
                "increase" ? (
                  <TrendingUp className="w-4 h-4 text-red-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <div className="text-xl font-bold text-slate-800">
                {formatCurrency(
                  healthData.monthlyComparison.bills.current
                )}
              </div>
              <div
                className={`text-sm ${
                  healthData.monthlyComparison.bills.changeType ===
                  "increase"
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                {healthData.monthlyComparison.bills.change > 0 ? "+" : ""}
                {Math.round(healthData.monthlyComparison.bills.change)}% vs
                last month
              </div>
            </div>

            <div className="bg-white/60 p-4 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Payment Rate
                </span>
                {healthData.monthlyComparison.paymentRate.change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div className="text-xl font-bold text-slate-800">
                {Math.round(
                  healthData.monthlyComparison.paymentRate.current
                )}
                %
              </div>
              <div
                className={`text-sm ${
                  healthData.monthlyComparison.paymentRate.change >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {healthData.monthlyComparison.paymentRate.change > 0
                  ? "+"
                  : ""}
                {Math.round(
                  healthData.monthlyComparison.paymentRate.change
                )}
                % vs last month
              </div>
            </div>

            
          </div>
        </div>
      </div>

      {/* Improvement Suggestions */}
      <div>
        <h4 className="text-lg font-bold text-slate-800 mb-4">
          How to Improve Your Score
        </h4>
        <div className="space-y-3">
          {healthData.suggestions.map((suggestion, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={`flex items-start space-x-3 p-4 rounded-xl border ${getSuggestionBorderColor(
                suggestion.type
              )} hover:shadow-md transition-shadow duration-200`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getSuggestionIcon(suggestion.type)}
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-slate-800 mb-1">
                  {suggestion.title}
                </h5>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {suggestion.description}
                </p>
                <span
                  className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${
                    suggestion.impact === "high"
                      ? "bg-red-100 text-red-700"
                      : suggestion.impact === "medium"
                      ? "bg-yellow-100 text-yellow-700"
                      : suggestion.impact === "positive"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {suggestion.impact} impact
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default FinancialHealthScore;
