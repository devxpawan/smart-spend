import React from "react";

export const SkeletonCard = () => (
  <div className="group relative p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 min-h-[120px] sm:min-h-[140px]">
    <div className="animate-pulse flex flex-col h-full">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-8 bg-slate-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-gray-700 flex-shrink-0 ml-2"></div>
      </div>
      <div className="mt-auto h-4 bg-slate-200 dark:bg-gray-700 rounded w-1/4"></div>
    </div>
  </div>
);

export const SkeletonChart = () => (
  <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-4 sm:p-6 lg:p-8 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 lg:mb-8 space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-gray-700"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-32"></div>
            <div className="h-3 bg-slate-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-20"></div>
          <div className="h-3 bg-slate-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
      </div>
      <div className="h-64 sm:h-72 lg:h-80 bg-slate-200 dark:bg-gray-700 rounded-lg"></div>
    </div>
  </div>
);

export const SkeletonDoughnut = () => (
  <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 sm:p-6 lg:p-8 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 lg:mb-8 space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-gray-700"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-32"></div>
            <div className="h-3 bg-slate-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col items-center">
          <div className="w-48 h-48 rounded-full bg-slate-200 dark:bg-gray-700"></div>
          <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-20 mt-4"></div>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-48 h-48 rounded-full bg-slate-200 dark:bg-gray-700"></div>
          <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-20 mt-4"></div>
        </div>
      </div>
    </div>
  </div>
);
