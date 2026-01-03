import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Expense } from '../../types';

interface LineChartMonthlyProps {
  expenses: Expense[];
  currency: string;
}

const LineChartMonthly: React.FC<LineChartMonthlyProps> = ({ expenses, currency }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Explicit colors for Android APK compatibility
  const CHART_COLOR = '#2383E2'; // blue-600
  const GRID_COLOR = '#E5E7EB'; // gray-200
  const AXIS_COLOR = '#9CA3AF'; // gray-400

  const chartData = useMemo(() => {
    // Group expenses by day
    const dailyTotals: { [day: string]: number } = {};
    
    expenses.forEach(expense => {
      const day = new Date(expense.date).getDate();
      const dayKey = day.toString();
      dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + expense.amount;
    });

    // Create array for all days in month
    const daysInMonth = expenses.length > 0 
      ? new Date(new Date(expenses[0].date).getFullYear(), new Date(expenses[0].date).getMonth() + 1, 0).getDate()
      : 31;

    const data = [];
    for (let day = 1; day <= daysInMonth; day++) {
      data.push({
        day,
        amount: dailyTotals[day.toString()] || 0,
        displayDay: day.toString()
      });
    }

    return data;
  }, [expenses]);

  const getCurrencySymbol = (code: string): string => {
    const symbols: { [key: string]: string } = {
      USD: '$',
      INR: '₹',
      EUR: '€',
      GBP: '£'
    };
    return symbols[code] || '$';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-[#37352f] dark:text-gray-100">
            Day {payload[0].payload.day}
          </p>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {getCurrencySymbol(currency)}{payload[0].value.toFixed(2)}
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
          Daily Spending Trend
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
          maxHeight: isExpanded ? '300px' : '0',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis 
            dataKey="day" 
            stroke={AXIS_COLOR} 
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => value}
          />
          <YAxis 
            stroke={AXIS_COLOR} 
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${getCurrencySymbol(currency)}${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="amount" 
            stroke={CHART_COLOR} 
            strokeWidth={2}
            dot={{ fill: CHART_COLOR, r: 3 }}
            activeDot={{ r: 5, fill: CHART_COLOR }}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
};

export default React.memo(LineChartMonthly);
