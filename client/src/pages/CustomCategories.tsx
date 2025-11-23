import { motion } from "framer-motion";
import { AlertTriangle, Check, Info, Plus, RotateCcw, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/auth-exports";
import { defaultExpenseCategories, defaultIncomeCategories } from "../lib/defaultCategories";

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
  const [saving, setSaving] = useState(false);

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;

    if (categories.includes(trimmed)) {
      setMessage({ type: "error", text: "Category already exists." });
      return;
    }

    const updated = [...categories, trimmed];
    setNewCategory("");
    setSaving(true);
    try {
      await onUpdate(updated);
      setMessage({
        type: "success",
        text: `${title} category added successfully.`,
      });
    } catch {
      setMessage({ type: "error", text: "Failed to save category." });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCategory = async (category: string) => {
    const updated = categories.filter((c) => c !== category);
    setSaving(true);
    try {
      await onUpdate(updated);
      setMessage({
        type: "success",
        text: `${title} category removed successfully.`,
      });
    } catch {
      setMessage({ type: "error", text: "Failed to remove category." });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm(`Are you sure you want to reset ${title} categories to system defaults? This will remove all your custom categories.`)) {
      return;
    }
    
    setSaving(true);
    try {
      await onUpdate(defaultCategories);
      setMessage({
        type: "success",
        text: `${title} categories reset to defaults successfully.`,
      });
    } catch {
      setMessage({ type: "error", text: "Failed to reset categories." });
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
          className="flex items-center text-sm text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={saving}
          type="button"
          title="Reset to system defaults"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset to defaults
        </button>
      </div>

      {/* Add new category input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder={`Add new ${title.toLowerCase()} category`}
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
          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={saving || !newCategory.trim()}
          type="button"
          aria-label="Add category"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Categories grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {categories.map((cat) => (
          <div
            key={cat}
            className="flex items-center justify-between rounded-lg px-4 py-3 text-sm border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <span className="font-medium truncate">{cat}</span>
            <button
              onClick={() => handleRemoveCategory(cat)}
              className="ml-2 text-slate-400 hover:text-red-500 transition-colors duration-200 disabled:opacity-50 flex-shrink-0 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
              disabled={saving}
              type="button"
              aria-label={`Remove ${cat} category`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        {categories.length === 0 && (
          <div className="col-span-full py-8 text-center text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
            No categories found. Add one to get started.
          </div>
        )}
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
  
  // Use the full category lists from user object, falling back to defaults if empty (though API should handle this)
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);

  // Auto-clear toast messages
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message.text]);

  // Sync with user data
  useEffect(() => {
    if (user) {
      // Prefer the new fields, fall back to custom + defaults if needed (for safety)
      setIncomeCategories(user.incomeCategories || []);
      setExpenseCategories(user.expenseCategories || []);
    }
  }, [user]);

  const handleUpdateIncomeCategories = async (categories: string[]) => {
    await updateCustomIncomeCategories(categories);
    // Optimistic update
    setIncomeCategories(categories);
  };

  const handleUpdateExpenseCategories = async (categories: string[]) => {
    await updateCustomExpenseCategories(categories);
    // Optimistic update
    setExpenseCategories(categories);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
      <header className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Manage Categories
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-base max-w-2xl mx-auto">
          Customize your income and expense categories. You can add new ones, remove existing ones, or reset to the system defaults at any time.
        </p>
      </header>

      <div className="space-y-10">
        <CategoryManager
          title="Income"
          categories={incomeCategories}
          defaultCategories={defaultIncomeCategories}
          onUpdate={handleUpdateIncomeCategories}
          setMessage={setMessage}
        />

        <div className="border-t border-slate-200 dark:border-slate-700 my-8"></div>

        <CategoryManager
          title="Expense"
          categories={expenseCategories}
          defaultCategories={defaultExpenseCategories}
          onUpdate={handleUpdateExpenseCategories}
          setMessage={setMessage}
        />
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
              {message.type === "success" && <Check className="w-5 h-5 mr-2 mt-0.5" />}
              {message.type === "error" && <AlertTriangle className="w-5 h-5 mr-2 mt-0.5" />}
              {message.type === "info" && <Info className="w-5 h-5 mr-2 mt-0.5" />}
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
