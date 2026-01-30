import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Target, Users, Star } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { AIInsights } from '../components/dashboard/AIInsights';
import { UpcomingVisits } from '../components/dashboard/UpcomingVisits';
import { PerformanceChart } from '../components/dashboard/PerformanceChart';
import { NationalStats } from '../components/dashboard/NationalStats';
import { SpecialtyBreakdown } from '../components/dashboard/SpecialtyBreakdown';
import { VingtileDistribution } from '../components/dashboard/VingtileDistribution';
import { useAppStore } from '../stores/useAppStore';

export const Dashboard: React.FC = () => {
  const { currentUser, practitioners } = useAppStore();
  const { objectives } = currentUser;

  // Calculate average loyalty score
  const avgLoyalty = (
    practitioners.reduce((acc, p) => acc + p.loyaltyScore, 0) / practitioners.length
  ).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-2">
          Bonjour {currentUser.name.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-600">
          Voici un aperçu de votre activité et des recommandations personnalisées.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          icon={Calendar}
          label="VISITES CE MOIS"
          value={objectives.visitsCompleted}
          total={objectives.visitsMonthly}
          trend={{ value: 15, isPositive: true }}
          delay={0}
        />
        <StatCard
          icon={Target}
          label="OBJECTIF VISITES"
          value={Math.round((objectives.visitsCompleted / objectives.visitsMonthly) * 100)}
          suffix="%"
          delay={0.1}
        />
        <StatCard
          icon={Users}
          label="NOUVEAUX PRESCRIPTEURS"
          value={objectives.newPrescribers}
          suffix="ce mois"
          trend={{ value: 20, isPositive: true }}
          delay={0.2}
        />
        <StatCard
          icon={Star}
          label="FIDÉLITÉ MOYENNE"
          value={parseFloat(avgLoyalty)}
          suffix="/10"
          delay={0.3}
        />
      </div>

      {/* AI Insights */}
      <AIInsights />

      {/* National Statistics and Territory Overview */}
      <NationalStats />

      {/* Specialty Breakdown */}
      <SpecialtyBreakdown />

      {/* Vingtile Distribution */}
      <VingtileDistribution />

      {/* Upcoming Visits & Priority Practitioners */}
      <UpcomingVisits />

      {/* Performance Chart */}
      <PerformanceChart />
    </motion.div>
  );
};
