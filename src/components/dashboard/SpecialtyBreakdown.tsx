import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAppStore } from '../../stores/useAppStore';
import { Stethoscope, Users2 } from 'lucide-react';

export const SpecialtyBreakdown: React.FC = () => {
  const { practitioners } = useAppStore();

  // Calculate specialty breakdown
  const pneumologues = practitioners.filter(p => p.specialty === 'Pneumologue');
  const generalistes = practitioners.filter(p => p.specialty === 'Médecin généraliste');

  const pneumoVolume = pneumologues.reduce((sum, p) => sum + p.volumeL, 0);
  const genVolume = generalistes.reduce((sum, p) => sum + p.volumeL, 0);

  const pneumoKOL = pneumologues.filter(p => p.isKOL).length;
  const genKOL = generalistes.filter(p => p.isKOL).length;

  // Data for pie chart (by count)
  const countData = [
    { name: 'Pneumologues', value: pneumologues.length, color: '#0066B3' },
    { name: 'Généralistes', value: generalistes.length, color: '#00B5AD' }
  ];

  // Data for volume pie chart
  const volumeData = [
    { name: 'Pneumologues', value: pneumoVolume, color: '#0066B3' },
    { name: 'Généralistes', value: genVolume, color: '#00B5AD' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card p-4 sm:p-6"
    >
      <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6 flex items-center space-x-2">
        <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 text-al-blue-500" />
        <span>Répartition par Spécialité</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Count Pie Chart */}
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-slate-600 text-center mb-3 sm:mb-4">
            Nombre de Praticiens
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={countData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {countData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Volume Pie Chart */}
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-slate-600 text-center mb-3 sm:mb-4">
            Volume Total (Litres)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={volumeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {volumeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
                formatter={(value: number | undefined) => value ? `${(value / 1000000).toFixed(2)}M L` : '0M L'}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Stats Table */}
      <div className="mt-4 sm:mt-6 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-slate-700">Spécialité</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-slate-700">Prat.</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-slate-700">KOL</th>
              <th className="hidden sm:table-cell px-4 py-3 text-center font-semibold text-slate-700">Volume Total</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-slate-700">Moy.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr className="hover:bg-al-blue-50/50 transition-colors">
              <td className="px-2 sm:px-4 py-2 sm:py-3">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-al-blue-500 flex-shrink-0"></div>
                  <span className="font-medium text-slate-800 text-xs sm:text-sm">Pneumologues</span>
                </div>
              </td>
              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-slate-800">{pneumologues.length}</td>
              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-100 text-amber-800">
                  {pneumoKOL}
                </span>
              </td>
              <td className="hidden sm:table-cell px-4 py-3 text-center font-semibold text-al-blue-600">
                {(pneumoVolume / 1000000).toFixed(2)}M L
              </td>
              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-slate-600">
                {pneumologues.length > 0 ? (pneumoVolume / pneumologues.length / 1000).toFixed(0) : '0'}K
              </td>
            </tr>
            <tr className="hover:bg-al-teal/10 transition-colors">
              <td className="px-2 sm:px-4 py-2 sm:py-3">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-al-teal flex-shrink-0"></div>
                  <span className="font-medium text-slate-800 text-xs sm:text-sm">Médecins généralistes</span>
                </div>
              </td>
              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-slate-800">{generalistes.length}</td>
              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-100 text-amber-800">
                  {genKOL}
                </span>
              </td>
              <td className="hidden sm:table-cell px-4 py-3 text-center font-semibold text-al-teal">
                {(genVolume / 1000000).toFixed(2)}M L
              </td>
              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-slate-600">
                {generalistes.length > 0 ? (genVolume / generalistes.length / 1000).toFixed(0) : '0'}K
              </td>
            </tr>
            <tr className="bg-slate-50 font-semibold">
              <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-800">Total</td>
              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-slate-800">{practitioners.length}</td>
              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-200 text-amber-900">
                  {pneumoKOL + genKOL}
                </span>
              </td>
              <td className="hidden sm:table-cell px-4 py-3 text-center text-slate-800">
                {((pneumoVolume + genVolume) / 1000000).toFixed(2)}M L
              </td>
              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-slate-600">
                {practitioners.length > 0
                  ? ((pneumoVolume + genVolume) / practitioners.length / 1000).toFixed(0)
                  : '0'}K
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Key insight */}
      <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gradient-to-r from-al-navy/5 to-al-blue-500/5 rounded-lg border border-al-blue-200">
        <div className="flex items-start space-x-2 sm:space-x-3">
          <Users2 className="w-4 h-4 sm:w-5 sm:h-5 text-al-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-800">Insight clé</p>
            <p className="text-[10px] sm:text-xs text-slate-600 mt-1">
              Les pneumologues représentent {((pneumologues.length / practitioners.length) * 100).toFixed(1)}%
              des praticiens mais génèrent {((pneumoVolume / (pneumoVolume + genVolume)) * 100).toFixed(1)}%
              du volume total - un ratio de {(pneumoVolume / pneumologues.length / (genVolume / generalistes.length)).toFixed(1)}x
              supérieur aux généralistes.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
