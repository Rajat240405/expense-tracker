import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Split, CustomCurrency } from '../types';
import { format, parse } from 'date-fns';
import DatePickerModal from './pickers/DatePickerModal';
import CurrencyPickerModal from './pickers/CurrencyPickerModal';

// Currency options
const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'Dollar' },
  { code: 'INR', symbol: '₹', name: 'Rupees' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'Pound' },
];

interface AddSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (split: Omit<Split, 'id' | 'timestamp' | 'settled'>) => void;
  defaultCurrency: string;
  getCurrencySymbol: (code: string) => string;
  customCurrencies: CustomCurrency[];
  onAddCustomCurrency?: (currency: CustomCurrency) => void;
}

const AddSplitModal: React.FC<AddSplitModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  defaultCurrency,
  getCurrencySymbol,
  customCurrencies,
  onAddCustomCurrency,
}) => {
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [direction, setDirection] = useState<'to_receive' | 'to_pay'>('to_receive');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!personName.trim() || !amount || parseFloat(amount) <= 0) return;

    onAdd({
      personName: personName.trim(),
      amount: parseFloat(amount),
      currency,
      category: category.trim() || undefined,
      note: note.trim() || undefined,
      direction,
      date,
    });

    // Reset form
    setPersonName('');
    setAmount('');
    setCurrency(defaultCurrency);
    setCategory('');
    setNote('');
    setDirection('to_receive');
    setDate(new Date().toISOString().split('T')[0]);
    onClose();
  };

  const handleClose = () => {
    setPersonName('');
    setAmount('');
    setCurrency(defaultCurrency);
    setCategory('');
    setNote('');
    setDirection('to_receive');
    setDate(new Date().toISOString().split('T')[0]);
    onClose();
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={handleClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        </Transition.Child>

        {/* Bottom Sheet */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="translate-y-full"
          enterTo="translate-y-0"
          leave="ease-in duration-200"
          leaveFrom="translate-y-0"
          leaveTo="translate-y-full"
        >
          <div className="fixed inset-x-0 bottom-0">
            <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10 px-6 py-4 flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold text-[#37352f] dark:text-gray-100">
                  Add Split
                </Dialog.Title>
                <button
                  onClick={handleClose}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Direction */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Split Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDirection('to_receive')}
                      className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        direction === 'to_receive'
                          ? 'bg-blue-500 text-white border-2 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      I paid for them
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('to_pay')}
                      className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        direction === 'to_pay'
                          ? 'bg-blue-500 text-white border-2 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      They paid for me
                    </button>
                  </div>
                </div>

                {/* Person Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Person Name *
                  </label>
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="e.g. John, Sarah, Roommate"
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-base text-[#37352f] dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Amount & Currency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Amount *
                    </label>
                    <div className="flex items-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                      <span className="pl-4 text-gray-500 dark:text-gray-400 text-base font-medium">
                        {getCurrencySymbol(currency)}
                      </span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="flex-1 px-2 py-3 bg-transparent border-0 text-base font-medium text-[#37352f] dark:text-gray-100 outline-none placeholder-gray-400"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Currency
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCurrencyPickerOpen(true)}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-base text-[#37352f] dark:text-gray-100 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      <span>{getCurrencySymbol(currency)} {currency}</span>
                      <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Category (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Dinner, Groceries, Rent"
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-base text-[#37352f] dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(true)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-base text-[#37352f] dark:text-gray-100 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <span>{format(parse(date, 'yyyy-MM-dd', new Date()), 'dd MMM yyyy')}</span>
                    <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>

                {/* Note (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Note <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add any additional details..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-base text-[#37352f] dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!personName.trim() || !amount || parseFloat(amount) <= 0}
                  className="w-full px-4 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  Add Split
                </button>
              </form>
            </Dialog.Panel>
          </div>
        </Transition.Child>
      </Dialog>

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        selectedDate={date}
        onSelect={(newDate) => setDate(newDate)}
        onClose={() => setIsDatePickerOpen(false)}
        maxDate={new Date()}
      />

      {/* Currency Picker Modal */}
      <CurrencyPickerModal
        isOpen={isCurrencyPickerOpen}
        selectedCurrency={currency}
        currencies={CURRENCIES}
        customCurrencies={customCurrencies}
        onSelect={(newCurrency) => setCurrency(newCurrency)}
        onAddCustom={onAddCustomCurrency}
        onClose={() => setIsCurrencyPickerOpen(false)}
      />
    </Transition>
  );
};

export default AddSplitModal;
