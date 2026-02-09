import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, User, Filter, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { format, addDays, isSameDay, startOfWeek, addWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import { PeriodSelector } from '../components/shared/PeriodSelector';
import { filterVisitsByPeriod } from '../services/metricsCalculator';

type FilterType = 'all' | 'today' | 'week' | 'month';

export const Visits: React.FC = () => {
  const navigate = useNavigate();
  const { upcomingVisits, practitioners } = useAppStore();
  const { timePeriod } = useTimePeriod();
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Filter visits by time period first
  const periodFilteredVisits = useMemo(() => {
    return filterVisitsByPeriod(upcomingVisits, timePeriod);
  }, [upcomingVisits, timePeriod]);

  // Filter visits based on the selected filter type
  const filteredVisits = periodFilteredVisits.filter((visit) => {
    const visitDate = new Date(visit.date);
    const today = new Date();

    if (selectedDate && !isSameDay(visitDate, selectedDate)) {
      return false;
    }

    switch (filterType) {
      case 'today':
        return isSameDay(visitDate, today);
      case 'week':
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = addWeeks(weekStart, 1);
        return visitDate >= weekStart && visitDate < weekEnd;
      case 'month':
        return (
          visitDate.getMonth() === today.getMonth() &&
          visitDate.getFullYear() === today.getFullYear()
        );
      default:
        return true;
    }
  });

  // Group visits by date
  const visitsByDate = filteredVisits.reduce((acc, visit) => {
    const dateKey = format(new Date(visit.date), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(visit);
    return acc;
  }, {} as Record<string, typeof upcomingVisits>);

  const sortedDates = Object.keys(visitsByDate).sort();

  // Generate week days for quick filter
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
    return date;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
          Mes Visites
        </h1>
        <p className="text-slate-600">
          Gérez et planifiez vos visites médicales
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Toutes' },
              { key: 'today', label: "Aujourd'hui" },
              { key: 'week', label: 'Cette semaine' },
              { key: 'month', label: 'Ce mois' },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => {
                  setFilterType(filter.key as FilterType);
                  setSelectedDate(null);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterType === filter.key
                    ? 'bg-gradient-to-r from-airLiquide-primary to-airLiquide-teal text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <PeriodSelector />
          </div>
        </div>

        {/* Week Day Quick Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {weekDays.map((day, index) => {
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const dayVisits = periodFilteredVisits.filter((v) =>
              isSameDay(new Date(v.date), day)
            );

            return (
              <button
                key={index}
                onClick={() => {
                  setSelectedDate(isSelected ? null : day);
                  setFilterType('all');
                }}
                className={`flex flex-col items-center min-w-[80px] p-3 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-gradient-to-br from-airLiquide-primary to-airLiquide-teal text-white shadow-lg scale-105'
                    : isToday
                    ? 'bg-airLiquide-lightBlue/20 border-2 border-airLiquide-primary'
                    : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <span className={`text-xs font-medium mb-1 ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                  {format(day, 'EEE', { locale: fr })}
                </span>
                <span className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                  {format(day, 'd')}
                </span>
                {dayVisits.length > 0 && (
                  <span
                    className={`text-xs mt-1 px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-airLiquide-primary/20 text-airLiquide-primary'
                    }`}
                  >
                    {dayVisits.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visits List */}
      <div className="space-y-6">
        {sortedDates.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Aucune visite planifiée
            </h3>
            <p className="text-slate-600 mb-6">
              Commencez par planifier vos premières visites
            </p>
            <Button onClick={() => navigate('/practitioners')}>
              Voir les praticiens
            </Button>
          </div>
        ) : (
          sortedDates.map((dateKey, dateIndex) => {
            const date = new Date(dateKey);
            const dayVisits = visitsByDate[dateKey];

            return (
              <motion.div
                key={dateKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: dateIndex * 0.1 }}
                className="space-y-3"
              >
                {/* Date Header */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Calendar className="w-5 h-5" />
                    <h2 className="text-xl font-bold">
                      {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
                    </h2>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                  <Badge variant="info" size="sm">
                    {dayVisits.length} visite{dayVisits.length > 1 ? 's' : ''}
                  </Badge>
                </div>

                {/* Visits for this date */}
                <div className="grid gap-3">
                  {dayVisits.map((visit, visitIndex) => {
                    const practitioner = practitioners.find(
                      (p) => p.id === visit.practitioner.id
                    );

                    return (
                      <motion.div
                        key={visit.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: visitIndex * 0.05 }}
                        onClick={() => navigate(`/practitioner/${visit.practitioner.id}`)}
                        className="glass-card p-4 hover:shadow-xl transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${
                            visit.practitioner.isKOL ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                            visit.practitioner.specialty === 'Pneumologue' ? 'bg-gradient-to-br from-al-blue-500 to-al-blue-600' :
                            'bg-gradient-to-br from-slate-500 to-slate-600'
                          }`}>
                            {visit.practitioner.firstName[0]}{visit.practitioner.lastName[0]}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-slate-800 text-lg">
                                {visit.practitioner.title} {visit.practitioner.lastName}
                              </h3>
                              {visit.practitioner.isKOL && (
                                <Badge variant="warning" size="sm">
                                  KOL
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                {visit.time}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                {visit.practitioner.city}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <User className="w-4 h-4" />
                                {visit.practitioner.specialty}
                              </span>
                            </div>

                            {practitioner && (
                              <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                                <span>Vingtile {practitioner.vingtile}</span>
                                <span>•</span>
                                <span>{(practitioner.volumeL / 1000).toFixed(0)}K L/an</span>
                                <span>•</span>
                                <span>Fidélité {practitioner.loyaltyScore}/10</span>
                              </div>
                            )}
                          </div>

                          <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-airLiquide-primary group-hover:translate-x-1 transition-all" />
                        </div>

                        {visit.notes && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <p className="text-sm text-slate-600">
                              <span className="font-medium">Notes:</span> {visit.notes}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Stats Footer */}
      {filteredVisits.length > 0 && (
        <div className="glass-card p-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text mb-1">
                {filteredVisits.length}
              </div>
              <div className="text-sm text-slate-600">
                Visite{filteredVisits.length > 1 ? 's' : ''} planifiée{filteredVisits.length > 1 ? 's' : ''}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text mb-1">
                {new Set(filteredVisits.map((v) => v.practitioner.id)).size}
              </div>
              <div className="text-sm text-slate-600">Praticiens différents</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text mb-1">
                {filteredVisits.filter((v) => v.practitioner.isKOL).length}
              </div>
              <div className="text-sm text-slate-600">Visites KOL</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
