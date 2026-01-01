export interface Expense {
  id: string;
  amount: number;
  category: string;
  note?: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  currency?: string; // 'USD', 'INR', etc.
}

export type ViewState = 'landing' | 'workspace';
