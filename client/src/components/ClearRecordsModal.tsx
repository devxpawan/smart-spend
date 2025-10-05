import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Trash2, RefreshCw, Info } from "lucide-react";
import { createPortal } from "react-dom";

interface ProfileStatsData {
  bills: number;
  expenses: number;
  warranties: number;
  incomes: number;
  total: number;
}

interface ClearRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (recordsToClear: string[]) => void;
  clearing: boolean;
  recordStats: ProfileStatsData;
}

const LoadingSpinner: React.FC<{ size?: "sm" | "md" }> = ({
  size = "md",
}) => (
  <RefreshCw
    className={`animate-spin ${size === "sm" ? "w-4 h-4" : "w-5 h-5"}`}
  />
);

const ClearRecordsModal: React.FC<ClearRecordsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  clearing,
  recordStats,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [recordsToClear, setRecordsToClear] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const availableRecordTypes = Object.entries(recordStats)
    .filter(([key, value]) => key !== 'total' && value > 0)
    .map(([key]) => key);

  const requiredConfirmText = "clear my records";

  useEffect(() => {
    if (isOpen) {
      setRecordsToClear([]);
      setSelectAll(false);
      setConfirmText("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleSelectAll = () => {
    if (selectAll) {
      setRecordsToClear([]);
    } else {
      setRecordsToClear(availableRecordTypes);
    }
    setSelectAll(!selectAll);
  };

  const handleRecordTypeChange = (recordType: string) => {
    const updatedRecords = recordsToClear.includes(recordType)
      ? recordsToClear.filter((r) => r !== recordType)
      : [...recordsToClear, recordType];
    setRecordsToClear(updatedRecords);
    setSelectAll(updatedRecords.length === availableRecordTypes.length);
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-records-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
                      <motion.div
                        ref={modalRef}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-md shadow-xl"            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3
                id="clear-records-modal-title"
                className="text-base sm:text-lg font-semibold text-red-600 flex items-center"
              >
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span>Clear Records</span>
              </h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 rounded p-1"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="mb-4 sm:mb-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 sm:p-3">
                <p className="text-xs sm:text-sm text-red-800 font-medium mb-1">
                  ⚠️ This action cannot be undone
                </p>
                <p className="text-xs sm:text-sm text-red-700">
                  This will permanently delete the selected records.
                </p>
              </div>

              {availableRecordTypes.length > 0 ? (
                <>
                  <div>
                    <label className="block text-xs sm:text-sm text-slate-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                      Select the records you want to clear:
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          id="select-all"
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="select-all" className="ml-2 block text-sm text-gray-900 dark:text-white">
                          Select All
                        </label>
                      </div>
                      {availableRecordTypes.map((recordType) => (
                        <div key={recordType} className="flex items-center">
                          <input
                            id={recordType}
                            type="checkbox"
                            checked={recordsToClear.includes(recordType)}
                            onChange={() => handleRecordTypeChange(recordType)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label htmlFor={recordType} className="ml-2 block text-sm text-gray-900 dark:text-white capitalize">
                            {recordType}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-gray-300 mb-1.5">
                      To confirm, please type '''clear my records''' in the box below.
                    </p>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="block w-full px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 bg-slate-50 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-gray-500 sm:text-sm"
                      placeholder="clear my records"
                    />
                  </div>
                </>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-700 rounded-lg p-3 flex items-center">
                  <Info className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    You have no records to clear.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors text-sm min-h-[44px] sm:min-h-0 mr-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(recordsToClear)}
                disabled={clearing || recordsToClear.length === 0 || confirmText !== requiredConfirmText || availableRecordTypes.length === 0}
                className="px-4 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0"
              >
                {clearing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Clear Records
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ClearRecordsModal;