import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AnimatedStatCardProps {
  icon: LucideIcon;
  iconBgColor: string;
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  trend?: number; // pourcentage de variation
  trendLabel?: string;
  delay?: number;
}

export function AnimatedStatCard({
  icon: Icon,
  iconBgColor,
  label,
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  trend,
  trendLabel,
  delay = 0,
}: AnimatedStatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 1500; // ms
      const startTime = Date.now();
      const startValue = 0;

      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime - (delay * 1000);
        if (elapsed < 0) return;

        const progress = Math.min(elapsed / duration, 1);
        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = startValue + (value - startValue) * easeOut;

        setDisplayValue(current);

        if (progress >= 1) {
          clearInterval(timer);
          setDisplayValue(value);
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [isInView, value, delay]);

  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const trendColor = trend && trend > 0 ? 'text-green-500' : trend && trend < 0 ? 'text-red-500' : 'text-slate-400';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="glass-card p-3 sm:p-4 hover:shadow-lg transition-shadow duration-300"
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`p-1.5 sm:p-2 rounded-lg ${iconBgColor}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{trend > 0 ? '+' : ''}{trend}%</span>
          </div>
        )}
      </div>

      <div className="mb-0.5">
        <span className="text-xl sm:text-2xl font-bold text-al-navy">
          {prefix}{displayValue.toFixed(decimals)}{suffix}
        </span>
      </div>

      <p className="text-xs sm:text-sm text-slate-500 leading-tight">{label}</p>

      {trendLabel && (
        <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{trendLabel}</p>
      )}
    </motion.div>
  );
}
