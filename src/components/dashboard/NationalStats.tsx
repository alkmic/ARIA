import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

export const NationalStats: React.FC = () => {
  const { practitioners } = useAppStore();

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
      className="glass-card p-4 sm:p-6"
    >
      <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6 flex items-center space-x-2">
        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-al-blue-500" />
        <span>Statistiques Nationales et Territoire</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* National Stats */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200 pb-2">
            France Entière
          </h3>

          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-slate-600">Médecins généralistes</span>
              <span className="text-base sm:text-lg font-bold text-slate-800">{nationalStats.medecinsGeneralistes.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-slate-600">Pneumologues</span>
              <span className="text-base sm:text-lg font-bold text-slate-800">{nationalStats.pneumologues.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-200 pt-2 sm:pt-3">
              <span className="text-xs sm:text-sm font-semibold text-slate-700">Total général</span>
              <span className="text-lg sm:text-xl font-bold text-al-blue-500">{nationalStats.total.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gradient-to-br from-al-blue-50 to-al-sky/10 rounded-lg space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-slate-600">Patients sous O₂</span>
              <span className="text-xs sm:text-sm font-bold text-al-blue-600">{nationalStats.patientsOxygene.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-slate-600">Volume moy./patient/an</span>
              <span className="text-xs sm:text-sm font-bold text-al-blue-600">{nationalStats.volumeMoyenPatient} L</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-slate-600">% KOL</span>
              <span className="text-xs sm:text-sm font-bold text-al-blue-600">{nationalStats.percentageKOL}%</span>
            </div>
          </div>
        </div>

        {/* Territory Stats */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200 pb-2">
            Votre Territoire
          </h3>

          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-slate-600">Médecins généralistes</span>
              <span className="text-base sm:text-lg font-bold text-slate-800">{territoryStats.medecinsGeneralistes}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-slate-600">Pneumologues</span>
              <span className="text-base sm:text-lg font-bold text-slate-800">{territoryStats.pneumologues}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-200 pt-2 sm:pt-3">
              <span className="text-xs sm:text-sm font-semibold text-slate-700">Total territoire</span>
              <span className="text-lg sm:text-xl font-bold text-al-teal">{territoryStats.total}</span>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gradient-to-br from-al-teal/10 to-al-sky/10 rounded-lg space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-slate-600">KOL identifiés</span>
              <span className="text-xs sm:text-sm font-bold text-al-teal">{territoryStats.kolCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-slate-600">Volume total territoire</span>
              <span className="text-xs sm:text-sm font-bold text-al-teal">{(totalVolumeTerritory / 1000000).toFixed(1)}M L</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-slate-600">Volume moy./praticien</span>
              <span className="text-xs sm:text-sm font-bold text-al-teal">{(avgVolumePerPractitioner / 1000).toFixed(0)}K L</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ratio comparison */}
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-al-navy/5 to-al-blue-500/5 rounded-lg border border-al-blue-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-al-blue-500" />
            <span className="text-xs sm:text-sm font-medium text-slate-700">Ratio Pneumologues/Généralistes</span>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto justify-end">
            <div className="text-right">
              <div className="text-[10px] sm:text-xs text-slate-500">National</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">1:{Math.round(nationalStats.medecinsGeneralistes / nationalStats.pneumologues)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] sm:text-xs text-slate-500">Territoire</div>
              <div className="text-xs sm:text-sm font-bold text-al-blue-500">1:{Math.round(territoryStats.medecinsGeneralistes / territoryStats.pneumologues)}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
