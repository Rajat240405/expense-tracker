import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface Currency {
  code: string;
  symbol: string;
  name: string;
  region?: string;
}

interface CurrencyPickerModalProps {
  isOpen: boolean;
  selectedCurrency: string;
  currencies: Currency[];
  onSelect: (currencyCode: string) => void;
  onClose: () => void;
}

// Extended currency list with emoji-style grid
const ALL_CURRENCIES: Currency[] = [
  // Popular
  { code: 'USD', symbol: '$', name: 'US Dollar', region: 'United States' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', region: 'India' },
  { code: 'EUR', symbol: '€', name: 'Euro', region: 'Europe' },
  { code: 'GBP', symbol: '£', name: 'British Pound', region: 'UK' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', region: 'Japan' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', region: 'China' },
  
  // Americas
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar', region: 'Canada' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', region: 'Mexico' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', region: 'Brazil' },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso', region: 'Argentina' },
  
  // Europe
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', region: 'Switzerland' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', region: 'Sweden' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', region: 'Norway' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', region: 'Denmark' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', region: 'Poland' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', region: 'Russia' },
  
  // Asia Pacific
  { code: 'AUD', symbol: '$', name: 'Australian Dollar', region: 'Australia' },
  { code: 'NZD', symbol: '$', name: 'New Zealand Dollar', region: 'New Zealand' },
  { code: 'SGD', symbol: '$', name: 'Singapore Dollar', region: 'Singapore' },
  { code: 'HKD', symbol: '$', name: 'Hong Kong Dollar', region: 'Hong Kong' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', region: 'South Korea' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', region: 'Thailand' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', region: 'Indonesia' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', region: 'Malaysia' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', region: 'Philippines' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', region: 'Vietnam' },
  
  // Middle East & Africa
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', region: 'UAE' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal', region: 'Saudi Arabia' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', region: 'Israel' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', region: 'Turkey' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', region: 'South Africa' },
  { code: 'EGP', symbol: '£', name: 'Egyptian Pound', region: 'Egypt' },
  
  // Crypto (bonus)
  { code: 'BTC', symbol: '₿', name: 'Bitcoin', region: 'Crypto' },
  { code: 'ETH', symbol: 'Ξ', name: 'Ethereum', region: 'Crypto' },
];

const CurrencyPickerModal: React.FC<CurrencyPickerModalProps> = ({
  isOpen,
  selectedCurrency,
  currencies,
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'default' | 'all'>('default');

  const handleSelect = (currencyCode: string) => {
    onSelect(currencyCode);
    setSearchQuery('');
    setViewMode('default');
    onClose();
  };

  const currenciesToShow = viewMode === 'all' 
    ? ALL_CURRENCIES 
    : currencies;

  const filteredCurrencies = currenciesToShow.filter(curr => 
    curr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    curr.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    curr.symbol.includes(searchQuery) ||
    (curr.region && curr.region.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10">
                <div className="px-6 py-4 flex items-center justify-between">
                  <Dialog.Title className="text-lg font-semibold text-[#37352f] dark:text-gray-100">
                    {viewMode === 'all' ? 'All Currencies' : 'Select Currency'}
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
                
                {/* Search Bar */}
                <div className="px-6 pb-4">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search currency..."
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-[#37352f] dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* View Mode Toggle */}
                {viewMode === 'default' && (
                  <div className="px-6 pb-4">
                    <button
                      onClick={() => setViewMode('all')}
                      className="w-full px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Browse All {ALL_CURRENCIES.length} Currencies
                    </button>
                  </div>
                )}
                
                {viewMode === 'all' && (
                  <div className="px-6 pb-4">
                    <button
                      onClick={() => setViewMode('default')}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Common
                    </button>
                  </div>
                )}
              </div>

              {/* Content - Grid Layout for All Currencies */}
              <div className="overflow-y-auto max-h-[calc(80vh-200px)] overscroll-contain">
                {filteredCurrencies.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No currencies found</p>
                  </div>
                ) : viewMode === 'all' ? (
                  // Grid view for all currencies (emoji-style)
                  <div className="p-4 grid grid-cols-2 gap-2">
                    {filteredCurrencies.map(curr => (
                      <button
                        key={curr.code}
                        onClick={() => handleSelect(curr.code)}
                        className={`
                          px-4 py-3 rounded-lg transition-all text-left
                          ${selectedCurrency === curr.code
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-600'
                            : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-semibold">{curr.symbol}</span>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${selectedCurrency === curr.code ? 'text-blue-700 dark:text-blue-300' : 'text-[#37352f] dark:text-gray-100'}`}>
                              {curr.code}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {curr.region || curr.name}
                            </div>
                          </div>
                          {selectedCurrency === curr.code && (
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  // List view for default currencies
                  <div className="p-4 space-y-1">
                    {filteredCurrencies.map(curr => (
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
                )}
              </div>
            </Dialog.Panel>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
};

export default CurrencyPickerModal;
