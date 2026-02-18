import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useTranslation } from '../../i18n';

export const NationalStats: React.FC = () => {
  const { practitioners } = useAppStore();
  const { t } = useTranslation();

  // Calculate statistics based on actual data
  const pneumologues = practitioners.filter(p => p.specialty === 'Pneumologue');
  const medecinsGeneralistes = practitioners.filter(p => p.specialty === 'Médecin généraliste');

  // National statistics (from user's data)
  const nationalStats = {
    medecinsGeneralistes: 64291,
    pneumologues: 2008,
    total: 66299,
    patientsOxygene: 100000,
    volumeMoyenPatient: 760, // litres par an
    percentageKOL: 0.24
  };

  // Territory stats (our current data subset)
  const territoryStats = {
    medecinsGeneralistes: medecinsGeneralistes.length,
    pneumologues: pneumologues.length,
    total: practitioners.length,
    kolCount: practitioners.filter(p => p.isKOL).length
  };

  const totalVolumeTerritory = practitioners.reduce((sum, p) => sum + p.volumeL, 0);
  const avgVolumePerPractitioner = Math.round(totalVolumeTerritory / practitioners.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card p-3 sm:p-4"
    >
      <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center space-x-2">
        <Users className="w-4 h-4 text-al-blue-500" />
        <span>{t('dashboard.nationalStats')}</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* National Stats */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200 pb-1.5">
            {t('dashboard.nationalFrance')}
          </h3>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">{t('dashboard.generalPractitioners')}</span>
              <span className="text-sm font-bold text-slate-800">{nationalStats.medecinsGeneralistes.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">{t('dashboard.pneumologists')}</span>
              <span className="text-sm font-bold text-slate-800">{nationalStats.pneumologues.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-200 pt-1.5">
              <span className="text-xs font-semibold text-slate-700">{t('dashboard.totalGeneral')}</span>
              <span className="text-base font-bold text-al-blue-500">{nationalStats.total.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-2 p-2 bg-gradient-to-br from-al-blue-50 to-al-sky/10 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">{t('dashboard.patientsO2')}</span>
              <span className="text-xs font-bold text-al-blue-600">{nationalStats.patientsOxygene.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">{t('dashboard.avgVolumePatient')}</span>
              <span className="text-xs font-bold text-al-blue-600">{nationalStats.volumeMoyenPatient} L</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">{t('dashboard.pctKol')}</span>
              <span className="text-xs font-bold text-al-blue-600">{nationalStats.percentageKOL}%</span>
            </div>
          </div>
        </div>

        {/* Territory Stats */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200 pb-1.5">
            {t('dashboard.yourTerritory')}
          </h3>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">{t('dashboard.generalPractitioners')}</span>
              <span className="text-sm font-bold text-slate-800">{territoryStats.medecinsGeneralistes}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">{t('dashboard.pneumologists')}</span>
              <span className="text-sm font-bold text-slate-800">{territoryStats.pneumologues}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-200 pt-1.5">
              <span className="text-xs font-semibold text-slate-700">{t('dashboard.totalTerritory')}</span>
              <span className="text-base font-bold text-al-teal">{territoryStats.total}</span>
            </div>
          </div>

          <div className="mt-2 p-2 bg-gradient-to-br from-al-teal/10 to-al-sky/10 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">{t('dashboard.kolIdentified')}</span>
              <span className="text-xs font-bold text-al-teal">{territoryStats.kolCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">{t('dashboard.totalVolumeTerritory')}</span>
              <span className="text-xs font-bold text-al-teal">{(totalVolumeTerritory / 1000000).toFixed(1)}M L</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">{t('dashboard.avgVolumePractitioner')}</span>
              <span className="text-xs font-bold text-al-teal">{(avgVolumePerPractitioner / 1000).toFixed(0)}K L</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ratio comparison */}
      <div className="mt-3 p-2.5 bg-gradient-to-r from-al-navy/5 to-al-blue-500/5 rounded-lg border border-al-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-al-blue-500" />
            <span className="text-xs font-medium text-slate-700">{t('dashboard.ratioSpecialties')}</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-xs text-slate-500">{t('dashboard.national')}</div>
              <div className="text-xs font-bold text-slate-800">1:{Math.round(nationalStats.medecinsGeneralistes / nationalStats.pneumologues)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">{t('dashboard.territoryLabel')}</div>
              <div className="text-xs font-bold text-al-blue-500">1:{Math.round(territoryStats.medecinsGeneralistes / territoryStats.pneumologues)}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
