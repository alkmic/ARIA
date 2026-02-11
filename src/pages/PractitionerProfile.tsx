import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Phone, Mail, MapPin, TrendingUp, Sparkles, Target,
  CheckCircle, Lightbulb, Swords, Calendar, Wand2, Newspaper, FileEdit,
  MessageCircle, Mic
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDate } from '../utils/helpers';
import { NewsTab } from '../components/practitioner/NewsTab';
import { NotesTab } from '../components/practitioner/NotesTab';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import { PeriodSelector } from '../components/shared/PeriodSelector';

type TabType = 'synthesis' | 'history' | 'metrics' | 'news' | 'notes';

export default function PractitionerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPractitionerById } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>('synthesis');
  const { timePeriod, periodLabel, periodLabelShort } = useTimePeriod();

  const practitioner = getPractitionerById(id || '');

  if (!practitioner) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-xl text-slate-600">Praticien non trouvé</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Retour au dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Générer des points clés si absents
  const keyPoints = practitioner.keyPoints || [
    `${practitioner.specialty === 'Pneumologue' ? 'Expert' : 'Référent'} reconnu en oxygénothérapie BPCO`,
    `Vingtile ${practitioner.vingtile} - ${practitioner.vingtile <= 2 ? 'Top 10%' : practitioner.vingtile <= 5 ? 'Top 25%' : 'Prescripteur actif'}`,
    `${practitioner.patientCount} patients suivis, opportunité de croissance`,
    practitioner.isKOL ? 'Leader d\'opinion - Relais stratégique sur le territoire' : 'Potentiel de développement important'
  ];

  // Générer l'historique de volumes si absent
  const volumeHistory = practitioner.volumeHistory || generateVolumeHistory(practitioner.volumeL);

  const tabs = [
    { id: 'synthesis', label: 'Synthèse IA', icon: Sparkles },
    { id: 'history', label: 'Historique', icon: Calendar },
    { id: 'metrics', label: 'Métriques', icon: TrendingUp },
    { id: 'news', label: 'Actualités', icon: Newspaper },
    { id: 'notes', label: 'Notes', icon: FileEdit }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </button>
          <PeriodSelector size="sm" />
        </div>
        <div className="flex items-center gap-3">
          {practitioner.id.startsWith('pract-new') && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold rounded-full shadow-lg shadow-indigo-500/30 animate-pulse">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
              NOUVEAU
            </span>
          )}
          <Badge variant={practitioner.riskLevel === 'high' ? 'danger' : practitioner.riskLevel === 'medium' ? 'warning' : 'success'}>
            Risque {practitioner.riskLevel}
          </Badge>
          {practitioner.isKOL && (
            <Badge variant="warning">Key Opinion Leader</Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Initials & Name */}
          <div className="glass-card p-6 text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 ${
              practitioner.isKOL ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
              practitioner.specialty === 'Pneumologue' ? 'bg-gradient-to-br from-al-blue-500 to-al-blue-600' :
              'bg-gradient-to-br from-slate-500 to-slate-600'
            }`}>
              {practitioner.firstName[0]}{practitioner.lastName[0]}
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">
              {practitioner.title} {practitioner.firstName} {practitioner.lastName}
            </h1>
            <p className="text-slate-600 mb-4">{practitioner.specialty}</p>

            {/* Contact Info */}
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-al-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-700">{practitioner.address}</p>
                  <p className="text-slate-600">{practitioner.postalCode} {practitioner.city}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-al-blue-500" />
                <a href={`tel:${practitioner.phone}`} className="text-slate-700 hover:text-al-blue-500">
                  {practitioner.phone}
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-al-blue-500" />
                <a href={`mailto:${practitioner.email}`} className="text-slate-700 hover:text-al-blue-500 truncate">
                  {practitioner.email}
                </a>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="glass-card p-6">
            <div className="mb-4 p-4 bg-gradient-to-br from-al-blue-50 to-al-sky/10 rounded-xl text-center">
              <p className="text-sm text-slate-600 mb-1">VINGTILE</p>
              <p className="text-4xl font-bold gradient-text">{practitioner.vingtile}</p>
              <p className="text-sm text-slate-600 mt-1">
                Top {practitioner.vingtile * 5}%
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-600">Volume {periodLabelShort}</span>
                <span className="font-semibold text-slate-800">
                  {(practitioner.volumeL / 1000).toFixed(0)}K L
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-600">Patients</span>
                <span className="font-semibold text-slate-800">~{practitioner.patientCount}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-600">Tendance</span>
                <span className={`font-semibold flex items-center gap-1 ${
                  practitioner.trend === 'up' ? 'text-success' :
                  practitioner.trend === 'down' ? 'text-danger' : 'text-slate-600'
                }`}>
                  {practitioner.trend === 'up' ? '+12%' :
                   practitioner.trend === 'down' ? '-8%' : 'Stable'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Fidélité</span>
                <span className="font-semibold text-slate-800">
                  {practitioner.loyaltyScore}/10
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate(`/pitch?practitionerId=${practitioner.id}`)}
            >
              <Wand2 className="w-5 h-5 mr-2" />
              Préparer la visite
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate(`/visit-report?practitionerId=${practitioner.id}`)}
            >
              <Mic className="w-5 h-5 mr-2" />
              Compte-rendu de visite
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate(`/coach?q=Analyse complète de ${practitioner.title} ${practitioner.firstName} ${practitioner.lastName}`)}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Demander au Coach IA
            </Button>
            <Button variant="secondary" className="w-full">
              <Phone className="w-5 h-5 mr-2" />
              Appeler
            </Button>
          </div>
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Navigation */}
          <div className="glass-card p-2">
            <div className="flex gap-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-al-blue-500 to-al-sky text-white shadow-lg'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'synthesis' && (
              <SynthesisTab practitioner={practitioner} keyPoints={keyPoints} />
            )}
            {activeTab === 'history' && (
              <HistoryTab conversations={practitioner.conversations} timePeriod={timePeriod} periodLabel={periodLabel} />
            )}
            {activeTab === 'metrics' && (
              <MetricsTab volumeHistory={volumeHistory} practitioner={practitioner} periodLabel={periodLabel} periodLabelShort={periodLabelShort} />
            )}
            {activeTab === 'news' && (
              <NewsTab practitioner={practitioner} />
            )}
            {activeTab === 'notes' && (
              <NotesTab practitioner={practitioner} />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Tab Synthesis
function SynthesisTab({ practitioner, keyPoints }: { practitioner: any; keyPoints: string[] }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* AI Summary */}
      <div className="glass-card p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
          <Sparkles className="w-5 h-5 text-al-blue-500" />
          Synthèse IA
        </h3>
        <p className="text-slate-600 leading-relaxed">{practitioner.aiSummary}</p>
      </div>

      {/* Key Points */}
      <div className="glass-card p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Target className="w-5 h-5 text-al-blue-500" />
          Points clés pour la prochaine visite
        </h3>
        <ul className="space-y-3">
          {keyPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
              <span className="text-slate-700">{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Battlecard */}
      <div className="glass-card p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Swords className="w-5 h-5 text-amber-600" />
          Battlecard vs Concurrence
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white/80 rounded-xl">
            <p className="text-sm font-semibold text-amber-700 mb-2">vs Vivisol</p>
            <p className="text-sm text-slate-600">
              ✓ Réactivité SAV +30% (astreinte 24/7)<br />
              ✓ Télésuivi O₂ inclus gratuitement<br />
              ✓ Formation patient à domicile par IDE
            </p>
          </div>
          <div className="p-4 bg-white/80 rounded-xl">
            <p className="text-sm font-semibold text-amber-700 mb-2">vs Linde Healthcare</p>
            <p className="text-sm text-slate-600">
              ✓ Connectivité IoT native sur tous les DM<br />
              ✓ Chronic Care Connect (suivi digital)<br />
              ✓ Plateforme Orkyn' patient dédiée
            </p>
          </div>
          <div className="p-4 bg-white/80 rounded-xl">
            <p className="text-sm font-semibold text-amber-700 mb-2">vs SOS Oxygène</p>
            <p className="text-sm text-slate-600">
              ✓ Couverture nationale (vs régionale)<br />
              ✓ Gamme VNI/PPC complète (ALMS)<br />
              ✓ R&D interne et innovation continue
            </p>
          </div>
          <div className="p-4 bg-white/80 rounded-xl">
            <p className="text-sm font-semibold text-amber-700 mb-2">vs Bastide Médical</p>
            <p className="text-sm text-slate-600">
              ✓ Expertise respiratoire pure (vs multi-activité)<br />
              ✓ LPPR spécialiste avec forfaits optimisés<br />
              ✓ Support technique spécialisé 24/7
            </p>
          </div>
        </div>
      </div>

      {/* Next Best Action */}
      <div className="glass-card p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
          <Lightbulb className="w-5 h-5 text-green-600" />
          Prochaine meilleure action
        </h3>
        <p className="text-slate-700 mb-4">{practitioner.nextBestAction}</p>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => navigate(`/pitch?practitionerId=${practitioner.id}`)}>
            <Wand2 className="w-4 h-4 mr-1" />
            Préparer le pitch
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/visit-report?practitionerId=${practitioner.id}`)}>
            <Mic className="w-4 h-4 mr-1" />
            Compte-rendu
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// Tab History
function HistoryTab({ conversations, timePeriod, periodLabel }: { conversations: any[]; timePeriod: string; periodLabel: string }) {
  // Filtrer les conversations selon la période
  const now = new Date();
  const filteredConversations = conversations.filter(conv => {
    const convDate = new Date(conv.date);
    if (timePeriod === 'month') {
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      return convDate >= oneMonthAgo;
    } else if (timePeriod === 'quarter') {
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      return convDate >= threeMonthsAgo;
    } else {
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      return convDate >= oneYearAgo;
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Period indicator */}
      <div className="glass-card p-3 bg-al-blue-50 border-al-blue-100">
        <p className="text-sm text-slate-600">
          Affichage des visites : <span className="font-semibold text-slate-800">{periodLabel}</span>
          {filteredConversations.length !== conversations.length && (
            <span className="ml-2 text-slate-500">
              ({filteredConversations.length} sur {conversations.length})
            </span>
          )}
        </p>
      </div>

      {filteredConversations.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucune conversation enregistrée pour cette période</p>
        </div>
      ) : (
        filteredConversations.map((conv, i) => (
          <div key={i} className="glass-card p-5 relative">
            {/* Connection Line */}
            {i < filteredConversations.length - 1 && (
              <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-slate-200 -mb-4" />
            )}

            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                conv.sentiment === 'positive' ? 'bg-green-100 text-green-600' :
                conv.sentiment === 'negative' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
              }`}>
                {conv.sentiment === 'positive' ? '+' :
                 conv.sentiment === 'negative' ? '-' : '='}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">{formatDate(conv.date)}</p>
                <p className="text-sm text-slate-500">
                  {conv.type || 'Visite'} • {conv.duration || '25 min'}
                </p>
              </div>
              <Badge variant={
                conv.sentiment === 'positive' ? 'success' :
                conv.sentiment === 'negative' ? 'danger' : 'default'
              } size="sm">
                {conv.sentiment}
              </Badge>
            </div>

            {/* Summary */}
            <p className="text-slate-600 mb-3 ml-13">{conv.summary}</p>

            {/* Actions */}
            {conv.actions && conv.actions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 ml-13">
                <p className="text-sm font-medium text-slate-700 mb-2">Actions convenues :</p>
                <ul className="space-y-1">
                  {conv.actions.map((action: string, j: number) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))
      )}
    </motion.div>
  );
}

// Tab Metrics
function MetricsTab({ volumeHistory, practitioner, periodLabel, periodLabelShort }: { volumeHistory: any[]; practitioner: any; periodLabel: string; periodLabelShort: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Volume Chart */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Évolution des volumes ({periodLabel})</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={volumeHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#0066B3"
              strokeWidth={3}
              dot={{ fill: '#0066B3', strokeWidth: 2 }}
              name="Volumes Dr."
            />
            <Line
              type="monotone"
              dataKey="vingtileAvg"
              stroke="#00B5AD"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Moyenne vingtile"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-sm text-slate-600 mb-1">Volume {periodLabelShort}</p>
          <p className="text-2xl font-bold text-slate-800">
            {(practitioner.volumeL / 1000).toFixed(0)}K L
          </p>
          <p className="text-sm text-success mt-1">+12% vs période précédente</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-sm text-slate-600 mb-1">Visites réalisées</p>
          <p className="text-2xl font-bold text-slate-800">{practitioner.visitCount}</p>
          <p className="text-sm text-slate-500 mt-1">Dernière : {practitioner.lastVisitDate ? formatDate(practitioner.lastVisitDate) : 'Jamais'}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-sm text-slate-600 mb-1">Score fidélité</p>
          <p className="text-2xl font-bold text-slate-800">{practitioner.loyaltyScore}/10</p>
          <p className="text-sm text-al-blue-500 mt-1">
            {practitioner.loyaltyScore >= 8 ? 'Excellent' :
             practitioner.loyaltyScore >= 6 ? 'Bon' : 'À améliorer'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Helper to generate volume history (deterministic, no Math.random() during render)
function generateVolumeHistory(annualVolume: number) {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const monthlyBase = annualVolume / 12;
  const vingtileAvg = monthlyBase * 0.95;
  // Deterministic seasonal pattern (winter peak for respiratory)
  const seasonalFactors = [0.92, 0.88, 0.95, 1.0, 1.02, 0.98, 0.90, 0.88, 0.95, 1.05, 1.10, 1.08];

  return months.map((month, i) => ({
    month,
    volume: Math.round(monthlyBase * seasonalFactors[i]),
    vingtileAvg: Math.round(vingtileAvg * (0.97 + (i % 3) * 0.015))
  }));
}
