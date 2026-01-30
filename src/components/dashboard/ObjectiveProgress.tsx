import { motion } from 'framer-motion';
import { Target, Zap, Calendar } from 'lucide-react';

interface ObjectiveProgressProps {
  current: number;
  target: number;
  daysRemaining: number;
}

export function ObjectiveProgress({ current, target, daysRemaining }: ObjectiveProgressProps) {
  const percentage = Math.round((current / target) * 100);
  const remaining = target - current;
  const visitsPerDay = remaining > 0 ? (remaining / daysRemaining).toFixed(1) : '0.0';

  // Couleur selon le statut
  const getStatusColor = () => {
    if (percentage >= 90) return 'from-green-500 to-emerald-500';
    if (percentage >= 70) return 'from-al-blue-500 to-al-sky';
    if (percentage >= 50) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  return (
    <div className="glass-card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-al-blue-100 rounded-xl">
            <Target className="w-6 h-6 text-al-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-al-navy">Objectif du mois</h2>
            <p className="text-sm text-slate-500">Janvier 2026</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600">{daysRemaining} jours restants</span>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="relative h-8 bg-slate-100 rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getStatusColor()} rounded-full`}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white drop-shadow-md">
            {percentage}% atteint
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <div>
            <span className="font-bold text-al-navy text-lg">{current}</span>
            <span className="text-slate-500"> / {target} visites</span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <span className="font-bold text-al-navy">{remaining}</span>
            <span className="text-slate-500"> restantes</span>
          </div>
        </div>

        {remaining > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-lg">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="text-amber-700 font-medium">
              Rythme requis : {visitsPerDay} visites/jour
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
