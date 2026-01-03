import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface Currency {
  code: string;
  symbol: string;
  name: string;
}

interface CurrencyPickerModalProps {
  isOpen: boolean;
  selectedCurrency: string;
  currencies: Currency[];
  onSelect: (currencyCode: string) => void;
  onClose: () => void;
}

const CurrencyPickerModal: React.FC<CurrencyPickerModalProps> = ({
  isOpen,
  selectedCurrency,
  currencies,
  onSelect,
  onClose,
}) => {
  const handleSelect = (currencyCode: string) => {
    onSelect(currencyCode);
    onClose();
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
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
                  Select Currency
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(80vh-70px)] overscroll-contain">
                <div className="p-4 space-y-1">
                  {currencies.map(curr => (
                    <button
                      key={curr.code}
                      onClick={() => handleSelect(curr.code)}
                      className={`
                        w-full text-left px-4 py-3.5 rounded-lg transition-all
                        ${selectedCurrency === curr.code
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-600 text-blue-700 dark:text-blue-300 font-medium'
                          : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600 text-[#37352f] dark:text-gray-100'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-semibold w-8">{curr.symbol}</span>
                          <div>
                            <div className="text-base font-medium">{curr.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{curr.code}</div>
                          </div>
                        </div>
                        {selectedCurrency === curr.code && (
                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
};

export default CurrencyPickerModal;
