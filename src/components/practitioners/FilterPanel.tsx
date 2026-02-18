import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter } from 'lucide-react';
import type { FilterOptions, PracticeType } from '../../types';
import { useTranslation } from '../../i18n';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

export function FilterPanel({ isOpen, onClose, filters, onFilterChange }: FilterPanelProps) {
  const { t } = useTranslation();

  const handleSpecialtyChange = (specialty: 'Médecin généraliste' | 'Pneumologue') => {
    const currentSpecialties = filters.specialty || [];
    const newSpecialties = currentSpecialties.includes(specialty)
      ? currentSpecialties.filter((s) => s !== specialty)
      : [...currentSpecialties, specialty];

    onFilterChange({ ...filters, specialty: newSpecialties });
  };

  const handlePracticeTypeChange = (type: PracticeType) => {
    const current = filters.practiceType || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];

    onFilterChange({ ...filters, practiceType: updated });
  };

  const handleVingtileChange = (vingtile: number) => {
    const currentVingtiles = filters.vingtile || [];
    const newVingtiles = currentVingtiles.includes(vingtile)
      ? currentVingtiles.filter((v) => v !== vingtile)
      : [...currentVingtiles, vingtile];

    onFilterChange({ ...filters, vingtile: newVingtiles });
  };

  const handleRiskLevelChange = (riskLevel: 'low' | 'medium' | 'high') => {
    const currentRisks = filters.riskLevel || [];
    const newRisks = currentRisks.includes(riskLevel)
      ? currentRisks.filter((r) => r !== riskLevel)
      : [...currentRisks, riskLevel];

    onFilterChange({ ...filters, riskLevel: newRisks });
  };

  const handleIsKOLChange = (value: boolean | undefined) => {
    onFilterChange({ ...filters, isKOL: value });
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const activeFilterCount =
    (filters.specialty?.length || 0) +
    (filters.practiceType?.length || 0) +
    (filters.vingtile?.length || 0) +
    (filters.riskLevel?.length || 0) +
    (filters.isKOL !== undefined ? 1 : 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />

          {/* Panel - Responsive positioning */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-80 bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-al-blue-500 to-al-teal flex items-center justify-center">
                    <Filter className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{t('practitioners.filterPanel.title')}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              {activeFilterCount > 0 && (
                <p className="text-sm text-gray-600">
                  {t('practitioners.filterPanel.activeFilters', { count: activeFilterCount, plural: activeFilterCount > 1 ? 's' : '' })}
                </p>
              )}
            </div>

            {/* Filters */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Specialty */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('practitioners.filterPanel.specialty')}</h3>
                <div className="space-y-2">
                  {([
                    { value: 'Pneumologue' as const, labelKey: 'common.specialty.pneumologue' },
                    { value: 'Médecin généraliste' as const, labelKey: 'common.specialty.generaliste' },
                  ]).map(({ value, labelKey }) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.specialty?.includes(value) || false}
                        onChange={() => handleSpecialtyChange(value)}
                        className="w-4 h-4 text-al-blue-500 rounded focus:ring-2 focus:ring-al-blue-500"
                      />
                      <span className="text-sm text-gray-700">{t(labelKey)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Practice type */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('practitioners.filterPanel.practiceType')}</h3>
                <div className="space-y-2">
                  {([
                    { value: 'ville' as PracticeType, labelKey: 'practitioners.filterPanel.cityPractitioner' },
                    { value: 'hospitalier' as PracticeType, labelKey: 'practitioners.filterPanel.hospitalPractitioner' },
                    { value: 'mixte' as PracticeType, labelKey: 'practitioners.filterPanel.mixedPractitioner' },
                  ]).map(({ value, labelKey }) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.practiceType?.includes(value) || false}
                        onChange={() => handlePracticeTypeChange(value)}
                        className="w-4 h-4 text-al-blue-500 rounded focus:ring-2 focus:ring-al-blue-500"
                      />
                      <span className="text-sm text-gray-700">{t(labelKey)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vingtile */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('practitioners.filterPanel.vingtilePotential')}</h3>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((vingtile) => (
                    <label
                      key={vingtile}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.vingtile?.includes(vingtile) || false}
                        onChange={() => handleVingtileChange(vingtile)}
                        className="w-4 h-4 text-al-blue-500 rounded focus:ring-2 focus:ring-al-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {vingtile === 1
                          ? t('practitioners.filterPanel.vingtileTop5', { v: vingtile })
                          : `${t('common.vingtile')} ${vingtile}`
                        }
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Risk level */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('practitioners.filterPanel.riskLevel')}</h3>
                <div className="space-y-2">
                  {([
                    { value: 'low' as const, labelKey: 'common.risk.low' },
                    { value: 'medium' as const, labelKey: 'common.risk.medium' },
                    { value: 'high' as const, labelKey: 'common.risk.high' },
                  ]).map(({ value, labelKey }) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.riskLevel?.includes(value) || false}
                        onChange={() => handleRiskLevelChange(value)}
                        className="w-4 h-4 text-al-blue-500 rounded focus:ring-2 focus:ring-al-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {t(labelKey)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* KOL */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('practitioners.filterPanel.practitionerType')}</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <input
                      type="radio"
                      checked={filters.isKOL === undefined}
                      onChange={() => handleIsKOLChange(undefined)}
                      className="w-4 h-4 text-al-blue-500 focus:ring-2 focus:ring-al-blue-500"
                    />
                    <span className="text-sm text-gray-700">{t('practitioners.filterPanel.allTypes')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <input
                      type="radio"
                      checked={filters.isKOL === true}
                      onChange={() => handleIsKOLChange(true)}
                      className="w-4 h-4 text-al-blue-500 focus:ring-2 focus:ring-al-blue-500"
                    />
                    <span className="text-sm text-gray-700">{t('practitioners.filterPanel.kolOnly')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <input
                      type="radio"
                      checked={filters.isKOL === false}
                      onChange={() => handleIsKOLChange(false)}
                      className="w-4 h-4 text-al-blue-500 focus:ring-2 focus:ring-al-blue-500"
                    />
                    <span className="text-sm text-gray-700">{t('practitioners.filterPanel.nonKolOnly')}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 space-y-2">
              <button
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
                className="w-full py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('practitioners.filterPanel.resetFilters')}
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-sm bg-al-blue-500 text-white hover:bg-al-blue-600 rounded-lg transition-colors font-medium"
              >
                {t('practitioners.filterPanel.applyCount', { count: activeFilterCount })}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
