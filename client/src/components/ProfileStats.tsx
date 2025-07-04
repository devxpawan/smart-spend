import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  FileText,
  CreditCard,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

interface ProfileStatsData {
  bills: number;
  expenses: number;
  warranties: number;
  total: number;
}

// Loading Spinner Component (matching Profile page style)
const LoadingSpinner: React.FC<{ size?: "sm" | "md" }> = ({
  size = "md",
}) => (
  <RefreshCw
    className={`animate-spin ${size === "sm" ? "w-4 h-4" : "w-5 h-5"}`}
  />
);

const ProfileStats: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProfileStatsData>({
    bills: 0,
    expenses: 0,
    warranties: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await axios.get("/api/auth/profile/stats");

        // Handle both old and new API response formats
        const data = response.data;
        if (data.activity) {
          // New format - extract basic stats
          setStats({
            bills: data.activity.bills || 0,
            expenses: data.activity.expenses || 0,
            warranties: data.activity.warranties || 0,
            total: data.activity.total || 0,
          });
        } else {
          // Old format - use as is
          setStats({
            bills: data.bills || 0,
            expenses: data.expenses || 0,
            warranties: data.warranties || 0,
            total: data.total || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching profile stats:", err);
        setError("Failed to load profile statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "1 day ago";
    if (diffInDays < 30) return `${diffInDays} days ago`;
    if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return months === 1 ? "1 month ago" : `${months} months ago`;
    }
    const years = Math.floor(diffInDays / 365);
    return years === 1 ? "1 year ago" : `${years} years ago`;
  };

  const statsCards = [
    {
      icon: <CreditCard className="w-8 h-8" />,
      title: "Bills",
      count: stats.bills,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      borderColor: "border-blue-200",
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Expenses",
      count: stats.expenses,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
      borderColor: "border-green-200",
    },
    {
      icon: <ShieldCheck className="w-8 h-8" />,
      title: "Warranties",
      count: stats.warranties,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
      borderColor: "border-purple-200",
    },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="md" />
          <p className="mt-3 text-slate-600 text-sm">
            Loading statistics...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-xl border border-red-200 p-8">
        <div className="text-red-600 text-center">{error}</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 space-y-8"
    >
      {/* Account Created Date */}
      <div className="text-center pb-6 border-b border-slate-100">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="p-3 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Account Created
            </h2>
            <p className="text-lg text-slate-600">
              {user?.createdAt ? formatDate(user.createdAt) : "Unknown"}
            </p>
            <p className="text-sm text-slate-500">
              {user?.createdAt ? getTimeAgo(user.createdAt) : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statsCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`relative p-6 rounded-xl border ${card.borderColor} bg-gradient-to-br ${card.bgColor} hover:shadow-lg transition-all duration-200`}
          >
            <div className="text-center">
              <div
                className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${card.color} mb-4`}
              >
                <div className="text-white">{card.icon}</div>
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                {card.title}
              </h3>
              <p className="text-3xl font-bold text-slate-800">
                {card.count.toLocaleString()}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Total {card.title.toLowerCase()} managed
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ProfileStats;
