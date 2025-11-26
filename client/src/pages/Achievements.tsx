import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Award, Star, Target } from "lucide-react";
import { useAuth } from "../contexts/auth-exports";
import AchievementCard from "../components/AchievementCard";
import { getAchievements, markAchievementAsSeen } from "../api/achievements";
import { AchievementInterface } from "../api/achievements";
import toast from "react-hot-toast";

const Achievements: React.FC = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<AchievementInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setLoading(true);
        const fetchedAchievements = await getAchievements();
        setAchievements(fetchedAchievements);
        
        // Mark all achievements as seen
        const unseenAchievements = fetchedAchievements.filter(a => !a.isSeen);
        await Promise.all(unseenAchievements.map(a => markAchievementAsSeen(a._id)));
      } catch (err) {
        console.error("Error fetching achievements:", err);
        setError("Failed to fetch achievements. Please try again.");
        toast.error("Failed to fetch achievements. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAchievements();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-800 dark:text-red-200">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const goalCompletedAchievements = achievements.filter(a => a.type === "goal_completed");
  const milestoneAchievements = achievements.filter(a => a.type === "milestone");
  const otherAchievements = achievements.filter(a => a.type !== "goal_completed" && a.type !== "milestone");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Achievements</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Celebrate your financial milestones and accomplishments
          </p>
        </div>
      </div>

      {achievements.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-slate-200 dark:border-gray-700 p-8 text-center">
          <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center mb-6">
            <Trophy className="h-12 w-12 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
            No achievements yet
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Start working toward your financial goals to earn achievements!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {goalCompletedAchievements.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Target className="w-5 h-5 text-green-500" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  Goals Achieved
                </h2>
                <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-semibold px-2 py-1 rounded-full">
                  {goalCompletedAchievements.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {goalCompletedAchievements.map((achievement) => (
                  <AchievementCard 
                    key={achievement._id} 
                    achievement={achievement} 
                  />
                ))}
              </div>
            </div>
          )}

          {milestoneAchievements.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Star className="w-5 h-5 text-yellow-500" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  Milestones
                </h2>
                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-semibold px-2 py-1 rounded-full">
                  {milestoneAchievements.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {milestoneAchievements.map((achievement) => (
                  <AchievementCard 
                    key={achievement._id} 
                    achievement={achievement} 
                  />
                ))}
              </div>
            </div>
          )}

          {otherAchievements.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Award className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  Other Achievements
                </h2>
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-semibold px-2 py-1 rounded-full">
                  {otherAchievements.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherAchievements.map((achievement) => (
                  <AchievementCard 
                    key={achievement._id} 
                    achievement={achievement} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Achievements;