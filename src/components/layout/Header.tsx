import React, { useState } from 'react';
import { Bell, Menu } from 'lucide-react';
import { SearchBar } from '../ui/SearchBar';
import { Avatar } from '../ui/Avatar';
import { ThemeToggle } from '../ui/ThemeToggle';
import { NotificationDrawer } from '../ui/NotificationDrawer';
import { MobileSidebar } from './MobileSidebar';
import { useAppStore } from '../../stores/useAppStore';

export const Header: React.FC = () => {
  const { searchQuery, setSearchQuery, currentUser, insights } = useAppStore();
  const unreadCount = insights.filter(i => i.priority === 'high').length;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <MobileSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <header className="h-20 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 flex items-center px-4 lg:px-8 fixed top-0 right-0 left-0 lg:left-64 z-10">
        <div className="flex items-center justify-between w-full">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors mr-2"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-6 h-6 text-slate-600 dark:text-gray-300" />
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
          <div className="flex items-center space-x-3 lg:space-x-6 ml-4 lg:ml-8">
            <ThemeToggle />

            {/* Notifications */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="relative p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-6 h-6 text-slate-600 dark:text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Avatar - hidden on small screens */}
            <div className="hidden sm:block">
              <Avatar src={currentUser.avatarUrl} alt={currentUser.name} size="md" />
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
    </>
  );
};
