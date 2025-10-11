import { AnimatePresence, motion } from "framer-motion";
import { Calendar, DollarSign, Receipt, RefreshCw, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import CustomSelect from "./CustomSelect";

export interface BulkEditData {
  description?: string;
  amount?: string;
  date?: string;
  category?: string;
}

interface ExpenseBulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: BulkEditData) => void;
  categories: string[];
  isBulkEditing: boolean;
  selectedCount: number;
}

const ExpenseBulkEditModal: React.FC<ExpenseBulkEditModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  categories,
  isBulkEditing,
  selectedCount,
}) => {
  const [formData, setFormData] = useState<BulkEditData>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({}); // Reset form on open
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value }));
  };

  const handleConfirm = () => {
    // Filter out empty strings before confirming
    const updates = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value) {
        acc[key as keyof BulkEditData] = value;
      }
      return acc;
    }, {} as BulkEditData);

    if (Object.keys(updates).length > 0) {
      onConfirm(updates);
    }
  };

  const isFormEmpty = Object.values(formData).every((v) => !v);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
                Edit Expenses
              </h2>
              <p className="text-slate-600 dark:text-gray-300 mt-1 text-sm">
                Update fields for {selectedCount} selected item(s). Leave fields
                blank to keep original values.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-white transition-colors rounded-full p-1 -mt-2 -mr-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2.5 gap-6">

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Receipt className="h-5 w-5 text-slate-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    name="description"
                    value={formData.description || ""}
                    onChange={handleChange}
                    className="form-input block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm transition duration-150 ease-in-out"
                    placeholder="Enter new description"
                  />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2"> Amount </label>
                <div className="relative">  
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-slate-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount || ""}
                    onChange={handleChange}
                    className="form-input block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm transition duration-150 ease-in-out"
                    placeholder="0.00"
                  />
                </div>
                
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                  New Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-slate-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="date"
                    name="date"
                    value={formData.date || ""}
                    onChange={handleChange}
                    max={new Date().toISOString().split("T")[0]}
                    className="form-input block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm transition duration-150 ease-in-out bg-white dark:bg-gray-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                  New Category
                </label>
                <CustomSelect
                  options={[
                    { value: "", label: "Select a new category" },
                    ...categories.map((cat) => ({ value: cat, label: cat })),
                  ]}
                  value={formData.category || ""}
                  onChange={handleCategoryChange}
                  className="w-full"
                  isSearchable={true}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 sm:gap-4 mt-8">
            <button
              onClick={onClose}
              className="px-4 sm:px-6 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 sm:px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={isFormEmpty || isBulkEditing}
            >
              {isBulkEditing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Applying...
                </>
              ) : (
                "Apply Changes"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default ExpenseBulkEditModal;
