import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, UserPlus, Droplets, Star, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import { calculatePeriodMetrics } from '../services/metricsCalculator';
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

export const Dashboard: React.FC = () => {
  const { currentUser, practitioners, upcomingVisits } = useAppStore();
  const { timePeriod, periodLabel, periodLabelShort } = useTimePeriod();

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
      // Fin du mois actuel
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (timePeriod === 'quarter') {
      // Fin du trimestre actuel
      const currentQuarter = Math.floor(today.getMonth() / 3);
      const quarterEndMonth = (currentQuarter + 1) * 3 - 1;
      endDate = new Date(today.getFullYear(), quarterEndMonth + 1, 0);
    } else {
      // Fin de l'année
      endDate = new Date(today.getFullYear(), 11, 31);
    }

    const diffTime = endDate.getTime() - today.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [timePeriod]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Header compact */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-al-navy">
            Bonjour {currentUser.name.split(' ')[0]} 👋
          </h1>
          <p className="text-xs text-slate-500">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <PeriodSelector className="flex-1 sm:flex-none" size="sm" />
        </div>
      </div>

      {/* Barre d'objectif */}
      <ObjectiveProgress
        current={periodMetrics.visitsCount}
        target={periodMetrics.visitsObjective}
        daysRemaining={daysRemaining}
        periodLabel={periodLabel}
      />

      {/* 5 KPIs compacts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <AnimatedStatCard
          icon={Calendar}
          iconBgColor="bg-al-blue-500"
          label={`Visites ${periodLabelShort}`}
          value={periodMetrics.visitsCount}
          suffix={`/${periodMetrics.visitsObjective}`}
          trend={Math.round(periodMetrics.visitGrowth)}
          delay={0}
        />
        <AnimatedStatCard
          icon={UserPlus}
          iconBgColor="bg-green-500"
          label="Nouveaux prescr."
          value={periodMetrics.newPrescribers}
          prefix="+"
          trend={periodMetrics.newPrescribers > 0 ? Math.round((periodMetrics.newPrescribers / (timePeriod === 'year' ? 24 : timePeriod === 'quarter' ? 6 : 2)) * 100 - 100) : 0}
          delay={0.1}
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
        />
        <AnimatedStatCard
          icon={Star}
          iconBgColor="bg-amber-500"
          label="Fidélité moy."
          value={periodMetrics.avgLoyalty}
          suffix="/10"
          decimals={1}
          delay={0.3}
        />
        <AnimatedStatCard
          icon={AlertTriangle}
          iconBgColor="bg-red-500"
          label="KOLs urgents"
          value={periodMetrics.undervisitedKOLs}
          trendLabel={`>${timePeriod === 'month' ? '30' : timePeriod === 'quarter' ? '60' : '90'}j`}
          delay={0.4}
        />
      </div>

      {/* Section principale : Journée + Carte + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <DayTimeline visits={todayVisits} />
        </div>
        <div className="lg:col-span-1">
          <TerritoryMiniMap stats={territoryStats} points={mapPoints} />
        </div>
      </div>

      {/* ARIA Insights */}
      <AIInsights />

      {/* Performance + Stats en grille */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PerformanceChart />
        <NationalStats />
      </div>

      {/* Détails spécialité + Vingtile (optionnel, en dessous) */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer p-3 glass-card text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <span className="group-open:rotate-90 transition-transform">▶</span>
          Voir les analyses détaillées (Spécialités, Vingtiles, Réussites)
        </summary>
        <div className="mt-3 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SpecialtyBreakdown />
            <VingtileDistribution />
          </div>
          <WeeklyWins />
        </div>
      </details>
    </motion.div>
  );
};
