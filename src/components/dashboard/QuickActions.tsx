import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MessageCircle, Map, Route, Mic, Zap } from 'lucide-react';

interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  path: string;
  color: string;
}

const actions: QuickAction[] = [
  {
    id: 'actions',
    icon: Zap,
    label: 'Mes Actions',
    description: 'Actions IA prioritaires',
    path: '/next-actions',
    color: 'from-amber-500 to-red-500',
  },
  {
    id: 'pitch',
    icon: Sparkles,
    label: 'Pitch IA',
    description: 'Générer un pitch personnalisé',
    path: '/pitch',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    id: 'visit-report',
    icon: Mic,
    label: 'Compte-rendu',
    description: 'Dicter un CRV vocal',
    path: '/visit-report',
    color: 'from-teal-500 to-cyan-500',
  },
  {
    id: 'coach',
    icon: MessageCircle,
    label: 'Coach IA',
    description: 'Dialogue avec ARIA',
    path: '/coach',
    color: 'from-al-blue-500 to-al-sky',
  },
  {
    id: 'tour',
    icon: Route,
    label: 'Optimiser Tournée',
    description: 'Planifier les visites du jour',
    path: '/tour-optimization',
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'map',
    icon: Map,
    label: 'Territoire',
    description: 'Visualiser votre secteur',
    path: '/map',
    color: 'from-amber-500 to-orange-500',
  },
];

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      <h2 className="text-base font-bold text-slate-800">
        Accès rapide
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
            <p className="font-semibold text-slate-800 text-sm text-center">{action.label}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
