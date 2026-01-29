import React from 'react';
import { Bell } from 'lucide-react';
import { SearchBar } from '../ui/SearchBar';
import { Avatar } from '../ui/Avatar';
import { useAppStore } from '../../stores/useAppStore';

export const Header: React.FC = () => {
  const { searchQuery, setSearchQuery, currentUser, insights } = useAppStore();
  const unreadCount = insights.filter(i => i.priority === 'high').length;

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center px-8 fixed top-0 right-0 left-64 z-10">
      <div className="flex items-center justify-between w-full">
        {/* Search Bar */}
        <div className="flex-1 max-w-2xl">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher un praticien..."
          />
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-6 ml-8">
          {/* Notifications */}
          <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
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
    </header>
  );
};
