import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import React from "react";

interface ScanResultData {
  description: string;
  amount: string;
  category: string;
  date: string;
}

interface ScanResultCardProps {
  show: boolean;
  data?: ScanResultData;
  onClose: () => void;
}

const ScanResultCard: React.FC<ScanResultCardProps> = ({ show, data, onClose }) => {
  if (!data) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl shadow-lg"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-green-900 dark:text-green-100">
                Receipt Scanned Successfully!
              </h4>
            </div>
            <button
              onClick={onClose}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Extracted Data Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded-lg">
              <span className="text-slate-600 dark:text-slate-400 font-medium block mb-1">
                Description:
              </span>
              <p className="text-slate-900 dark:text-white font-semibold truncate">
                {data.description}
              </p>
            </div>
            
            <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded-lg">
              <span className="text-slate-600 dark:text-slate-400 font-medium block mb-1">
                Amount:
              </span>
              <p className="text-slate-900 dark:text-white font-semibold">
                Rs {data.amount}
              </p>
            </div>
            
            <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded-lg">
              <span className="text-slate-600 dark:text-slate-400 font-medium block mb-1">
                Category:
              </span>
              <p className="text-slate-900 dark:text-white font-semibold truncate">
                {data.category}
              </p>
            </div>
            
            <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded-lg">
              <span className="text-slate-600 dark:text-slate-400 font-medium block mb-1">
                Date:
              </span>
              <p className="text-slate-900 dark:text-white font-semibold">
                {new Date(data.date).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Footer Message */}
          <div className="mt-3 flex items-center justify-center space-x-2 text-xs text-green-700 dark:text-green-300">
            <span className="text-base">📝</span>
            <p className="font-medium">Please review and edit if needed</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScanResultCard;