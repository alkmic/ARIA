import React, { useState } from 'react';
import { Bell, Menu } from 'lucide-react';
import { SearchBar } from '../ui/SearchBar';
import { NotificationDrawer } from '../ui/NotificationDrawer';
import { useAppStore } from '../../stores/useAppStore';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { searchQuery, setSearchQuery, currentUser, insights } = useAppStore();
  const unreadCount = insights.filter(i => i.priority === 'high').length;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const initials = currentUser.name.split(' ').map(n => n[0]).join('');

  return (
    <header className="h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center px-4 lg:px-8 fixed top-0 right-0 left-0 lg:left-64 z-10">
      <div className="flex items-center justify-between w-full gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6 text-slate-600" />
        </button>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher un praticien..."
          />
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3 lg:space-x-6">
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
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-al-blue-500 flex items-center justify-center text-white font-semibold text-sm">
            {initials}
          </div>
        </div>
      </div>

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        notifications={insights}
      />
    </header>
  );
};
