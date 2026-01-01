import React, { useState } from 'react';
import AuthModal from './AuthModal';

interface LandingProps {
  onEnter: () => void;
}

const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Minimal Navbar */}
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm z-10 border-b border-transparent dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#37352f] dark:bg-gray-100 rounded-sm"></div>
          <span className="font-semibold tracking-tight text-[#37352f] dark:text-gray-100">Expenses</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto w-full py-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[#37352f] dark:text-gray-100 leading-tight">
          Track expenses.<br />Stay in control.
        </h1>
        <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-12 font-normal max-w-xl leading-relaxed">
          A calm, distraction-free space to log what you spend.<br />
          No charts, no clutter. Just clarity.
        </p>
        
        {/* Primary Action */}
        <button
          onClick={onEnter}
          className="bg-[#2383e2] hover:bg-[#1d70c2] text-white px-8 py-3.5 rounded-lg font-semibold transition-all duration-200 ease-in-out text-base shadow-lg hover:shadow-xl mb-3 w-full max-w-xs"
        >
          Start Tracking
        </button>

        {/* Secondary Action */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium text-sm transition-colors"
        >
          Or sign in to sync
        </button>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 max-w-sm">
          Your data stays on your device. Sign in later if you want to sync across devices.
        </p>

        {/* Realistic Expense Preview */}
        <div className="mt-16 w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-lg overflow-hidden">
            {/* Preview Header */}
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Recent</span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">December 2025</span>
              </div>
            </div>

            {/* Sample Expenses */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {/* Expense 1 */}
              <div className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                  <div className="text-left">
                    <div className="font-medium text-sm text-[#37352f] dark:text-gray-100">Coffee & Bagel</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">15/12/2025</div>
                  </div>
                </div>
                <span className="font-semibold text-sm text-[#37352f] dark:text-gray-100">$12.50</span>
              </div>

              {/* Expense 2 */}
              <div className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <div className="text-left">
                    <div className="font-medium text-sm text-[#37352f] dark:text-gray-100">Uber to Airport</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">14/12/2025</div>
                  </div>
                </div>
                <span className="font-semibold text-sm text-[#37352f] dark:text-gray-100">$45.00</span>
              </div>

              {/* Expense 3 */}
              <div className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <div className="text-left">
                    <div className="font-medium text-sm text-[#37352f] dark:text-gray-100">Monthly Groceries</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">13/12/2025</div>
                  </div>
                </div>
                <span className="font-semibold text-sm text-[#37352f] dark:text-gray-100">$127.80</span>
              </div>
            </div>

            {/* Preview Footer */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Total spent</span>
                <span className="font-semibold text-[#37352f] dark:text-gray-100">$185.30</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800">
        <p>© 2026 Expenses. Designed for focus.</p>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={onEnter}
      />
    </div>
  );
};

export default Landing;