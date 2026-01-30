import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const AIInsights: React.FC = () => {
  const { insights } = useAppStore();
  const navigate = useNavigate();

  const priorityColors = {
    high: 'danger' as const,
    medium: 'warning' as const,
    low: 'info' as const,
  };

  const typeIcons = {
    opportunity: '🎯',
    alert: '⚠️',
    reminder: '📅',
    achievement: '🏆',
  };

  const handleAction = (insight: typeof insights[0]) => {
    if (insight.actionLabel === 'Préparer visite' && insight.practitionerId) {
      // Navigate to pitch generator for this practitioner
      navigate(`/pitch?practitionerId=${insight.practitionerId}`);
    } else if (insight.practitionerId) {
      // Navigate to practitioner profile
      navigate(`/practitioner/${insight.practitionerId}`);
    } else if (insight.actionLabel === 'Planifier visites') {
      // Navigate to KOL planning page
      navigate('/kol-planning');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
          <span>🤖</span>
          <span>ARIA recommande aujourd'hui</span>
        </h2>
      </div>

      <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="min-w-[320px] glass-card p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-default"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{typeIcons[insight.type]}</span>
              <Badge variant={priorityColors[insight.priority]} size="sm">
                {insight.priority}
              </Badge>
            </div>

            <h3 className="font-bold text-slate-800 mb-2">{insight.title}</h3>
            <p className="text-sm text-slate-600 mb-4 line-clamp-3">{insight.message}</p>

            {insight.actionLabel && (
              <Button
                variant="secondary"
                size="sm"
                className="w-full cursor-pointer"
                onClick={() => handleAction(insight)}
              >
                {insight.actionLabel}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
