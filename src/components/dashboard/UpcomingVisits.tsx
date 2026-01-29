import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export const UpcomingVisits: React.FC = () => {
  const { getTodayVisits, getHighPriorityPractitioners } = useAppStore();
  const todayVisits = getTodayVisits();
  const priorityPractitioners = getHighPriorityPractitioners();

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Today's Visits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center space-x-2">
          <span>📅</span>
          <span>Visites aujourd'hui</span>
        </h2>

        <div className="space-y-4">
          {todayVisits.length > 0 ? (
            todayVisits.map((visit, index) => (
              <motion.div
                key={visit.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                className="flex items-start space-x-3 p-3 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Avatar
                  src={visit.practitioner.avatarUrl}
                  alt={`${visit.practitioner.firstName} ${visit.practitioner.lastName}`}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-semibold text-slate-800 truncate">
                      {visit.practitioner.title} {visit.practitioner.lastName}
                    </p>
                    {visit.practitioner.isKOL && (
                      <Badge variant="warning" size="sm">KOL</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-slate-600">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{visit.time}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{visit.practitioner.city}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {visit.practitioner.specialty}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">
              Aucune visite prévue aujourd'hui
            </p>
          )}

          {todayVisits.length > 0 && (
            <Button variant="ghost" size="sm" className="w-full">
              Voir toutes les visites
            </Button>
          )}
        </div>
      </motion.div>

      {/* Priority Practitioners */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center space-x-2">
          <span>🔥</span>
          <span>Praticiens prioritaires</span>
        </h2>

        <div className="space-y-4">
          {priorityPractitioners.slice(0, 3).map((practitioner, index) => {
            const daysSinceVisit = practitioner.lastVisitDate
              ? Math.floor(
                  (new Date().getTime() - new Date(practitioner.lastVisitDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 999;

            return (
              <motion.div
                key={practitioner.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                className="flex items-start space-x-3 p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <Avatar
                  src={practitioner.avatarUrl}
                  alt={`${practitioner.firstName} ${practitioner.lastName}`}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-semibold text-slate-800 truncate">
                      {practitioner.title} {practitioner.lastName}
                    </p>
                    {practitioner.isKOL && (
                      <Badge variant="warning" size="sm">KOL</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mb-1">
                    {practitioner.specialty} • Vingtile {practitioner.vingtile} • {(practitioner.volumeL / 1000).toFixed(0)}K L
                  </p>
                  <p className="text-xs text-danger font-medium">
                    ⚠️ Non vu depuis {daysSinceVisit} jours
                  </p>
                </div>
              </motion.div>
            );
          })}

          <Button variant="ghost" size="sm" className="w-full">
            Voir tous les prioritaires
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
