import React, { useState, useEffect } from 'react';
import { ViewState } from './types';
import Landing from './components/Landing';
import Workspace from './components/Workspace';
import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [isDark, setIsDark] = useState(false);

  // Sync with device theme
  useEffect(() => {
    // Check system preference
    const checkTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
      
      // Apply dark class to html element
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Initial check
    checkTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => checkTheme();
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen w-full bg-white dark:bg-gray-900 text-[#37352f] dark:text-gray-100 transition-colors">
        {currentView === 'landing' ? (
          <Landing onEnter={() => setCurrentView('workspace')} />
        ) : (
          <Workspace onBack={() => setCurrentView('landing')} />
        )}
      </div>
    </AuthProvider>
  );
};

export default App;