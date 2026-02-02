import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  User,
  Calendar,
  Phone,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Star,
  Clock,
  CheckCircle2,
  Filter,
  Sparkles,
  Target,
  Route,
  FileText,
  Eye,
  Award
} from 'lucide-react';
import { DataService } from '../services/dataService';
import { useAppStore } from '../stores/useAppStore';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import type { PractitionerProfile } from '../types/database';

interface Action {
  id: string;
  type: 'visit_urgent' | 'visit_kol' | 'opportunity' | 'risk' | 'followup' | 'upsell';
  priority: 'critical' | 'high' | 'medium' | 'low';
  practitioner: PractitionerProfile;
  title: string;
  reason: string;
  impact: string;
  suggestedDate?: string;
  daysOverdue?: number;
}

const ACTION_CONFIG = {
  visit_urgent: {
    icon: AlertTriangle,
    color: 'from-red-500 to-rose-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    label: 'Visite urgente'
  },
  visit_kol: {
    icon: Star,
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    label: 'Visite KOL'
  },
  opportunity: {
    icon: TrendingUp,
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    label: 'Opportunité'
  },
  risk: {
    icon: TrendingDown,
    color: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    label: 'Risque churn'
  },
  followup: {
    icon: Phone,
    color: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    label: 'Suivi'
  },
  upsell: {
    icon: Award,
    color: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-700',
    label: 'Upsell'
  }
};

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export default function NextBestActions() {
  const navigate = useNavigate();
  const { periodLabel } = useTimePeriod();
  const { upcomingVisits } = useAppStore();

  const [filter, setFilter] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);

  // Generate intelligent actions based on data
  const actions = useMemo(() => {
    const allActions: Action[] = [];
    const practitioners = DataService.getAllPractitioners();
    const today = new Date();
    const visitedIds = new Set(upcomingVisits.map(v => v.practitionerId));

    practitioners.forEach(p => {
      const daysSinceVisit = p.lastVisitDate
        ? Math.floor((today.getTime() - new Date(p.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // 1. Urgent KOL visits (>60 days)
      if (p.metrics.isKOL && daysSinceVisit > 60) {
        allActions.push({
          id: `kol-${p.id}`,
          type: 'visit_kol',
          priority: daysSinceVisit > 90 ? 'critical' : 'high',
          practitioner: p,
          title: `Visite KOL urgente`,
          reason: `Non visité depuis ${daysSinceVisit} jours`,
          impact: `Volume: ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an`,
          daysOverdue: daysSinceVisit - 60,
          suggestedDate: 'Cette semaine'
        });
      }

      // 2. High-value practitioners not visited (>45 days)
      if (p.metrics.vingtile <= 5 && daysSinceVisit > 45 && !p.metrics.isKOL) {
        allActions.push({
          id: `urgent-${p.id}`,
          type: 'visit_urgent',
          priority: daysSinceVisit > 75 ? 'high' : 'medium',
          practitioner: p,
          title: `Visite Top 25% à planifier`,
          reason: `Vingtile ${p.metrics.vingtile} - Non visité depuis ${daysSinceVisit}j`,
          impact: `Potentiel: ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an`,
          daysOverdue: daysSinceVisit - 45
        });
      }

      // 3. Churn risk
      if (p.metrics.churnRisk === 'high' || (p.metrics.loyaltyScore < 5 && p.metrics.volumeL > 50000)) {
        allActions.push({
          id: `risk-${p.id}`,
          type: 'risk',
          priority: p.metrics.volumeL > 100000 ? 'high' : 'medium',
          practitioner: p,
          title: `Risque de perte`,
          reason: `Fidélité ${p.metrics.loyaltyScore}/10 - Signes d'attrition`,
          impact: `Enjeu: ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an`,
          suggestedDate: 'Sous 2 semaines'
        });
      }

      // 4. Growth opportunities
      if (p.metrics.potentialGrowth > 25 && p.metrics.loyaltyScore >= 7) {
        allActions.push({
          id: `opp-${p.id}`,
          type: 'opportunity',
          priority: p.metrics.potentialGrowth > 40 ? 'high' : 'medium',
          practitioner: p,
          title: `Potentiel de croissance`,
          reason: `+${p.metrics.potentialGrowth}% de potentiel identifié`,
          impact: `Fidélité ${p.metrics.loyaltyScore}/10 - Bien disposé`,
          suggestedDate: 'Ce mois'
        });
      }

      // 5. Upsell opportunities (high loyalty, low volume)
      if (p.metrics.loyaltyScore >= 8 && p.metrics.volumeL < 80000 && p.metrics.vingtile <= 10) {
        allActions.push({
          id: `upsell-${p.id}`,
          type: 'upsell',
          priority: 'medium',
          practitioner: p,
          title: `Opportunité d'expansion`,
          reason: `Excellente relation - Volume développable`,
          impact: `Fidélité ${p.metrics.loyaltyScore}/10`,
          suggestedDate: 'Prochaine visite'
        });
      }

      // 6. Follow-up needed (recent visit with pending action)
      const recentNotes = p.notes.filter(n => {
        const noteDate = new Date(n.date);
        return (today.getTime() - noteDate.getTime()) < 14 * 24 * 60 * 60 * 1000;
      });

      if (recentNotes.some(n => n.nextAction && !visitedIds.has(p.id))) {
        allActions.push({
          id: `followup-${p.id}`,
          type: 'followup',
          priority: 'medium',
          practitioner: p,
          title: `Suivi à effectuer`,
          reason: `Action en attente suite à visite récente`,
          impact: recentNotes[0]?.nextAction || 'Suivi planifié',
          suggestedDate: 'Cette semaine'
        });
      }
    });

    // Sort by priority then by impact
    return allActions.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.practitioner.metrics.volumeL - a.practitioner.metrics.volumeL;
    });
  }, [upcomingVisits]);

  // Filter actions
  const filteredActions = useMemo(() => {
    let result = actions;

    if (filter) {
      result = result.filter(a => a.type === filter);
    }

    if (!showCompleted) {
      result = result.filter(a => !completedActions.has(a.id));
    }

    return result;
  }, [actions, filter, completedActions, showCompleted]);

  // Stats
  const stats = useMemo(() => ({
    total: actions.length,
    critical: actions.filter(a => a.priority === 'critical').length,
    completed: completedActions.size,
    byType: {
      visit_urgent: actions.filter(a => a.type === 'visit_urgent').length,
      visit_kol: actions.filter(a => a.type === 'visit_kol').length,
      opportunity: actions.filter(a => a.type === 'opportunity').length,
      risk: actions.filter(a => a.type === 'risk').length,
      followup: actions.filter(a => a.type === 'followup').length,
      upsell: actions.filter(a => a.type === 'upsell').length,
    }
  }), [actions, completedActions]);

  const markCompleted = (actionId: string) => {
    setCompletedActions(prev => new Set([...prev, actionId]));
  };

  const ActionCard = ({ action, index }: { action: Action; index: number }) => {
    const config = ACTION_CONFIG[action.type];
    const Icon = config.icon;
    const isCompleted = completedActions.has(action.id);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ delay: index * 0.05 }}
        className={`glass-card overflow-hidden transition-all ${
          isCompleted ? 'opacity-50' : ''
        }`}
      >
        <div className={`h-1 bg-gradient-to-r ${config.color}`} />

        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
                  {config.label}
                </span>
                {action.priority === 'critical' && (
                  <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">
                    CRITIQUE
                  </span>
                )}
                {action.priority === 'high' && (
                  <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                    Priorité haute
                  </span>
                )}
              </div>

              <h3 className="font-semibold text-slate-800 mb-1">{action.title}</h3>

              <button
                onClick={() => navigate(`/practitioner/${action.practitioner.id}`)}
                className="flex items-center gap-2 text-sm text-al-blue-600 hover:text-al-blue-700 mb-2"
              >
                <User className="w-3.5 h-3.5" />
                {action.practitioner.title} {action.practitioner.firstName} {action.practitioner.lastName}
                {action.practitioner.metrics.isKOL && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">KOL</span>
                )}
              </button>

              <div className="space-y-1 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {action.reason}
                </p>
                <p className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-slate-400" />
                  {action.impact}
                </p>
                {action.suggestedDate && (
                  <p className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Suggéré: {action.suggestedDate}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {!isCompleted && (
                <button
                  onClick={() => markCompleted(action.id)}
                  className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600"
                  title="Marquer comme fait"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => navigate(`/practitioner/${action.practitioner.id}`)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                title="Voir le profil"
              >
                <Eye className="w-5 h-5" />
              </button>
              {['visit_urgent', 'visit_kol'].includes(action.type) && (
                <button
                  onClick={() => navigate(`/tour-optimization?include=${action.practitioner.id}`)}
                  className="p-2 hover:bg-al-blue-100 rounded-lg transition-colors text-al-blue-600"
                  title="Ajouter à une tournée"
                >
                  <Route className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => navigate(`/pitch?practitioner=${action.practitioner.id}`)}
              className="flex-1 py-2 px-3 text-sm font-medium text-slate-600 hover:text-al-blue-600 hover:bg-al-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Pitch
            </button>
            <button
              onClick={() => navigate(`/visit-report?practitioner=${action.practitioner.id}`)}
              className="flex-1 py-2 px-3 text-sm font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Compte-rendu
            </button>
            <a
              href={`tel:${action.practitioner.contact.phone}`}
              className="flex-1 py-2 px-3 text-sm font-medium text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Appeler
            </a>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Mes Prochaines Actions
          </span>
        </h1>
        <p className="text-slate-600">
          Actions prioritaires recommandées par ARIA basées sur vos données {periodLabel.toLowerCase()}
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-slate-800">{stats.total - stats.completed}</div>
          <div className="text-sm text-slate-500">Actions en attente</div>
        </div>
        <div className="glass-card p-4 text-center bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <div className="text-3xl font-bold text-red-600">{stats.critical}</div>
          <div className="text-sm text-red-600">Critiques</div>
        </div>
        <div className="glass-card p-4 text-center bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <div className="text-3xl font-bold text-amber-600">{stats.byType.visit_kol}</div>
          <div className="text-sm text-amber-600">Visites KOL</div>
        </div>
        <div className="glass-card p-4 text-center bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <div className="text-3xl font-bold text-emerald-600">{stats.byType.opportunity}</div>
          <div className="text-sm text-emerald-600">Opportunités</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === null
                ? 'bg-al-blue-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toutes ({stats.total})
          </button>
          {(Object.keys(ACTION_CONFIG) as Array<keyof typeof ACTION_CONFIG>).map(type => {
            const config = ACTION_CONFIG[type];
            const count = stats.byType[type];
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => setFilter(filter === type ? null : type)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === type
                    ? `bg-gradient-to-r ${config.color} text-white`
                    : `${config.bg} ${config.text} hover:opacity-80`
                }`}
              >
                {config.label} ({count})
              </button>
            );
          })}

          <div className="flex-1" />

          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded border-slate-300"
            />
            Afficher terminées ({stats.completed})
          </label>
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredActions.map((action, index) => (
            <ActionCard key={action.id} action={action} index={index} />
          ))}
        </AnimatePresence>

        {filteredActions.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <CheckCircle2 className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              {filter ? 'Aucune action de ce type' : 'Toutes les actions sont terminées !'}
            </h3>
            <p className="text-slate-500">
              {filter
                ? 'Essayez un autre filtre ou consultez toutes les actions'
                : 'Excellent travail ! Revenez plus tard pour de nouvelles recommandations.'}
            </p>
          </motion.div>
        )}
      </div>

      {/* AI Tip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-purple-800 mb-1">Conseil ARIA</p>
            <p className="text-sm text-purple-700">
              {stats.critical > 0
                ? `Concentrez-vous d'abord sur les ${stats.critical} action(s) critique(s). Ces KOLs n'ont pas été vus depuis longtemps et représentent un enjeu majeur.`
                : stats.byType.opportunity > 0
                  ? `Vous avez ${stats.byType.opportunity} opportunité(s) de croissance identifiée(s). C'est le moment idéal pour développer ces relations.`
                  : 'Votre portefeuille est bien géré ! Continuez à maintenir le contact régulier avec vos praticiens clés.'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
