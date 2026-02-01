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
    <div className="glass-card rounded-2xl p-6 shadow-card">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-5 text-left hover:opacity-70 transition-smooth btn-press"
      >
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
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
        <div className="flex flex-col md:flex-row items-center justify-around gap-8">
          {/* Circular Progress with Gradient */}
          <div className={`relative w-48 h-48 flex items-center justify-center ${overBudget ? 'animate-pulse-glow' : ''}`}>
            <svg className="w-48 h-48 transform -rotate-90">
              {/* Define Gradients */}
              <defs>
                <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
              </defs>

              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r="75"
                stroke="currentColor"
                strokeWidth="14"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />

              {/* Progress circle with gradient */}
              <circle
                cx="96"
                cy="96"
                r="75"
                stroke={overBudget ? "url(#redGradient)" : percentage >= 75 ? "url(#yellowGradient)" : "url(#greenGradient)"}
                strokeWidth="14"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
                style={{
                  filter: overBudget ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))' : percentage >= 75 ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.4))' : 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.3))'
                }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-[#37352f] dark:text-gray-100 tabular-nums">
                {Math.round(percentage)}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-semibold tracking-wide">
                {overBudget ? 'Over Budget' : 'Used'}
              </span>
            </div>
          </div>

          {/* Stats with enhanced typography */}
          <div className="space-y-5 w-full md:w-auto md:min-w-[220px]">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 font-bold">
                Budget
              </p>
              <p className="text-2xl font-bold text-[#37352f] dark:text-gray-100 tabular-nums">
                {getCurrencySymbol(currency)}{budget.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 font-bold">
                Spent
              </p>
              <p className="text-2xl font-bold tabular-nums" style={{ color }}>
                {getCurrencySymbol(currency)}{spent.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 font-bold">
                {overBudget ? 'Over By' : 'Remaining'}
              </p>
              <p className={`text-2xl font-bold tabular-nums ${overBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
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
