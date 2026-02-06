import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MessageCircle, Map, Route, Users, Calendar } from 'lucide-react';

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
    id: 'pitch',
    icon: Sparkles,
    label: 'Pitch IA',
    description: 'Générer un pitch personnalisé',
    path: '/pitch',
    color: 'from-al-blue-600 to-al-blue-500',
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
    color: 'from-al-teal to-emerald-500',
  },
  {
    id: 'map',
    icon: Map,
    label: 'Territoire',
    description: 'Visualiser votre secteur',
    path: '/map',
    color: 'from-al-sky to-al-blue-500',
  },
  {
    id: 'practitioners',
    icon: Users,
    label: 'Praticiens',
    description: 'Voir votre portefeuille',
    path: '/practitioners',
    color: 'from-al-blue-500 to-al-teal',
  },
  {
    id: 'visits',
    icon: Calendar,
    label: 'Visites',
    description: 'Gérer votre agenda',
    path: '/visits',
    color: 'from-al-teal to-al-sky',
  },
];

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">
        Accès rapide
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            onClick={() => navigate(action.path)}
            className="glass-card p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:scale-[1.03]"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 mx-auto group-hover:scale-110 transition-transform`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <p className="font-semibold text-slate-800 text-sm text-center">{action.label}</p>
            <p className="text-xs text-slate-500 text-center mt-1 hidden sm:block">{action.description}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
