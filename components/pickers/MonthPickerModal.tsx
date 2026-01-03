import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface MonthPickerModalProps {
  isOpen: boolean;
  selectedMonth: number; // 0-11
  selectedYear: number;
  onSelect: (month: number, year: number) => void;
  onClose: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MonthPickerModal: React.FC<MonthPickerModalProps> = ({
  isOpen,
  selectedMonth,
  selectedYear,
  onSelect,
  onClose,
}) => {
  const [month, setMonth] = React.useState(selectedMonth);
  const [year, setYear] = React.useState(selectedYear);

  React.useEffect(() => {
    if (isOpen) {
      setMonth(selectedMonth);
      setYear(selectedYear);
    }
  }, [selectedMonth, selectedYear, isOpen]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const handleSet = () => {
    onSelect(month, year);
    onClose();
  };

  const handleCancel = () => {
    setMonth(selectedMonth);
    setYear(selectedYear);
    onClose();
  };

  const handlePrevious = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={handleCancel} className="relative z-50">
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
            <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-h-[80vh] overflow-hidden">
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold text-[#37352f] dark:text-gray-100">
                  Select Month
                </Dialog.Title>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(80vh-140px)] overscroll-contain p-6">
                {/* Navigation Header */}
                <div className="flex items-center justify-between mb-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <button
                    onClick={handlePrevious}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="text-lg font-semibold text-[#37352f] dark:text-gray-100">
                    {MONTHS[month]} {year}
                  </div>
                  <button
                    onClick={handleNext}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Month Grid */}
                <div className="mb-6">
                  <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold mb-3">
                    Month
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {MONTHS.map((monthName, idx) => (
                      <button
                        key={monthName}
                        onClick={() => setMonth(idx)}
                        className={`
                          px-4 py-3 rounded-lg text-sm font-medium transition-all
                          ${month === idx
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'bg-gray-50 dark:bg-gray-700 text-[#37352f] dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }
                        `}
                      >
                        {monthName.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Year Selector */}
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold mb-3">
                    Year
                  </h3>
                  <div className="grid grid-cols-5 gap-2">
                    {years.map((y) => (
                      <button
                        key={y}
                        onClick={() => setYear(y)}
                        className={`
                          px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                          ${year === y
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'bg-gray-50 dark:bg-gray-700 text-[#37352f] dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }
                        `}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSet}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-[#2383e2] hover:bg-[#1d70c2] rounded-lg transition-colors"
                >
                  Set
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
};

export default MonthPickerModal;
