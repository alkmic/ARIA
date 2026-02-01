import React, { useState, useEffect } from 'react';
import { Bell, Menu } from 'lucide-react';
import { SearchBar } from '../ui/SearchBar';
import { Avatar } from '../ui/Avatar';
import { NotificationDrawer } from '../ui/NotificationDrawer';
import { useAppStore } from '../../stores/useAppStore';
import { useDebounceWithStatus } from '../../hooks/useDebounce';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { searchQuery, setSearchQuery, currentUser, insights } = useAppStore();
  const unreadCount = insights.filter(i => i.priority === 'high').length;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Local state pour l'input (immediate update)
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Debounce la valeur de recherche (300ms)
  const [debouncedQuery, isSearching] = useDebounceWithStatus(localSearchQuery, 300);

  // Update le store seulement quand la valeur debouncée change
  useEffect(() => {
    setSearchQuery(debouncedQuery);
  }, [debouncedQuery, setSearchQuery]);

  // Sync local state with store (pour les changements externes)
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center px-4 sm:px-8 fixed top-0 right-0 left-0 lg:left-64 z-10">
      <div className="flex items-center justify-between w-full gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-6 h-6 text-slate-600" />
        </button>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl">
          <SearchBar
            value={localSearchQuery}
            onChange={setLocalSearchQuery}
            placeholder="Rechercher un praticien..."
            isSearching={isSearching}
          />
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-6 ml-8">
          {/* Notifications */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <Bell className="w-6 h-6 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Avatar */}
          <Avatar src={currentUser.avatarUrl} alt={currentUser.name} size="md" />
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
