import React from 'react';
import { Link, useLocation } from 'react-router';

const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-red-900 rounded-[25px] shadow-md' : 'text-white/80';
  };

  const buttonClasses = (path: string) => `
    px-6 py-2 
    transition-all 
    rounded-[25px]
    text-base
    ${isActive(path)}
    ${location.pathname !== path ? 'hover:bg-red-800 hover:shadow-md hover:text-white' : ''}
  `;

  return (
    <header className="bg-red-700 text-white font-['Source_Sans_Pro'] font-semibold">
      {/* Title and Icon Row */}
      <div className="flex items-center justify-center py-4">
        <img 
          src="/icon.png" 
          alt="Marinara Icon" 
          className="w-8 h-8 mr-2"
        />
        <h1 className="text-3xl font-semibold">
          Marinara: Pomodoro Assistant
        </h1>
      </div>

      {/* Navigation Links Row */}
      <nav className="flex justify-center pb-2">
        <div className="flex space-x-4">
          <Link 
            to="settings" 
            className={buttonClasses('/settings')}
          >
            SETTINGS
          </Link>
          <Link 
            to="history" 
            className={buttonClasses('/history')}
          >
            HISTORY
          </Link>
          <Link 
            to="feedback" 
            className={buttonClasses('/feedback')}
          >
            FEEDBACK
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Header; 