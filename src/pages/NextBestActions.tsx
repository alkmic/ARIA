import { useState, useMemo, useEffect } from 'react';
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
  Award,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  BarChart3,
  Lightbulb,
  Shield,
  Newspaper,
  XCircle,
  Timer,
  Brain
} from 'lucide-react';
import { DataService } from '../services/dataService';
import { generateIntelligentActions } from '../services/actionIntelligence';
import { useUserDataStore, type AIAction } from '../stores/useUserDataStore';
import { useTimePeriod } from '../contexts/TimePeriodContext';

// Configuration des types d'actions
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
  },
  competitor: {
    icon: Shield,
    color: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    label: 'Concurrence'
  },
  publication: {
    icon: Newspaper,
    color: 'from-cyan-500 to-blue-500',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    label: 'Publication'
  }
};

// Composant Score Gauge
const ScoreGauge = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-slate-500 w-16">{label}</span>
    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={`h-full ${color} rounded-full`}
      />
    </div>
    <span className="text-xs font-medium text-slate-600 w-8">{value}</span>
  </div>
);

// Composant Action Card amélioré
const ActionCard = ({
  action,
  index,
  onComplete,
  onSnooze,
  onDismiss
}: {
  action: AIAction;
  index: number;
  onComplete: (id: string, note?: string) => void;
  onSnooze: (id: string) => void;
  onDismiss: (id: string) => void;
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  const config = ACTION_CONFIG[action.type];
  const Icon = config.icon;
  const practitioner = DataService.getPractitionerById(action.practitionerId);

  if (!practitioner) return null;

  const handleComplete = () => {
    if (showCompleteForm) {
      onComplete(action.id, completionNote);
      setShowCompleteForm(false);
      setCompletionNote('');
    } else {
      setShowCompleteForm(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.05 }}
      layout
      className="glass-card overflow-hidden"
    >
      {/* Top colored bar with score */}
      <div className={`h-2 bg-gradient-to-r ${config.color} relative`}>
        <div
          className="absolute right-0 top-0 h-full bg-black/20"
          style={{ width: `${100 - action.scores.overall}%` }}
        />
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Icon with score */}
          <div className="relative">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center">
              <span className="text-xs font-bold text-slate-700">{action.scores.overall}</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}>
                {config.label}
              </span>
              {action.priority === 'critical' && (
                <span className="text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  CRITIQUE
                </span>
              )}
              {action.priority === 'high' && (
                <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2.5 py-1 rounded-full">
                  Priorité haute
                </span>
              )}
            </div>

            <h3 className="font-bold text-lg text-slate-800 mb-1">{action.title}</h3>

            <button
              onClick={() => navigate(`/practitioner/${practitioner.id}`)}
              className="flex items-center gap-2 text-sm text-al-blue-600 hover:text-al-blue-700 mb-2"
            >
              <User className="w-4 h-4" />
              <span className="font-medium">{practitioner.title} {practitioner.firstName} {practitioner.lastName}</span>
              {practitioner.metrics.isKOL && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">KOL</span>
              )}
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">{practitioner.address.city}</span>
            </button>

            {/* AI Summary */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <Brain className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700 leading-relaxed">
                  {action.aiJustification.summary}
                </p>
              </div>
            </div>

            {/* Quick metrics */}
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                {action.reason}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                {action.suggestedDate}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setShowCompleteForm(!showCompleteForm)}
              className="p-2.5 hover:bg-green-100 rounded-lg transition-colors text-green-600"
              title="Marquer comme fait"
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => onSnooze(action.id)}
              className="p-2.5 hover:bg-amber-100 rounded-lg transition-colors text-amber-600"
              title="Reporter"
            >
              <Timer className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDismiss(action.id)}
              className="p-2.5 hover:bg-red-100 rounded-lg transition-colors text-red-400"
              title="Ignorer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Completion form */}
        <AnimatePresence>
          {showCompleteForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-slate-200"
            >
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Note de complétion (optionnel)
              </label>
              <textarea
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                placeholder="Décrivez brièvement ce qui a été fait..."
                className="input-field w-full resize-none"
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleComplete}
                  className="btn-primary bg-gradient-to-r from-green-500 to-emerald-500 flex-1"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmer
                </button>
                <button
                  onClick={() => setShowCompleteForm(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expand/Collapse for details */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-al-blue-600 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Masquer les détails
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Voir l'analyse complète
            </>
          )}
        </button>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-4">
                {/* Scores */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Scores IA
                  </h4>
                  <div className="space-y-2">
                    <ScoreGauge label="Urgence" value={action.scores.urgency} color="bg-red-500" />
                    <ScoreGauge label="Impact" value={action.scores.impact} color="bg-blue-500" />
                    <ScoreGauge label="Probabilité" value={action.scores.probability} color="bg-green-500" />
                  </div>
                </div>

                {/* Metrics */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Métriques clés
                  </h4>
                  <ul className="space-y-1">
                    {action.aiJustification.metrics.map((metric, i) => (
                      <li key={i} className="text-sm text-blue-600 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        {metric}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risks & Opportunities */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Risks */}
                  <div className="bg-red-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Risques si non-action
                    </h4>
                    <ul className="space-y-1">
                      {action.aiJustification.risks.map((risk, i) => (
                        <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Opportunities */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Opportunités
                    </h4>
                    <ul className="space-y-1">
                      {action.aiJustification.opportunities.map((opp, i) => (
                        <li key={i} className="text-sm text-green-600 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                          {opp}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Contextual alerts */}
                {(action.aiJustification.competitorAlert || action.aiJustification.contextualNews || action.aiJustification.trendAnalysis) && (
                  <div className="space-y-2">
                    {action.aiJustification.competitorAlert && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
                        {action.aiJustification.competitorAlert}
                      </div>
                    )}
                    {action.aiJustification.contextualNews && (
                      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-sm text-cyan-700">
                        {action.aiJustification.contextualNews}
                      </div>
                    )}
                    {action.aiJustification.trendAnalysis && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
                        {action.aiJustification.trendAnalysis}
                      </div>
                    )}
                  </div>
                )}

                {/* Suggested approach */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
                  <h4 className="text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Approche suggérée par ARIA
                  </h4>
                  <p className="text-sm text-purple-600 leading-relaxed">
                    {action.aiJustification.suggestedApproach}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => navigate(`/practitioner/${practitioner.id}`)}
                    className="flex-1 min-w-[140px] py-2.5 px-4 text-sm font-medium bg-white border border-slate-200 hover:border-al-blue-300 hover:bg-al-blue-50 text-slate-700 hover:text-al-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Voir profil
                  </button>
                  <button
                    onClick={() => navigate(`/pitch?practitioner=${practitioner.id}`)}
                    className="flex-1 min-w-[140px] py-2.5 px-4 text-sm font-medium bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Préparer pitch
                  </button>
                  <button
                    onClick={() => navigate(`/visit-report?practitioner=${practitioner.id}`)}
                    className="flex-1 min-w-[140px] py-2.5 px-4 text-sm font-medium bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Compte-rendu
                  </button>
                  <button
                    onClick={() => navigate(`/tour-optimization?include=${practitioner.id}`)}
                    className="flex-1 min-w-[140px] py-2.5 px-4 text-sm font-medium bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Route className="w-4 h-4" />
                    Ajouter tournée
                  </button>
                  <a
                    href={`tel:${practitioner.contact.phone}`}
                    className="flex-1 min-w-[140px] py-2.5 px-4 text-sm font-medium bg-white border border-slate-200 hover:border-green-300 hover:bg-green-50 text-slate-700 hover:text-green-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    Appeler
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Page principale
export default function NextBestActions() {
  const navigate = useNavigate();
  const { periodLabel } = useTimePeriod();
  const {
    actions: storedActions,
    addAction,
    completeAction,
    snoozeAction,
    dismissAction,
    getActiveActions,
    thresholds,
    getStats
  } = useUserDataStore();

  const [filter, setFilter] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Générer les actions intelligentes au chargement
  useEffect(() => {
    const newActions = generateIntelligentActions(thresholds);

    // Ajouter uniquement les nouvelles actions
    newActions.forEach(action => {
      addAction(action);
    });
  }, [thresholds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Récupérer les actions actives
  const activeActions = useMemo(() => getActiveActions(), [storedActions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtrer les actions
  const filteredActions = useMemo(() => {
    let result = showCompleted
      ? storedActions.filter(a => a.status === 'completed' || a.status === 'pending')
      : activeActions;

    if (filter) {
      result = result.filter(a => a.type === filter);
    }

    return result;
  }, [activeActions, storedActions, filter, showCompleted]);

  // Statistiques
  const stats = useMemo(() => {
    const active = getActiveActions();
    return {
      total: active.length,
      critical: active.filter(a => a.priority === 'critical').length,
      high: active.filter(a => a.priority === 'high').length,
      completed: storedActions.filter(a => a.status === 'completed').length,
      byType: {
        visit_urgent: active.filter(a => a.type === 'visit_urgent').length,
        visit_kol: active.filter(a => a.type === 'visit_kol').length,
        opportunity: active.filter(a => a.type === 'opportunity').length,
        risk: active.filter(a => a.type === 'risk').length,
        followup: active.filter(a => a.type === 'followup').length,
        upsell: active.filter(a => a.type === 'upsell').length,
        competitor: active.filter(a => a.type === 'competitor').length,
        publication: active.filter(a => a.type === 'publication').length,
      }
    };
  }, [storedActions, getActiveActions]); // eslint-disable-line react-hooks/exhaustive-deps

  const userStats = getStats();

  const handleSnooze = (actionId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    snoozeAction(actionId, tomorrow.toISOString());
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
          Recommandations intelligentes générées par ARIA basées sur l'analyse de vos données {periodLabel.toLowerCase()}
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
          <div className="text-sm text-slate-500">Actions</div>
        </div>
        <div className="glass-card p-4 text-center bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <div className="text-3xl font-bold text-red-600">{stats.critical}</div>
          <div className="text-sm text-red-600">Critiques</div>
        </div>
        <div className="glass-card p-4 text-center bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <div className="text-3xl font-bold text-amber-600">{stats.byType.visit_kol}</div>
          <div className="text-sm text-amber-600">KOL</div>
        </div>
        <div className="glass-card p-4 text-center bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <div className="text-3xl font-bold text-emerald-600">{stats.byType.opportunity}</div>
          <div className="text-sm text-emerald-600">Opportunités</div>
        </div>
        <div className="glass-card p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-green-600">Complétées</div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-slate-600">
                <strong className="text-slate-800">{userStats.reportsThisWeek}</strong> compte-rendus cette semaine
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm text-slate-600">
                <strong className="text-slate-800">{userStats.completedActions}</strong> actions complétées
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/data-explorer')}
            className="text-sm text-al-blue-600 hover:text-al-blue-700 font-medium flex items-center gap-1"
          >
            <BarChart3 className="w-4 h-4" />
            Voir analytics
          </button>
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
            Historique ({stats.completed})
          </label>
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredActions.map((action, index) => (
            <ActionCard
              key={action.id}
              action={action}
              index={index}
              onComplete={completeAction}
              onSnooze={handleSnooze}
              onDismiss={dismissAction}
            />
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
              {filter ? 'Aucune action de ce type' : 'Toutes les actions sont traitées !'}
            </h3>
            <p className="text-slate-500">
              {filter
                ? 'Essayez un autre filtre ou consultez toutes les actions'
                : 'Excellent travail ! ARIA analysera vos données pour de nouvelles recommandations.'}
            </p>
          </motion.div>
        )}
      </div>

      {/* AI Insight */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-5 border border-purple-200"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
              Analyse ARIA
              <span className="text-xs font-normal text-purple-500">Mise à jour en temps réel</span>
            </p>
            <p className="text-sm text-purple-700 leading-relaxed">
              {stats.critical > 0
                ? `Attention : ${stats.critical} action(s) critique(s) nécessitent votre attention immédiate. Ces KOLs représentent une part significative de votre volume et n'ont pas été vus depuis longtemps. L'analyse des tendances montre un risque de perte de relation si aucune action n'est entreprise cette semaine.`
                : stats.byType.risk > 0
                  ? `${stats.byType.risk} praticien(s) à risque détecté(s). Leurs scores de fidélité ont baissé récemment. Une intervention rapide pourrait prévenir une attrition. Concentrez-vous sur la compréhension de leurs besoins et proposez des solutions personnalisées.`
                  : stats.byType.opportunity > 0
                    ? `${stats.byType.opportunity} opportunité(s) de croissance identifiée(s). Ces praticiens ont un excellent score de fidélité et un potentiel de développement significatif. Le moment est idéal pour proposer des services additionnels ou une montée en gamme.`
                    : 'Votre portefeuille est en excellente santé ! Continuez à maintenir le contact régulier avec vos praticiens clés pour préserver cette dynamique positive.'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
