import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Sparkles, AlertTriangle, TrendingUp, Star, Clock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { useUserDataStore } from '../../stores/useUserDataStore';
import { DataService } from '../../services/dataService';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { AIInsight } from '../../types';

export const AIInsights: React.FC = () => {
  const { practitioners, upcomingVisits } = useAppStore();
  const { visitReports, userNotes } = useUserDataStore();
  const navigate = useNavigate();

  // Generate dynamic insights based on real data
  const dynamicInsights = useMemo((): AIInsight[] => {
    const insights: AIInsight[] = [];
    const today = new Date();
    const allPractitioners = DataService.getAllPractitioners();

    // 1. Find overdue KOLs (>60 days without visit)
    const overdueKOLs = allPractitioners.filter(p => {
      if (!p.metrics.isKOL) return false;
      if (!p.lastVisitDate) return true;
      const daysSince = Math.floor((today.getTime() - new Date(p.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince > 60;
    });

    if (overdueKOLs.length > 0) {
      const mostUrgent = overdueKOLs.sort((a, b) => {
        const daysA = a.lastVisitDate ? Math.floor((today.getTime() - new Date(a.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24)) : 999;
        const daysB = b.lastVisitDate ? Math.floor((today.getTime() - new Date(b.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24)) : 999;
        return daysB - daysA;
      })[0];

      const daysSince = mostUrgent.lastVisitDate
        ? Math.floor((today.getTime() - new Date(mostUrgent.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      insights.push({
        id: 'overdue-kols',
        type: 'alert',
        title: `${overdueKOLs.length} KOL${overdueKOLs.length > 1 ? 's' : ''} à voir en urgence`,
        message: `${mostUrgent.title} ${mostUrgent.lastName} n'a pas été visité depuis ${daysSince > 100 ? '+100' : daysSince} jours. Volume: ${(mostUrgent.metrics.volumeL / 1000).toFixed(0)}K L/an.`,
        priority: overdueKOLs.length >= 3 ? 'high' : 'medium',
        actionLabel: 'Planifier visites',
        practitionerId: mostUrgent.id
      });
    }

    // 2. Find high-growth opportunities
    const opportunities = allPractitioners.filter(p =>
      p.metrics.potentialGrowth > 30 && p.metrics.loyaltyScore >= 7
    ).sort((a, b) => b.metrics.potentialGrowth - a.metrics.potentialGrowth);

    if (opportunities.length > 0) {
      const best = opportunities[0];
      insights.push({
        id: 'opportunity',
        type: 'opportunity',
        title: 'Opportunité de croissance détectée',
        message: `${best.title} ${best.firstName} ${best.lastName} présente un potentiel de +${best.metrics.potentialGrowth}%. Fidélité élevée (${best.metrics.loyaltyScore}/10) - excellent moment pour développer.`,
        priority: best.metrics.potentialGrowth > 40 ? 'high' : 'medium',
        actionLabel: 'Voir le profil',
        practitionerId: best.id
      });
    }

    // 3. Find churn risks
    const atRisk = allPractitioners.filter(p =>
      (p.metrics.churnRisk === 'high' || p.metrics.loyaltyScore < 5) && p.metrics.volumeL > 50000
    ).sort((a, b) => b.metrics.volumeL - a.metrics.volumeL);

    if (atRisk.length > 0) {
      const mostAtRisk = atRisk[0];
      insights.push({
        id: 'churn-risk',
        type: 'alert',
        title: 'Risque de perte identifié',
        message: `${mostAtRisk.title} ${mostAtRisk.lastName} (${(mostAtRisk.metrics.volumeL / 1000).toFixed(0)}K L/an) montre des signes d'attrition. Fidélité: ${mostAtRisk.metrics.loyaltyScore}/10. Action recommandée.`,
        priority: mostAtRisk.metrics.volumeL > 100000 ? 'high' : 'medium',
        actionLabel: 'Voir le profil',
        practitionerId: mostAtRisk.id
      });
    }

    // 4. Today's visits preparation
    const todayStr = today.toISOString().split('T')[0];
    const todayVisits = upcomingVisits.filter(v => v.date === todayStr);

    if (todayVisits.length > 0) {
      const firstVisit = todayVisits[0];
      insights.push({
        id: 'today-visits',
        type: 'reminder',
        title: `${todayVisits.length} visite${todayVisits.length > 1 ? 's' : ''} aujourd'hui`,
        message: `Prochaine visite: ${firstVisit.practitioner.title} ${firstVisit.practitioner.lastName} à ${firstVisit.time}. Préparez votre pitch et vos arguments.`,
        priority: 'medium',
        actionLabel: 'Préparer visite',
        practitionerId: firstVisit.practitionerId
      });
    }

    // 5. Volume trend achievement
    const highVolumeGrowth = allPractitioners.filter(p =>
      p.metrics.loyaltyScore >= 8 && p.metrics.vingtile <= 5
    );

    if (highVolumeGrowth.length >= 5) {
      insights.push({
        id: 'achievement',
        type: 'achievement',
        title: 'Excellente performance',
        message: `${highVolumeGrowth.length} praticiens Top 25% avec fidélité élevée (≥8/10). Votre relation client est excellente. Continuez ainsi !`,
        priority: 'low',
        actionLabel: 'Voir les détails'
      });
    }

    // 6. Objective gap analysis
    const monthlyObjective = 60;
    const currentVisits = upcomingVisits.filter(v => {
      const visitDate = new Date(v.date);
      return visitDate.getMonth() === today.getMonth() && visitDate.getFullYear() === today.getFullYear();
    }).length;

    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const expectedProgress = (dayOfMonth / daysInMonth) * monthlyObjective;

    if (currentVisits < expectedProgress * 0.8) {
      const gap = Math.ceil(expectedProgress - currentVisits);
      insights.push({
        id: 'objective-gap',
        type: 'alert',
        title: 'Objectif mensuel en retard',
        message: `Vous êtes en retard de ${gap} visite${gap > 1 ? 's' : ''} sur votre objectif mensuel. Planifiez des visites supplémentaires cette semaine.`,
        priority: 'medium',
        actionLabel: 'Planifier tournée'
      });
    }

    // 7. New practitioners never visited
    const newToTerritory = allPractitioners.filter(p =>
      !p.lastVisitDate && p.visitHistory.length === 0
    );
    if (newToTerritory.length > 0) {
      const best = newToTerritory.sort((a, b) => b.metrics.volumeL - a.metrics.volumeL)[0];
      insights.push({
        id: 'new-practitioner',
        type: 'opportunity',
        title: `${newToTerritory.length} nouveau(x) praticien(s) détecté(s)`,
        message: `${best.title} ${best.firstName} ${best.lastName} (${(best.metrics.volumeL / 1000).toFixed(0)}K L/an) n'a jamais été visité. Planifiez une première visite.`,
        priority: newToTerritory.some(p => p.metrics.vingtile <= 5) ? 'high' : 'medium',
        actionLabel: 'Voir les actions',
        practitionerId: best.id,
      });
    }

    // 8. Recent visit report follow-ups
    const recentReports = visitReports
      .filter(r => {
        const reportDate = new Date(r.date);
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return reportDate >= sevenDaysAgo;
      })
      .filter(r => r.extractedInfo.nextActions.length > 0);

    if (recentReports.length > 0) {
      const report = recentReports[0];
      insights.push({
        id: 'visit-followup',
        type: 'reminder',
        title: `Suivi post-visite : ${report.practitionerName}`,
        message: `Action en attente : ${report.extractedInfo.nextActions[0]}`,
        priority: 'medium',
        actionLabel: 'Voir le profil',
        practitionerId: report.practitionerId,
      });
    }

    // 9. Competitor alerts from user notes
    const competitorNotes = userNotes.filter(n => n.type === 'competitive');
    if (competitorNotes.length > 0) {
      const recent = competitorNotes.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      const practitioner = allPractitioners.find(p => p.id === recent.practitionerId);
      if (practitioner) {
        insights.push({
          id: 'competitor-alert',
          type: 'alert',
          title: 'Alerte concurrence',
          message: `${practitioner.title} ${practitioner.lastName} : ${recent.content.substring(0, 100)}`,
          priority: 'high',
          actionLabel: 'Voir le profil',
          practitionerId: recent.practitionerId,
        });
      }
    }

    return insights.slice(0, 5); // Max 5 insights
  }, [practitioners, upcomingVisits, visitReports, userNotes]);

  const priorityColors = {
    high: 'danger' as const,
    medium: 'warning' as const,
    low: 'info' as const,
  };

  const typeConfig = {
    opportunity: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    alert: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    reminder: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
    achievement: { icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
  };

  const typeLabels = {
    opportunity: 'Opportunité',
    alert: 'Alerte',
    reminder: 'Rappel',
    achievement: 'Succès',
  };

  const handleAction = (insight: AIInsight) => {
    if (insight.actionLabel === 'Préparer visite' && insight.practitionerId) {
      navigate(`/pitch?practitionerId=${insight.practitionerId}`);
    } else if (insight.actionLabel === 'Planifier visites' || insight.actionLabel === 'Planifier tournée') {
      navigate('/tour-optimization');
    } else if (insight.actionLabel === 'Voir les détails') {
      navigate('/next-actions');
    } else if (insight.practitionerId) {
      navigate(`/practitioner/${insight.practitionerId}`);
    }
  };

  if (dynamicInsights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          ARIA recommande aujourd'hui
        </h2>
        <button
          onClick={() => navigate('/next-actions')}
          className="text-sm text-al-blue-600 hover:text-al-blue-700 font-medium flex items-center gap-1"
        >
          Toutes les actions
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
        {dynamicInsights.map((insight, index) => {
          const config = typeConfig[insight.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="min-w-[320px] glass-card overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
            >
              {/* Colored top bar */}
              <div className={`h-1 ${
                insight.priority === 'high' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                insight.priority === 'medium' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                'bg-gradient-to-r from-blue-500 to-cyan-500'
              }`} />

              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {typeLabels[insight.type]}
                    </span>
                  </div>
                  <Badge variant={priorityColors[insight.priority]} size="sm">
                    {insight.priority === 'high' ? 'Urgent' :
                     insight.priority === 'medium' ? 'Important' : 'Info'}
                  </Badge>
                </div>

                <h3 className="font-bold text-slate-800 mb-2">{insight.title}</h3>
                <p className="text-sm text-slate-600 mb-4 line-clamp-3">{insight.message}</p>

                {insight.actionLabel && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full cursor-pointer hover:bg-al-blue-50 hover:text-al-blue-700 hover:border-al-blue-200"
                    onClick={() => handleAction(insight)}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    {insight.actionLabel}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
