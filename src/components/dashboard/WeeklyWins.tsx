import { motion } from 'framer-motion';
import { CheckCircle, UserPlus, Star, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Win {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

export function WeeklyWins() {
  const navigate = useNavigate();

  const wins: Win[] = [
    { icon: <CheckCircle className="w-5 h-5" />, label: 'Visites réalisées', value: '8', color: 'text-green-600 bg-green-100' },
    { icon: <UserPlus className="w-5 h-5" />, label: 'Nouveaux prescripteurs', value: '2', color: 'text-blue-600 bg-blue-100' },
    { icon: <Star className="w-5 h-5" />, label: 'KOL reconquis', value: '1', color: 'text-amber-600 bg-amber-100' },
  ];

  const pending = [
    { label: 'Propositions en attente de réponse', value: '3' },
    { label: 'Relances à effectuer', value: '5' },
  ];

  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">🏆 Cette semaine</h3>

      <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
        {wins.map((win, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-2 sm:gap-3"
          >
            <div className={`p-1.5 sm:p-2 rounded-lg ${win.color}`}>
              <div className="w-4 h-4 sm:w-5 sm:h-5">
                {win.icon}
              </div>
            </div>
            <span className="flex-1 text-xs sm:text-sm text-slate-600">{win.label}</span>
            <span className="font-bold text-al-navy text-base sm:text-lg">{win.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="pt-3 sm:pt-4 border-t border-slate-100 space-y-1.5 sm:space-y-2">
        {pending.map((item, i) => (
          <div key={i} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
            <span className="flex-1 text-slate-500">{item.label}</span>
            <span className="font-medium text-slate-700">{item.value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/visits')}
        className="mt-3 sm:mt-4 w-full text-xs sm:text-sm text-al-blue-500 hover:underline flex items-center justify-center gap-1"
      >
        Voir l'historique complet
        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
      </button>
    </div>
  );
}
