import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../../stores/useAppStore';

export const PerformanceChart: React.FC = () => {
  const { performanceData } = useAppStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="glass-card p-6"
    >
      <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center space-x-2">
        <span>📈</span>
        <span>Évolution des volumes (12 mois)</span>
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={performanceData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="month"
            stroke="#64748b"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value: number | undefined) => value ? [`${(value / 1000).toFixed(0)}K L`, ''] : ['', '']}
          />
          <Legend
            wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
          />
          <Line
            type="monotone"
            dataKey="yourVolume"
            stroke="#0066B3"
            strokeWidth={3}
            dot={{ fill: '#0066B3', r: 4 }}
            activeDot={{ r: 6 }}
            name="Vos volumes"
          />
          <Line
            type="monotone"
            dataKey="objective"
            stroke="#F59E0B"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Objectif"
          />
          <Line
            type="monotone"
            dataKey="teamAverage"
            stroke="#00B5AD"
            strokeWidth={2}
            strokeDasharray="3 3"
            dot={false}
            name="Moyenne équipe"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-sm text-slate-600 mb-1">Volume annuel</p>
          <p className="text-2xl font-bold text-slate-800">
            {(performanceData.reduce((acc, d) => acc + d.yourVolume, 0) / 1000000).toFixed(1)}M L
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-600 mb-1">Vs Objectif</p>
          <p className="text-2xl font-bold text-success">+12%</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-600 mb-1">Vs Équipe</p>
          <p className="text-2xl font-bold text-al-blue-500">+8%</p>
        </div>
      </div>
    </motion.div>
  );
};
