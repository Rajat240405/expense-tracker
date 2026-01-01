import type { Expense } from '../types';

/**
 * Export expenses as CSV
 */
export const exportToCSV = (expenses: Expense[], filename: string = 'expenses.csv') => {
  if (expenses.length === 0) {
    alert('No expenses to export');
    return;
  }

  // CSV headers
  const headers = ['Date', 'Category', 'Amount', 'Currency', 'Note'];
  
  // Convert expenses to CSV rows
  const rows = expenses.map(expense => [
    expense.date,
    expense.category,
    expense.amount.toString(),
    expense.currency || 'USD',
    expense.note ? `"${expense.note.replace(/"/g, '""')}"` : ''
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create and download file
  downloadFile(csvContent, filename, 'text/csv');
};

/**
 * Export all data as JSON (includes metadata)
 */
export const exportToJSON = (
  expenses: Expense[], 
  customCategories: string[] = [],
  budget: number = 0,
  filename: string = 'expenses-backup.json'
) => {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    expenses,
    customCategories,
    budget,
    totalExpenses: expenses.length
  };

  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
};

/**
 * Helper to trigger file download
 */
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Format date for filename
 */
export const getExportFilename = (prefix: string, extension: string): string => {
  const date = new Date();
  const formatted = date.toISOString().split('T')[0];
  return `${prefix}-${formatted}.${extension}`;
};
