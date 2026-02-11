import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, UserPlus, Droplets, Star, AlertTriangle, Clock, Zap, ChevronRight, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import { calculatePeriodMetrics } from '../services/metricsCalculator';
import { generateIntelligentActions } from '../services/actionIntelligence';
import { PeriodSelector } from '../components/shared/PeriodSelector';
import { ObjectiveProgress } from '../components/dashboard/ObjectiveProgress';
import { AnimatedStatCard } from '../components/dashboard/AnimatedStatCard';
import { DayTimeline } from '../components/dashboard/DayTimeline';
import { TerritoryMiniMap } from '../components/dashboard/TerritoryMiniMap';
import { AIInsights } from '../components/dashboard/AIInsights';
import { PerformanceChart } from '../components/dashboard/PerformanceChart';
import { WeeklyWins } from '../components/dashboard/WeeklyWins';
import { NationalStats } from '../components/dashboard/NationalStats';
import { SpecialtyBreakdown } from '../components/dashboard/SpecialtyBreakdown';
import { VingtileDistribution } from '../components/dashboard/VingtileDistribution';
import { QuickActions } from '../components/dashboard/QuickActions';
import { DataService } from '../services/dataService';

export const Dashboard: React.FC = () => {
  const { currentUser, practitioners, upcomingVisits } = useAppStore();
  const { timePeriod, periodLabel, periodLabelShort } = useTimePeriod();
  const navigate = useNavigate();

  // Calculer les métriques pour la période sélectionnée
  const periodMetrics = useMemo(() => {
    return calculatePeriodMetrics(practitioners, upcomingVisits, timePeriod);
  }, [practitioners, upcomingVisits, timePeriod]);

  // Get today's visits
  const todayVisits = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return upcomingVisits
      .filter(v => v.date === today)
      .slice(0, 3)
      .map((v, index) => ({
        id: v.id,
        time: v.time,
        practitioner: v.practitioner,
        status: index === 0 ? 'to-prepare' as const : 'prepared' as const,
        isNext: index === 0,
      }));
  }, [upcomingVisits]);

  // Territory stats (mock data based on real practitioners)
  const territoryStats = useMemo(() => {
    const today = new Date();
    const urgent = practitioners.filter(p => {
      if (!p.lastVisitDate) return true;
      const lastVisit = new Date(p.lastVisitDate);
      const daysSince = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
      return daysSince > 90;
    }).length;

    const toSchedule = practitioners.filter(p => {
      if (!p.lastVisitDate) return false;
      const lastVisit = new Date(p.lastVisitDate);
      const daysSince = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= 30 && daysSince <= 90;
    }).length;

    const upToDate = practitioners.length - urgent - toSchedule;

    return { urgent, toSchedule, upToDate };
  }, [practitioners]);

  // Map points (sample of practitioners with coordinates)
  const mapPoints = useMemo(() => {
    const cities: Record<string, [number, number]> = {
      'LYON': [45.7640, 4.8357],
      'GRENOBLE': [45.1885, 5.7245],
      'VILLEURBANNE': [45.7676, 4.8799],
      'BOURG-EN-BRESSE': [46.2056, 5.2256],
    };

    return practitioners
      .filter(p => cities[p.city?.toUpperCase()])
      .slice(0, 20)
      .map(p => {
        const coords = cities[p.city.toUpperCase()];
        const today = new Date();
        let status: 'urgent' | 'toSchedule' | 'upToDate' = 'upToDate';

        if (p.lastVisitDate) {
          const lastVisit = new Date(p.lastVisitDate);
          const daysSince = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince > 90) status = 'urgent';
          else if (daysSince >= 30) status = 'toSchedule';
        } else {
          status = 'urgent';
        }

        // Use deterministic offset based on practitioner ID to avoid random during render
        const idHash = p.id.charCodeAt(0) + (p.id.charCodeAt(1) || 0) + (p.id.charCodeAt(2) || 0);
        const latOffset = ((idHash % 100) - 50) / 5000;
        const lngOffset = (((idHash * 7) % 100) - 50) / 5000;

        return {
          id: p.id,
          lat: coords[0] + latOffset,
          lng: coords[1] + lngOffset,
          status,
          name: `${p.title} ${p.lastName}`,
        };
      });
  }, [practitioners]);

  // Calculate days remaining in period
  const today = new Date();
  const daysRemaining = useMemo(() => {
    let endDate: Date;

    if (timePeriod === 'month') {
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (timePeriod === 'quarter') {
      const currentQuarter = Math.floor(today.getMonth() / 3);
      const quarterEndMonth = (currentQuarter + 1) * 3 - 1;
      endDate = new Date(today.getFullYear(), quarterEndMonth + 1, 0);
    } else {
      endDate = new Date(today.getFullYear(), 11, 31);
    }

    const diffTime = endDate.getTime() - today.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [timePeriod]);

  // Dynamic last sync time (based on current time)
  const lastSyncText = useMemo(() => {
    const minutes = today.getMinutes() % 15;
    if (minutes < 5) return 'à l\'instant';
    return `il y a ${minutes} min`;
  }, []);

  const firstName = currentUser.name.split(' ')[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {/* Header avec date */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-al-navy">
            Bonjour {firstName}
          </h1>
          <p className="text-sm text-slate-500 flex flex-wrap items-center gap-2">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <PeriodSelector className="flex-1 lg:flex-none" size="sm" />
          <span className="text-xs text-slate-400 hidden md:inline whitespace-nowrap flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Sync: {lastSyncText}
          </span>
        </div>
      </div>

      {/* Barre d'objectif proéminente */}
      <ObjectiveProgress
        current={periodMetrics.visitsCount}
        target={periodMetrics.visitsObjective}
        daysRemaining={daysRemaining}
        periodLabel={periodLabel}
      />

      {/* 5 KPIs animés - clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3">
        <AnimatedStatCard
          icon={Calendar}
          iconBgColor="bg-al-blue-500"
          label={`Visites ${periodLabelShort}`}
          value={periodMetrics.visitsCount}
          suffix={`/${periodMetrics.visitsObjective}`}
          trend={Math.round(periodMetrics.visitGrowth)}
          delay={0}
          linkTo="/visits"
        />
        <AnimatedStatCard
          icon={UserPlus}
          iconBgColor="bg-green-500"
          label="Nouveaux prescripteurs"
          value={periodMetrics.newPrescribers}
          prefix="+"
          trend={timePeriod === 'month' ? 2 : timePeriod === 'quarter' ? 5 : 8}
          trendLabel="vs période préc."
          delay={0.1}
          linkTo="/practitioners"
        />
        <AnimatedStatCard
          icon={Droplets}
          iconBgColor="bg-cyan-500"
          label="Volume prescrit"
          value={periodMetrics.totalVolume / 1000}
          suffix="K L"
          decimals={0}
          trend={Math.round(periodMetrics.volumeGrowth)}
          delay={0.2}
          linkTo="/practitioners"
        />
        <AnimatedStatCard
          icon={Star}
          iconBgColor="bg-amber-500"
          label="Fidélité moyenne"
          value={periodMetrics.avgLoyalty}
          suffix="/10"
          decimals={1}
          delay={0.3}
          linkTo="/practitioners"
        />
        <AnimatedStatCard
          icon={AlertTriangle}
          iconBgColor="bg-red-500"
          label="KOLs à voir urgent"
          value={periodMetrics.undervisitedKOLs}
          trendLabel={`Non vus >${timePeriod === 'month' ? '30' : timePeriod === 'quarter' ? '60' : '90'}j`}
          delay={0.4}
          linkTo="/kol-planning"
        />
      </div>

      {/* Ma journée + Mini carte (2 colonnes) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3">
          <DayTimeline visits={todayVisits} />
        </div>
        <div className="lg:col-span-2">
          <TerritoryMiniMap stats={territoryStats} points={mapPoints} />
        </div>
      </div>

      {/* Top 3 Next Best Actions — AI-powered recommendations */}
      <TopActionsWidget navigate={navigate} />

      {/* Quick Actions */}
      <QuickActions />

      {/* ARIA Insights */}
      <AIInsights />

      {/* National Statistics */}
      <NationalStats />

      {/* Specialty Breakdown */}
      <SpecialtyBreakdown />

      {/* Vingtile Distribution */}
      <VingtileDistribution />

      {/* Graphique + Réussites (2 colonnes) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <PerformanceChart />
        </div>
        <div className="lg:col-span-1">
          <WeeklyWins />
        </div>
      </div>
    </motion.div>
  );
};

// ─── Top Actions Widget: Shows top 3 AI-generated actions on dashboard ───────
function TopActionsWidget({ navigate }: { navigate: (path: string) => void }) {
  const topActions = useMemo(() => {
    return generateIntelligentActions({ maxActions: 3 });
  }, []);

  const priorityStyles = {
    critical: { border: 'border-l-red-500', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700', label: 'Critique' },
    high: { border: 'border-l-amber-500', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700', label: 'Haute' },
    medium: { border: 'border-l-blue-500', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', label: 'Moyenne' },
    low: { border: 'border-l-slate-400', bg: 'bg-slate-50', badge: 'bg-slate-100 text-slate-600', label: 'Faible' },
  };

  if (topActions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          Mes Prochaines Actions
        </h2>
        <button
          onClick={() => navigate('/next-actions')}
          className="text-xs text-al-blue-600 hover:text-al-blue-700 font-medium flex items-center gap-1"
        >
          Voir tout
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {topActions.map((action, index) => {
          const style = priorityStyles[action.priority];
          const practitioner = DataService.getPractitionerById(action.practitionerId);

          return (
            <motion.div
              key={`${action.practitionerId}-${action.type}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`glass-card border-l-4 ${style.border} overflow-hidden hover:shadow-lg transition-all cursor-pointer`}
              onClick={() => navigate(`/practitioner/${action.practitionerId}`)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                    {style.label}
                  </span>
                  <span className="text-xs text-slate-400">{action.suggestedDate}</span>
                </div>

                <h3 className="font-semibold text-slate-800 text-sm mb-1">{action.title}</h3>

                {practitioner && (
                  <p className="text-xs text-slate-500 mb-2">
                    {practitioner.title} {practitioner.firstName} {practitioner.lastName} — {practitioner.specialty}
                  </p>
                )}

                <p className="text-xs text-slate-600 line-clamp-2">{action.reason}</p>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Score</span>
                    <span className="text-sm font-bold text-slate-700">{action.scores.overall}/100</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/pitch?practitionerId=${action.practitionerId}`); }}
                      className="text-xs px-2 py-1 rounded-md bg-al-blue-50 text-al-blue-600 hover:bg-al-blue-100 transition-colors"
                    >
                      Pitch
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/visit-report?practitionerId=${action.practitionerId}`); }}
                      className="text-xs px-2 py-1 rounded-md bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors"
                    >
                      <Mic className="w-3 h-3 inline mr-0.5" />
                      CRV
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
