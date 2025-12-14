import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  
  Lightbulb,
  DollarSign,
  Info,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Brain,
  Target
} from "lucide-react";
import { getInsightsSummary, getSpendingPatterns } from "../api/insights";
import { useTheme } from "../contexts/theme-exports";

interface UnusualPattern {
  type: string;
  category: string;
  currentAmount: number;
  previousAmount?: number;
  increasePercentage?: number;
  amount?: number;
  description?: string;
  date?: string;
  message: string;
  severity: "high" | "medium" | "low";
}

interface SavingsTip {
  tip: string;
  category: string;
  potentialSavings: string;
}

interface InsightsData {
  unusualSpending: UnusualPattern[];
  insights: {
    savingsTips: SavingsTip[];
    educationalFact: {
      fact: string;
      relevance: string;
    };
    recommendation: {
      action: string;
      impact: string;
    };
  };
  summary: string;
}

interface InsightsSummary {
  unusualCount: number;
  highSeverityCount: number;
  summary: string;
  topTip: SavingsTip | null;
  hasData: boolean;
}

const InsightsDashboard: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("patterns");

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both summary and detailed insights
      const [summaryResponse, patternsResponse] = await Promise.all([
        getInsightsSummary(),
        getSpendingPatterns(3)
      ]);
      
      setSummary(summaryResponse.data);
      setInsightsData(patternsResponse.data);
    } catch (err) {
      console.error("Error fetching insights:", err);
      setError("Failed to load insights. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return isDark ? "text-red-400" : "text-red-600";
      case "medium":
        return isDark ? "text-yellow-400" : "text-yellow-600";
      case "low":
        return isDark ? "text-blue-400" : "text-blue-600";
      default:
        return isDark ? "text-gray-400" : "text-gray-600";
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case "high":
        return isDark ? "bg-red-900/20 border-red-800/50" : "bg-red-50 border-red-200";
      case "medium":
        return isDark ? "bg-yellow-900/20 border-yellow-800/50" : "bg-yellow-50 border-yellow-200";
      case "low":
        return isDark ? "bg-blue-900/20 border-blue-800/50" : "bg-blue-50 border-blue-200";
      default:
        return isDark ? "bg-gray-900/20 border-gray-800/50" : "bg-gray-50 border-gray-200";
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className={`h-8 rounded w-1/3 ${isDark ? "bg-gray-700" : "bg-gray-200"}`}></div>
          <div className="mt-4 space-y-3">
            <div className={`h-20 rounded ${isDark ? "bg-gray-700" : "bg-gray-200"}`}></div>
            <div className={`h-20 rounded ${isDark ? "bg-gray-700" : "bg-gray-200"}`}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 rounded-lg ${isDark ? "bg-red-900/20 border border-red-800/50" : "bg-red-50 border border-red-200"}`}>
        <div className="flex items-center space-x-3">
          <AlertCircle className={`w-5 h-5 ${isDark ? "text-red-400" : "text-red-600"}`} />
          <p className={isDark ? "text-red-300" : "text-red-700"}>{error}</p>
        </div>
      </div>
    );
  }

  if (!summary?.hasData) {
    return (
      <div className={`p-6 rounded-lg ${isDark ? "bg-gray-800/50 border border-gray-700/50" : "bg-gray-50 border border-gray-200"}`}>
        <div className="text-center">
          <Brain className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
          <p className={isDark ? "text-gray-400" : "text-gray-600"}>
            Not enough spending data yet. Continue tracking your expenses to unlock personalized insights!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isDark ? "bg-purple-900/20" : "bg-purple-100"}`}>
              <Brain className={`w-6 h-6 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
            </div>
            <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              Smart Insights
            </h3>
          </div>
          {summary.highSeverityCount > 0 && (
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${isDark ? "bg-red-900/20 text-red-400" : "bg-red-100 text-red-700"}`}>
              {summary.highSeverityCount} Alert{summary.highSeverityCount > 1 ? "s" : ""}
            </div>
          )}
        </div>
        
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
          {summary.summary}
        </p>

        {summary.topTip && (
          <div className={`p-4 rounded-lg ${isDark ? "bg-green-900/20 border border-green-800/50" : "bg-green-50 border border-green-200"}`}>
            <div className="flex items-start space-x-3">
              <Lightbulb className={`w-5 h-5 mt-0.5 ${isDark ? "text-green-400" : "text-green-600"}`} />
              <div className="flex-1">
                <p className={`font-medium mb-1 ${isDark ? "text-green-300" : "text-green-800"}`}>
                  Top Savings Tip
                </p>
                <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  {summary.topTip.tip}
                </p>
                {summary.topTip.potentialSavings && (
                  <p className={`text-xs mt-1 ${isDark ? "text-green-400" : "text-green-600"}`}>
                    Potential savings: {summary.topTip.potentialSavings}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Unusual Spending Patterns */}
      {insightsData?.unusualSpending && insightsData.unusualSpending.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-lg border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
        >
          <button
            onClick={() => toggleSection("patterns")}
            className="w-full p-6 flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${isDark ? "bg-orange-900/20" : "bg-orange-100"}`}>
                <AlertTriangle className={`w-6 h-6 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Unusual Spending Patterns
                </h3>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {insightsData.unusualSpending.length} pattern{insightsData.unusualSpending.length > 1 ? "s" : ""} detected
                </p>
              </div>
            </div>
            {expandedSection === "patterns" ? (
              <ChevronUp className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
            )}
          </button>

          <AnimatePresence>
            {expandedSection === "patterns" && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="border-t border-gray-200 dark:border-gray-700"
              >
                <div className="p-6 space-y-3">
                  {insightsData.unusualSpending.map((pattern, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border ${getSeverityBg(pattern.severity)}`}
                    >
                      <div className="flex items-start space-x-3">
                        <AlertCircle className={`w-5 h-5 mt-0.5 ${getSeverityColor(pattern.severity)}`} />
                        <div className="flex-1">
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {pattern.message}
                          </p>
                          {pattern.increasePercentage && (
                            <p className={`text-sm mt-1 ${getSeverityColor(pattern.severity)}`}>
                              +{pattern.increasePercentage}% from last month
                            </p>
                          )}
                          {pattern.amount && (
                            <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              Amount: ${pattern.amount.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Savings Tips */}
      {insightsData?.insights?.savingsTips && insightsData.insights.savingsTips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-lg border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
        >
          <button
            onClick={() => toggleSection("tips")}
            className="w-full p-6 flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${isDark ? "bg-green-900/20" : "bg-green-100"}`}>
                <DollarSign className={`w-6 h-6 ${isDark ? "text-green-400" : "text-green-600"}`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Personalized Savings Tips
                </h3>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {insightsData.insights.savingsTips.length} recommendation{insightsData.insights.savingsTips.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {expandedSection === "tips" ? (
              <ChevronUp className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
            )}
          </button>

          <AnimatePresence>
            {expandedSection === "tips" && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="border-t border-gray-200 dark:border-gray-700"
              >
                <div className="p-6 space-y-3">
                  {insightsData.insights.savingsTips.map((tip, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg ${isDark ? "bg-green-900/20 border border-green-800/50" : "bg-green-50 border border-green-200"}`}
                    >
                      <div className="flex items-start space-x-3">
                        <Target className={`w-5 h-5 mt-0.5 ${isDark ? "text-green-400" : "text-green-600"}`} />
                        <div className="flex-1">
                          <p className={`font-medium ${isDark ? "text-green-300" : "text-green-800"}`}>
                            {tip.category}
                          </p>
                          <p className={`text-sm mt-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            {tip.tip}
                          </p>
                          {tip.potentialSavings && (
                            <p className={`text-xs mt-2 ${isDark ? "text-green-400" : "text-green-600"}`}>
                              💰 Potential savings: {tip.potentialSavings}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Educational Content */}
      {insightsData?.insights?.educationalFact && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-6 rounded-lg border ${isDark ? "bg-blue-900/20 border-blue-800/50" : "bg-blue-50 border-blue-200"}`}
        >
          <div className="flex items-start space-x-3">
            <Info className={`w-5 h-5 mt-0.5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            <div>
              <p className={`font-medium mb-2 ${isDark ? "text-blue-300" : "text-blue-800"}`}>
                Did You Know?
              </p>
              <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {insightsData.insights.educationalFact.fact}
              </p>
              <p className={`text-xs mt-2 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                {insightsData.insights.educationalFact.relevance}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default InsightsDashboard;