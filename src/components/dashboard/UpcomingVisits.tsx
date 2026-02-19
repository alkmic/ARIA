import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useTranslation } from '../../i18n';
import { localizeSpecialty } from '../../utils/localizeData';

export const UpcomingVisits: React.FC = () => {
  const navigate = useNavigate();
  const { getTodayVisits, getHighPriorityPractitioners } = useAppStore();
  const todayVisits = getTodayVisits();
  const priorityPractitioners = getHighPriorityPractitioners();
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Today's Visits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          {t('dashboard.visitsToday')}
        </h2>

        <div className="space-y-4">
          {todayVisits.length > 0 ? (
            todayVisits.map((visit, index) => (
              <motion.div
                key={visit.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                onClick={() => navigate(`/practitioner/${visit.practitioner.id}`)}
                className="flex items-start space-x-3 p-3 hover:bg-slate-50 rounded-lg transition-colors duration-200 cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  visit.practitioner.isKOL ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                  visit.practitioner.specialty === 'Pneumologue' ? 'bg-gradient-to-br from-al-blue-500 to-al-blue-600' :
                  'bg-gradient-to-br from-slate-500 to-slate-600'
                }`}>
                  {visit.practitioner.firstName[0]}{visit.practitioner.lastName[0]}
                </div>
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
                    {localizeSpecialty(visit.practitioner.specialty)}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">
              {t('dashboard.noVisitsToday')}
            </p>
          )}

          {todayVisits.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full cursor-pointer"
              onClick={() => navigate('/visits')}
            >
              {t('dashboard.seeAllVisits')}
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
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          {t('dashboard.priorityPractitioners')}
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
                onClick={() => navigate(`/practitioner/${practitioner.id}`)}
                className="flex items-start space-x-3 p-3 hover:bg-slate-50 rounded-lg transition-colors duration-200 cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  practitioner.isKOL ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                  practitioner.specialty === 'Pneumologue' ? 'bg-gradient-to-br from-al-blue-500 to-al-blue-600' :
                  'bg-gradient-to-br from-slate-500 to-slate-600'
                }`}>
                  {practitioner.firstName[0]}{practitioner.lastName[0]}
                </div>
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
                    {localizeSpecialty(practitioner.specialty)} &bull; {t('common.vingtile')} {practitioner.vingtile} &bull; {(practitioner.volumeL / 1000).toFixed(0)}K L
                  </p>
                  <p className="text-xs text-danger font-medium">
                    {t('dashboard.notSeenSince', { days: daysSinceVisit })}
                  </p>
                </div>
              </motion.div>
            );
          })}

          <Button
            variant="ghost"
            size="sm"
            className="w-full cursor-pointer"
            onClick={() => navigate('/practitioners?filter=priority')}
          >
            {t('dashboard.seeAllPriority')}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
