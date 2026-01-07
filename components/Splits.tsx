import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Split, CustomCurrency } from '../types';
import { format, parse } from 'date-fns';
import AddSplitModal from './AddSplitModal';

interface SplitsProps {
  customCurrencies: CustomCurrency[];
  getCurrencySymbol: (code: string) => string;
  onBack?: () => void;
}

const formatDateDisplay = (dateStr: string): string => {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return format(date, 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
};

const Splits: React.FC<SplitsProps> = ({ customCurrencies, getCurrencySymbol, onBack }) => {
  const [splits, setSplits] = useState<Split[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load splits from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('splits_v1');
    if (saved) {
      try {
        const parsed: Split[] = JSON.parse(saved);
        setSplits(parsed);
      } catch (e) {
        console.error('Failed to load splits:', e);
      }
    }
  }, []);

  // Save splits to localStorage
  useEffect(() => {
    localStorage.setItem('splits_v1', JSON.stringify(splits));
  }, [splits]);

  // Filter only unsettled splits
  const pendingSplits = useMemo(() => {
    return splits.filter(s => !s.settled).sort((a, b) => b.timestamp - a.timestamp);
  }, [splits]);

  // Calculate totals by currency
  const splitTotalsByCurrency = useMemo(() => {
    const toReceive: { [currency: string]: number } = {};
    const toPay: { [currency: string]: number } = {};
    
    pendingSplits.forEach(s => {
      if (s.direction === 'to_receive') {
        toReceive[s.currency] = (toReceive[s.currency] || 0) + s.amount;
      } else if (s.direction === 'to_pay') {
        toPay[s.currency] = (toPay[s.currency] || 0) + s.amount;
      }
    });
    
    return { toReceive, toPay };
  }, [pendingSplits]);

  const toReceiveSplits = pendingSplits.filter(s => s.direction === 'to_receive');
  const toPaySplits = pendingSplits.filter(s => s.direction === 'to_pay');

  const handleAddSplit = useCallback((splitData: Omit<Split, 'id' | 'timestamp' | 'settled'>) => {
    const newSplit: Split = {
      ...splitData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      settled: false,
    };
    setSplits(prev => [newSplit, ...prev]);
  }, []);

  const handleMarkSettled = useCallback((id: string) => {
    setSplits(prev => prev.map(s => s.id === id ? { ...s, settled: true } : s));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-[#37352f] dark:text-gray-100">Splits</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track shared expenses and IOUs</p>
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Split
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* To Receive Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">You Will Receive</h3>
          </div>
          {Object.keys(splitTotalsByCurrency.toReceive).length === 0 ? (
            <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">—</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(splitTotalsByCurrency.toReceive).map(([curr, amount]) => (
                <div key={curr} className="text-2xl font-bold text-[#37352f] dark:text-gray-100 font-mono">
                  {getCurrencySymbol(curr)}{(amount as number).toFixed(2)}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{toReceiveSplits.length} pending</p>
        </div>

        {/* To Pay Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">You Owe</h3>
          </div>
          {Object.keys(splitTotalsByCurrency.toPay).length === 0 ? (
            <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">—</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(splitTotalsByCurrency.toPay).map(([curr, amount]) => (
                <div key={curr} className="text-2xl font-bold text-[#37352f] dark:text-gray-100 font-mono">
                  {getCurrencySymbol(curr)}{(amount as number).toFixed(2)}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{toPaySplits.length} pending</p>
        </div>
      </div>

      {/* To Receive List */}
      {toReceiveSplits.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-[#37352f] dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            Money You'll Receive
          </h2>
          <div className="space-y-2">
            {toReceiveSplits.map(split => (
              <div key={split.id} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-base font-semibold text-[#37352f] dark:text-gray-100 break-all">{split.personName}</span>
                    {split.category && (
                      <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded shrink-0">
                        {split.category}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <div>{formatDateDisplay(split.date)}</div>
                    {split.note && (
                      <div className="line-clamp-2 break-words">{split.note}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-lg font-bold text-[#37352f] dark:text-gray-100 font-mono whitespace-nowrap">
                    {getCurrencySymbol(split.currency)}{split.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleMarkSettled(split.id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    Settle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* To Pay List */}
      {toPaySplits.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-[#37352f] dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
            Money You Owe
          </h2>
          <div className="space-y-2">
            {toPaySplits.map(split => (
              <div key={split.id} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-base font-semibold text-[#37352f] dark:text-gray-100 break-all">{split.personName}</span>
                    {split.category && (
                      <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded shrink-0">
                        {split.category}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <div>{formatDateDisplay(split.date)}</div>
                    {split.note && (
                      <div className="line-clamp-2 break-words">{split.note}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-lg font-bold text-[#37352f] dark:text-gray-100 font-mono whitespace-nowrap">
                    {getCurrencySymbol(split.currency)}{split.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleMarkSettled(split.id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    Settle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingSplits.length === 0 && (
        <div className="text-center py-20 px-6">
          <div className="max-w-sm mx-auto">
            <div className="text-6xl mb-4">🤝</div>
            <h3 className="text-lg font-semibold text-[#37352f] dark:text-gray-100 mb-2">
              No Pending Splits
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Track money you've lent to others or borrowed from them.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Your First Split
            </button>
          </div>
        </div>
      )}

      {/* Add Split Modal */}
      <AddSplitModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddSplit}
        defaultCurrency="INR"
        getCurrencySymbol={getCurrencySymbol}
      />
    </div>
  );
};

export default Splits;
