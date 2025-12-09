import React, { useEffect, useMemo, useState } from "react";
import { Plus, Target, TrendingUp, Calendar, Edit, Trash2, PlusCircle, Trophy, Search, Filter, ArrowDownAZ, ArrowUpZA, RefreshCw, X } from "lucide-react";
import { useAuth } from "../contexts/auth-exports";
import toast from "react-hot-toast";
import GoalInterface, { GoalFormData } from "../types/GoalInterface";
import { getGoals, createGoal, updateGoal, deleteGoal, addContribution } from "../api/goals";
import GoalModal from "../components/GoalModal";
import AddContributionModal from "../components/AddContributionModal";
import { motion } from "framer-motion";
import ConfirmModal from "../components/ConfirmModal";
import { useNavigate } from "react-router-dom";

interface SortConfig {
  key: "name" | "targetAmount" | "savedAmount" | "targetDate" | "progress";
  direction: "asc" | "desc";
}

interface FilterConfig {
  searchTerm: string;
  status: "all" | "active" | "completed";
}

const Goals: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  
  // Filtering and sorting states
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "targetDate",
    direction: "asc",
  });
  const [filters, setFilters] = useState<FilterConfig>({
    searchTerm: "",
    status: "all",
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 12;

  // Fetch goals
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

  useEffect(() => {
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
  const handleAddContribution = async (amount: number, description: string, bankAccountId?: string) => {
    if (!selectedGoal) return;

    try {
      const updatedGoal = await addContribution(selectedGoal._id, amount, description, bankAccountId);
      setGoals(goals.map((goal) => (goal._id === selectedGoal._id ? updatedGoal : goal)));
      toast.success("Contribution added successfully!");
      
      // Dispatch a custom event to notify other components that bank accounts may have changed
      window.dispatchEvent(new CustomEvent('bankAccountsUpdated'));
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
    // If user has set a fixed monthly contribution, use that
    if (goal.monthlyContribution && goal.monthlyContribution > 0) {
      return goal.monthlyContribution;
    }
    
    // Otherwise calculate based on remaining amount and time
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

  // Memoized filtered and sorted goals with pagination
  const filteredAndSortedGoals = useMemo(() => {
    let filtered = [...goals];
    
    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(goal => 
        goal.name.toLowerCase().includes(searchLower) ||
        (goal.description && goal.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply status filter
    if (filters.status !== "all") {
      filtered = filtered.filter(goal => {
        const progress = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
        const isCompleted = progress >= 100;
        
        if (filters.status === "active") return !isCompleted;
        if (filters.status === "completed") return isCompleted;
        return true;
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let valueA: number | string | Date;
      let valueB: number | string | Date;
      
      switch (sortConfig.key) {
        case "name":
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case "targetAmount":
          valueA = a.targetAmount;
          valueB = b.targetAmount;
          break;
        case "savedAmount":
          valueA = a.savedAmount;
          valueB = b.savedAmount;
          break;
        case "targetDate":
          valueA = new Date(a.targetDate);
          valueB = new Date(b.targetDate);
          break;
        case "progress":
          const progressA = Math.min(100, Math.round((a.savedAmount / a.targetAmount) * 100));
          const progressB = Math.min(100, Math.round((b.savedAmount / b.targetAmount) * 100));
          valueA = progressA;
          valueB = progressB;
          break;
        default:
          valueA = 0;
          valueB = 0;
      }
      
      if (valueA < valueB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valueA > valueB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [goals, filters, sortConfig]);

  // Paginated goals
  const paginatedGoals = useMemo(() => {
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    return filteredAndSortedGoals.slice(indexOfFirstRecord, indexOfLastRecord);
  }, [filteredAndSortedGoals, currentPage, recordsPerPage]);

  // Total pages
  const totalPages = Math.ceil(filteredAndSortedGoals.length / recordsPerPage);

  // Adjust current page if it becomes invalid after filtering or deletion
  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    } else if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

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
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button
            onClick={() => navigate('/achievements')}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-lg hover:from-yellow-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-150 ease-in-out shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            <Trophy className="w-5 h-5 mr-2" />
            Achievements
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-150 ease-in-out shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Goal
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border dark:border-gray-700 shadow-sm space-y-3 sm:space-y-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search goals..."
            value={filters.searchTerm}
            onChange={(e) => {
              setFilters((prev) => ({
                ...prev,
                searchTerm: e.target.value,
              }));
              setCurrentPage(1);
            }}
            className="w-full pl-12 pr-10 py-3 bg-slate-100 dark:bg-gray-700 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-gray-800 transition-all duration-300 shadow-sm dark:text-white"
          />
          {filters.searchTerm && (
            <button
              type="button"
              onClick={() => {
                setFilters((prev) => ({ ...prev, searchTerm: "" }));
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-full p-1"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters and Sort */}
        <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
          {/* Status Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              Status:
            </label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as FilterConfig["status"],
                }));
                setCurrentPage(1);
              }}
              className="w-full sm:w-40 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white text-sm transition duration-150 ease-in-out"
            >
              <option value="all">All Goals</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 sm:ml-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort by:
              </label>
              <select
                value={sortConfig.key}
                onChange={(e) => {
                  setSortConfig((prev) => ({
                    ...prev,
                    key: e.target.value as SortConfig["key"],
                  }));
                  setCurrentPage(1);
                }}
                className="w-full sm:w-40 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white text-sm transition duration-150 ease-in-out"
              >
                <option value="name">Name</option>
                <option value="targetAmount">Target Amount</option>
                <option value="savedAmount">Saved Amount</option>
                <option value="targetDate">Target Date</option>
                <option value="progress">Progress</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSortConfig((prev) => ({
                    ...prev,
                    direction: prev.direction === "asc" ? "desc" : "asc",
                  }));
                }}
                className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 border dark:border-gray-600 rounded-md text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 flex-1 sm:flex-none"
                title="Toggle sort order"
              >
                {sortConfig.direction === "asc" ? (
                  <ArrowDownAZ className="w-4 h-4 sm:mr-1" />
                ) : (
                  <ArrowUpZA className="w-4 h-4 sm:mr-1" />
                )}
                <span className="hidden sm:inline">
                  {sortConfig.direction === "asc" ? "Asc" : "Desc"}
                </span>
              </button>

              <button
                onClick={() => {
                  fetchGoals();
                  setCurrentPage(1);
                }}
                className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 border dark:border-gray-600 rounded-md text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                title="Refresh goals"
                disabled={loading}
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {filteredAndSortedGoals.length === 0 ? (
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
          {paginatedGoals.map((goal) => {
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
                      {goal.monthlyContribution && goal.monthlyContribution > 0 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Fixed amount
                        </div>
                      )}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex justify-center mt-6 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <ul className="flex items-center space-x-1 h-10 text-base">
            <li>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center justify-center px-4 h-10 font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-800 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                Previous
              </button>
            </li>
            {/* Page numbers */}
            {(() => {
              const pageNumbers = [];
              const maxPagesToShow = 5;
              const ellipsis = <li key="ellipsis" className="px-2 text-gray-500 dark:text-gray-400">...</li>;

              let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
              const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

              if (endPage - startPage + 1 < maxPagesToShow) {
                startPage = Math.max(1, endPage - maxPagesToShow + 1);
              }

              if (startPage > 1) {
                pageNumbers.push(
                  <li key={1}>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className={`flex items-center justify-center px-4 h-10 font-semibold border dark:border-gray-600 transition-colors duration-150 ${
                        currentPage === 1
                          ? "text-white bg-purple-500 hover:bg-purple-600"
                          : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      1
                    </button>
                  </li>
                );
                if (startPage > 2) {
                  pageNumbers.push(ellipsis);
                }
              }

              for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(
                  <li key={i}>
                    <button
                      onClick={() => setCurrentPage(i)}
                      className={`flex items-center justify-center px-4 h-10 font-semibold border dark:border-gray-600 transition-colors duration-150 ${
                        currentPage === i
                          ? "text-white bg-purple-500 hover:bg-purple-600"
                          : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      {i}
                    </button>
                  </li>
                );
              }

              if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                  pageNumbers.push(ellipsis);
                }
                pageNumbers.push(
                  <li key={totalPages}>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className={`flex items-center justify-center px-4 h-10 font-semibold border dark:border-gray-600 transition-colors duration-150 ${
                        currentPage === totalPages
                          ? "text-white bg-purple-500 hover:bg-purple-600"
                          : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      {totalPages}
                    </button>
                  </li>
                );
              }
              return pageNumbers;
            })()}
            <li>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center px-4 h-10 font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-800 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
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