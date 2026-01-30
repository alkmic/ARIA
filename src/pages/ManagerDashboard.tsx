import { motion } from 'framer-motion';
import {
  Users, Target, Award,
  BarChart3, ArrowUpRight
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell,
  AreaChart, Area, Line
} from 'recharts';

// Données fictives de l'équipe
const teamData = [
  { name: 'Marie Dupont', visits: 47, objective: 60, newPrescribers: 12, satisfaction: 8.4 },
  { name: 'Pierre Martin', visits: 52, objective: 55, newPrescribers: 8, satisfaction: 7.9 },
  { name: 'Sophie Bernard', visits: 38, objective: 50, newPrescribers: 15, satisfaction: 9.1 },
  { name: 'Lucas Petit', visits: 61, objective: 60, newPrescribers: 6, satisfaction: 8.0 },
  { name: 'Emma Leroy', visits: 44, objective: 55, newPrescribers: 10, satisfaction: 8.7 },
];

const monthlyPerformance = [
  { month: 'Jan', actual: 180, objective: 200, previousYear: 165 },
  { month: 'Fév', actual: 195, objective: 200, previousYear: 170 },
  { month: 'Mar', actual: 210, objective: 200, previousYear: 185 },
  { month: 'Avr', actual: 188, objective: 200, previousYear: 175 },
  { month: 'Mai', actual: 220, objective: 210, previousYear: 190 },
  { month: 'Jun', actual: 205, objective: 210, previousYear: 180 },
];

const specialtyDistribution = [
  { name: 'Médecins généralistes', value: 65, color: '#0066B3' },
  { name: 'Pneumologues', value: 25, color: '#00B5AD' },
  { name: 'Autres', value: 10, color: '#94A3B8' },
];

export default function ManagerDashboard() {
  const totalVisits = teamData.reduce((sum, m) => sum + m.visits, 0);
  const totalObjective = teamData.reduce((sum, m) => sum + m.objective, 0);
  const avgSatisfaction = (teamData.reduce((sum, m) => sum + m.satisfaction, 0) / teamData.length).toFixed(1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-al-navy">Dashboard Manager</h1>
          <p className="text-slate-500">Région Auvergne-Rhône-Alpes • {teamData.length} commerciaux</p>
        </div>
        <div className="flex gap-2">
          <select className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-al-blue-500">
            <option>Ce mois</option>
            <option>Ce trimestre</option>
            <option>Cette année</option>
          </select>
        </div>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-al-blue-500" />
            <span className="flex items-center text-green-500 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4" />
              +12%
            </span>
          </div>
          <p className="text-3xl font-bold text-al-navy">{totalVisits}</p>
          <p className="text-slate-500 text-sm">Visites totales</p>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-al-blue-500 to-al-sky rounded-full"
              style={{ width: `${(totalVisits / totalObjective) * 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{totalVisits}/{totalObjective} objectif</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-green-500" />
            <span className="text-green-500 text-sm font-medium">On track</span>
          </div>
          <p className="text-3xl font-bold text-al-navy">
            {Math.round((totalVisits / totalObjective) * 100)}%
          </p>
          <p className="text-slate-500 text-sm">Taux d'atteinte</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 text-amber-500" />
            <span className="flex items-center text-green-500 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4" />
              +8%
            </span>
          </div>
          <p className="text-3xl font-bold text-al-navy">
            {teamData.reduce((sum, m) => sum + m.newPrescribers, 0)}
          </p>
          <p className="text-slate-500 text-sm">Nouveaux prescripteurs</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-al-navy">{avgSatisfaction}</p>
          <p className="text-slate-500 text-sm">Score satisfaction moyen</p>
        </motion.div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-3 gap-6">
        {/* Performance mensuelle */}
        <div className="col-span-2 bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Performance mensuelle vs objectifs</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyPerformance}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0066B3" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0066B3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#0066B3"
                fillOpacity={1}
                fill="url(#colorActual)"
                name="Réalisé"
              />
              <Line
                type="monotone"
                dataKey="objective"
                stroke="#10B981"
                strokeDasharray="5 5"
                name="Objectif"
              />
              <Line
                type="monotone"
                dataKey="previousYear"
                stroke="#94A3B8"
                strokeDasharray="3 3"
                name="N-1"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par spécialité */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Visites par spécialité</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPie>
              <Pie
                data={specialtyDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {specialtyDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {specialtyDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span className="font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tableau de l'équipe */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6">
        <h3 className="font-semibold mb-4">Performance par commercial</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-600">Commercial</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Visites</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Objectif</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Progression</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Nouveaux</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Satisfaction</th>
              </tr>
            </thead>
            <tbody>
              {teamData.map((member, index) => {
                const progress = Math.round((member.visits / member.objective) * 100);
                const isOnTrack = progress >= 80;

                return (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-al-blue-400 to-al-sky flex items-center justify-center text-white font-medium">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4 font-semibold">{member.visits}</td>
                    <td className="text-center py-4 px-4 text-slate-500">{member.objective}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isOnTrack ? 'bg-green-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${isOnTrack ? 'text-green-600' : 'text-amber-600'}`}>
                          {progress}%
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        +{member.newPrescribers}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="font-semibold">{member.satisfaction}</span>
                      <span className="text-slate-400">/10</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
