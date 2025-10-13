import React from "react";
import { Info, Repeat } from "lucide-react";

const RecurringInfo: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <Repeat className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            What is Recurring?
          </h3>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            "Recurring" means something that happens regularly, at the same time. 
            In SmartSpend, it refers to recurring income or expenses that occur on a regular basis.
          </p>
          
          <div className="mt-4 space-y-3">
            <div className="flex items-start space-x-2">
              <Info className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white">Examples</h4>
                <ul className="mt-1 text-slate-600 dark:text-slate-300 list-disc list-inside space-y-1">
                  <li>Netflix subscription (monthly)</li>
                  <li>Salary (monthly/weekly)</li>
                  <li>Electricity bill (monthly)</li>
                  <li>Rent (monthly)</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Info className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white">How it works</h4>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  When you create a recurring transaction, SmartSpend will automatically 
                  add it to your records on the scheduled date based on the interval you set.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecurringInfo;