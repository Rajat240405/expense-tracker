import React, { useState } from 'react';
import AuthModal from './AuthModal';

interface LandingProps {
  onEnter: () => void;
}

const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-2xl mx-auto w-full py-16">
        
        {/* App Name */}
        <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-8 text-[#37352f] dark:text-gray-100">
          Expenses
        </h1>

        {/* Headline */}
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6 text-[#37352f] dark:text-gray-100 leading-tight">
          Simple daily expense tracking
        </h2>
        
        {/* Supporting Text */}
        <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-12 font-normal max-w-lg leading-relaxed">
          Know where your money goes with clear, organized records.
        </p>
        
        {/* Primary Action */}
        <button
          onClick={onEnter}
          className="bg-[#2383e2] hover:bg-[#1d70c2] text-white px-8 py-3.5 rounded-lg font-semibold transition-all duration-200 ease-in-out text-base shadow-lg hover:shadow-xl mb-4 w-full max-w-xs"
        >
          Start Tracking
        </button>

        {/* Secondary Action */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium text-sm transition-colors"
        >
          Sign in to sync across devices
        </button>
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