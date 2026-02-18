import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MessageCircle, Map, Route, Mic, Zap } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface QuickAction {
  id: string;
  icon: React.ElementType;
  labelKey: string;
  path: string;
  color: string;
}

const actions: QuickAction[] = [
  {
    id: 'actions',
    icon: Zap,
    labelKey: 'dashboard.quickActions.myActions',
    path: '/next-actions',
    color: 'from-amber-500 to-red-500',
  },
  {
    id: 'pitch',
    icon: Sparkles,
    labelKey: 'dashboard.quickActions.pitchIA',
    path: '/pitch',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    id: 'visit-report',
    icon: Mic,
    labelKey: 'dashboard.quickActions.visitReport',
    path: '/visit-report',
    color: 'from-teal-500 to-cyan-500',
  },
  {
    id: 'coach',
    icon: MessageCircle,
    labelKey: 'dashboard.quickActions.coachIA',
    path: '/coach',
    color: 'from-al-blue-500 to-al-sky',
  },
  {
    id: 'tour',
    icon: Route,
    labelKey: 'dashboard.quickActions.optimizeTour',
    path: '/tour-optimization',
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'map',
    icon: Map,
    labelKey: 'dashboard.quickActions.territory',
    path: '/map',
    color: 'from-amber-500 to-orange-500',
  },
];

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <h2 className="text-base font-bold text-slate-800">
        {t('dashboard.quickAccess')}
      </h2>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {actions.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            onClick={() => navigate(action.path)}
            className="glass-card p-3 hover:shadow-lg transition-shadow duration-300 cursor-pointer group"
          >
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-2 mx-auto`}>
              <action.icon className="w-4.5 h-4.5 text-white" />
            </div>
            <p className="font-semibold text-slate-800 text-sm text-center">{t(action.labelKey)}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
