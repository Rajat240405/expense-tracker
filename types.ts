export interface Expense {
  id: string;
  amount: number;
  category: string;
  note?: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  currency?: string; // 'USD', 'INR', etc.
}

export interface Split {
  id: string;
  personName: string;
  amount: number;
  currency: string;
  category?: string;
  note?: string;
  direction: 'to_receive' | 'to_pay'; // I paid for them / They paid for me
  date: string; // YYYY-MM-DD
  timestamp: number;
  settled: boolean;
}

export interface CustomCurrency {
  code: string;
  symbol: string;
  name: string;
  isCustom: true;
}

export type ViewState = 'landing' | 'workspace';

export type WorkspaceView = 'expenses' | 'splits' | 'visualize';
