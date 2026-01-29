import React from 'react';
import { Home, Users, Sparkles, MessageCircle, Settings } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAppStore } from '../../stores/useAppStore';

const menuItems = [
  { id: 'dashboard', icon: Home, label: 'Dashboard', page: 'dashboard' as const },
  { id: 'practitioners', icon: Users, label: 'Praticiens', page: 'practitioners' as const },
  { id: 'pitch', icon: Sparkles, label: 'Pitch IA', page: 'pitch' as const },
  { id: 'coach', icon: MessageCircle, label: 'Coach IA', page: 'coach' as const },
];

export const Sidebar: React.FC = () => {
  const { currentPage, setCurrentPage, currentUser } = useAppStore();

  return (
    <div className="w-64 h-screen bg-gradient-to-b from-al-navy to-al-blue-800 text-white flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">ARIA</h1>
            <p className="text-xs text-al-blue-200">AI Assistant</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.page;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.page)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-white text-al-navy shadow-lg'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-2 h-2 bg-al-teal rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-white/10">
        <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Paramètres</span>
        </button>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center space-x-3">
          <Avatar src={currentUser.avatarUrl} alt={currentUser.name} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{currentUser.name}</p>
            <p className="text-xs text-al-blue-200 truncate">{currentUser.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
