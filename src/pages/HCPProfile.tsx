import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Filter, MapPin, TrendingUp } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { FilterPanel } from '../components/practitioners/FilterPanel';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import { PeriodSelector } from '../components/shared/PeriodSelector';
import { getTopPractitioners } from '../services/metricsCalculator';
import type { FilterOptions } from '../types';

export const HCPProfile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { filterPractitioners, searchQuery } = useAppStore();
  const { timePeriod, periodLabel } = useTimePeriod();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});

  // Handle ?filter=priority query param
  useEffect(() => {
    if (searchParams.get('filter') === 'priority') {
      // Show high priority practitioners (high risk level or KOL)
      setFilters({
        riskLevel: ['high'],
      });
    }
  }, [searchParams]);

  const practitioners = filterPractitioners(filters);

  // Get top practitioners for the selected period
  const topPractitioners = getTopPractitioners(practitioners, timePeriod, 10);
  const topPractitionerIds = new Set(topPractitioners.map(p => p.id));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Praticiens</h1>
            <p className="text-slate-600">
              {practitioners.length} praticiens dans votre portefeuille
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <PeriodSelector size="sm" />
            <button
              onClick={() => setIsFilterOpen(true)}
              className="btn-primary flex items-center space-x-2 cursor-pointer"
            >
              <Filter className="w-5 h-5" />
              <span>Filtres</span>
              {(filters.specialty?.length || 0) +
                (filters.vingtile?.length || 0) +
                (filters.riskLevel?.length || 0) +
                (filters.isKOL !== undefined ? 1 : 0) >
                0 && (
                <span className="ml-2 bg-white text-airLiquide-primary px-2 py-0.5 rounded-full text-xs font-bold">
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
            <span className="text-airLiquide-primary">Top praticiens</span> {periodLabel}
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

      {/* Practitioners Grid */}
      {practitioners.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-gray-600">
            {searchQuery
              ? `Aucun praticien trouvé pour "${searchQuery}"`
              : 'Aucun praticien dans votre portefeuille'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {practitioners.map((practitioner, index) => (
          <motion.div
            key={practitioner.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card hover className="cursor-pointer" onClick={() => navigate(`/practitioner/${practitioner.id}`)}>
              <div className="flex items-start space-x-4">
                <Avatar
                  src={practitioner.avatarUrl}
                  alt={`${practitioner.firstName} ${practitioner.lastName}`}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
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
                  <p className="text-sm text-slate-600 mb-2">{practitioner.specialty}</p>

                  <div className="flex items-center space-x-3 text-xs text-slate-500 mb-2">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{practitioner.city}</span>
                    </span>
                    <span>Vingtile {practitioner.vingtile}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-1 text-xs font-semibold ${
                      practitioner.trend === 'up' ? 'text-success' :
                      practitioner.trend === 'down' ? 'text-danger' : 'text-slate-500'
                    }`}>
                      <TrendingUp className="w-3 h-3" />
                      <span>{(practitioner.volumeL / 1000).toFixed(0)}K L/an</span>
                    </div>
                    <Badge
                      variant={practitioner.riskLevel === 'high' ? 'danger' : 'default'}
                      size="sm"
                    >
                      {practitioner.riskLevel}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-600 line-clamp-2">
                  {practitioner.aiSummary}
                </p>
              </div>
            </Card>
          </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
