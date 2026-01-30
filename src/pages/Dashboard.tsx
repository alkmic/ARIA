import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, UserPlus, Droplets, Star, AlertTriangle, Sun } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
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
  const { objectives } = currentUser;

  // Calculate average loyalty score
  const avgLoyalty = (
    practitioners.reduce((acc, p) => acc + p.loyaltyScore, 0) / practitioners.length
  ).toFixed(1);

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

        return {
          id: p.id,
          lat: coords[0] + (Math.random() - 0.5) * 0.02,
          lng: coords[1] + (Math.random() - 0.5) * 0.02,
          status,
          name: `${p.title} ${p.lastName}`,
        };
      });
  }, [practitioners]);

  // Calculate total volume
  const totalVolume = practitioners.reduce((sum, p) => sum + p.volumeL, 0);

  // Get KOLs that need attention
  const urgentKOLs = practitioners.filter(p => p.isKOL && p.riskLevel === 'high').length;

  // Calculate days remaining in month
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysRemaining = lastDay.getDate() - today.getDate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header avec date/météo */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-al-navy">
            Bonjour {currentUser.name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm sm:text-base text-slate-500 flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs sm:text-sm">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1 text-xs sm:text-sm">
              <Sun className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
              Lyon, 8°C
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 w-full lg:w-auto">
          <select className="flex-1 lg:flex-none px-2 sm:px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-al-blue-500 text-xs sm:text-sm">
            <option>Ce mois</option>
            <option>Ce trimestre</option>
            <option>Cette année</option>
          </select>
          <span className="text-xs text-slate-400 hidden md:inline whitespace-nowrap">
            Dernière sync: il y a 5 min
          </span>
        </div>
      </div>

      {/* Barre d'objectif proéminente */}
      <ObjectiveProgress
        current={objectives.visitsCompleted}
        target={objectives.visitsMonthly}
        daysRemaining={daysRemaining}
      />

      {/* 5 KPIs animés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <AnimatedStatCard
          icon={Calendar}
          iconBgColor="bg-al-blue-500"
          label="Visites ce mois"
          value={objectives.visitsCompleted}
          suffix={`/${objectives.visitsMonthly}`}
          trend={15}
          delay={0}
        />
        <AnimatedStatCard
          icon={UserPlus}
          iconBgColor="bg-green-500"
          label="Nouveaux prescripteurs"
          value={objectives.newPrescribers}
          prefix="+"
          trend={20}
          trendLabel="vs mois dernier"
          delay={0.1}
        />
        <AnimatedStatCard
          icon={Droplets}
          iconBgColor="bg-cyan-500"
          label="Volume prescrit"
          value={totalVolume / 1000000}
          suffix="M L"
          decimals={1}
          trend={12}
          delay={0.2}
        />
        <AnimatedStatCard
          icon={Star}
          iconBgColor="bg-amber-500"
          label="Score NPS moyen"
          value={parseFloat(avgLoyalty)}
          suffix="/10"
          decimals={1}
          delay={0.3}
        />
        <AnimatedStatCard
          icon={AlertTriangle}
          iconBgColor="bg-red-500"
          label="KOLs à voir urgent"
          value={urgentKOLs}
          trendLabel="Non vus >90 jours"
          delay={0.4}
        />
      </div>

      {/* Ma journée + Mini carte (2 colonnes) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        <div className="lg:col-span-3">
          <DayTimeline visits={todayVisits} />
        </div>
        <div className="lg:col-span-2">
          <TerritoryMiniMap stats={territoryStats} points={mapPoints} />
        </div>
      </div>

      {/* ARIA Insights */}
      <AIInsights />

      {/* National Statistics */}
      <NationalStats />

      {/* Specialty Breakdown */}
      <SpecialtyBreakdown />

      {/* Vingtile Distribution */}
      <VingtileDistribution />

      {/* Graphique + Réussites (2 colonnes) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
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
