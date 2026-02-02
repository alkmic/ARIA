import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Sparkles,
  MessageCircle,
  Settings,
  Calendar,
  Map,
  BarChart3,
  Route,
  X,
  Brain,
  Mic,
  Zap
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { id: 'dashboard', icon: Home, label: 'Dashboard', path: '/dashboard' },
  { id: 'practitioners', icon: Users, label: 'Praticiens', path: '/practitioners' },
  { id: 'visits', icon: Calendar, label: 'Visites', path: '/visits' },
  { id: 'map', icon: Map, label: 'Territoire', path: '/map' },
  { id: 'tour', icon: Route, label: 'Optimisation', path: '/tour-optimization' },
];

const aiItems = [
  { id: 'next-actions', icon: Zap, label: 'Mes Actions', path: '/next-actions' },
  { id: 'visit-report', icon: Mic, label: 'Compte-rendu', path: '/visit-report' },
  { id: 'pitch', icon: Sparkles, label: 'Pitch IA', path: '/pitch' },
  { id: 'coach', icon: MessageCircle, label: 'Coach IA', path: '/coach', badge: 'Data' },
];

const managerItems = [
  { id: 'manager', icon: BarChart3, label: 'Vue équipe', path: '/manager' },
  { id: 'kol', icon: Brain, label: 'Planning KOL', path: '/kol-planning' },
];

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  const { currentUser } = useAppStore();

  const renderMenuItem = (item: typeof menuItems[0] & { badge?: string }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    return (
      <Link
        key={item.id}
        to={item.path}
        onClick={onClose}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
          isActive
            ? 'bg-white text-al-navy shadow-lg'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium flex-1">{item.label}</span>
        {item.badge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
            isActive
              ? 'bg-al-teal/20 text-al-teal'
              : 'bg-al-teal/30 text-al-teal'
          }`}>
            {item.badge}
          </span>
        )}
        {isActive && !item.badge && (
          <div className="ml-auto w-2 h-2 bg-al-teal rounded-full" />
        )}
      </Link>
    );
  };

  return (
    <div
      className={`
        w-64 h-screen bg-gradient-to-b from-al-navy to-al-blue-800 text-white flex flex-col fixed left-0 top-0 z-40
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity" onClick={onClose}>
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-al-navy" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ARIA</h1>
            <p className="text-xs text-al-blue-200">AI Assistant</p>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {/* Main Navigation */}
        {menuItems.map(renderMenuItem)}

        {/* Section Intelligence IA */}
        <div className="pt-6 mt-4 border-t border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3 px-4 flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            Intelligence IA
          </p>
          {aiItems.map(renderMenuItem)}
        </div>

        {/* Section Manager */}
        <div className="pt-6 mt-4 border-t border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3 px-4">Manager</p>
          {managerItems.map(renderMenuItem)}
        </div>
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-white/10">
        <Link
          to="/settings"
          onClick={onClose}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 cursor-pointer"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Paramètres</span>
        </Link>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{currentUser.name}</p>
            <p className="text-xs text-al-blue-200 truncate">{currentUser.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
