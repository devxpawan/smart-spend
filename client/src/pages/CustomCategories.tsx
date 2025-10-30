import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Info, AlertTriangle, Check, Plus } from "lucide-react";
import { useAuth } from "../contexts/auth-exports";
import { expenseCategories } from "../lib/expenseCategories";
import { incomeCategories } from "../lib/incomeCategories";

// Types
interface Message {
  type: "success" | "error" | "info" | "";
  text: string;
}

// Category Management Component
const CategoryManager: React.FC<{
  title: string;
  categories: string[];
  defaultCategories: string[];
  onUpdate: (categories: string[]) => Promise<void>;
  setMessage: (message: Message) => void;
}> = ({ title, categories, defaultCategories, onUpdate, setMessage }) => {
  const [newCategory, setNewCategory] = useState("");
  const [tempCategories, setTempCategories] = useState<string[]>(categories);
  const [saving, setSaving] = useState(false);

  // Sync tempCategories with categories prop when it changes
  React.useEffect(() => {
    setTempCategories(categories);
  }, [categories]);

  const handleAddCategory = async () => {
    const trimmedCategory = newCategory.trim();
    if (trimmedCategory && !tempCategories.includes(trimmedCategory)) {
      const updated = [...tempCategories, trimmedCategory];
      setTempCategories(updated);
      setNewCategory("");

      // Immediately save the changes
      try {
        setSaving(true);
        await onUpdate(updated);
        setMessage({
          type: "success",
          text: `${title} category added successfully.`,
        });
      } catch (error) {
        setMessage({
          type: "error",
          text: "Failed to save category. Please try again.",
        });
        // Revert the change if save failed
        setTempCategories(tempCategories);
      } finally {
        setSaving(false);
      }
    } else if (trimmedCategory && tempCategories.includes(trimmedCategory)) {
      setMessage({
        type: "error",
        text: "Category already exists.",
      });
    }
  };

  const handleRemoveCategory = async (category: string) => {
    const updated = tempCategories.filter((cat) => cat !== category);
    setTempCategories(updated);

    // Immediately save the changes
    try {
      setSaving(true);
      await onUpdate(updated);
      setMessage({
        type: "success",
        text: `${title} category removed successfully.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to remove category. Please try again.",
      });
      // Revert the change if save failed
      setTempCategories([...tempCategories]);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    try {
      setSaving(true);
      await onUpdate([...defaultCategories]);
      setTempCategories([...defaultCategories]);
      setMessage({
        type: "success",
        text: `${title} categories reset to defaults.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to reset categories. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          {title} Categories
        </h3>
        <button
          onClick={handleResetToDefaults}
          className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={saving}
          type="button"
        >
          Reset to defaults
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Add new category"
            className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCategory();
              }
            }}
            disabled={saving}
          />
          <button
            onClick={handleAddCategory}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving || !newCategory.trim()}
            type="button"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Categories Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {tempCategories.map((category) => (
            <div
              key={category}
              className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm border ${
                defaultCategories.includes(category)
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
              }`}
            >
              <span className="font-medium truncate">{category}</span>
              
              {/* Close icon - show for ALL categories now */}
              <button
                onClick={() => handleRemoveCategory(category)}
                className="ml-2 text-slate-400 hover:text-red-500 transition-colors duration-200 disabled:opacity-50 flex-shrink-0"
                disabled={saving}
                type="button"
                aria-label={`Remove ${category} category`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Alternative: List layout with close buttons for all */}
        {/* <div className="flex flex-wrap gap-2">
          {tempCategories.map((category) => (
            <div
              key={category}
              className={`flex items-center rounded-full px-3 py-2 text-sm ${
                defaultCategories.includes(category)
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              }`}
            >
              <span className="mr-2">{category}</span>
              <button
                onClick={() => handleRemoveCategory(category)}
                className="text-slate-500 hover:text-red-500 disabled:opacity-50"
                disabled={saving}
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div> */}
      </div>
    </div>
  );
};

// Main Custom Categories Component
const CustomCategories: React.FC = () => {
  const {
    user,
    updateCustomIncomeCategories,
    updateCustomExpenseCategories,
  } = useAuth();

  const [message, setMessage] = useState<Message>({ type: "", text: "" });
  const [customIncomeCategories, setCustomIncomeCategories] = useState<string[]>(
    user?.customIncomeCategories || incomeCategories
  );
  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>(
    user?.customExpenseCategories || expenseCategories
  );

  // Auto-clear messages
  React.useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message.text]);

  // Sync with user data
  React.useEffect(() => {
    if (user?.customIncomeCategories) {
      setCustomIncomeCategories(user.customIncomeCategories);
    } else {
      setCustomIncomeCategories(incomeCategories);
    }
    
    if (user?.customExpenseCategories) {
      setCustomExpenseCategories(user.customExpenseCategories);
    } else {
      setCustomExpenseCategories(expenseCategories);
    }
  }, [user?.customIncomeCategories, user?.customExpenseCategories]);

  const handleUpdateIncomeCategories = async (categories: string[]) => {
    await updateCustomIncomeCategories(categories);
    setCustomIncomeCategories(categories);
  };

  const handleUpdateExpenseCategories = async (categories: string[]) => {
    await updateCustomExpenseCategories(categories);
    setCustomExpenseCategories(categories);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Custom Categories
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-base">
          Customize your income and expense categories. These will be used in the income and expense forms.
        </p>
      </header>

      <div className="space-y-8">
        {/* Custom Categories Section */}
        <div className="space-y-8">
          <CategoryManager
            title="Income"
            categories={customIncomeCategories}
            defaultCategories={incomeCategories}
            onUpdate={handleUpdateIncomeCategories}
            setMessage={setMessage}
          />

          <CategoryManager
            title="Expense"
            categories={customExpenseCategories}
            defaultCategories={expenseCategories}
            onUpdate={handleUpdateExpenseCategories}
            setMessage={setMessage}
          />
        </div>

        {/* separator */}
        <div className="h-px bg-slate-200 dark:bg-slate-700"></div>
      </div>

      {/* Toast Notification */}
      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`fixed top-4 right-4 z-50 max-w-md rounded-lg p-4 shadow-lg border-l-4 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-500"
              : message.type === "error"
              ? "bg-red-50 text-red-700 border-red-500"
              : "bg-blue-50 text-blue-700 border-blue-500"
          }`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              {message.type === "success" && (
                <Check className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
              )}
              {message.type === "error" && (
                <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
              )}
              {message.type === "info" && (
                <Info className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {message.type === "success"
                    ? "Success"
                    : message.type === "error"
                    ? "Error"
                    : "Info"}
                </p>
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
            <button
              onClick={() => setMessage({ type: "", text: "" })}
              className="ml-4 text-current opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2 rounded"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CustomCategories;