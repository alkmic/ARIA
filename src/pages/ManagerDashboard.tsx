import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Target, Award, ArrowUpRight,
  Droplets, Star, AlertTriangle, TrendingUp, MapPin, Clock,
  AlertCircle, CheckCircle2, Trophy, Zap, BarChart2
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell,
  AreaChart, Area, Line, BarChart, Bar
} from 'recharts';
import { useAppStore } from '../stores/useAppStore';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import { PeriodSelector } from '../components/shared/PeriodSelector';

// Mock team data - in real app would come from backend
const teamMembers = [
  { id: '1', name: 'Marie Dupont', territory: 'Lyon', objective: 60 },
  { id: '2', name: 'Pierre Martin', territory: 'Grenoble', objective: 55 },
  { id: '3', name: 'Sophie Bernard', territory: 'Bourg-en-Bresse', objective: 50 },
  { id: '4', name: 'Lucas Petit', territory: 'Villeurbanne', objective: 60 },
  { id: '5', name: 'Emma Leroy', territory: 'Lyon', objective: 55 },
];

const monthlyPerformance = [
  { month: 'Jan', actual: 180, objective: 200, previousYear: 165, volume: 2.4 },
  { month: 'Fév', actual: 195, objective: 200, previousYear: 170, volume: 2.6 },
  { month: 'Mar', actual: 210, objective: 200, previousYear: 185, volume: 2.8 },
  { month: 'Avr', actual: 188, objective: 200, previousYear: 175, volume: 2.5 },
  { month: 'Mai', actual: 220, objective: 210, previousYear: 190, volume: 2.9 },
  { month: 'Jun', actual: 205, objective: 210, previousYear: 180, volume: 2.7 },
];

const projectionData = [
  { month: 'Jul', forecast: 215, objective: 210 },
  { month: 'Août', forecast: 198, objective: 210 },
  { month: 'Sep', forecast: 225, objective: 220 },
  { month: 'Oct', forecast: 232, objective: 220 },
  { month: 'Nov', forecast: 240, objective: 230 },
  { month: 'Déc', forecast: 245, objective: 230 },
];

