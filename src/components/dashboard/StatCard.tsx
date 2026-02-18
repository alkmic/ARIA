import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { AnimatedNumber } from '../shared/AnimatedNumber';
interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  total?: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  suffix?: string;
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  total,
  trend,
  suffix = '',
  delay = 0,
}) => {
  const percentage = total ? Math.round((value / total) * 100) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="stat-card"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-gradient-to-br from-al-blue-500 to-al-sky rounded-xl">
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 text-sm font-semibold ${
            trend.isPositive ? 'text-success' : 'text-danger'
          }`}>
            <span>{trend.isPositive ? '↗' : '↘'}</span>
            <span>+{trend.value}%</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-slate-600 text-sm font-medium">{label}</p>
        <div className="flex items-baseline space-x-2">
          <h3 className="text-3xl font-bold text-slate-800">
            <AnimatedNumber value={value} />
            {total && <span className="text-slate-400">/{total}</span>}
          </h3>
          {suffix && <span className="text-lg text-slate-500">{suffix}</span>}
        </div>
        {percentage !== null && (
          <div className="flex items-center space-x-2">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, delay: delay + 0.3 }}
                className="h-full bg-gradient-to-r from-al-blue-500 to-al-sky"
              />
            </div>
            <span className="text-sm font-semibold text-al-blue-500">
              {percentage}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
