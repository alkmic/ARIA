import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Home, Users, Calendar, Map, Sparkles, MessageCircle,
  Settings, BarChart3, FileText, Sun, Moon
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useTheme } from '../contexts/ThemeContext';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { practitioners } = useAppStore();
  const { theme, toggleTheme } = useTheme();

  // Fermer avec Escape
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onClose]);

  // Navigation vers une route
  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  // Résultats filtrés de praticiens
  const filteredPractitioners = useMemo(() => {
    if (!search || search.length < 2) return [];
    const query = search.toLowerCase();
    return practitioners
      .filter(p =>
        p.firstName.toLowerCase().includes(query) ||
        p.lastName.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query) ||
        p.specialty.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [search, practitioners]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 px-4">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Command Palette */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl"
        >
          <Command className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <Search className="w-5 h-5 text-gray-400" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Rechercher une page, un praticien, une action..."
                className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm"
                autoFocus
              />
              <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-96 overflow-y-auto p-2">
              <Command.Empty className="px-4 py-8 text-center text-sm text-gray-500">
                Aucun résultat trouvé.
              </Command.Empty>

              {/* Pages */}
              <Command.Group heading="Pages" className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                <CommandItem
                  icon={<Home className="w-4 h-4" />}
                  label="Dashboard"
                  onSelect={() => handleNavigate('/dashboard')}
                />
                <CommandItem
                  icon={<Users className="w-4 h-4" />}
                  label="Praticiens"
                  onSelect={() => handleNavigate('/practitioners')}
                />
                <CommandItem
                  icon={<Calendar className="w-4 h-4" />}
                  label="Visites"
                  onSelect={() => handleNavigate('/visits')}
                />
                <CommandItem
                  icon={<Map className="w-4 h-4" />}
                  label="Territoire"
                  onSelect={() => handleNavigate('/map')}
                />
                <CommandItem
                  icon={<Sparkles className="w-4 h-4" />}
                  label="Pitch IA"
                  onSelect={() => handleNavigate('/pitch')}
                />
                <CommandItem
                  icon={<MessageCircle className="w-4 h-4" />}
                  label="Coach IA"
                  onSelect={() => handleNavigate('/coach')}
                />
                <CommandItem
                  icon={<BarChart3 className="w-4 h-4" />}
                  label="Manager Dashboard"
                  onSelect={() => handleNavigate('/manager')}
                />
                <CommandItem
                  icon={<Settings className="w-4 h-4" />}
                  label="Paramètres"
                  onSelect={() => handleNavigate('/settings')}
                />
              </Command.Group>

              {/* Actions */}
              <Command.Group heading="Actions" className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mt-2">
                <CommandItem
                  icon={theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                  onSelect={() => {
                    toggleTheme();
                    onClose();
                  }}
                  shortcut="⌘D"
                />
              </Command.Group>

              {/* Praticiens */}
              {filteredPractitioners.length > 0 && (
                <Command.Group heading="Praticiens" className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mt-2">
                  {filteredPractitioners.map((p) => (
                    <CommandItem
                      key={p.id}
                      icon={<FileText className="w-4 h-4" />}
                      label={`${p.title} ${p.firstName} ${p.lastName}`}
                      description={`${p.specialty} • ${p.city}`}
                      onSelect={() => handleNavigate(`/practitioner/${p.id}`)}
                    />
                  ))}
                </Command.Group>
              )}
            </Command.List>

            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd>
                  Naviguer
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd>
                  Sélectionner
                </span>
              </div>
            </div>
          </Command>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

interface CommandItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  shortcut?: string;
  onSelect: () => void;
}

function CommandItem({ icon, label, description, shortcut, onSelect }: CommandItemProps) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors aria-selected:bg-al-blue-50 dark:aria-selected:bg-al-blue-900/20"
    >
      <div className="text-gray-600 dark:text-gray-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
        {description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</div>
        )}
      </div>
      {shortcut && (
        <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
