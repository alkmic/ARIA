import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Phone, Mail, MapPin, TrendingUp, Sparkles, Target,
  CheckCircle, Lightbulb, Swords, Calendar, Wand2, Newspaper, FileEdit,
  AlertTriangle, Shield, FileText, Clock, Eye, Brain, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useUserDataStore } from '../stores/useUserDataStore';
import { DataService } from '../services/dataService';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDate } from '../utils/helpers';
import { NewsTab } from '../components/practitioner/NewsTab';
import { NotesTab } from '../components/practitioner/NotesTab';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import { PeriodSelector } from '../components/shared/PeriodSelector';
import type { Practitioner } from '../types';
import type { PractitionerProfile as PractitionerProfileType } from '../types/database';

type TabType = 'synthesis' | 'history' | 'metrics' | 'news' | 'notes';

// Battlecard arguments per competitor (module-level constant)
const BATTLECARD_ARGS: Record<string, string[]> = {
  'Vivisol': ['Réactivité SAV +30%', 'Télésuivi inclus gratuitement', 'Formation patient à domicile'],
  'Linde': ['Connectivité IoT native', 'Formation continue incluse', 'Plateforme digitale dédiée'],
  'SOS Oxygène': ['Couverture nationale plus large', 'Programme éducation thérapeutique complet', 'Service technique 24/7'],
  'Bastide': ['Expertise historique en O2 liquide', 'Monitoring à distance avancé', 'Gamme de concentrateurs portables'],
  'Orkyn': ['Innovation technologique supérieure', 'Accompagnement patient personnalisé', 'Solutions connectées évolutives'],
};

