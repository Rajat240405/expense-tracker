import React, { useMemo, useState } from 'react';

interface BudgetProgressProps {
  budget: number;
  spent: number;
  currency: string;
}

const BudgetProgress: React.FC<BudgetProgressProps> = ({ budget, spent, currency }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const percentage = useMemo(() => {
    if (budget <= 0) return 0;
    return Math.min((spent / budget) * 100, 100);
  }, [budget, spent]);

  const overBudget = spent > budget;
  const remaining = budget - spent;

  const getColor = (): string => {
    if (overBudget) return '#ef4444'; // red
    if (percentage >= 75) return '#f59e0b'; // yellow/amber
    return '#10b981'; // green
  };

  const getCurrencySymbol = (code: string): string => {
    const symbols: { [key: string]: string } = {
      USD: '$',
      INR: '₹',
      EUR: '€',
      GBP: '£'
    };
    return symbols[code] || '$';
  };

  if (budget <= 0) {
    return null;
  }

  const color = getColor();
  const circumference = 2 * Math.PI * 70; // radius = 70
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4 text-left hover:opacity-70 transition-opacity"
      >
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Budget Status
        </h3>
        <svg 
          className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div 
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          maxHeight: isExpanded ? '400px' : '0',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="flex flex-col md:flex-row items-center justify-around gap-6">
        {/* Circular Progress */}
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-44 h-44 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="88"
              cy="88"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="88"
              cy="88"
              r="70"
              stroke={color}
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-[#37352f] dark:text-gray-100">
              {overBudget ? Math.round(percentage) : Math.round(percentage)}%
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {overBudget ? 'over budget' : 'used'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4 w-full md:w-auto md:min-w-[200px]">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Budget
            </p>
            <p className="text-lg font-semibold text-[#37352f] dark:text-gray-100">
              {getCurrencySymbol(currency)}{budget.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Spent
            </p>
            <p className="text-lg font-semibold" style={{ color }}>
              {getCurrencySymbol(currency)}{spent.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              {overBudget ? 'Over by' : 'Remaining'}
            </p>
            <p className={`text-lg font-semibold ${overBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {getCurrencySymbol(currency)}{Math.abs(remaining).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default React.memo(BudgetProgress);
