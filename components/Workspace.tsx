import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { Expense } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { DataSyncService } from '../services/DataSyncService';
import AuthModal from './AuthModal';
import MigrationModal from './MigrationModal';
import LineChartMonthly from './charts/LineChartMonthly';
import DonutChartCategories from './charts/DonutChartCategories';
import BudgetProgress from './charts/BudgetProgress';

const PREDEFINED_CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Other'];

// Currency options
const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'Dollar' },
  { code: 'INR', symbol: '₹', name: 'Rupees' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'Pound' },
];

// Helper to get currency symbol
const getCurrencySymbol = (code: string = 'USD'): string => {
  return CURRENCIES.find(c => c.code === code)?.symbol || '$';
};

// Category Selector Modal Component
interface CategorySelectorProps {
  isOpen: boolean;
  selectedCategory: string;
  categories: string[];
  onSelect: (category: string) => void;
  onClose: () => void;
  onAddCustom: () => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = memo(({ 
  isOpen, 
  selectedCategory, 
  categories, 
  onSelect, 
  onClose,
  onAddCustom 
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-40 animate-fadeIn"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl animate-slideUp max-h-[80vh] overflow-hidden">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#37352f] dark:text-gray-100">Select Category</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(80vh-70px)] overscroll-contain">
          <div className="p-4 space-y-1">
            {categories.filter(c => c !== 'Other').map(cat => (
              <button
                key={cat}
                onClick={() => {
                  onSelect(cat);
                  onClose();
                }}
                className={`
                  w-full text-left px-4 py-3.5 rounded-lg transition-all
                  ${selectedCategory === cat 
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-600 text-blue-700 dark:text-blue-300 font-medium' 
                    : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600 text-[#37352f] dark:text-gray-100'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">{cat}</span>
                  {selectedCategory === cat && (
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  )}
                </div>
              </button>
            ))}
            
            {/* Add Custom Category */}
            <button
              onClick={() => {
                onAddCustom();
                onClose();
              }}
              className="w-full text-left px-4 py-3.5 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 border-2 border-dashed border-purple-300 dark:border-purple-600 hover:border-purple-400 dark:hover:border-purple-500 text-purple-700 dark:text-purple-300 font-medium transition-all"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                </svg>
                <span>Add Custom Category</span>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </>
  );
});

// App-level currency constant
const CURRENCY_SYMBOL = '$';

interface WorkspaceProps {
  onBack?: () => void;
}

// Helper to format date for display (DD/MM/YYYY)
const formatDateDisplay = (dateStr: string): string => {
  // dateStr is in YYYY-MM-DD format from date input
  const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper to format date groups
const getDateLabel = (dateStr: string) => {
  const today = new Date();
  const date = new Date(dateStr);
  
  // Reset times for comparison
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffTime = t.getTime() - d.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

const Workspace: React.FC<WorkspaceProps> = ({ onBack }) => {
  // --- STATE ---
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [budget, setBudget] = useState<number>(0);
  
  // View State
  const [viewDate, setViewDate] = useState(new Date()); // For tracking current month view
  
  // Add Form State
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Food');
  const [currency, setCurrency] = useState<string>('INR');
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState<boolean>(false);
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>(new Date().toISOString().split('T')[0]);

  // Breakdown Accordion State
  const [isBreakdownOpen, setIsBreakdownOpen] = useState<boolean>(true);

  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Expense>>({});

  // Undo Delete State
  const [deletedExpense, setDeletedExpense] = useState<Expense | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

  // Auth & Cloud Sync State
  const { user, isGuest, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [hasCheckedMigration, setHasCheckedMigration] = useState(false);

  // --- PERSISTENCE ---
  // Load data based on auth state
  useEffect(() => {
    const loadData = async () => {
      if (!isGuest && user) {
        // Authenticated: Load from Supabase
        const cloudExpenses = await DataSyncService.fetchExpenses(user.id);
        setExpenses(cloudExpenses);
        
        // Check if we need to migrate local data
        if (!hasCheckedMigration) {
          const localExpenses = localStorage.getItem('expenses_v1');
          if (localExpenses) {
            const parsed: Expense[] = JSON.parse(localExpenses);
            if (parsed.length > 0) {
              const hasCloud = await DataSyncService.hasCloudData(user.id);
              if (!hasCloud) {
                setIsMigrationModalOpen(true);
              }
            }
          }
          setHasCheckedMigration(true);
        }
      } else {
        // Guest: Load from localStorage
        const saved = localStorage.getItem('expenses_v1');
        if (saved) {
          try {
            const parsed: Expense[] = JSON.parse(saved);
            const migrated = parsed.map(e => ({
              ...e,
              date: e.date || new Date(e.timestamp).toISOString().split('T')[0]
            }));
            setExpenses(migrated);
          } catch (e) { console.error(e); }
        }
      }

      // Load categories and budget (always from localStorage for now)
      const savedCats = localStorage.getItem('custom_categories_v1');
      const savedBudget = localStorage.getItem('budget_v1');
      
      if (savedCats) {
        try { setCustomCategories(JSON.parse(savedCats)); } catch (e) {}
      }
      if (savedBudget) {
        try { setBudget(parseFloat(savedBudget)); } catch (e) {}
      }
    };

    loadData();
  }, [user, isGuest, hasCheckedMigration]);

  // Save to localStorage for guests, Supabase for authenticated
  useEffect(() => {
    if (isGuest) {
      localStorage.setItem('expenses_v1', JSON.stringify(expenses));
    }
  }, [expenses, isGuest]);

  useEffect(() => {
    localStorage.setItem('custom_categories_v1', JSON.stringify(customCategories));
  }, [customCategories]);

  useEffect(() => {
    localStorage.setItem('budget_v1', budget.toString());
  }, [budget]);


  // --- COMPUTED ---
  const allCategories = useMemo(() => {
    return Array.from(new Set([...PREDEFINED_CATEGORIES.filter(c => c !== 'Other'), ...customCategories, 'Other']));
  }, [customCategories]);

  const currentMonthKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
  
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(currentMonthKey));
  }, [expenses, currentMonthKey]);

  const groupedExpenses = useMemo(() => {
    const groups: { [key: string]: Expense[] } = {};
    // Sort by date desc, then timestamp desc
    const sorted = [...filteredExpenses].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.timestamp - a.timestamp;
    });

    sorted.forEach(e => {
      const label = getDateLabel(e.date);
      if (!groups[label]) groups[label] = [];
      groups[label].push(e);
    });
    return groups;
  }, [filteredExpenses]);

  const total = useMemo(() => 
    filteredExpenses.reduce((sum, ex) => sum + ex.amount, 0)
  , [filteredExpenses]);

  // Today's total calculation
  const todayTotal = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return expenses
      .filter(e => e.date === today)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const categoryTotals = useMemo(() => {
    const totals: { [key: string]: number } = {};
    filteredExpenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);


  // --- ACTIONS ---

  const handleMonthChange = useCallback((direction: -1 | 1) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setViewDate(newDate);
  }, [viewDate]);

  const handleMonthSelect = useCallback((monthIndex: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(monthIndex);
    setViewDate(newDate);
  }, [viewDate]);

  const handleCategorySelect = useCallback((selectedCat: string) => {
    setCategory(selectedCat);
    setIsCustomCategory(false);
  }, []);

  const handleAddCustomCategory = useCallback(() => {
    setIsCustomCategory(true);
    setCustomCategoryInput('');
  }, []);

  const addExpense = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amountNum = parseFloat(amount);
    const finalCategory = isCustomCategory ? customCategoryInput.trim() : category;

    if (!amount || isNaN(amountNum) || amountNum <= 0) return;
    if (isCustomCategory && !finalCategory) return;

    // Save custom category if new
    if (isCustomCategory && !customCategories.includes(finalCategory)) {
      setCustomCategories(prev => [...prev, finalCategory]);
    }

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      amount: amountNum,
      category: finalCategory,
      note: note.trim(),
      date: dateInput,
      timestamp: Date.now(),
      currency: currency,
    };

    // Sync to cloud if authenticated
    if (!isGuest && user) {
      await DataSyncService.addExpense(newExpense, user.id);
    }

    setExpenses(prev => [newExpense, ...prev]);

    // Reset Form (keep date sticky)
    setAmount('');
    setCategory('Food');
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setNote('');
  }, [amount, category, isCustomCategory, customCategoryInput, note, dateInput, customCategories, isGuest, user]);

  const deleteExpense = useCallback(async (id: string) => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;

    // Clear any existing timer
    if (undoTimer) clearTimeout(undoTimer);

    // Sync deletion to cloud if authenticated
    if (!isGuest && user) {
      await DataSyncService.deleteExpense(id, user.id);
    }

    // Remove expense and store for undo
    setExpenses(prev => prev.filter(ex => ex.id !== id));
    setDeletedExpense(expense);

    // Set timer to permanently delete after 5 seconds
    const timer = setTimeout(() => {
      setDeletedExpense(null);
      setUndoTimer(null);
    }, 5000);
    
    setUndoTimer(timer);
  }, [expenses, undoTimer, isGuest, user]);

  const undoDelete = useCallback(async () => {
    if (!deletedExpense) return;

    // Clear timer and restore expense
    if (undoTimer) {
      clearTimeout(undoTimer);
      setUndoTimer(null);
    }

    // Restore to cloud if authenticated
    if (!isGuest && user) {
      await DataSyncService.addExpense(deletedExpense, user.id);
    }

    setExpenses(prev => [deletedExpense, ...prev]);
    setDeletedExpense(null);
  }, [deletedExpense, undoTimer, isGuest, user]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimer) clearTimeout(undoTimer);
    };
  }, [undoTimer]);

  // Inline Editing Logic
  const startEditing = useCallback((expense: Expense) => {
    setEditingId(expense.id);
    setEditForm({ ...expense });
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId || !editForm) return;
    
    const updatedExpense = expenses.find(ex => ex.id === editingId);
    if (!updatedExpense) return;

    const finalExpense = { ...updatedExpense, ...editForm } as Expense;

    // Sync to cloud if authenticated
    if (!isGuest && user) {
      await DataSyncService.updateExpense(finalExpense, user.id);
    }

    setExpenses(prev => prev.map(ex => {
      if (ex.id === editingId) {
        return finalExpense;
      }
      return ex;
    }));
    setEditingId(null);
    setEditForm({});
  }, [editingId, editForm, expenses, isGuest, user]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm({});
  }, []);

  const toggleBreakdown = useCallback(() => {
    setIsBreakdownOpen(prev => !prev);
  }, []);

  // Handle hardware back button
  useEffect(() => {
    let listener: any;
    
    const setupBackButton = async () => {
      // Only setup for Capacitor (mobile)
      if (typeof window !== 'undefined' && (window as any).Capacitor) {
        const { App } = await import('@capacitor/app');
        listener = await App.addListener('backButton', () => {
          if (onBack) {
            onBack();
          }
        });
      }
    };

    setupBackButton();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [onBack]);


  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 min-h-screen font-sans">
      
      {/* Category Selector Modal */}
      <CategorySelector
        isOpen={isCategorySelectorOpen}
        selectedCategory={category}
        categories={allCategories}
        onSelect={handleCategorySelect}
        onClose={() => setIsCategorySelectorOpen(false)}
        onAddCustom={handleAddCustomCategory}
      />

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Back to landing"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2 text-gray-400 dark:text-gray-500 text-sm font-medium">
                <span>Workspace</span>
                <span className="opacity-40">/</span>
                <span>Expenses</span>
              </div>
              <h1 className="text-4xl font-bold text-[#37352f] dark:text-gray-100 tracking-tight">Expenses</h1>
            </div>
          </div>

          {/* Auth UI */}
          <div className="md:hidden">
            {isGuest ? (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                Sync
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{user?.email}</span>
                <button
                  onClick={() => signOut()}
                  className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  title="Sign out"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Month & Budget Controls */}
        <div className="flex items-center gap-3">
          {/* Desktop Auth UI */}
          <div className="hidden md:flex items-center">
            {isGuest ? (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                Sync
              </button>
            ) : (
              <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px]">{user?.email}</span>
                <button
                  onClick={() => signOut()}
                  className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  title="Sign out"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 bg-gray-50/80 dark:bg-gray-800/50 p-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <button onClick={() => handleMonthChange(-1)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400" title="Previous month">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <select
              value={viewDate.getMonth()}
              onChange={(e) => handleMonthSelect(parseInt(e.target.value))}
              className="text-sm font-semibold text-[#37352f] dark:text-gray-100 bg-transparent border-none outline-none cursor-pointer px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                <option key={month} value={idx} className="bg-white dark:bg-gray-800">{month} {viewDate.getFullYear()}</option>
              ))}
            </select>
            <button onClick={() => handleMonthChange(1)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400" title="Next month">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
          <div className="flex items-center gap-2 pr-2">
             <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Budget</span>
             <input 
               type="number"
               value={budget || ''}
               onChange={(e) => setBudget(parseFloat(e.target.value))}
               placeholder="Set..."
               className="w-20 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 outline-none text-sm font-medium text-[#37352f] dark:text-gray-100 text-right p-0"
             />
          </div>
          </div>
        </div>
      </div>

      {/* Budget Status (Soft) */}
      {budget > 0 && (
        <div className="mb-8 text-sm font-medium dark:text-gray-300">
          {budget - total >= 0 ? (
            <span className="text-gray-500 dark:text-gray-400">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">${(budget - total).toFixed(2)}</span> left this month
            </span>
          ) : (
             <span className="text-orange-600 dark:text-orange-400">
               ${Math.abs(budget - total).toFixed(2)} over budget
             </span>
          )}
        </div>
      )}

      {/* Add Expense Form */}
      <div className="mb-12 border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-white dark:bg-gray-800 shadow-sm transition-all hover:shadow-md">
        <form onSubmit={addExpense} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Date */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold mb-2 ml-1">Date</label>
              <input 
                type="date"
                required
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded text-sm text-[#37352f] dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              />
            </div>

            {/* Amount */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold mb-2 ml-1">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-medium">{getCurrencySymbol(currency)}</span>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-7 pr-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded text-sm font-medium text-[#37352f] dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-300 dark:placeholder-gray-600 transition-colors"
                />
              </div>
            </div>

            {/* Currency */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold mb-2 ml-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded text-sm text-[#37352f] dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors cursor-pointer"
              >
                {CURRENCIES.map(curr => (
                  <option key={curr.code} value={curr.code} className="bg-white dark:bg-gray-900">
                    {curr.symbol} {curr.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="md:col-span-3">
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold mb-2 ml-1">Category</label>
              {isCustomCategory ? (
                <input
                  type="text"
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  placeholder="Type custom category..."
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-blue-500 rounded text-sm text-[#37352f] dark:text-gray-100 outline-none ring-1 ring-blue-500"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCategorySelectorOpen(true)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded text-sm text-[#37352f] dark:text-gray-100 text-left flex items-center justify-between hover:border-gray-300 dark:hover:border-gray-500 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <span>{category}</span>
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Note */}
            <div className="md:col-span-3">
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold mb-2 ml-1">Note</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded text-sm text-[#37352f] dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-300 dark:placeholder-gray-600 transition-colors"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="bg-[#2383e2] hover:bg-[#1d70c2] text-white px-6 py-2 rounded text-sm font-medium transition-colors shadow-sm"
            >
              Add Entry
            </button>
          </div>
        </form>
      </div>

      {/* Main List */}
      <div className="space-y-8">
        {Object.keys(groupedExpenses).length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="max-w-sm mx-auto">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-lg font-semibold text-[#37352f] dark:text-gray-100 mb-2">
                No expenses for {viewDate.toLocaleDateString('en-US', { month: 'long' })}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Start tracking your spending by adding your first expense above.
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-100 dark:border-gray-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
                <span>Track · Budget · Save</span>
              </div>
            </div>
          </div>
        ) : (
          Object.keys(groupedExpenses).map(dateLabel => (
            <div key={dateLabel}>
              <div className="flex items-center justify-between mb-3 ml-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{dateLabel}</h3>
                {dateLabel === 'Today' && todayTotal > 0 && (
                  <span className="text-sm font-bold text-[#37352f] dark:text-gray-100 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-700">
                    ${todayTotal.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {groupedExpenses[dateLabel].map(expense => (
                  <div 
                    key={expense.id}
                    className="group relative flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200"
                  >
                    {/* Inline Edit Mode */}
                    {editingId === expense.id ? (
                      <div className="flex-1 grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-3 md:col-span-2">
                           <input 
                             type="number"
                             value={editForm.amount}
                             onChange={e => setEditForm(prev => ({...prev, amount: parseFloat(e.target.value)}))}
                             className="w-full p-2 border border-blue-400 dark:border-blue-500 rounded text-sm bg-white dark:bg-gray-900 text-[#37352f] dark:text-gray-100"
                             autoFocus
                             onKeyDown={e => e.key === 'Enter' && saveEdit()}
                           />
                        </div>
                        <div className="col-span-4 md:col-span-3">
                           <select 
                             value={editForm.category}
                             onChange={e => setEditForm(prev => ({...prev, category: e.target.value}))}
                             className="w-full p-2 border border-blue-400 dark:border-blue-500 rounded text-sm bg-white dark:bg-gray-900 text-[#37352f] dark:text-gray-100"
                           >
                             {allCategories.filter(c => c !== 'Other').map(c => <option key={c} value={c} className="bg-white dark:bg-gray-900">{c}</option>)}
                           </select>
                        </div>
                        <div className="col-span-5 md:col-span-7 flex gap-2">
                           <input 
                             type="text"
                             value={editForm.note}
                             onChange={e => setEditForm(prev => ({...prev, note: e.target.value}))}
                             className="w-full p-2 border border-blue-400 dark:border-blue-500 rounded text-sm bg-white dark:bg-gray-900 text-[#37352f] dark:text-gray-100"
                             onKeyDown={e => e.key === 'Enter' && saveEdit()}
                           />
                           <button onClick={saveEdit} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-xs font-medium px-2 whitespace-nowrap">Save</button>
                           <button onClick={cancelEdit} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 text-xs px-1">✕</button>
                        </div>
                      </div>
                    ) : (
                      /* Display Mode */
                      <>
                        <div className="flex items-start gap-3 flex-1 overflow-hidden">
                           <span className={`
                             flex-shrink-0 px-2.5 py-1 rounded text-xs font-semibold tracking-wide
                             ${getCategoryColor(expense.category)}
                           `}>
                             {expense.category}
                           </span>
                           <div className="flex-1 min-w-0">
                             <span className="block text-base text-[#37352f] dark:text-gray-100 break-words">
                               {expense.note || <span className="text-gray-300 dark:text-gray-600 italic text-sm">No note</span>}
                             </span>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                           <span className="text-base font-semibold text-[#37352f] dark:text-gray-100 font-mono">
                             {getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)}
                           </span>
                           <button
                            onClick={() => startEditing(expense)}
                            className="text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 active:text-blue-600 dark:active:text-blue-300 transition-colors p-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 active:bg-blue-100 dark:active:bg-blue-900/50 md:opacity-0 md:group-hover:opacity-100"
                            title="Edit expense"
                           >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                           </button>
                           <button
                            onClick={() => deleteExpense(expense.id)}
                            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 active:text-red-600 dark:active:text-red-300 transition-colors p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/30 active:bg-red-100 dark:active:bg-red-900/50 md:opacity-0 md:group-hover:opacity-100"
                            title="Delete expense"
                           >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                           </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Category Breakdown - Collapsible Accordion */}
      {filteredExpenses.length > 0 && (
        <div className="mt-16 pt-8 border-t border-gray-100">
           {/* Accordion Header */}
           <button
             onClick={toggleBreakdown}
             className="w-full flex items-center justify-between p-4 -mx-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors group"
           >
             <h4 className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">
               Breakdown ({viewDate.toLocaleDateString('en-US', { month: 'long' })})
             </h4>
             <svg 
               className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isBreakdownOpen ? 'rotate-180' : 'rotate-0'}`}
               fill="none" 
               stroke="currentColor" 
               viewBox="0 0 24 24"
             >
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
             </svg>
           </button>

           {/* Accordion Content */}
           <div 
             className={`overflow-hidden transition-all duration-300 ease-in-out ${
               isBreakdownOpen ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
             }`}
           >
             <div className="space-y-3">
               {categoryTotals.map(([cat, amount]) => (
                 <div 
                   key={cat} 
                   className="flex items-center justify-between py-2.5 px-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                 >
                   <span className="text-sm text-gray-600 dark:text-gray-300">{cat}</span>
                   <span className="text-sm font-medium text-[#37352f] dark:text-gray-100">${amount.toFixed(2)}</span>
                 </div>
               ))}
               
               {/* Total Row */}
               <div className="flex items-center justify-between py-3 px-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border-t-2 border-blue-200 dark:border-blue-700 mt-2">
                 <span className="text-sm font-bold text-blue-900 dark:text-blue-300">Total</span>
                 <span className="text-base font-bold text-blue-900 dark:text-blue-300">${total.toFixed(2)}</span>
               </div>
             </div>
           </div>
        </div>
      )}

      {/* Data Visualizations */}
      {filteredExpenses.length > 0 && (
        <div className="mt-16 pt-8 border-t border-gray-100 dark:border-gray-800 space-y-6">
          {/* Budget Progress - Only show if budget is set */}
          {budget > 0 && (
            <BudgetProgress
              budget={budget}
              spent={total}
              currency={currency}
            />
          )}

          {/* Monthly Trend Line Chart */}
          <LineChartMonthly
            expenses={filteredExpenses}
            currency={currency}
          />

          {/* Category Distribution Donut Chart */}
          <DonutChartCategories
            expenses={filteredExpenses}
            currency={currency}
          />
        </div>
      )}

      {/* Undo Delete Snackbar */}
      {deletedExpense && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slideUpFade">
          <div className="bg-[#37352f] text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-4 min-w-[280px] max-w-[90vw]">
            <div className="flex-1">
              <span className="text-sm font-medium">Expense deleted</span>
            </div>
            <button
              onClick={undoDelete}
              className="text-blue-400 hover:text-blue-300 font-semibold text-sm uppercase tracking-wide transition-colors"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {/* Snackbar Animation */}
      <style>{`
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-slideUpFade {
          animation: slideUpFade 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Migration Modal */}
      <MigrationModal
        isOpen={isMigrationModalOpen}
        expenseCount={expenses.length}
        onMigrate={async () => {
          if (user) {
            await DataSyncService.migrateLocalExpenses(expenses, user.id);
            setHasCheckedMigration(true);
            setIsMigrationModalOpen(false);
          }
        }}
        onSkip={() => {
          setHasCheckedMigration(true);
          setIsMigrationModalOpen(false);
        }}
      />

    </div>
  );
};

// Expanded palette for deterministic coloring
const PASTEL_COLORS = [
  'bg-gray-100 text-gray-700',
  'bg-orange-100 text-orange-800',
  'bg-yellow-100 text-yellow-800',
  'bg-green-100 text-green-800',
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-red-100 text-red-800',
  'bg-teal-100 text-teal-800',
  'bg-indigo-100 text-indigo-800',
  'bg-rose-100 text-rose-800',
  'bg-cyan-100 text-cyan-800',
  'bg-amber-100 text-amber-800',
  'bg-lime-100 text-lime-800',
  'bg-emerald-100 text-emerald-800',
  'bg-violet-100 text-violet-800',
  'bg-fuchsia-100 text-fuchsia-800',
];

function getCategoryColor(category: string): string {
  const normalized = category.trim().toLowerCase();
  
  // Specific Overrides for Default Categories
  if (normalized === 'food') return 'bg-orange-100 text-orange-800';
  if (normalized === 'travel') return 'bg-emerald-100 text-emerald-800';
  if (normalized === 'shopping') return 'bg-blue-100 text-blue-800';
  if (normalized === 'bills') return 'bg-red-100 text-red-800';
  if (normalized === 'other') return 'bg-gray-100 text-gray-600';

  // Deterministic color assignment
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % PASTEL_COLORS.length;
  return PASTEL_COLORS[index];
}

export default Workspace;