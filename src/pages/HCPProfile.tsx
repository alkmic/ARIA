import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Filter, MapPin, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { FilterPanel } from '../components/practitioners/FilterPanel';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import { PeriodSelector } from '../components/shared/PeriodSelector';
import { getTopPractitioners } from '../services/metricsCalculator';
import { useTranslation } from '../i18n';
import { localizeSpecialty, localizeAiSummary } from '../utils/localizeData';
import type { FilterOptions } from '../types';

export const HCPProfile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { filterPractitioners, searchQuery } = useAppStore();
  const { timePeriod, periodLabel } = useTimePeriod();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const { t } = useTranslation();

  // Handle ?filter=priority query param
  useEffect(() => {
    if (searchParams.get('filter') === 'priority') {
      setFilters({
        riskLevel: ['high'],
      });
    }
  }, [searchParams]);

  const practitioners = filterPractitioners(filters);

  // Get top practitioners for the selected period
  const topPractitioners = getTopPractitioners(practitioners, timePeriod, 10);
  const topPractitionerIds = new Set(topPractitioners.map(p => p.id));

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">{t('practitioners.title')}</h1>
            <p className="text-slate-600">
              {t('practitioners.countInPortfolio', { count: practitioners.length })}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <PeriodSelector size="sm" />
            <button
              onClick={() => setIsFilterOpen(true)}
              className="btn-primary flex items-center space-x-2 cursor-pointer"
            >
              <Filter className="w-5 h-5" />
              <span>{t('practitioners.filters')}</span>
              {(filters.specialty?.length || 0) +
                (filters.vingtile?.length || 0) +
                (filters.riskLevel?.length || 0) +
                (filters.isKOL !== undefined ? 1 : 0) >
                0 && (
                <span className="ml-2 bg-white text-al-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                  {(filters.specialty?.length || 0) +
                    (filters.vingtile?.length || 0) +
                    (filters.riskLevel?.length || 0) +
                    (filters.isKOL !== undefined ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Period Indicator */}
        <div className="glass-card px-4 py-2 inline-block">
          <p className="text-sm font-medium text-slate-700">
            <span className="text-al-blue-600">{t('practitioners.topPractitioners')}</span> {periodLabel}
          </p>
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Practitioners Grid - RESPONSIVE */}
      {practitioners.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-gray-600">
            {searchQuery
              ? t('practitioners.noPractitionerFound', { query: searchQuery })
              : t('practitioners.noPractitionerInPortfolio')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {practitioners.map((practitioner, index) => (
          <motion.div
            key={practitioner.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.03 }}
          >
            <Card hover className="cursor-pointer group" onClick={() => navigate(`/practitioner/${practitioner.id}`)}>
              <div className="flex items-start space-x-4">
                {/* Initials instead of Avatar */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                  practitioner.isKOL ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                  practitioner.specialty === 'Pneumologue' ? 'bg-gradient-to-br from-al-blue-500 to-al-blue-600' :
                  'bg-gradient-to-br from-slate-500 to-slate-600'
                }`}>
                  {practitioner.firstName[0]}{practitioner.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <h3 className="font-bold text-slate-800 truncate">
                      {practitioner.title} {practitioner.lastName}
                    </h3>
                    {topPractitionerIds.has(practitioner.id) && (
                      <Badge variant="success" size="sm">Top {periodLabel}</Badge>
                    )}
                    {practitioner.isKOL && (
                      <Badge variant="warning" size="sm">KOL</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{localizeSpecialty(practitioner.specialty)}</p>

                  <div className="flex items-center flex-wrap gap-3 text-xs text-slate-500 mb-2">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{practitioner.city}</span>
                    </span>
                    <span>Vingtile {practitioner.vingtile}</span>
                  </div>

                  <div className="flex items-center flex-wrap gap-2">
                    <div className={`flex items-center space-x-1 text-xs font-semibold ${
                      practitioner.trend === 'up' ? 'text-success' :
                      practitioner.trend === 'down' ? 'text-danger' : 'text-slate-500'
                    }`}>
                      {getTrendIcon(practitioner.trend)}
                      <span>{(practitioner.volumeL / 1000).toFixed(0)}{t('visits.perYear')}</span>
                    </div>
                    <Badge
                      variant={practitioner.riskLevel === 'high' ? 'danger' : practitioner.riskLevel === 'medium' ? 'warning' : 'default'}
                      size="sm"
                    >
                      {practitioner.riskLevel === 'high' ? t('common.risk.high') : practitioner.riskLevel === 'medium' ? t('common.risk.medium') : t('common.risk.low')}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-600 line-clamp-2 flex-1">
                  {localizeAiSummary(practitioner.aiSummary)}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/pitch?practitionerId=${practitioner.id}`);
                  }}
                  className="ml-3 p-2 rounded-lg bg-al-blue-50 text-al-blue-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-al-blue-100"
                  title={t('practitioners.generatePitch')}
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </Card>
          </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
