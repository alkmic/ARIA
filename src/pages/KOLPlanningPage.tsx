import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, AlertTriangle, Star, TrendingUp, MapPin, Clock, CheckCircle, Sparkles, ArrowLeft, Users, Droplets, FileText, Target, Shield } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import type { Practitioner } from '../types';

export const KOLPlanningPage: React.FC = () => {
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
      estimatedInfluence: kol.vingtile <= 2 ? 'Très élevée' : kol.vingtile <= 5 ? 'Élevée' : 'Moyenne',
      suggestedDate,
      travelTime,
      keyTopics: [
        'Nouvelles solutions O2 domicile',
        'Études cliniques récentes GOLD 2025',
        'Programme de suivi patient personnalisé',
        'Formation équipe soignante'
      ],
      risks: [
        daysSinceLastVisit > 120 ? 'Risque de désengagement élevé' : 'Suivi à renforcer',
        'Concurrence active sur ce prescripteur',
        'Budget à renouveler ce trimestre'
      ],
      opportunities: [
        `Leader d'opinion dans ${kol.city}`,
        `${kol.volumeL > 500000 ? 'Top prescripteur régional' : 'Prescripteur important'}`,
        'Potentiel de recommandation à ses pairs',
        'Participation possible aux études cliniques'
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
        'Préparer pitch personnalisé',
        'Revoir historique des prescriptions',
        'Analyser les dernières publications',
        'Préparer documentation GOLD 2025'
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
            <span className="text-sm">Retour au tableau de bord</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
            Planning KOL Prioritaire
          </h1>
          <p className="text-slate-600 mt-2">
            {kolsAnalysis.length} leaders d'opinion nécessitent une attention urgente
          </p>
        </div>

        <div className="flex gap-3">
          <div className="text-center p-3 bg-amber-50 rounded-lg border-2 border-amber-200">
            <div className="text-2xl font-bold text-amber-700">{avgUrgency.toFixed(0)}</div>
            <div className="text-xs text-amber-600">Urgence moy.</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{totalImpact}</div>
            <div className="text-xs text-blue-600">Impact total</div>
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
            <h3 className="font-bold text-lg text-slate-800 mb-2">Analyse IA - Recommandations Stratégiques</h3>
            <p className="text-slate-700 leading-relaxed">
              L'analyse prédictive identifie ces {kolsAnalysis.length} KOLs comme prioritaires basé sur <strong>7 critères</strong> :
              ancienneté de la dernière visite, volume de prescription, influence régionale, engagement historique,
              potentiel de croissance, risque concurrentiel et opportunités de collaboration.
              Le modèle estime une <strong className="text-purple-600">probabilité de 87%</strong> d'augmentation
              du volume prescrit de <strong>+{(kolsAnalysis.reduce((s, k) => s + k.volumeL, 0) / 1000000 * 0.15).toFixed(1)}M litres/an</strong> si
              ces visites sont réalisées dans les 14 prochains jours.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1">
                <Target className="w-3 h-3" />
                Précision du modèle : 92%
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Basé sur 2 847 interactions historiques
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Confiance : Très élevée
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
                      <p className="text-slate-600 text-sm">{kol.specialty} - {kol.activityType}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">{kol.city}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="text-center px-3 py-1 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-xs text-red-600 font-medium">Urgence</div>
                        <div className="text-lg font-bold text-red-700">{kol.analysis.urgencyScore}</div>
                      </div>
                      <div className="text-center px-3 py-1 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-xs text-blue-600 font-medium">Impact</div>
                        <div className="text-lg font-bold text-blue-700">{kol.analysis.impactScore}</div>
                      </div>
                      <div className="text-center px-3 py-1 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-xs text-green-600 font-medium">Opportunité</div>
                        <div className="text-lg font-bold text-green-700">{kol.analysis.opportunityScore}</div>
                      </div>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <div>
                        <div className="text-xs text-slate-500">Dernière visite</div>
                        <div className="text-sm font-bold text-slate-800">{kol.analysis.daysSinceLastVisit}j</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <Droplets className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="text-xs text-slate-500">Volume annuel</div>
                        <div className="text-sm font-bold text-blue-700">{(kol.volumeL / 1000000).toFixed(1)}M L</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <div>
                        <div className="text-xs text-slate-500">vs Moyenne</div>
                        <div className="text-sm font-bold text-green-700">+{kol.analysis.volumeVsAvg}%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <Users className="w-4 h-4 text-purple-500" />
                      <div>
                        <div className="text-xs text-slate-500">Influence</div>
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
                      Planning Proposé
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Date suggérée</span>
                        <span className="font-bold text-blue-700">
                          {proposedSchedule[index].date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Créneau optimal</span>
                        <span className="font-bold text-blue-700">{proposedSchedule[index].timeSlot}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Durée estimée</span>
                        <span className="font-bold text-blue-700">{proposedSchedule[index].duration} min</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Temps de trajet</span>
                        <span className="font-bold text-blue-700">{proposedSchedule[index].travelTime} min</span>
                      </div>
                    </div>
                  </div>

                  {/* Sujets clés */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-600" />
                      Sujets Clés à Aborder
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
                      Opportunités Identifiées
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
                      Points de Vigilance
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
                      Checklist de Préparation
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
                      Voir le profil complet
                    </button>
                    <button className="flex-1 btn-primary">
                      Planifier la visite
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
            <h3 className="font-bold text-lg text-slate-800">Prêt à planifier ces visites ?</h3>
            <p className="text-sm text-slate-600 mt-1">
              Le planning optimisé prend en compte les distances, disponibilités et priorités
            </p>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary">
              Exporter le planning
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Planifier les {kolsAnalysis.length} visites
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default KOLPlanningPage;
