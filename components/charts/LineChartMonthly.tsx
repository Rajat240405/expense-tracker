import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Expense } from '../../types';

interface LineChartMonthlyProps {
  expenses: Expense[];
  currency: string;
}

const LineChartMonthly: React.FC<LineChartMonthlyProps> = ({ expenses, currency }) => {
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
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
        Daily Spending Trend
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis 
            dataKey="day" 
            stroke="#9ca3af" 
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => value}
          />
          <YAxis 
            stroke="#9ca3af" 
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${getCurrencySymbol(currency)}${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="amount" 
            stroke="#2383e2" 
            strokeWidth={2}
            dot={{ fill: '#2383e2', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(LineChartMonthly);
