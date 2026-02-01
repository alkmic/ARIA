import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, Users, Sparkles, MessageCircle, Settings, Calendar, Map, BarChart3 } from 'lucide-react';
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

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const location = useLocation();
  const { currentUser } = useAppStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-al-navy to-al-blue-800 dark:from-gray-900 dark:to-gray-800 text-white z-50 flex flex-col lg:hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <Link to="/dashboard" className="flex items-center space-x-3" onClick={onClose}>
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-2xl" role="img" aria-label="ARIA">🤖</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">ARIA</h1>
                  <p className="text-xs text-al-blue-200">AI Assistant</p>
                </div>
              </Link>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Fermer le menu"
              >
                <X className="w-6 h-6" />
              </button>
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
                    onClick={onClose}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-al-navy shadow-lg'
                        : 'text-white/80 hover:bg-white/10 hover:text-white active:scale-95'
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
                      onClick={onClose}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-white text-al-navy shadow-lg'
                          : 'text-white/80 hover:bg-white/10 hover:text-white active:scale-95'
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
                onClick={onClose}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 active:scale-95"
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
