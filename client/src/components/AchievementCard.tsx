import React from "react";
import { motion } from "framer-motion";
import { AchievementInterface } from "../api/achievements";

interface AchievementCardProps {
  achievement: AchievementInterface;
  isNew?: boolean;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ achievement, isNew = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200 dark:border-gray-700 overflow-hidden ${
        isNew ? "ring-2 ring-green-500 ring-opacity-50" : ""
      }`}
    >
      {isNew && (
        <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          NEW
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-2xl">
            {achievement.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate">
              {achievement.title}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              {achievement.description}
            </p>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Earned on {new Date(achievement.earnedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AchievementCard;