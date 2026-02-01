import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Sparkles, MessageCircle, Settings, Calendar, Map, BarChart3 } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAppStore } from '../../stores/useAppStore';

const menuItems = [
  { id: 'dashboard', icon: Home, label: 'Dashboard', path: '/dashboard' },
  { id: 'practitioners', icon: Users, label: 'Praticiens', path: '/practitioners' },
  { id: 'visits', icon: Calendar, label: 'Visites', path: '/visits' },
  { id: 'map', icon: Map, label: 'Territoire', path: '/map' },
  { id: 'pitch', icon: Sparkles, label: 'Pitch IA', path: '/pitch' },
  { id: 'coach', icon: MessageCircle, label: 'Coach IA', path: '/coach' },
];

const managerItems = [
  { id: 'manager', icon: BarChart3, label: 'Vue équipe', path: '/manager' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const location = useLocation();
  const { currentUser } = useAppStore();

  const handleLinkClick = () => {
    // Close mobile menu when a link is clicked
    if (onClose) {
      onClose();
    }
  };

  return (
    <div
      className={`w-64 h-screen bg-gradient-to-b from-al-navy to-al-blue-800 text-white flex flex-col fixed left-0 top-0 z-40 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link to="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">ARIA</h1>
            <p className="text-xs text-al-blue-200">AI Assistant</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={handleLinkClick}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-white text-al-navy shadow-lg'
                  : 'text-white/80 hover:bg-white/10 hover:text-white hover:scale-[1.02]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-2 h-2 bg-al-teal rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}

        {/* Section Manager */}
        <div className="pt-6 mt-6 border-t border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3 px-4">Manager</p>
          {managerItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={handleLinkClick}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white text-al-navy shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white hover:scale-[1.02]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-al-teal rounded-full animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-white/10">
        <Link
          to="/settings"
          onClick={handleLinkClick}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-white/80 hover:bg-white/10 hover:text-white hover:scale-[1.02] transition-all duration-200 cursor-pointer"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Paramètres</span>
        </Link>
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