export default function PractitionerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPractitionerById } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>('synthesis');
  const { timePeriod, periodLabel, periodLabelShort } = useTimePeriod();

  const practitioner = getPractitionerById(id || '');

  // Get enriched profile from DataService (notes, news, visit history)
  const enrichedProfile = useMemo(() => {
    if (!id) return null;
    return DataService.getPractitionerById(id) || null;
  }, [id]);

  // Get user-created data (visit reports, personal notes)
  const { visitReports, userNotes } = useUserDataStore();
  const myReports = useMemo(() =>
    visitReports.filter(r => r.practitionerId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [visitReports, id]
  );
  const myNotes = useMemo(() =>
    userNotes.filter(n => n.practitionerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [userNotes, id]
  );

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

  // Générer l'historique de volumes si absent
  const volumeHistory = practitioner.volumeHistory || generateVolumeHistory(practitioner.volumeL, practitioner.id);

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
          <div className="space-y-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate(`/pitch?practitionerId=${practitioner.id}`)}
            >
              <Wand2 className="w-5 h-5 mr-2" />
              Générer un pitch
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate(`/visit-report?practitionerId=${practitioner.id}`)}
            >
              <FileText className="w-5 h-5 mr-2" />
              Nouveau compte-rendu
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
              <SynthesisTab
                practitioner={practitioner}
                enrichedProfile={enrichedProfile}
                myReports={myReports}
                myNotes={myNotes}
                navigate={navigate}
              />
            )}
            {activeTab === 'history' && (
              <HistoryTab
                practitioner={practitioner}
                conversations={practitioner.conversations}
                myReports={myReports}
                timePeriod={timePeriod}
                periodLabel={periodLabel}
              />
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

// ============================================================
// SYNTHESIS TAB - Full AI-powered analysis
// ============================================================
interface SynthesisTabProps {
  practitioner: Practitioner;
  enrichedProfile: PractitionerProfileType | null;
  myReports: ReturnType<typeof useUserDataStore.getState>['visitReports'];
  myNotes: ReturnType<typeof useUserDataStore.getState>['userNotes'];
  navigate: ReturnType<typeof useNavigate>;
}

function SynthesisTab({ practitioner, enrichedProfile, myReports, myNotes, navigate }: SynthesisTabProps) {
  const profile = enrichedProfile;

  // Compute today once for all memos (avoids React compiler purity issues)
  const [today] = useState(() => new Date());

  // Build real AI synthesis from enriched data
  const aiAnalysis = useMemo(() => {
    const daysSinceVisit = practitioner.lastVisitDate
      ? Math.floor((today.getTime() - new Date(practitioner.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Build synthesis paragraphs from actual data
    const segments: string[] = [];

    // Identity & positioning
    const ranking = practitioner.vingtile <= 2 ? 'top prescripteur (Top 10%)'
      : practitioner.vingtile <= 5 ? 'prescripteur important (Top 25%)'
      : practitioner.vingtile <= 10 ? 'prescripteur actif (Top 50%)'
      : 'prescripteur régulier';

    segments.push(
      `${practitioner.title} ${practitioner.lastName} est ${practitioner.specialty.toLowerCase()} à ${practitioner.city}, classé ${ranking} avec un volume annuel de ${(practitioner.volumeL / 1000).toFixed(0)}K litres.`
    );

    // Loyalty & relationship
    if (practitioner.loyaltyScore >= 8) {
      segments.push(`Fidélité excellente (${practitioner.loyaltyScore}/10) — relation solide à maintenir et développer.`);
    } else if (practitioner.loyaltyScore >= 6) {
      segments.push(`Fidélité correcte (${practitioner.loyaltyScore}/10) — potentiel de renforcement de la relation.`);
    } else {
      segments.push(`Fidélité faible (${practitioner.loyaltyScore}/10) — attention requise pour prévenir la perte.`);
    }

    // Visit urgency
    if (daysSinceVisit === null) {
      segments.push('Ce praticien n\'a jamais été visité. Première visite à planifier en priorité.');
    } else if (daysSinceVisit > 90) {
      segments.push(`Dernière visite il y a ${daysSinceVisit} jours — visite urgente recommandée.`);
    } else if (daysSinceVisit > 60) {
      segments.push(`Dernière visite il y a ${daysSinceVisit} jours — planifier une visite prochainement.`);
    }

    // KOL status
    if (practitioner.isKOL) {
      segments.push('Leader d\'opinion identifié — influence significative sur les pratiques de prescription du territoire.');
    }

    // Recent publications
    if (profile && profile.news.length > 0) {
      const publications = profile.news.filter(n => n.type === 'publication');
      if (publications.length > 0) {
        segments.push(`${publications.length} publication(s) récente(s) — opportunité d'accroche pour la prochaine visite.`);
      }
    }

    // User reports context
    if (myReports.length > 0) {
      const lastReport = myReports[0];
      const sentimentLabel = lastReport.extractedInfo.sentiment === 'positive' ? 'positif'
        : lastReport.extractedInfo.sentiment === 'negative' ? 'négatif' : 'neutre';
      segments.push(`Dernier compte-rendu (${lastReport.date}) : sentiment ${sentimentLabel}. ${lastReport.extractedInfo.keyPoints.length > 0 ? lastReport.extractedInfo.keyPoints[0] : ''}`);
    }

    return segments.join(' ');
  }, [practitioner, profile, myReports, today]);

  // Generate real key points from data
  const keyPoints = useMemo(() => {
    const points: string[] = [];

    // From enriched notes
    if (profile && profile.notes.length > 0) {
      const latestNote = profile.notes[0];
      if (latestNote.nextAction) {
        points.push(`Suivi en attente : ${latestNote.nextAction}`);
      }
    }

    // From user reports
    if (myReports.length > 0) {
      const lastReport = myReports[0];
      lastReport.extractedInfo.nextActions.slice(0, 2).forEach(action => {
        points.push(action);
      });
      lastReport.extractedInfo.opportunities.slice(0, 1).forEach(opp => {
        points.push(`Opportunité : ${opp}`);
      });
    }

    // From publications
    if (profile && profile.news.length > 0) {
      const recentPub = profile.news.find(n => n.type === 'publication');
      if (recentPub) {
        points.push(`Mentionner sa publication : "${recentPub.title}"`);
      }
    }

    // Strategic points based on metrics
    if (practitioner.loyaltyScore < 6) {
      points.push('Renforcer la relation — proposer un accompagnement personnalisé');
    }
    if (practitioner.isKOL) {
      points.push('Discuter des études cliniques récentes et opportunités de collaboration');
    }
    if (practitioner.vingtile <= 3 && practitioner.trend === 'down') {
      points.push('Investiguer la baisse de volume — risque de perte important');
    }
    if (points.length < 3) {
      points.push('Point sur les patients actuels et nouvelles solutions disponibles');
    }

    return points.slice(0, 5);
  }, [practitioner, profile, myReports]);

  // Generate real competitive intelligence from notes
  const competitorInsights = useMemo(() => {
    const competitors = ['Vivisol', 'Linde', 'SOS Oxygène', 'Bastide', 'Orkyn'];
    const mentions: { competitor: string; context: string }[] = [];

    if (profile) {
      // Search in notes
      profile.notes.forEach(note => {
        competitors.forEach(comp => {
          if (note.content.toLowerCase().includes(comp.toLowerCase())) {
            mentions.push({
              competitor: comp,
              context: note.content.substring(0, 120) + '...',
            });
          }
        });
      });
    }

    // Also search in user reports
    myReports.forEach(report => {
      report.extractedInfo.competitorsMentioned?.forEach(comp => {
        mentions.push({
          competitor: comp,
          context: `Mentionné dans le compte-rendu du ${report.date}`,
        });
      });
    });

    return mentions;
  }, [profile, myReports]);

  // Determine risk assessment
  const riskAssessment = useMemo(() => {
    const risks: { label: string; severity: 'high' | 'medium' | 'low' }[] = [];
    const daysSince = practitioner.lastVisitDate
      ? Math.floor((today.getTime() - new Date(practitioner.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSince > 90) risks.push({ label: `Pas de visite depuis ${daysSince > 200 ? '+200' : daysSince} jours`, severity: 'high' });
    if (practitioner.loyaltyScore < 5) risks.push({ label: `Fidélité critique (${practitioner.loyaltyScore}/10)`, severity: 'high' });
    if (practitioner.trend === 'down') risks.push({ label: 'Volume en baisse', severity: 'medium' });
    if (competitorInsights.length > 0) risks.push({ label: `${competitorInsights.length} mention(s) concurrence`, severity: 'medium' });
    if (practitioner.isKOL && daysSince > 60) risks.push({ label: 'KOL sous-visité', severity: 'high' });

    return risks;
  }, [practitioner, competitorInsights, today]);

  // Real next best action
  const nextBestAction = useMemo(() => {
    const daysSince = practitioner.lastVisitDate
      ? Math.floor((today.getTime() - new Date(practitioner.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSince === 999) return 'Planifier une première visite de découverte pour établir la relation.';
    if (riskAssessment.some(r => r.severity === 'high')) {
      if (practitioner.isKOL) return 'Visite urgente KOL — préparer un pitch personnalisé avec les dernières innovations.';
      if (practitioner.loyaltyScore < 5) return 'Visite de reconquête — proposer un plan d\'accompagnement renforcé.';
      return 'Visite prioritaire — reprendre contact et identifier les besoins actuels.';
    }
    if (myReports.length > 0 && myReports[0].extractedInfo.nextActions.length > 0) {
      return myReports[0].extractedInfo.nextActions[0];
    }
    if (profile && profile.notes.length > 0 && profile.notes[0].nextAction) {
      return profile.notes[0].nextAction;
    }
    return practitioner.isKOL
      ? 'Maintenir le contact — discuter des évolutions cliniques et renforcer le partenariat.'
      : 'Visite de suivi — faire le point sur les patients et identifier les opportunités de développement.';
  }, [practitioner, profile, myReports, riskAssessment, today]);

  // Determine which competitors to show in battlecard
  const battlecardCompetitors = useMemo(() => {
    const mentioned = new Set(competitorInsights.map(c => c.competitor));
    // Always show competitors that were mentioned + 1 default if none
    const result: string[] = [];
    mentioned.forEach(c => {
      const key = Object.keys(BATTLECARD_ARGS).find(k => c.toLowerCase().includes(k.toLowerCase()));
      if (key && !result.includes(key)) result.push(key);
    });
    // If no competitors mentioned, show the 2 most common
    if (result.length === 0) {
      result.push('Vivisol', 'Linde');
    }
    return result.slice(0, 3);
  }, [competitorInsights]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* AI Analysis */}
      <div className="glass-card p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
          <Brain className="w-5 h-5 text-purple-500" />
          Analyse IA du praticien
        </h3>
        <p className="text-slate-600 leading-relaxed">{aiAnalysis}</p>

        {/* Risk indicators */}
        {riskAssessment.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {riskAssessment.map((risk, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                  risk.severity === 'high'
                    ? 'bg-red-100 text-red-700'
                    : risk.severity === 'medium'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {risk.severity === 'high' ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
                {risk.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Key Points for Next Visit */}
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

      {/* Competitive Intelligence */}
      <div className="glass-card p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Swords className="w-5 h-5 text-amber-600" />
          Intelligence concurrentielle
        </h3>

        {/* Detected competitor mentions */}
        {competitorInsights.length > 0 && (
          <div className="mb-4 p-3 bg-white/80 rounded-lg border border-amber-200">
            <p className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {competitorInsights.length} mention(s) concurrence détectée(s)
            </p>
            {competitorInsights.slice(0, 3).map((ci, i) => (
              <p key={i} className="text-xs text-slate-600 mt-1">
                <strong>{ci.competitor}</strong> — {ci.context}
              </p>
            ))}
          </div>
        )}

        {/* Battlecard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {battlecardCompetitors.map(comp => (
            <div key={comp} className="p-4 bg-white/80 rounded-xl">
              <p className="text-sm font-semibold text-amber-700 mb-2">vs {comp}</p>
              <div className="space-y-1">
                {(BATTLECARD_ARGS[comp] || []).map((arg, i) => (
                  <p key={i} className="text-sm text-slate-600 flex items-start gap-1">
                    <Shield className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                    {arg}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Visit Reports */}
      {myReports.length > 0 && (
        <div className="glass-card p-6 bg-gradient-to-br from-purple-50/50 to-blue-50/50">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <FileText className="w-5 h-5 text-purple-500" />
            Mes comptes-rendus ({myReports.length})
          </h3>
          <div className="space-y-3">
            {myReports.slice(0, 3).map(report => (
              <div key={report.id} className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    {report.date} à {report.time}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    report.extractedInfo.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                    report.extractedInfo.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {report.extractedInfo.sentiment}
                  </span>
                </div>
                {report.extractedInfo.keyPoints.length > 0 && (
                  <p className="text-xs text-slate-600">{report.extractedInfo.keyPoints.slice(0, 2).join(' • ')}</p>
                )}
                {report.extractedInfo.nextActions.length > 0 && (
                  <p className="text-xs text-al-blue-600 mt-1 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {report.extractedInfo.nextActions[0]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Strategic Notes */}
      {myNotes.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            Mes notes stratégiques ({myNotes.length})
          </h3>
          <div className="space-y-2">
            {myNotes.slice(0, 4).map(note => {
              const typeColors = {
                observation: 'border-blue-200 bg-blue-50',
                strategy: 'border-emerald-200 bg-emerald-50',
                competitive: 'border-amber-200 bg-amber-50',
                reminder: 'border-purple-200 bg-purple-50',
              };
              return (
                <div key={note.id} className={`p-3 rounded-lg border text-sm ${typeColors[note.type] || 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-slate-700">{note.content}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(note.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Best Action */}
      <div className="glass-card p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
          <Lightbulb className="w-5 h-5 text-green-600" />
          Prochaine meilleure action
        </h3>
        <p className="text-slate-700 mb-4">{nextBestAction}</p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/pitch?practitionerId=${practitioner.id}`)}
          >
            <Wand2 className="w-4 h-4 mr-1" />
            Préparer le pitch
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/visit-report?practitionerId=${practitioner.id}`)}
          >
            <FileText className="w-4 h-4 mr-1" />
            Compte-rendu
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/coach`)}
          >
            <Brain className="w-4 h-4 mr-1" />
            Demander au Coach IA
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// HISTORY TAB - Enhanced with user visit reports
// ============================================================
interface HistoryTabProps {
  practitioner: Practitioner;
  conversations: Practitioner['conversations'];
  myReports: ReturnType<typeof useUserDataStore.getState>['visitReports'];
  timePeriod: string;
  periodLabel: string;
}

function HistoryTab({ conversations, myReports, timePeriod, periodLabel }: HistoryTabProps) {
  // Merge conversations with user reports into a unified timeline
  const allEntries = useMemo(() => {
    const entries: Array<{
      date: string;
      summary: string;
      sentiment: 'positive' | 'neutral' | 'negative';
      actions: string[];
      type: string;
      duration: string;
      source: 'system' | 'user';
    }> = [];

    // Add system conversations
    conversations.forEach(conv => {
      entries.push({
        date: conv.date,
        summary: conv.summary,
        sentiment: conv.sentiment,
        actions: conv.actions,
        type: conv.type || 'Visite',
        duration: conv.duration || '25 min',
        source: 'system',
      });
    });

    // Add user visit reports
    myReports.forEach(report => {
      entries.push({
        date: report.date,
        summary: report.extractedInfo.keyPoints.join('. ') || report.transcript.substring(0, 150) + '...',
        sentiment: report.extractedInfo.sentiment,
        actions: report.extractedInfo.nextActions,
        type: 'Compte-rendu ARIA',
        duration: report.time,
        source: 'user',
      });
    });

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [conversations, myReports]);

  // Filter by time period
  const now = new Date();
  const filteredEntries = allEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    if (timePeriod === 'month') {
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      return entryDate >= oneMonthAgo;
    } else if (timePeriod === 'quarter') {
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      return entryDate >= threeMonthsAgo;
    } else {
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      return entryDate >= oneYearAgo;
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
          {filteredEntries.length !== allEntries.length && (
            <span className="ml-2 text-slate-500">
              ({filteredEntries.length} sur {allEntries.length})
            </span>
          )}
        </p>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucune conversation enregistrée pour cette période</p>
        </div>
      ) : (
        filteredEntries.map((entry, i) => (
          <div key={i} className={`glass-card p-5 relative ${entry.source === 'user' ? 'border-l-4 border-l-purple-400' : ''}`}>
            {/* Connection Line */}
            {i < filteredEntries.length - 1 && (
              <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-slate-200 -mb-4" />
            )}

            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                entry.sentiment === 'positive' ? 'bg-green-100 text-green-600' :
                entry.sentiment === 'negative' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
              }`}>
                {entry.sentiment === 'positive' ? '+' :
                 entry.sentiment === 'negative' ? '-' : '='}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">{formatDate(entry.date)}</p>
                <p className="text-sm text-slate-500">
                  {entry.type} • {entry.duration}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {entry.source === 'user' && (
                  <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full font-medium">
                    Mon CR
                  </span>
                )}
                <Badge variant={
                  entry.sentiment === 'positive' ? 'success' :
                  entry.sentiment === 'negative' ? 'danger' : 'default'
                } size="sm">
                  {entry.sentiment}
                </Badge>
              </div>
            </div>

            {/* Summary */}
            <p className="text-slate-600 mb-3 ml-13">{entry.summary}</p>

            {/* Actions */}
            {entry.actions && entry.actions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 ml-13">
                <p className="text-sm font-medium text-slate-700 mb-2">Actions convenues :</p>
                <ul className="space-y-1">
                  {entry.actions.map((action: string, j: number) => (
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

// ============================================================
// METRICS TAB
// ============================================================
function MetricsTab({ volumeHistory, practitioner, periodLabel, periodLabelShort }: { volumeHistory: { month: string; volume: number; vingtileAvg: number }[]; practitioner: Practitioner; periodLabel: string; periodLabelShort: string }) {
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
          <p className={`text-sm mt-1 ${practitioner.trend === 'up' ? 'text-success' : practitioner.trend === 'down' ? 'text-danger' : 'text-slate-500'}`}>
            {practitioner.trend === 'up' ? '+12%' : practitioner.trend === 'down' ? '-8%' : 'Stable'} vs période précédente
          </p>
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

// Helper to generate deterministic volume history
function generateVolumeHistory(annualVolume: number, practitionerId: string) {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const monthlyBase = annualVolume / 12;
  const vingtileAvg = monthlyBase * 0.95;
  // Seed from practitioner ID for deterministic output
  const seed = practitionerId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const pseudoRandom = (i: number) => {
    const x = Math.sin(seed * 31 + i * 17) * 10000;
    return x - Math.floor(x);
  };

  return months.map((month, i) => ({
    month,
    volume: Math.round(monthlyBase * (0.85 + pseudoRandom(i) * 0.3)),
    vingtileAvg: Math.round(vingtileAvg * (0.95 + pseudoRandom(i + 100) * 0.1))
  }));
}
