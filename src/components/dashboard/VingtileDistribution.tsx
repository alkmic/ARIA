import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAppStore } from '../../stores/useAppStore';
import { Layers, TrendingDown } from 'lucide-react';

export const VingtileDistribution: React.FC = () => {
  const { practitioners } = useAppStore();
  const [selectedSpecialty, setSelectedSpecialty] = useState<'all' | 'Pneumologue' | 'Médecin généraliste'>('all');

  // Filter practitioners based on selected specialty
  const filteredPractitioners = selectedSpecialty === 'all'
    ? practitioners
    : practitioners.filter(p => p.specialty === selectedSpecialty);

  // Calculate vingtile distribution
  const vingtileData: { vingtile: number; count: number; avgVolume: number; totalVolume: number }[] = [];
  for (let v = 1; v <= 20; v++) {
    const practitionersInVingtile = filteredPractitioners.filter(p => p.vingtile === v);
    const totalVolume = practitionersInVingtile.reduce((sum, p) => sum + p.volumeL, 0);
    const avgVolume = practitionersInVingtile.length > 0 ? totalVolume / practitionersInVingtile.length : 0;

    vingtileData.push({
      vingtile: v,
      count: practitionersInVingtile.length,
      avgVolume: Math.round(avgVolume),
      totalVolume: Math.round(totalVolume)
    });
  }

  // Calculate top vingtiles stats
  const top5Vingtiles = filteredPractitioners.filter(p => p.vingtile <= 5);
  const top5Volume = top5Vingtiles.reduce((sum, p) => sum + p.volumeL, 0);
  const totalVolume = filteredPractitioners.reduce((sum, p) => sum + p.volumeL, 0);
  const top5Percentage = totalVolume > 0 ? (top5Volume / totalVolume * 100).toFixed(1) : '0';

  // Get color based on vingtile (gradient from high to low performance)
  const getBarColor = (vingtile: number) => {
    if (vingtile <= 3) return '#0066B3'; // al-blue
    if (vingtile <= 7) return '#00A3E0'; // al-sky
    if (vingtile <= 12) return '#00B5AD'; // al-teal
    if (vingtile <= 17) return '#94a3b8'; // slate-400
    return '#cbd5e1'; // slate-300
  };

  // Count by specialty
  const pneumologues = filteredPractitioners.filter(p => p.specialty === 'Pneumologue').length;
  const generalistes = filteredPractitioners.filter(p => p.specialty === 'Médecin généraliste').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
          <Layers className="w-5 h-5 text-al-blue-500" />
          <span>Distribution par Vingtile</span>
        </h2>

        {/* Specialty filter */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedSpecialty('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedSpecialty === 'all'
                ? 'bg-al-blue-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous ({practitioners.length})
          </button>
          <button
            onClick={() => setSelectedSpecialty('Pneumologue')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedSpecialty === 'Pneumologue'
                ? 'bg-al-blue-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pneumologues ({pneumologues})
          </button>
          <button
            onClick={() => setSelectedSpecialty('Médecin généraliste')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedSpecialty === 'Médecin généraliste'
                ? 'bg-al-blue-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Généralistes ({generalistes})
          </button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={vingtileData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="vingtile"
            stroke="#64748b"
            style={{ fontSize: '11px' }}
            label={{ value: 'Vingtile', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#64748b' }}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '11px' }}
            label={{ value: 'Nombre de praticiens', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#64748b' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
              padding: '12px'
            }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="text-xs">
                    <p className="font-bold text-slate-800 mb-2">Vingtile {data.vingtile}</p>
                    <p className="text-slate-600">Praticiens: <span className="font-semibold">{data.count}</span></p>
                    <p className="text-slate-600">Volume total: <span className="font-semibold">{(data.totalVolume / 1000).toFixed(0)}K L</span></p>
                    <p className="text-slate-600">Volume moyen: <span className="font-semibold">{(data.avgVolume / 1000).toFixed(0)}K L</span></p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {vingtileData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.vingtile)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Key insights */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="p-4 bg-gradient-to-br from-al-blue-50 to-al-sky/10 rounded-lg border border-al-blue-100">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="w-4 h-4 text-al-blue-500" />
            <p className="text-xs text-slate-600 font-medium">Top 5 Vingtiles</p>
          </div>
          <p className="text-2xl font-bold text-al-blue-600">{top5Percentage}%</p>
          <p className="text-xs text-slate-500 mt-1">du volume total</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-al-teal/10 to-al-sky/10 rounded-lg border border-al-teal/20">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm">🎯</span>
            <p className="text-xs text-slate-600 font-medium">Praticiens Top 3</p>
          </div>
          <p className="text-2xl font-bold text-al-teal">
            {filteredPractitioners.filter(p => p.vingtile <= 3).length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {((filteredPractitioners.filter(p => p.vingtile <= 3).length / filteredPractitioners.length) * 100).toFixed(1)}% du territoire
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm">📊</span>
            <p className="text-xs text-slate-600 font-medium">Volume moyen</p>
          </div>
          <p className="text-2xl font-bold text-slate-700">
            {filteredPractitioners.length > 0
              ? (totalVolume / filteredPractitioners.length / 1000).toFixed(0)
              : '0'}K L
          </p>
          <p className="text-xs text-slate-500 mt-1">par praticien</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-slate-600">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded bg-al-blue-500"></div>
          <span>V1-3 (Top)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded bg-al-sky"></div>
          <span>V4-7</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded bg-al-teal"></div>
          <span>V8-12</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded bg-slate-400"></div>
          <span>V13-17</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded bg-slate-300"></div>
          <span>V18-20</span>
        </div>
      </div>
    </motion.div>
  );
};
