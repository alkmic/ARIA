import { motion } from 'framer-motion';
import { Target, Zap, Calendar } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { getLocaleCode } from '../../utils/helpers';

interface ObjectiveProgressProps {
  current: number;
  target: number;
  daysRemaining: number;
  periodLabel?: string;
}

export function ObjectiveProgress({ current, target, daysRemaining, periodLabel = '' }: ObjectiveProgressProps) {
  const { t, language } = useTranslation();
  const percentage = Math.round((current / target) * 100);
  const remaining = target - current;
  const visitsPerDay = remaining > 0 && daysRemaining > 0 ? (remaining / daysRemaining).toFixed(1) : '0.0';

  // Couleur selon le statut
  const getStatusColor = () => {
    if (percentage >= 90) return 'from-green-500 to-emerald-500';
    if (percentage >= 70) return 'from-al-blue-500 to-al-sky';
    if (percentage >= 50) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  // Générer le sous-titre basé sur la période
  const getSubtitle = () => {
    const now = new Date();
    if (periodLabel.includes('mois') || periodLabel.includes('month')) {
      return now.toLocaleDateString(getLocaleCode(language), { month: 'long', year: 'numeric' });
    } else if (periodLabel.includes('trimestre') || periodLabel.includes('quarter')) {
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      return `Q${quarter} ${now.getFullYear()}`;
    } else {
      return `${now.getFullYear()}`;
    }
  };

  return (
    <div className="glass-card p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-al-blue-100 rounded-lg">
            <Target className="w-4 h-4 text-al-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-al-navy">{t('dashboard.objective', { period: periodLabel })}</h2>
            <p className="text-xs text-slate-500">{getSubtitle()}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <Calendar className="w-3 h-3 text-slate-400" />
          <span className="text-slate-600">{daysRemaining}{t('dashboard.daysRemaining')}</span>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="relative h-5 bg-slate-100 rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getStatusColor()} rounded-full`}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white drop-shadow-md">
            {percentage}%
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="font-bold text-al-navy text-sm">{current}</span>
            <span className="text-slate-500"> / {target}</span>
          </div>
          <div className="h-3 w-px bg-slate-200" />
          <div>
            <span className="font-bold text-al-navy text-sm">{remaining}</span>
            <span className="text-slate-500"> {t('dashboard.visitsRemaining')}</span>
          </div>
        </div>

        {remaining > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-md">
            <Zap className="w-3 h-3 text-amber-600" />
            <span className="text-amber-700 font-medium text-xs">
              {visitsPerDay}{t('dashboard.perDayRequired')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
