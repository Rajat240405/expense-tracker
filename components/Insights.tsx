import React, { useMemo } from 'react';
import type { Expense } from '../types';

interface InsightsProps {
  expenses: Expense[];
  previousMonthExpenses: Expense[];
  budget: number;
  currency: string;
}

const Insights: React.FC<InsightsProps> = ({ 
  expenses, 
  previousMonthExpenses, 
  budget,
  currency 
}) => {
  const insights = useMemo(() => {
    if (expenses.length === 0) return null;

    const currentTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const previousTotal = previousMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Monthly comparison
    const monthlyChange = previousTotal > 0 
      ? ((currentTotal - previousTotal) / previousTotal) * 100 
      : 0;

    // Top category
    const categoryTotals: { [key: string]: number } = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });
    const topCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0];
    const topCategoryPercentage = (topCategory[1] / currentTotal) * 100;

    // Daily average
    const uniqueDays = new Set(expenses.map(e => e.date)).size;
    const dailyAverage = currentTotal / Math.max(uniqueDays, 1);

    // Budget status
    const budgetUsage = budget > 0 ? (currentTotal / budget) * 100 : 0;

    return {
      currentTotal,
      previousTotal,
      monthlyChange,
      topCategory: topCategory[0],
      topCategoryAmount: topCategory[1],
      topCategoryPercentage,
      dailyAverage,
      budgetUsage,
      uniqueDays
    };
  }, [expenses, previousMonthExpenses, budget]);

  const getCurrencySymbol = (code: string): string => {
    const symbols: { [key: string]: string } = {
      USD: '$', INR: '₹', EUR: '€', GBP: '£'
    };
    return symbols[code] || '$';
  };

  if (!insights || expenses.length === 0) return null;

  const symbol = getCurrencySymbol(currency);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-200 dark:border-gray-700 rounded-lg p-6 mb-8 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
        Quick Insights
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">This month vs last</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#37352f] dark:text-gray-100">
              {symbol}{insights.currentTotal.toFixed(2)}
            </span>
            {insights.previousTotal > 0 && (
              <span className={`text-sm font-medium ${
                insights.monthlyChange > 0 
                  ? 'text-orange-600 dark:text-orange-400' 
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {insights.monthlyChange > 0 ? '↑' : '↓'} {Math.abs(insights.monthlyChange).toFixed(1)}%
              </span>
            )}
          </div>
          {insights.previousTotal > 0 && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {insights.monthlyChange > 0 ? 'More' : 'Less'} than last month
            </p>
          )}
        </div>

        {/* Top Category */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Most spent on</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#37352f] dark:text-gray-100">
              {insights.topCategory}
            </span>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {insights.topCategoryPercentage.toFixed(0)}%
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {symbol}{insights.topCategoryAmount.toFixed(2)} total
          </p>
        </div>

        {/* Daily Average */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Daily average</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#37352f] dark:text-gray-100">
              {symbol}{insights.dailyAverage.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Across {insights.uniqueDays} day{insights.uniqueDays !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Budget Status */}
        {budget > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Budget status</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${
                insights.budgetUsage > 100 
                  ? 'text-red-600 dark:text-red-400' 
                  : insights.budgetUsage > 75 
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {insights.budgetUsage.toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {insights.budgetUsage > 100 
                ? 'Over budget' 
                : insights.budgetUsage > 75 
                ? 'Watch your spending'
                : 'On track'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(Insights);
