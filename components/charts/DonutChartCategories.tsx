import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Expense } from '../../types';

interface DonutChartCategoriesProps {
  expenses: Expense[];
  currency: string;
}

const CATEGORY_COLORS: { [key: string]: string } = {
  'Food': '#fb923c',
  'Travel': '#34d399',
  'Shopping': '#3b82f6',
  'Bills': '#ef4444',
  'Other': '#9ca3af'
};

const DonutChartCategories: React.FC<DonutChartCategoriesProps> = ({ expenses, currency }) => {
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
    return CATEGORY_COLORS[category] || '#6b7280';
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
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
        Category Distribution
      </h3>
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
  );
};

export default React.memo(DonutChartCategories);
