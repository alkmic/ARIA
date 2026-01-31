import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTimePeriod } from '../../contexts/TimePeriodContext';
import { getPerformanceDataForPeriod } from '../../services/metricsCalculator';

export const PerformanceChart: React.FC = () => {
  const { timePeriod, periodLabelShort } = useTimePeriod();

  // Get performance data for the selected period
  const performanceData = useMemo(() => {
    return getPerformanceDataForPeriod(timePeriod);
  }, [timePeriod]);

  // Calculate total volume for the period
  const periodVolume = useMemo(() => {
    return performanceData.reduce((acc, d) => acc + d.yourVolume, 0);
  }, [performanceData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
          <span>📈</span>
          <span>Performance {periodLabelShort}</span>
        </h2>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-al-blue-500" />
            <span className="text-slate-600">Vos volumes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-slate-600">Objectif</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-400" />
            <span className="text-slate-600">Moyenne équipe</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={performanceData}>
          <defs>
            <linearGradient id="colorVolumes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0066B3" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0066B3" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}
            formatter={(value: number | undefined) => value ? [`${(value / 1000).toFixed(0)}K L`, ''] : ['', '']}
          />
          <Area
            type="monotone"
            dataKey="yourVolume"
            stroke="#0066B3"
            strokeWidth={3}
            fill="url(#colorVolumes)"
            name="Vos volumes"
          />
          <Area
            type="monotone"
            dataKey="objective"
            stroke="#10B981"
            strokeWidth={2}
            strokeDasharray="8 4"
            fill="none"
            name="Objectif"
          />
          <Area
            type="monotone"
            dataKey="teamAverage"
            stroke="#94A3B8"
            strokeWidth={2}
            strokeDasharray="4 4"
            fill="none"
            name="Moyenne équipe"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-sm text-slate-600 mb-1">Volume {timePeriod === 'month' ? 'mensuel' : timePeriod === 'quarter' ? 'trimestriel' : 'annuel'}</p>
          <p className="text-2xl font-bold text-slate-800">
            {(periodVolume / 1000000).toFixed(1)}M L
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
