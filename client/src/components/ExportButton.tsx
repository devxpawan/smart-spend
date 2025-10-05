import React from "react";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { ChevronDown, Download, FileText, FileSpreadsheet } from "lucide-react";

interface ExportButtonProps {
  onExportCsv: () => void;
  onExportPdf: () => void;
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ onExportCsv, onExportPdf, disabled }) => {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 transition-colors min-h-[44px] min-w-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Export options"
          disabled={disabled}
        >
          <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          <span>Export</span>
          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 ml-2 -mr-1" />
        </Menu.Button>
      </div>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-1 py-1 ">
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`${
                    active
                      ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      : "text-slate-700 dark:text-slate-300"
                  }
                    group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                >
                  <FileSpreadsheet className="w-5 h-5 mr-2" />
                  Export as CSV
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onExportPdf}
                  className={`${
                    active
                      ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      : "text-slate-700 dark:text-slate-300"
                  }
                    group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Export as PDF
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default ExportButton;
