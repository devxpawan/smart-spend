import axios, { AxiosError } from "axios";
import { motion } from "framer-motion";
import {
  TrendingUp,
  CreditCard,
  FileText,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

// Types
interface StatsData {
  bills: number;
  expenses: number;
  warranties: number;
  incomes: number;
  total: number;
}

const Customize: React.FC = () => {
  const [stats, setStats] = useState<StatsData>({
    bills: 0,
    expenses: 0,
    warranties: 0,
    incomes: 0,
    total: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Fetch stats data
  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    try {
      setStatsLoading(true);
      const response = await axios.get("/api/auth/profile/stats", { signal });
      const data = response.data;

      if (data?.activity) {
        setStats({
          bills: data.activity.bills || 0,
          expenses: data.activity.expenses || 0,
          warranties: data.activity.warranties || 0,
          incomes: data.activity.incomes || 0,
          total: data.activity.total || 0,
        });
      }
    } catch (error: unknown) {
      if (error instanceof AxiosError && error?.code === "ERR_CANCELED") return;
      console.error("Error fetching statistics:", error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchStats(controller.signal);
    return () => controller.abort();
  }, [fetchStats]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Financial Statistics
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Overview of your financial records and activities
        </p>
      </div>

      {/* Total Records Summary */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold opacity-90">Total Records</h2>
            <p className="text-3xl font-bold mt-2">{stats.total}</p>
            <p className="text-indigo-100 text-sm mt-1">
              Across all categories
            </p>
          </div>
          <div className="bg-white/20 p-3 rounded-xl">
            <TrendingUp className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {statsLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              Loading statistics...
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Incomes Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Incomes
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.incomes}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-900/50">
                <TrendingUp className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </motion.div>

          {/* Bills Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Bills
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.bills}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/50">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          {/* Expenses Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Expenses
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.expenses}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/50">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          {/* Warranties Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Warranties
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.warranties}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/50">
                <ShieldCheck className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Additional Statistics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Distribution Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Records Distribution
          </h3>
          <div className="space-y-4">
            {[
              { label: "Incomes", value: stats.incomes, color: "bg-cyan-500" },
              { label: "Bills", value: stats.bills, color: "bg-blue-500" },
              { label: "Expenses", value: stats.expenses, color: "bg-green-500" },
              { label: "Warranties", value: stats.warranties, color: "bg-purple-500" },
            ].map((item, index) => {
              const percentage = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {item.value} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Summary */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Quick Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">Total Records</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{stats.total}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">Financial Items</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {stats.bills + stats.expenses}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">Income Sources</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{stats.incomes}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600 dark:text-slate-400">Protected Items</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{stats.warranties}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!statsLoading && stats.total === 0 && (
        <div className="text-center py-16">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-8 max-w-md mx-auto">
            <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No Records Yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Start adding financial records to see your statistics here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customize;