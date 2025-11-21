import React, { useEffect, useState } from "react";
import { Plus, Target, TrendingUp, Calendar, Edit, Trash2, PlusCircle } from "lucide-react";
import { useAuth } from "../contexts/auth-exports";
import toast from "react-hot-toast";
import GoalInterface, { GoalFormData } from "../types/GoalInterface";
import { getGoals, createGoal, updateGoal, deleteGoal, addContribution } from "../api/goals";
import GoalModal from "../components/GoalModal";
import AddContributionModal from "../components/AddContributionModal";
import { motion } from "framer-motion";
import ConfirmModal from "../components/ConfirmModal";

const Goals: React.FC = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<GoalInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalInterface | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<GoalInterface | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    goalId: string | null;
  }>({
    open: false,
    goalId: null,
  });

  // Fetch goals
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        const fetchedGoals = await getGoals();
        setGoals(fetchedGoals);
      } catch (err) {
        console.error("Error fetching goals:", err);
        setError("Failed to fetch goals. Please try again.");
        toast.error("Failed to fetch goals. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchGoals();
    }
  }, [user]);

  // Handle create/update goal
  const handleGoalSubmit = async (data: GoalFormData) => {
    try {
      let updatedGoal: GoalInterface;
      if (editingGoal) {
        updatedGoal = await updateGoal(editingGoal._id, data);
        setGoals(goals.map((goal) => (goal._id === editingGoal._id ? updatedGoal : goal)));
        toast.success("Goal updated successfully!");
      } else {
        updatedGoal = await createGoal(data);
        setGoals([...goals, updatedGoal]);
        toast.success("Goal created successfully!");
      }
    } catch (err) {
      console.error("Error saving goal:", err);
      toast.error(`Failed to ${editingGoal ? "update" : "create"} goal. Please try again.`);
    }
  };

  // Handle delete goal confirmation
  const handleDeleteGoalConfirm = (goalId: string) => {
    setConfirmModal({
      open: true,
      goalId,
    });
  };

  // Handle actual delete goal
  const handleDeleteGoal = async () => {
    if (!confirmModal.goalId) return;

    try {
      await deleteGoal(confirmModal.goalId);
      setGoals(goals.filter((goal) => goal._id !== confirmModal.goalId));
      toast.success("Goal deleted successfully!");
      setConfirmModal({ open: false, goalId: null });
    } catch (err) {
      console.error("Error deleting goal:", err);
      toast.error("Failed to delete goal. Please try again.");
    }
  };

  // Handle add contribution
  const handleAddContribution = async (amount: number, description: string) => {
    if (!selectedGoal) return;

    try {
      const updatedGoal = await addContribution(selectedGoal._id, amount, description);
      setGoals(goals.map((goal) => (goal._id === selectedGoal._id ? updatedGoal : goal)));
      toast.success("Contribution added successfully!");
    } catch (err) {
      console.error("Error adding contribution:", err);
      toast.error("Failed to add contribution. Please try again.");
    }
  };

  // Calculate progress percentage
  const calculateProgress = (goal: GoalInterface) => {
    return Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
  };

  // Calculate monthly saving amount
  const calculateMonthlySaving = (goal: GoalInterface) => {
    const startDate = new Date(goal.startDate);
    const targetDate = new Date(goal.targetDate);
    const months = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + 
                   (targetDate.getMonth() - startDate.getMonth());
    
    if (months <= 0) return goal.targetAmount;
    
    return Math.max(0, Math.round((goal.targetAmount - goal.savedAmount) / months));
  };

  // Calculate days remaining
  const calculateDaysRemaining = (goal: GoalInterface) => {
    const today = new Date();
    const targetDate = new Date(goal.targetDate);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Open modal for editing
  const openEditModal = (goal: GoalInterface) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  // Open contribution modal
  const openContributionModal = (goal: GoalInterface) => {
    setSelectedGoal(goal);
    setIsContributionModalOpen(true);
  };

  // Close modals
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  const closeContributionModal = () => {
    setIsContributionModalOpen(false);
    setSelectedGoal(null);
  };

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Goal Planning</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Turn your financial dreams into reality with personalized saving plans
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-150 ease-in-out shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-slate-200 dark:border-gray-700 p-8 text-center">
          <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center mb-6">
            <Target className="h-12 w-12 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
            No goals yet
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Start planning your financial future by creating your first goal.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-150 ease-in-out shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const progress = calculateProgress(goal);
            const monthlySaving = calculateMonthlySaving(goal);
            const daysRemaining = calculateDaysRemaining(goal);
            const isCompleted = progress >= 100;

            return (
              <motion.div
                key={goal._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-slate-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white truncate">
                      {goal.name}
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(goal)}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="Edit goal"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoalConfirm(goal._id)}
                        className="p-2 text-slate-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="Delete goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-1">
                      <span>
                        Rs {goal.savedAmount.toLocaleString()}{" "}
                        <span className="text-xs">saved</span>
                      </span>
                      <span>
                        Rs {goal.targetAmount.toLocaleString()}{" "}
                        <span className="text-xs">target</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          isCompleted
                            ? "bg-gradient-to-r from-green-500 to-emerald-500"
                            : "bg-gradient-to-r from-purple-500 to-indigo-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {progress}% complete
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-purple-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center text-purple-600 dark:text-purple-400 mb-1">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span className="text-xs font-medium">Monthly Save</span>
                      </div>
                      <div className="text-lg font-semibold text-slate-800 dark:text-white">
                        Rs {monthlySaving.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-indigo-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center text-indigo-600 dark:text-indigo-400 mb-1">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span className="text-xs font-medium">Days Left</span>
                      </div>
                      <div className="text-lg font-semibold text-slate-800 dark:text-white">
                        {daysRemaining > 0 ? daysRemaining : "0"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openContributionModal(goal)}
                    disabled={isCompleted}
                    className={`w-full inline-flex items-center justify-center px-4 py-2 font-semibold rounded-lg transition-all duration-150 ease-in-out ${
                      isCompleted
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 cursor-not-allowed"
                        : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow hover:shadow-lg transform hover:scale-[1.02]"
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    {isCompleted ? "Goal Achieved!" : "Add Savings"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Goal Modal */}
      <GoalModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleGoalSubmit}
        initialData={editingGoal || undefined}
      />

      {/* Add Contribution Modal */}
      <AddContributionModal
        isOpen={isContributionModalOpen}
        onClose={closeContributionModal}
        onSubmit={handleAddContribution}
        goal={selectedGoal || undefined}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.open}
        title="Delete Goal"
        message="Are you sure you want to delete this goal? This action cannot be undone."
        onConfirm={handleDeleteGoal}
        onCancel={() => setConfirmModal({ open: false, goalId: null })}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Goals;