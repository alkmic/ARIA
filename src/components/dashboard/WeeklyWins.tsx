import { motion } from 'framer-motion';
import { CheckCircle, UserPlus, Star, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';

interface Win {
  icon: React.ReactNode;
  labelKey: string;
  value: string;
  color: string;
}

export function WeeklyWins() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const wins: Win[] = [
    { icon: <CheckCircle className="w-5 h-5" />, labelKey: 'dashboard.weeklyWins.visitsCompleted', value: '8', color: 'text-green-600 bg-green-100' },
    { icon: <UserPlus className="w-5 h-5" />, labelKey: 'dashboard.weeklyWins.newPrescribers', value: '2', color: 'text-blue-600 bg-blue-100' },
    { icon: <Star className="w-5 h-5" />, labelKey: 'dashboard.weeklyWins.kolRecovered', value: '1', color: 'text-amber-600 bg-amber-100' },
  ];

  const pending = [
    { labelKey: 'dashboard.weeklyPending.pendingProposals', value: '3' },
    { labelKey: 'dashboard.weeklyPending.followUps', value: '5' },
  ];

  return (
    <div className="glass-card p-3 sm:p-4">
      <h3 className="font-bold text-base mb-2">{t('dashboard.thisWeek')}</h3>

      <div className="space-y-2 mb-3">
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
            <span className="flex-1 text-xs sm:text-sm text-slate-600">{t(win.labelKey)}</span>
            <span className="font-bold text-al-navy text-base sm:text-lg">{win.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-1.5">
        {pending.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="flex-1 text-slate-500">{t(item.labelKey)}</span>
            <span className="font-medium text-slate-700">{item.value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/visits')}
        className="mt-2 w-full text-xs text-al-blue-500 hover:underline flex items-center justify-center gap-1"
      >
        {t('dashboard.seeFullHistory')}
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}
