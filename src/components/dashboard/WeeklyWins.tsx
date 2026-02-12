import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, UserPlus, Star, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';

interface Win {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

export function WeeklyWins() {
  const navigate = useNavigate();
  const { upcomingVisits, practitioners } = useAppStore();

  const weeklyData = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Count visits this week
    const thisWeekVisits = upcomingVisits.filter(v => {
      const vDate = new Date(v.date);
      return vDate >= startOfWeek && vDate <= endOfWeek;
    });

    // KOL visits this week
    const kolVisits = thisWeekVisits.filter(v => {
      const pract = practitioners.find(p => p.id === v.practitionerId);
      return pract?.isKOL;
    });

    // High-loyalty practitioners visited (loyalty >= 8) — "fidélisés"
    const highLoyaltyVisits = thisWeekVisits.filter(v => {
      const pract = practitioners.find(p => p.id === v.practitionerId);
      return pract && pract.loyaltyScore >= 8;
    });

    // Pending visits (future dates this week)
    const pendingVisits = thisWeekVisits.filter(v => new Date(v.date) > today);

    // At-risk practitioners needing follow-up
    const atRiskCount = practitioners.filter(p =>
      p.loyaltyScore < 5 && p.volumeL > 5000
    ).length;

    return {
      visitsCount: thisWeekVisits.length,
      kolVisitsCount: kolVisits.length,
      highLoyaltyCount: highLoyaltyVisits.length,
      pendingCount: pendingVisits.length,
      relancesCount: Math.min(atRiskCount, 10),
    };
  }, [upcomingVisits, practitioners]);

  const wins: Win[] = [
    { icon: <CheckCircle className="w-5 h-5" />, label: 'Visites cette semaine', value: String(weeklyData.visitsCount), color: 'text-green-600 bg-green-100' },
    { icon: <Star className="w-5 h-5" />, label: 'Visites KOL', value: String(weeklyData.kolVisitsCount), color: 'text-amber-600 bg-amber-100' },
    { icon: <UserPlus className="w-5 h-5" />, label: 'Praticiens fidélisés vus', value: String(weeklyData.highLoyaltyCount), color: 'text-blue-600 bg-blue-100' },
  ];

  const pending = [
    { label: 'Visites restantes cette semaine', value: String(weeklyData.pendingCount) },
    { label: 'Relances à effectuer', value: String(weeklyData.relancesCount) },
  ];

  return (
    <div className="glass-card p-3 sm:p-4">
      <h3 className="font-bold text-base mb-2">Cette semaine</h3>

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
            <span className="flex-1 text-xs sm:text-sm text-slate-600">{win.label}</span>
            <span className="font-bold text-al-navy text-base sm:text-lg">{win.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-1.5">
        {pending.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="flex-1 text-slate-500">{item.label}</span>
            <span className="font-medium text-slate-700">{item.value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/visits')}
        className="mt-2 w-full text-xs text-al-blue-500 hover:underline flex items-center justify-center gap-1"
      >
        Voir l'historique complet
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}
