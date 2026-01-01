import { supabase, toSupabaseExpense, fromSupabaseExpense } from '../lib/supabase';
import type { Expense } from '../types';

export class DataSyncService {
  // Fetch all expenses for authenticated user from Supabase
  static async fetchExpenses(userId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }

    return data.map(fromSupabaseExpense);
  }

  // Add expense to Supabase
  static async addExpense(expense: Expense, userId: string): Promise<boolean> {
    const supabaseExpense = toSupabaseExpense(expense, userId);
    const { error } = await supabase
      .from('expenses')
      .insert([supabaseExpense]);

    if (error) {
      console.error('Error adding expense:', error);
      return false;
    }

    return true;
  }

  // Update expense in Supabase
  static async updateExpense(expense: Expense, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('expenses')
      .update({
        amount: expense.amount,
        category: expense.category,
        note: expense.note || null,
        date: expense.date,
        currency: expense.currency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', expense.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating expense:', error);
      return false;
    }

    return true;
  }

  // Delete expense from Supabase
  static async deleteExpense(expenseId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting expense:', error);
      return false;
    }

    return true;
  }

  // Migrate local expenses to Supabase (called once when user first logs in)
  static async migrateLocalExpenses(localExpenses: Expense[], userId: string): Promise<boolean> {
    if (localExpenses.length === 0) return true;

    const supabaseExpenses = localExpenses.map(exp => toSupabaseExpense(exp, userId));
    
    const { error } = await supabase
      .from('expenses')
      .insert(supabaseExpenses);

    if (error) {
      console.error('Error migrating expenses:', error);
      return false;
    }

    return true;
  }

  // Check if user has any expenses in Supabase
  static async hasCloudData(userId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error checking cloud data:', error);
      return false;
    }

    return (count || 0) > 0;
  }
}