export default function ManagerDashboard() {
  const { practitioners, upcomingVisits } = useAppStore();
  const { timePeriod } = useTimePeriod();

  // Calculate real metrics from store data - adapted to period
  const metrics = useMemo(() => {
    const totalPractitioners = practitioners.length;

    // Adapter le volume à la période sélectionnée
    const volumeMultiplier = timePeriod === 'month' ? 1/12 : timePeriod === 'quarter' ? 1/4 : 1;
    const totalVolume = practitioners.reduce((sum, p) => sum + (p.volumeL * volumeMultiplier), 0);

    const kolCount = practitioners.filter(p => p.isKOL).length;
    const avgLoyalty = practitioners.reduce((sum, p) => sum + p.loyaltyScore, 0) / totalPractitioners;

    // Group practitioners by specialty
    const specialties = practitioners.reduce((acc, p) => {
      acc[p.specialty] = (acc[p.specialty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate territory stats (volume adapté à la période)
    const territories = practitioners.reduce((acc, p) => {
      if (!acc[p.city]) {
        acc[p.city] = { count: 0, volume: 0, kols: 0 };
      }
      acc[p.city].count++;
      acc[p.city].volume += p.volumeL * volumeMultiplier;
      if (p.isKOL) acc[p.city].kols++;
      return acc;
    }, {} as Record<string, { count: number; volume: number; kols: number }>);

    // High-risk practitioners (low loyalty + high volume or KOL)
    const atRisk = practitioners.filter(p =>
      (p.loyaltyScore < 6 && p.volumeL > 100000) || (p.isKOL && p.loyaltyScore < 7)
    ).length;

    // Undervisited KOLs
    const today = new Date();
    const undervisitedKOLs = practitioners.filter(p => {
      if (!p.isKOL || !p.lastVisitDate) return p.isKOL;
      const lastVisit = new Date(p.lastVisitDate);
      const daysSince = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
      return daysSince > 60;
    }).length;

    return {
      totalPractitioners,
      totalVolume,
      kolCount,
      avgLoyalty,
      specialties,
      territories,
      atRisk,
      undervisitedKOLs,
      totalVisits: upcomingVisits.length,
    };
  }, [practitioners, upcomingVisits, timePeriod]);

  // Calculate team performance (simulated per member) - adapted to period
  const teamPerformance = useMemo(() => {
    // Adapter les objectifs et visites à la période
    const periodMultiplier = timePeriod === 'month' ? 1 : timePeriod === 'quarter' ? 3 : 12;
    const volumeMultiplier = timePeriod === 'month' ? 1/12 : timePeriod === 'quarter' ? 1/4 : 1;

    // Seed-based pseudo-random for deterministic values per member
    const memberSeed = (idx: number, offset: number) => {
      const x = Math.sin((idx + 1) * 9999 + offset) * 10000;
      return x - Math.floor(x);
    };

    return teamMembers.map((member, memberIdx) => {
      // Simulate assignment of practitioners to team members
      const memberPractitioners = practitioners.filter((_, idx) =>
        idx % teamMembers.length === memberIdx
      );

      // Visites adaptées à la période (déterministes)
      const baseVisits = Math.floor(memberSeed(memberIdx, 1) * 20) + 40;
      const visits = Math.floor(baseVisits * periodMultiplier);
      const adjustedObjective = member.objective * periodMultiplier;

      // Volume adapté à la période
      const volume = memberPractitioners.reduce((sum, p) => sum + (p.volumeL * volumeMultiplier), 0);

      // Nouveaux prescripteurs adaptés à la période (déterministes)
      const baseNewPrescribers = Math.floor(memberSeed(memberIdx, 2) * 10) + 5;
      const newPrescribers = Math.floor(baseNewPrescribers * periodMultiplier);

      const satisfaction = 7 + memberSeed(memberIdx, 3) * 2;
      const kolCoverage = memberPractitioners.filter(p => p.isKOL).length;

      return {
        ...member,
        visits,
        objective: adjustedObjective,
        volume,
        newPrescribers,
        satisfaction: parseFloat(satisfaction.toFixed(1)),
        kolCoverage,
        progress: Math.round((visits / adjustedObjective) * 100),
        practitioners: memberPractitioners.length,
      };
    });
  }, [practitioners, timePeriod]);

  // Prepare specialty distribution for pie chart
  const specialtyData = useMemo(() => {
    return Object.entries(metrics.specialties).map(([name, count], index) => ({
      name,
      value: count,
      percentage: ((count / metrics.totalPractitioners) * 100).toFixed(1),
      color: index === 0 ? '#0066B3' : index === 1 ? '#00B5AD' : '#94A3B8',
    }));
  }, [metrics]);

  // Territory comparison data
  const territoryComparison = useMemo(() => {
    return Object.entries(metrics.territories)
      .sort((a, b) => b[1].volume - a[1].volume)
      .slice(0, 5)
      .map(([name, stats]) => ({
        name,
        volume: stats.volume / 1000000,
        practitioners: stats.count,
        kols: stats.kols,
      }));
  }, [metrics]);

  // Calculate aggregate stats
  const totalVisits = teamPerformance.reduce((sum, m) => sum + m.visits, 0);
  const totalObjective = teamPerformance.reduce((sum, m) => sum + m.objective, 0);
  const avgProgress = Math.round((totalVisits / totalObjective) * 100);

  // Alerts and priorities
  const alerts = [
    {
      id: 1,
      type: 'warning' as const,
      icon: AlertTriangle,
      title: `${metrics.atRisk} praticiens à risque`,
      description: 'Fidélité faible + Volume élevé',
      action: 'Analyser',
    },
    {
      id: 2,
      type: 'danger' as const,
      icon: Clock,
      title: `${metrics.undervisitedKOLs} KOL non visités >60j`,
      description: 'Planifier des visites urgentes',
      action: 'Planifier',
    },
    {
      id: 3,
      type: 'info' as const,
      icon: TrendingUp,
      title: 'Projection T4 optimiste',
      description: '+15% vs objectif si tendance maintenue',
      action: 'Voir détails',
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Dashboard Directeur Régional</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Région Auvergne-Rhône-Alpes • {teamMembers.length} commerciaux • {metrics.totalPractitioners} praticiens
          </p>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <PeriodSelector size="sm" />
        </div>
      </div>

      {/* Alerts & Priority Actions */}
      <div className="glass-card p-4 sm:p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Alertes & Actions Prioritaires
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {alerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border-2 ${
                alert.type === 'danger'
                  ? 'bg-red-50 border-red-300'
                  : alert.type === 'warning'
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-blue-50 border-blue-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <alert.icon
                  className={`w-5 h-5 mt-0.5 ${
                    alert.type === 'danger'
                      ? 'text-red-600'
                      : alert.type === 'warning'
                      ? 'text-amber-600'
                      : 'text-blue-600'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800">{alert.title}</p>
                  <p className="text-xs text-slate-600 mt-1">{alert.description}</p>
                  <button
                    className={`mt-2 text-xs font-medium ${
                      alert.type === 'danger'
                        ? 'text-red-700 hover:underline'
                        : alert.type === 'warning'
                        ? 'text-amber-700 hover:underline'
                        : 'text-blue-700 hover:underline'
                    }`}
                  >
                    {alert.action} →
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-al-blue-500" />
            <span className="flex items-center text-green-500 text-xs sm:text-sm font-medium">
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
              +12%
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-al-navy">{totalVisits}</p>
          <p className="text-slate-500 text-xs sm:text-sm">Visites totales</p>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-al-blue-500 to-al-sky rounded-full"
              style={{ width: `${Math.min(avgProgress, 100)}%` }}
            />
          </div>
          <p className="text-xs sm:text-xs text-slate-500 mt-1">
            {totalVisits}/{totalObjective} objectif
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Droplets className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-500" />
            <span className="flex items-center text-green-500 text-xs sm:text-sm font-medium">
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
              +18%
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-al-navy">
            {(metrics.totalVolume / 1000000).toFixed(1)}M
          </p>
          <p className="text-slate-500 text-xs sm:text-sm">Volume total (L)</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Target className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
            <span className={`text-xs sm:text-sm font-medium ${avgProgress >= 80 ? 'text-green-500' : 'text-amber-500'}`}>
              {avgProgress >= 80 ? 'On track' : 'À suivre'}
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-al-navy">{avgProgress}%</p>
          <p className="text-slate-500 text-xs sm:text-sm">Taux d'atteinte</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Award className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
            <span className="flex items-center text-green-500 text-xs sm:text-sm font-medium">
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
              +8%
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-al-navy">
            {teamPerformance.reduce((sum, m) => sum + m.newPrescribers, 0)}
          </p>
          <p className="text-slate-500 text-xs sm:text-sm">Nouveaux prescripteurs</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Star className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-al-navy">{metrics.kolCount}</p>
          <p className="text-slate-500 text-xs sm:text-sm">KOLs dans le réseau</p>
          <p className="text-xs sm:text-xs text-amber-600 mt-1">
            {metrics.undervisitedKOLs} non visités {'>'}60j
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-al-navy">{metrics.atRisk}</p>
          <p className="text-slate-500 text-xs sm:text-sm">Praticiens à risque</p>
          <p className="text-xs sm:text-xs text-slate-400 mt-1">Fidélité faible</p>
        </motion.div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Performance mensuelle + projection */}
        <div className="col-span-1 lg:col-span-2 glass-card p-4 sm:p-6">
          <h3 className="font-semibold text-base sm:text-lg mb-4">
            Performance & Projection
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={[...monthlyPerformance, ...projectionData]}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0066B3" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0066B3" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#0066B3"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorActual)"
                name="Réalisé"
              />
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorForecast)"
                name="Projection"
              />
              <Line
                type="monotone"
                dataKey="objective"
                stroke="#F59E0B"
                strokeDasharray="8 4"
                strokeWidth={2}
                name="Objectif"
              />
              <Line
                type="monotone"
                dataKey="previousYear"
                stroke="#94A3B8"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                name="N-1"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par spécialité */}
        <div className="glass-card p-4 sm:p-6">
          <h3 className="font-semibold text-base sm:text-lg mb-4">Par spécialité</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RechartsPie>
              <Pie
                data={specialtyData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                label={({ percent }: any) => `${((percent || 0) * 100).toFixed(0)}%`}
              >
                {specialtyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {specialtyData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 - Territory Comparison */}
      <div className="glass-card p-4 sm:p-6">
        <h3 className="font-semibold text-base sm:text-lg mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-al-blue-500" />
          Comparaison par Territoire (Top 5)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={territoryComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="volume" fill="#0066B3" name="Volume (M L)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="practitioners" fill="#00B5AD" name="Praticiens" radius={[8, 8, 0, 0]} />
            <Bar dataKey="kols" fill="#F59E0B" name="KOLs" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Team Leaderboard */}
      <div className="glass-card p-4 sm:p-6">
        <h3 className="font-semibold text-base sm:text-lg mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Classement de l'Équipe
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-3 px-2 sm:px-4 font-semibold text-slate-700">Rang</th>
                <th className="text-left py-3 px-2 sm:px-4 font-semibold text-slate-700">Commercial</th>
                <th className="text-center py-3 px-2 sm:px-4 font-semibold text-slate-700">Territoire</th>
                <th className="text-center py-3 px-2 sm:px-4 font-semibold text-slate-700">Visites</th>
                <th className="text-center py-3 px-2 sm:px-4 font-semibold text-slate-700">Volume</th>
                <th className="text-center py-3 px-2 sm:px-4 font-semibold text-slate-700">Progression</th>
                <th className="text-center py-3 px-2 sm:px-4 font-semibold text-slate-700">KOLs</th>
                <th className="text-center py-3 px-2 sm:px-4 font-semibold text-slate-700">Satisfaction</th>
              </tr>
            </thead>
            <tbody>
              {teamPerformance
                .sort((a, b) => b.progress - a.progress)
                .map((member, index) => {
                  const isTopPerformer = index === 0;
                  const isOnTrack = member.progress >= 80;

                  return (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${
                        isTopPerformer ? 'bg-amber-50' : ''
                      }`}
                    >
                      <td className="py-3 sm:py-4 px-2 sm:px-4">
                        <div className="flex items-center gap-2">
                          {isTopPerformer && (
                            <Trophy className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="font-bold text-al-navy">#{index + 1}</span>
                        </div>
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-al-blue-400 to-al-sky flex items-center justify-center text-white font-medium text-xs sm:text-sm flex-shrink-0">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="font-medium text-slate-800 text-xs sm:text-sm truncate">
                            {member.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm text-slate-600">
                        {member.territory}
                      </td>
                      <td className="text-center py-3 sm:py-4 px-2 sm:px-4 font-semibold text-slate-800">
                        {member.visits}
                        <span className="text-xs text-slate-400">/{member.objective}</span>
                      </td>
                      <td className="text-center py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm">
                        <span className="font-semibold text-cyan-600">
                          {(member.volume / 1000000).toFixed(1)}M
                        </span>
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                              <div
                                className={`h-full rounded-full ${
                                  isOnTrack ? 'bg-green-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(member.progress, 100)}%` }}
                              />
                            </div>
                            <span
                              className={`text-xs font-medium whitespace-nowrap ${
                                isOnTrack ? 'text-green-600' : 'text-amber-600'
                              }`}
                            >
                              {member.progress}%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 sm:py-4 px-2 sm:px-4">
                        <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                          {member.kolCoverage}
                        </span>
                      </td>
                      <td className="text-center py-3 sm:py-4 px-2 sm:px-4">
                        <span className="font-semibold text-slate-800">{member.satisfaction}</span>
                        <span className="text-xs text-slate-400">/10</span>
                      </td>
                    </motion.tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insights Summary */}
      <div className="glass-card p-4 sm:p-6">
        <h3 className="font-semibold text-base sm:text-lg mb-4 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-al-blue-500" />
          Insights Clés
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800 text-sm">Performance au-dessus des objectifs</p>
                <p className="text-xs text-slate-600 mt-1">
                  L'équipe atteint {avgProgress}% des objectifs ce mois. Si la tendance se maintient,
                  projection de +15% au T4.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800 text-sm">Attention aux KOLs</p>
                <p className="text-xs text-slate-600 mt-1">
                  {metrics.undervisitedKOLs} KOLs n'ont pas été visités depuis plus de 60 jours.
                  Prioriser leur visite dans les 2 prochaines semaines.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <Droplets className="w-5 h-5 text-cyan-600 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800 text-sm">Croissance volume exceptionnelle</p>
                <p className="text-xs text-slate-600 mt-1">
                  +18% de volume vs N-1. Les pneumologues représentent 75% de cette croissance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
