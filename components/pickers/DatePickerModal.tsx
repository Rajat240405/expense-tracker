import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { DayPicker } from 'react-day-picker';
import { format, parse } from 'date-fns';
// import 'react-day-picker/src/style.css';

interface DatePickerModalProps {
  isOpen: boolean;
  selectedDate: string; // YYYY-MM-DD format
  onSelect: (date: string) => void;
  onClose: () => void;
  maxDate?: Date;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  selectedDate,
  onSelect,
  onClose,
  maxDate = new Date(), // Default to today to disable future dates
}) => {
  const parseSelectedDate = (): Date | undefined => {
    if (!selectedDate) return undefined;
    try {
      return parse(selectedDate, 'yyyy-MM-dd', new Date());
    } catch {
      return undefined;
    }
  };

  const [selected, setSelected] = React.useState<Date | undefined>(parseSelectedDate());

  React.useEffect(() => {
    setSelected(parseSelectedDate());
  }, [selectedDate, isOpen]);

  const handleSelect = (date: Date | undefined) => {
    setSelected(date);
  };

  const handleSet = () => {
    if (selected) {
      const formattedDate = format(selected, 'yyyy-MM-dd');
      onSelect(formattedDate);
      onClose();
    }
  };

  const handleClear = () => {
    setSelected(undefined);
    onSelect(format(new Date(), 'yyyy-MM-dd')); // Reset to today
    onClose();
  };

  const handleCancel = () => {
    setSelected(parseSelectedDate()); // Reset to original
    onClose();
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
                  Select Date
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

              {/* Calendar */}
              <div className="overflow-y-auto max-h-[calc(80vh-140px)] overscroll-contain p-6 flex justify-center">
                <div className="date-picker-custom">
                  <DayPicker
                    mode="single"
                    selected={selected}
                    onSelect={handleSelect}
                    disabled={{ after: maxDate }}
                    showOutsideDays={false}
                    className="!font-sans"
                    modifiersClassNames={{
                      selected: 'selected-day',
                      today: 'today-day',
                      disabled: 'disabled-day',
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between gap-3">
                <button
                  onClick={handleClear}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Clear
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSet}
                    disabled={!selected}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-[#2383e2] hover:bg-[#1d70c2] disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    Set
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Transition.Child>

        {/* Custom Styles */}
        <style>{`
          .date-picker-custom .rdp {
            --rdp-cell-size: 44px;
            --rdp-accent-color: #2383e2;
            --rdp-background-color: #e3f2fd;
            margin: 0;
          }

          .date-picker-custom .rdp-months {
            justify-content: center;
          }

          .date-picker-custom .rdp-month {
            width: 100%;
            max-width: 320px;
          }

          .date-picker-custom .rdp-caption {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0.5rem;
            margin-bottom: 1rem;
          }

          .date-picker-custom .rdp-caption_label {
            font-size: 1rem;
            font-weight: 600;
            color: #37352f;
          }

          .dark .date-picker-custom .rdp-caption_label {
            color: #f3f4f6;
          }

          .date-picker-custom .rdp-nav {
            display: flex;
            gap: 0.5rem;
          }

          .date-picker-custom .rdp-nav_button {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            border: none;
            background: transparent;
          }

          .date-picker-custom .rdp-nav_button:hover:not(:disabled) {
            background-color: #f3f4f6;
          }

          .dark .date-picker-custom .rdp-nav_button:hover:not(:disabled) {
            background-color: #374151;
          }

          .date-picker-custom .rdp-nav_button:disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }

          .date-picker-custom .rdp-nav_button svg {
            width: 20px;
            height: 20px;
            fill: #6b7280;
          }

          .dark .date-picker-custom .rdp-nav_button svg {
            fill: #9ca3af;
          }

          .date-picker-custom .rdp-head_cell {
            color: #6b7280;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            padding: 0.5rem;
          }

          .dark .date-picker-custom .rdp-head_cell {
            color: #9ca3af;
          }

          .date-picker-custom .rdp-cell {
            padding: 2px;
          }

          .date-picker-custom .rdp-button {
            border: none;
            width: 100%;
            height: 100%;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            color: #37352f;
            transition: all 0.2s;
          }

          .dark .date-picker-custom .rdp-button {
            color: #e5e7eb;
          }

          .date-picker-custom .rdp-button:hover:not(:disabled):not(.selected-day) {
            background-color: #f3f4f6;
          }

          .dark .date-picker-custom .rdp-button:hover:not(:disabled):not(.selected-day) {
            background-color: #374151;
          }

          .date-picker-custom .rdp-day_outside {
            display: none;
          }

          .dark .date-picker-custom .rdp-day_outside {
            display: none;
          }

          .date-picker-custom .selected-day {
            background-color: #2383e2 !important;
            color: white !important;
            font-weight: 600;
          }

          .date-picker-custom .today-day:not(.selected-day) {
            background-color: #e3f2fd;
            color: #2383e2;
            font-weight: 600;
          }

          .dark .date-picker-custom .today-day:not(.selected-day) {
            background-color: #1e3a5f;
            color: #60a5fa;
          }

          .date-picker-custom .disabled-day {
            color: #d1d5db !important;
            cursor: not-allowed !important;
          }

          .dark .date-picker-custom .disabled-day {
            color: #4b5563 !important;
          }

          .date-picker-custom .rdp-button:disabled {
            opacity: 0.5;
          }
        `}</style>
      </Dialog>
    </Transition>
  );
};

export default DatePickerModal;
