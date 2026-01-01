import { createClient } from '@supabase/supabase-js';
import type { Expense } from '../types';

// These should be in environment variables in production
// For now, using placeholder values - REPLACE WITH YOUR SUPABASE PROJECT CREDENTIALS
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper type for Supabase expense (matches DB schema)
export interface SupabaseExpense {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  note: string | null;
  date: string;
  timestamp: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

// Convert app Expense to Supabase format
export const toSupabaseExpense = (expense: Expense, userId: string): Omit<SupabaseExpense, 'created_at' | 'updated_at'> => ({
  id: expense.id,
  user_id: userId,
  amount: expense.amount,
  category: expense.category,
  note: expense.note || null,
  date: expense.date,
  timestamp: expense.timestamp,
  currency: expense.currency || 'USD',
});

// Convert Supabase expense to app format
export const fromSupabaseExpense = (supabaseExpense: SupabaseExpense): Expense => ({
  id: supabaseExpense.id,
  amount: supabaseExpense.amount,
  category: supabaseExpense.category,
  note: supabaseExpense.note || undefined,
  date: supabaseExpense.date,
  timestamp: supabaseExpense.timestamp,
  currency: supabaseExpense.currency,
});
