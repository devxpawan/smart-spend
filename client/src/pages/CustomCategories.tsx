import React, { useState, useEffect } from "react";
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
  customCategories: string[];
  defaultCategories: string[];
  onUpdate: (categories: string[]) => Promise<void>;
  setMessage: (message: Message) => void;
}> = ({ title, customCategories, defaultCategories, onUpdate, setMessage }) => {
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;

    if (
      defaultCategories.includes(trimmed) ||
      customCategories.includes(trimmed)
    ) {
      setMessage({ type: "error", text: "Category already exists." });
      return;
    }

    const updated = [...customCategories, trimmed];
    setNewCategory("");
    setSaving(true);
    try {
      await onUpdate(updated);
      setMessage({
        type: "success",
        text: `${title} category added successfully.`,
      });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save category." });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCategory = async (category: string) => {
    const updated = customCategories.filter((c) => c !== category);
    setSaving(true);
    try {
      await onUpdate(updated);
      setMessage({
        type: "success",
        text: `${title} category removed successfully.`,
      });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to remove category." });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    setSaving(true);
    try {
      await onUpdate([]); // clear custom categories
      setMessage({
        type: "success",
        text: `${title} custom categories removed successfully.`,
      });
    } catch (err) {
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
          className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={saving}
          type="button"
        >
          Reset to defaults
        </button>
      </div>

      {/* Add new category input */}
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

      {/* Categories grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Default categories (uneditable) */}
        {defaultCategories.map((cat) => (
          <div
            key={cat}
            className="flex items-center justify-between rounded-lg px-4 py-3 text-sm border bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700 cursor-not-allowed"
          >
            <span className="font-medium truncate">{cat}</span>
          </div>
        ))}

        {/* Custom categories (editable/removable) */}
        {customCategories.map((cat) => (
          <div
            key={cat}
            className="flex items-center justify-between rounded-lg px-4 py-3 text-sm border bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
          >
            <span className="font-medium truncate">{cat}</span>
            <button
              onClick={() => handleRemoveCategory(cat)}
              className="ml-2 text-slate-400 hover:text-red-500 transition-colors duration-200 disabled:opacity-50 flex-shrink-0"
              disabled={saving}
              type="button"
              aria-label={`Remove ${cat} category`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
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
    user?.customIncomeCategories || []
  );
  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>(
    user?.customExpenseCategories || []
  );

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
    setCustomIncomeCategories(user?.customIncomeCategories || []);
    setCustomExpenseCategories(user?.customExpenseCategories || []);
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
      <header className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Custom Categories
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-base">
          Default categories are uneditable. Add your own custom ones or remove them as needed.
        </p>
      </header>

      <div className="space-y-8">
        <CategoryManager
          title="Income"
          customCategories={customIncomeCategories}
          defaultCategories={incomeCategories}
          onUpdate={handleUpdateIncomeCategories}
          setMessage={setMessage}
        />

        <CategoryManager
          title="Expense"
          customCategories={customExpenseCategories}
          defaultCategories={expenseCategories}
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
