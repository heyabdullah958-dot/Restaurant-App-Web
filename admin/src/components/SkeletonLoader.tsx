import React from 'react';

interface SkeletonProps {
  type: 'card' | 'table' | 'chart';
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({ type }) => {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 h-28 flex flex-col justify-between">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3"></div>
            <div className="h-8 bg-gray-300 dark:bg-slate-600 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 h-80 animate-pulse flex flex-col justify-between">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
        <div className="flex-1 flex items-end gap-3 px-4">
          {[40, 60, 45, 80, 55, 70, 95].map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-t"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  // Default: Table skeleton loader
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-pulse">
      <div className="bg-gray-50 dark:bg-slate-900/50 p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/5"></div>
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/6"></div>
      </div>
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex justify-between items-center py-2">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/5"></div>
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-12"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
