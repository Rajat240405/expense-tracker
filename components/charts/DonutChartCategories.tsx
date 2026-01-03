import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Expense } from '../../types';

interface DonutChartCategoriesProps {
  expenses: Expense[];
  currency: string;
}

// Explicit HEX colors for Android APK compatibility
const CATEGORY_COLORS: { [key: string]: string } = {
  'Food': '#FB923C',
  'Travel': '#34D399',
  'Shopping': '#3B82F6',
  'Bills': '#EF4444',
  'Other': '#9CA3AF'
};

// Dark mode colors - explicit HEX
const CATEGORY_COLORS_DARK: { [key: string]: string } = {
  'Food': '#FDBA74',
  'Travel': '#6EE7B7',
  'Shopping': '#60A5FA',
  'Bills': '#F87171',
  'Other': '#D1D5DB'
};

// Fallback color palette for custom categories
const FALLBACK_COLORS = [
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#F59E0B', // amber
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#6366F1', // indigo
];

const DonutChartCategories: React.FC<DonutChartCategoriesProps> = ({ expenses, currency }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const chartData = useMemo(() => {
    const categoryTotals: { [key: string]: number } = {};
    
    expenses.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        name: category,
        value: amount,
        percentage: 0 // Will be calculated after
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const total = useMemo(() => 
    chartData.reduce((sum, item) => sum + item.value, 0)
  , [chartData]);

  // Add percentage
  const dataWithPercentage = useMemo(() => 
    chartData.map(item => ({
      ...item,
      percentage: (item.value / total * 100).toFixed(1)
    }))
  , [chartData, total]);

  const getCurrencySymbol = (code: string): string => {
    const symbols: { [key: string]: string } = {
      USD: '$',
      INR: '₹',
      EUR: '€',
      GBP: '£'
    };
    return symbols[code] || '$';
  };

  const getColor = (category: string): string => {
    // Detect dark mode
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const colors = isDark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS;
    
    // Return predefined color or use fallback palette for custom categories
    if (colors[category]) {
      return colors[category];
    }
    
    // Generate consistent color for custom categories
    const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-[#37352f] dark:text-gray-100">
            {data.name}
          </p>
          <p className="text-sm font-semibold" style={{ color: getColor(data.name) }}>
            {getCurrencySymbol(currency)}{data.value.toFixed(2)} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (expenses.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4 text-left hover:opacity-70 transition-opacity"
      >
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Category Distribution
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
          maxHeight: isExpanded ? '500px' : '0',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="w-full md:w-1/2">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={dataWithPercentage}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {dataWithPercentage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full md:w-1/2 space-y-2">
          {dataWithPercentage.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getColor(item.name) }}
                />
                <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
              </div>
              <span className="font-medium text-[#37352f] dark:text-gray-100">
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
};

export default React.memo(DonutChartCategories);
