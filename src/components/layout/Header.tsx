import React, { useState } from 'react';
import { Bell, Menu, Sparkles } from 'lucide-react';
import { UniversalCommandBar } from '../ui/UniversalCommandBar';
import { NotificationDrawer } from '../ui/NotificationDrawer';
import { useAppStore } from '../../stores/useAppStore';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { currentUser, insights } = useAppStore();
  const unreadCount = insights.filter(i => i.priority === 'high').length;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const initials = currentUser.name.split(' ').map(n => n[0]).join('');

  return (
    <>
      <header className="h-16 lg:h-20 bg-white/95 backdrop-blur-sm border-b border-slate-200 flex items-center px-4 lg:px-8 fixed top-0 right-0 left-0 lg:left-64 z-10">
        <div className="flex items-center justify-between w-full gap-2 sm:gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-slate-600" />
          </button>

          {/* ARIA Badge (visible on larger screens) */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-gradient-to-r from-al-blue-50 to-sky-50 px-3 py-1.5 rounded-full border border-al-blue-100">
            <Sparkles className="w-3.5 h-3.5 text-al-blue-500" />
            <span className="font-medium text-al-blue-700">ARIA</span>
            <span className="text-slate-400">|</span>
            <span>Parlez ou tapez vos commandes</span>
          </div>

          {/* Universal Command Bar - Voice-First Search */}
          <div className="flex-1 min-w-0 max-w-2xl">
            <UniversalCommandBar />
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-6">
            {/* Notifications */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5 lg:w-6 lg:h-6 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Initials */}
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-al-blue-500 to-al-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-al-blue-500/20">
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* Notification Drawer — must be outside header to avoid backdrop-blur containing block */}
      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        notifications={insights}
      />
    </>
  );
};
