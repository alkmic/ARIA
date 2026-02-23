import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, AlertTriangle, Star, TrendingUp, MapPin, Clock, CheckCircle, Sparkles, ArrowLeft, Users, Droplets, FileText, Target, Shield } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useTranslation } from '../i18n';
import { localizeSpecialty, localizePracticeType } from '../utils/localizeData';
import { getLocaleCode } from '../utils/helpers';
import type { Practitioner } from '../types';

export const KOLPlanningPage: React.FC = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const { practitioners, upcomingVisits } = useAppStore();
  const [selectedKOL, setSelectedKOL] = useState<string | null>(null);

  // Identifier les KOLs urgents (>90 jours sans visite)
  const urgentKOLs = useMemo(() => {
    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

    return practitioners
      .filter(p => {
        if (!p.isKOL) return false;

        const practitionerVisits = upcomingVisits.filter(v => v.practitionerId === p.id);
        if (practitionerVisits.length === 0) return true;

        const lastVisit = practitionerVisits.reduce((latest, visit) => {
          const visitDate = new Date(visit.date);
          return visitDate > latest ? visitDate : latest;
        }, new Date(0));

        return lastVisit < ninetyDaysAgo;
      })
      .sort((a, b) => b.volumeL - a.volumeL)
      .slice(0, 3);
  }, [practitioners, upcomingVisits]);

  // Analyse IA pour chaque KOL (déterministe basé sur les données)
  const getKOLAnalysis = (kol: Practitioner, index: number) => {
    const daysSinceLastVisit = Math.floor((Date.now() - new Date(kol.lastVisitDate || 0).getTime()) / (1000 * 60 * 60 * 24));
    const volumeRank = practitioners.filter(p => p.volumeL > kol.volumeL).length + 1;
    const avgVolume = practitioners.reduce((sum, p) => sum + p.volumeL, 0) / practitioners.length;
    const volumeVsAvg = ((kol.volumeL / avgVolume - 1) * 100).toFixed(0);

    // Calculs déterministes basés sur les données réelles
    const baseOpportunityScore = 70 + Math.min(25, Math.floor(kol.loyaltyScore * 2.5));
    const vingtileBonus = Math.max(0, 6 - kol.vingtile) * 3;
    const opportunityScore = Math.min(100, baseOpportunityScore + vingtileBonus);

    // Dates suggérées déterministes (basées sur l'index du KOL)
    const daysOffset = 5 + (index * 3);
    const suggestedDate = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);

    // Temps de trajet basé sur le hash de l'ID (déterministe)
    const idHash = kol.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const travelTime = 20 + (idHash % 25);

    return {
      urgencyScore: Math.min(100, Math.floor((daysSinceLastVisit / 180) * 100)),
      impactScore: Math.min(100, Math.floor((kol.volumeL / avgVolume) * 20)),
      opportunityScore,
      daysSinceLastVisit,
      volumeRank,
      volumeVsAvg: parseInt(volumeVsAvg),
      estimatedInfluence: kol.vingtile <= 2 ? t('manager.kol.influenceVeryHigh') : kol.vingtile <= 5 ? t('manager.kol.influenceHigh') : t('manager.kol.influenceMedium'),
      suggestedDate,
      travelTime,
      keyTopics: [
        t('manager.kol.topicO2Solutions'),
        t('manager.kol.topicClinicalStudies'),
        t('manager.kol.topicPatientFollowup'),
        t('manager.kol.topicTeamTraining')
      ],
      risks: [
        daysSinceLastVisit > 120 ? t('manager.kol.riskDisengagement') : t('manager.kol.riskFollowUp'),
        t('manager.kol.riskCompetition'),
        t('manager.kol.riskBudget')
      ],
      opportunities: [
        t('manager.kol.oppLeaderIn', { city: kol.city }),
        kol.volumeL > 500000 ? t('manager.kol.oppTopPrescriber') : t('manager.kol.oppImportantPrescriber'),
        t('manager.kol.oppRecommendation'),
        t('manager.kol.oppClinicalStudies')
      ]
    };
  };

  const kolsAnalysis = urgentKOLs.map((kol, index) => ({
    ...kol,
    analysis: getKOLAnalysis(kol, index)
  }));

  // Proposition de planning optimisé
  const proposedSchedule = useMemo(() => {
    return kolsAnalysis.map((kol, index) => ({
      kol,
      date: kol.analysis.suggestedDate,
      timeSlot: ['09:00 - 10:00', '14:00 - 15:00', '16:00 - 17:00'][index],
      duration: 60,
      priority: index + 1,
      travelTime: kol.analysis.travelTime,
      preparation: [
        t('manager.kol.prepPitch'),
        t('manager.kol.prepHistory'),
        t('manager.kol.prepPublications'),
        t('manager.kol.prepDocumentation')
      ]
    }));
  }, [kolsAnalysis]);

  const totalImpact = kolsAnalysis.reduce((sum, k) => sum + k.analysis.impactScore, 0);
  const avgUrgency = kolsAnalysis.length > 0 ? kolsAnalysis.reduce((sum, k) => sum + k.analysis.urgencyScore, 0) / kolsAnalysis.length : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-slate-600 hover:text-al-blue-500 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t('manager.kol.backToDashboard')}</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
            {t('manager.kol.title')}
          </h1>
          <p className="text-slate-600 mt-2">
            {t('manager.kol.subtitle', { count: kolsAnalysis.length })}
          </p>
        </div>

        <div className="flex gap-3">
          <div className="text-center p-3 bg-amber-50 rounded-lg border-2 border-amber-200">
            <div className="text-2xl font-bold text-amber-700">{avgUrgency.toFixed(0)}</div>
            <div className="text-xs text-amber-600">{t('manager.kol.avgUrgency')}</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{totalImpact}</div>
            <div className="text-xs text-blue-600">{t('manager.kol.totalImpact')}</div>
          </div>
        </div>
      </motion.div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 bg-gradient-to-br from-purple-50 to-blue-50"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-slate-800 mb-2">{t('manager.kol.aiAnalysis')}</h3>
            <p className="text-slate-700 leading-relaxed">
              {t('manager.kol.aiAnalysisDesc', { count: kolsAnalysis.length })}
              {' '}{t('manager.kol.aiAnalysisDetails')}
              {' '}{t('manager.kol.aiModelEstimate', { volume: (kolsAnalysis.reduce((s, k) => s + k.volumeL, 0) / 1000000 * 0.15).toFixed(1) })}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1">
                <Target className="w-3 h-3" />
                {t('manager.kol.modelPrecision')}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {t('manager.kol.basedOnInteractions')}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {t('manager.kol.confidenceVeryHigh')}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KOL Cards */}
      <div className="space-y-4">
        {kolsAnalysis.map((kol, index) => (
          <motion.div
            key={kol.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="glass-card hover-lift cursor-pointer"
            onClick={() => setSelectedKOL(selectedKOL === kol.id ? null : kol.id)}
          >
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-2xl font-bold text-white">{index + 1}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {kol.title} {kol.firstName} {kol.lastName}
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                      </h3>
                      <p className="text-slate-600 text-sm">{localizeSpecialty(kol.specialty)} - {localizePracticeType(kol.activityType)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">{kol.city}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="text-center px-3 py-1 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-xs text-red-600 font-medium">{t('manager.kol.urgency')}</div>
                        <div className="text-lg font-bold text-red-700">{kol.analysis.urgencyScore}</div>
                      </div>
                      <div className="text-center px-3 py-1 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-xs text-blue-600 font-medium">{t('manager.kol.impact')}</div>
                        <div className="text-lg font-bold text-blue-700">{kol.analysis.impactScore}</div>
                      </div>
                      <div className="text-center px-3 py-1 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-xs text-green-600 font-medium">{t('manager.kol.opportunity')}</div>
                        <div className="text-lg font-bold text-green-700">{kol.analysis.opportunityScore}</div>
                      </div>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <div>
                        <div className="text-xs text-slate-500">{t('manager.kol.lastVisit')}</div>
                        <div className="text-sm font-bold text-slate-800">{kol.analysis.daysSinceLastVisit}j</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <Droplets className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="text-xs text-slate-500">{t('manager.kol.annualVolume')}</div>
                        <div className="text-sm font-bold text-blue-700">{(kol.volumeL / 1000000).toFixed(1)}M L</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <div>
                        <div className="text-xs text-slate-500">{t('manager.kol.vsAverage')}</div>
                        <div className="text-sm font-bold text-green-700">+{kol.analysis.volumeVsAvg}%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <Users className="w-4 h-4 text-purple-500" />
                      <div>
                        <div className="text-xs text-slate-500">{t('manager.kol.influence')}</div>
                        <div className="text-sm font-bold text-purple-700">{kol.analysis.estimatedInfluence}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Détails expandables */}
              {selectedKOL === kol.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 pt-6 border-t border-slate-200 space-y-4"
                >
                  {/* Planning proposé */}
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      {t('manager.kol.proposedPlanning')}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{t('manager.kol.suggestedDate')}</span>
                        <span className="font-bold text-blue-700">
                          {proposedSchedule[index].date.toLocaleDateString(getLocaleCode(language), { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{t('manager.kol.optimalSlot')}</span>
                        <span className="font-bold text-blue-700">{proposedSchedule[index].timeSlot}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{t('manager.kol.estimatedDuration')}</span>
                        <span className="font-bold text-blue-700">{proposedSchedule[index].duration} min</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{t('manager.kol.travelTime')}</span>
                        <span className="font-bold text-blue-700">{proposedSchedule[index].travelTime} min</span>
                      </div>
                    </div>
                  </div>

                  {/* Sujets clés */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-600" />
                      {t('manager.kol.keyTopics')}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {kol.analysis.keyTopics.map((topic, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm text-slate-700">{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Opportunités */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-slate-600" />
                      {t('manager.kol.identifiedOpportunities')}
                    </h4>
                    <div className="space-y-2">
                      {kol.analysis.opportunities.map((opp, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                          <Star className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-slate-700">{opp}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risques */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-slate-600" />
                      {t('manager.kol.watchPoints')}
                    </h4>
                    <div className="space-y-2">
                      {kol.analysis.risks.map((risk, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-slate-700">{risk}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Préparation */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-slate-600" />
                      {t('manager.kol.prepChecklist')}
                    </h4>
                    <div className="space-y-2">
                      {proposedSchedule[index].preparation.map((item, i) => (
                        <label key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                          <input type="checkbox" className="w-4 h-4 text-al-blue-500 rounded" />
                          <span className="text-sm text-slate-700">{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => navigate(`/practitioner/${kol.id}`)}
                      className="flex-1 btn-secondary"
                    >
                      {t('manager.kol.seeFullProfile')}
                    </button>
                    <button className="flex-1 btn-primary">
                      {t('manager.kol.planVisit')}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Actions globales */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-6 bg-gradient-to-br from-green-50 to-blue-50"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg text-slate-800">{t('manager.kol.readyToPlan')}</h3>
            <p className="text-sm text-slate-600 mt-1">
              {t('manager.kol.optimizedPlanDesc')}
            </p>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary">
              {t('manager.kol.exportPlanning')}
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t('manager.kol.planVisits', { count: kolsAnalysis.length })}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default KOLPlanningPage;
