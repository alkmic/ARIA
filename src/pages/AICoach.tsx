import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  User,
  ChevronRight,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Download,
  Trash2,
  MessageSquare,
  Zap,
  Brain,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { useGroq } from '../hooks/useGroq';
import { generateCoachResponse } from '../services/coachAI';
import { useAppStore } from '../stores/useAppStore';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import { calculatePeriodMetrics, getTopPractitioners } from '../services/metricsCalculator';
import { DataService } from '../services/dataService';
import { generateQueryContext, generateFullSiteContext, executeQuery } from '../services/dataQueryEngine';
import { universalSearch, getFullDatabaseContext } from '../services/universalSearch';
import type { Practitioner } from '../types';
import { Badge } from '../components/ui/Badge';
import { MarkdownText, InsightBox } from '../components/ui/MarkdownText';

// Types pour les graphiques
type ChartType = 'bar' | 'pie' | 'line';

interface ChartDataPoint {
  name: string;
  value: number;
  secondaryValue?: number;
  color?: string;
}

interface ChartConfig {
  type: ChartType;
  title: string;
  data: ChartDataPoint[];
  xLabel?: string;
  yLabel?: string;
  secondaryLabel?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  practitioners?: (Practitioner & { daysSinceVisit?: number })[];
  insights?: string[];
  chart?: ChartConfig;
  timestamp: Date;
  isMarkdown?: boolean;
  source?: 'llm' | 'local';
}

// Couleurs pour les graphiques
const CHART_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
];

export default function AICoach() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const { practitioners, currentUser, upcomingVisits } = useAppStore();
  const { periodLabel } = useTimePeriod();
  const navigate = useNavigate();
  const { complete, error: groqError } = useGroq();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Suggestions contextuelles - avec exemples de graphiques pour Talk to My Data
  const SUGGESTION_CHIPS = [
    `Qui dois-je voir en priorité ${periodLabel.toLowerCase()} ?`,
    "📊 Graphique des volumes par ville",
    "📈 Évolution de la fidélité par spécialité",
    "🥧 Répartition des praticiens par vingtile",
    "Quels KOLs n'ai-je pas vus depuis 60 jours ?",
    "📊 Top 10 prescripteurs en barres",
    "Praticiens à risque de churn",
    "📈 Comparaison volumes/fidélité par ville",
  ];

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialiser Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('La reconnaissance vocale n\'est pas supportée par votre navigateur. Essayez Chrome ou Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    // Remove markdown for speech
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/_/g, '')
      .replace(/`/g, '');

    // Arrêter toute synthèse en cours
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleAutoSpeak = () => {
    if (autoSpeak && isSpeaking) {
      stopSpeaking();
    }
    setAutoSpeak(!autoSpeak);
  };

  // ============================================
  // TALK TO MY DATA - Détection et génération de graphiques
  // ============================================

  // Détecter si l'utilisateur demande un graphique
  const detectChartRequest = (question: string): { wantsChart: boolean; chartType: ChartType; topic: string } => {
    const q = question.toLowerCase();

    // Mots-clés pour les graphiques
    const chartKeywords = ['graphique', 'graphe', 'chart', 'diagramme', 'visualis', 'courbe', 'barres', 'camembert', '📊', '📈', '🥧'];
    const pieKeywords = ['camembert', 'pie', 'répartition', 'distribution', 'proportion', '🥧'];
    const lineKeywords = ['évolution', 'tendance', 'courbe', 'progression', 'ligne', 'temps'];

    const wantsChart = chartKeywords.some(k => q.includes(k));

    // Déterminer le type de graphique (bar par défaut)
    let chartType: ChartType = 'bar';
    if (pieKeywords.some(k => q.includes(k))) {
      chartType = 'pie';
    } else if (lineKeywords.some(k => q.includes(k))) {
      chartType = 'line';
    }

    // Déterminer le sujet du graphique
    let topic = 'volume';
    if (q.includes('fidélité') || q.includes('loyalty')) topic = 'loyalty';
    else if (q.includes('vingtile') || q.includes('segment')) topic = 'vingtile';
    else if (q.includes('spécialité') || q.includes('specialite')) topic = 'specialty';
    else if (q.includes('ville') || q.includes('city') || q.includes('géograph')) topic = 'city';
    else if (q.includes('kol')) topic = 'kol';
    else if (q.includes('visite') || q.includes('contact')) topic = 'visits';

    return { wantsChart, chartType, topic };
  };

  // Générer les données du graphique basées sur le topic
  const generateChartData = (chartType: ChartType, topic: string): ChartConfig | null => {
    const allPractitioners = DataService.getAllPractitioners();

    switch (topic) {
      case 'city': {
        // Volume par ville
        const cityData = allPractitioners.reduce((acc, p) => {
          const city = p.address.city || 'Autre';
          if (!acc[city]) acc[city] = { volume: 0, count: 0, loyalty: 0 };
          acc[city].volume += p.metrics.volumeL;
          acc[city].count += 1;
          acc[city].loyalty += p.metrics.loyaltyScore;
          return acc;
        }, {} as Record<string, { volume: number; count: number; loyalty: number }>);

        const data = Object.entries(cityData)
          .map(([city, stats]) => ({
            name: city.length > 12 ? city.substring(0, 10) + '...' : city,
            value: Math.round(stats.volume / 1000),
            secondaryValue: Math.round(stats.loyalty / stats.count * 10) / 10
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);

        return {
          type: chartType === 'pie' ? 'pie' : 'bar',
          title: 'Volume par ville (K L/an)',
          data,
          xLabel: 'Ville',
          yLabel: 'Volume (K L)',
          secondaryLabel: 'Fidélité moy.'
        };
      }

      case 'specialty': {
        // Répartition par spécialité
        const specialtyData = allPractitioners.reduce((acc, p) => {
          const specialty = p.specialty || 'Autre';
          if (!acc[specialty]) acc[specialty] = { count: 0, volume: 0, loyalty: 0 };
          acc[specialty].count += 1;
          acc[specialty].volume += p.metrics.volumeL;
          acc[specialty].loyalty += p.metrics.loyaltyScore;
          return acc;
        }, {} as Record<string, { count: number; volume: number; loyalty: number }>);

        const data = Object.entries(specialtyData)
          .map(([specialty, stats]) => ({
            name: specialty.length > 15 ? specialty.substring(0, 12) + '...' : specialty,
            value: chartType === 'pie' ? stats.count : Math.round(stats.volume / 1000),
            secondaryValue: Math.round(stats.loyalty / stats.count * 10) / 10
          }))
          .sort((a, b) => b.value - a.value);

        return {
          type: chartType,
          title: chartType === 'pie' ? 'Répartition par spécialité' : 'Volume par spécialité (K L/an)',
          data,
          xLabel: 'Spécialité',
          yLabel: chartType === 'pie' ? 'Nombre' : 'Volume (K L)',
          secondaryLabel: 'Fidélité moy.'
        };
      }

      case 'vingtile': {
        // Répartition par vingtile
        const vingtileData = allPractitioners.reduce((acc, p) => {
          const vingtile = `V${p.metrics.vingtile}`;
          if (!acc[vingtile]) acc[vingtile] = { count: 0, volume: 0 };
          acc[vingtile].count += 1;
          acc[vingtile].volume += p.metrics.volumeL;
          return acc;
        }, {} as Record<string, { count: number; volume: number }>);

        const data = Object.entries(vingtileData)
          .map(([vingtile, stats]) => ({
            name: vingtile,
            value: stats.count,
            secondaryValue: Math.round(stats.volume / 1000)
          }))
          .sort((a, b) => parseInt(a.name.slice(1)) - parseInt(b.name.slice(1)));

        return {
          type: chartType === 'pie' ? 'pie' : 'bar',
          title: 'Répartition par vingtile',
          data,
          xLabel: 'Vingtile',
          yLabel: 'Nombre de praticiens',
          secondaryLabel: 'Volume (K L)'
        };
      }

      case 'loyalty': {
        // Distribution de la fidélité
        const loyaltyBuckets = ['0-2', '3-4', '5-6', '7-8', '9-10'];
        const loyaltyData = loyaltyBuckets.map(bucket => {
          const [min, max] = bucket.split('-').map(Number);
          const filtered = allPractitioners.filter(p =>
            p.metrics.loyaltyScore >= min && p.metrics.loyaltyScore <= max
          );
          return {
            name: bucket,
            value: filtered.length,
            secondaryValue: Math.round(filtered.reduce((sum, p) => sum + p.metrics.volumeL, 0) / 1000)
          };
        });

        return {
          type: chartType === 'pie' ? 'pie' : 'bar',
          title: 'Distribution par niveau de fidélité',
          data: loyaltyData,
          xLabel: 'Score de fidélité',
          yLabel: 'Nombre de praticiens',
          secondaryLabel: 'Volume (K L)'
        };
      }

      case 'kol': {
        // KOLs vs non-KOLs
        const kols = allPractitioners.filter(p => p.metrics.isKOL);
        const nonKols = allPractitioners.filter(p => !p.metrics.isKOL);

        const data = [
          {
            name: 'KOLs',
            value: kols.length,
            secondaryValue: Math.round(kols.reduce((sum, p) => sum + p.metrics.volumeL, 0) / 1000)
          },
          {
            name: 'Non-KOLs',
            value: nonKols.length,
            secondaryValue: Math.round(nonKols.reduce((sum, p) => sum + p.metrics.volumeL, 0) / 1000)
          }
        ];

        return {
          type: 'pie',
          title: 'Répartition KOLs vs Non-KOLs',
          data,
          yLabel: 'Nombre',
          secondaryLabel: 'Volume total (K L)'
        };
      }

      default: {
        // Top prescripteurs par volume (défaut)
        const topPractitioners = [...allPractitioners]
          .sort((a, b) => b.metrics.volumeL - a.metrics.volumeL)
          .slice(0, 10);

        const data = topPractitioners.map(p => ({
          name: `${p.lastName.substring(0, 8)}`,
          value: Math.round(p.metrics.volumeL / 1000),
          secondaryValue: p.metrics.loyaltyScore
        }));

        return {
          type: 'bar',
          title: 'Top 10 prescripteurs par volume (K L/an)',
          data,
          xLabel: 'Praticien',
          yLabel: 'Volume (K L)',
          secondaryLabel: 'Fidélité'
        };
      }
    }
  };

  // ============================================
  // FIN TALK TO MY DATA
  // ============================================

  // Créer un contexte ultra-enrichi pour l'IA avec accès complet aux données
  // et moteur de requêtes intelligent
  const buildContext = (userQuestion?: string) => {
    // Calculer les métriques de la période sélectionnée
    const periodMetrics = calculatePeriodMetrics(practitioners, upcomingVisits, 'month');

    // Utiliser le nouveau service de données pour les statistiques
    const stats = DataService.getGlobalStats();
    const kols = DataService.getKOLs();
    const atRiskPractitioners = DataService.getAtRiskPractitioners().slice(0, 10);

    // Top praticiens par volume
    const topPractitioners = getTopPractitioners(practitioners, 'year', 10);

    // KOLs non vus depuis longtemps
    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    const undervisitedKOLs = kols.filter(p => {
      if (!p.lastVisitDate) return true;
      const lastVisit = new Date(p.lastVisitDate);
      return lastVisit < ninetyDaysAgo;
    });

    // NOUVEAU: Utiliser le moteur de recherche universelle pour analyser la question
    let queryContext = '';
    let specificPractitionerContext = '';
    let universalSearchContext = '';

    if (userQuestion) {
      // Utiliser la recherche universelle pour des résultats complets
      const universalResult = universalSearch(userQuestion);
      if (universalResult.results.length > 0) {
        universalSearchContext = universalResult.context;
      }

      // Exécuter aussi la requête classique pour compatibilité
      const queryResult = executeQuery(userQuestion);

      // Si des résultats spécifiques sont trouvés, générer le contexte de requête
      if (queryResult.practitioners.length > 0 && queryResult.practitioners.length < practitioners.length) {
        queryContext = generateQueryContext(userQuestion);
      }

      // Recherche floue additionnelle pour le contexte de praticien spécifique
      const matches = DataService.fuzzySearchPractitioner(userQuestion);
      if (matches.length > 0 && matches.length <= 3) {
        specificPractitionerContext = matches.map(p =>
          DataService.getCompletePractitionerContext(p.id)
        ).join('\n');
      }
    }

    // Générer le contexte complet du site pour les questions générales
    const fullSiteContext = userQuestion ? getFullDatabaseContext() : generateFullSiteContext();

    return `Tu es un assistant stratégique expert pour un délégué pharmaceutique spécialisé en oxygénothérapie à domicile chez Air Liquide Healthcare.

Tu as accès à la BASE DE DONNÉES COMPLÈTE des praticiens et peux répondre à N'IMPORTE QUELLE question sur les données, incluant :
- Questions sur des praticiens spécifiques (par nom, prénom, ville, spécialité)
- Questions sur les publications, actualités, certifications
- Questions statistiques (combien de..., qui a le plus de..., moyenne de...)
- Questions géographiques (praticiens par ville)
- Questions sur les KOLs, vingtiles, volumes

CONTEXTE TERRITOIRE (${periodLabel}) :
- Nombre total de praticiens : ${stats.totalPractitioners} (${stats.pneumologues} pneumologues, ${stats.generalistes} médecins généralistes)
- KOLs identifiés : ${stats.totalKOLs}
- Volume total annuel : ${(stats.totalVolume / 1000).toFixed(0)}K L
- Fidélité moyenne : ${stats.averageLoyalty.toFixed(1)}/10
- Visites ${periodLabel} : ${periodMetrics.visitsCount}/${periodMetrics.visitsObjective}
- Praticiens à risque : ${atRiskPractitioners.length}
- KOLs sous-visités : ${undervisitedKOLs.length}

MÉTRIQUES DE PERFORMANCE ${periodLabel.toUpperCase()} :
- Objectif visites : ${periodMetrics.visitsObjective}
- Visites réalisées : ${periodMetrics.visitsCount} (${((periodMetrics.visitsCount / periodMetrics.visitsObjective) * 100).toFixed(0)}%)
- Nouveaux prescripteurs : ${periodMetrics.newPrescribers}
- Volume période : ${(periodMetrics.totalVolume / 1000).toFixed(0)}K L
- Croissance volume : +${periodMetrics.volumeGrowth.toFixed(1)}%

TOP 10 PRATICIENS (VOLUME ANNUEL) :
${topPractitioners.map((p, i) =>
  `${i + 1}. ${p.title} ${p.firstName} ${p.lastName} - ${p.specialty}, ${p.city}
   Volume: ${(p.volumeL / 1000).toFixed(0)}K L/an | Fidélité: ${p.loyaltyScore}/10 | Vingtile: ${p.vingtile}${p.isKOL ? ' | KOL' : ''}`
).join('\n')}

PRATICIENS À RISQUE :
${atRiskPractitioners.length > 0 ? atRiskPractitioners.slice(0, 5).map(p =>
  `- ${p.title} ${p.lastName} (${p.address.city}): Fidélité ${p.metrics.loyaltyScore}/10, Volume ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an${p.metrics.isKOL ? ', KOL' : ''}`
).join('\n') : '- Aucun praticien à risque critique'}

KOLS SOUS-VISITÉS (>90 jours) :
${undervisitedKOLs.length > 0 ? undervisitedKOLs.slice(0, 5).map(p =>
  `- ${p.title} ${p.firstName} ${p.lastName} (${p.address.city}): ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an`
).join('\n') : '- Tous les KOLs sont à jour'}

${universalSearchContext}
${queryContext}
${specificPractitionerContext}
${fullSiteContext}

INSTRUCTIONS IMPORTANTES :
- Réponds de manière concise et professionnelle avec des recommandations concrètes
- Utilise le format Markdown pour mettre en valeur les informations importantes (**gras**, *italique*)
- Pour les questions sur des praticiens spécifiques, utilise les données ci-dessus pour donner des réponses PRÉCISES
- Si on demande "quel médecin dont le prénom est X a le plus de Y", cherche dans la base complète ci-dessus
- Priorise par impact stratégique : KOL > Volume > Urgence > Fidélité
- Fournis des chiffres précis basés sur les données réelles
- Sois encourageant et positif
- Adapte tes recommandations à la période (${periodLabel})`;
  };

  const handleSend = async (question: string) => {
    if (!question.trim()) return;

    // Ajouter message utilisateur
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // TALK TO MY DATA: Détecter si l'utilisateur demande un graphique
    const { wantsChart, chartType, topic } = detectChartRequest(question);
    let chartConfig: ChartConfig | null = null;

    if (wantsChart) {
      chartConfig = generateChartData(chartType, topic);
    }

    try {
      // D'abord essayer avec Groq AI pour une vraie conversation
      const context = buildContext(question);
      const conversationHistory = messages
        .slice(-4) // Garder les 4 derniers échanges pour le contexte
        .map(m => `${m.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      // Ajouter contexte spécifique pour les graphiques
      const chartContext = wantsChart ? `
L'utilisateur demande un graphique. Un graphique de type "${chartType}" sur le thème "${topic}" sera généré automatiquement et affiché.
Fournis une brève analyse textuelle des données qui accompagnera le graphique. Ne décris pas le graphique lui-même, mais donne des insights sur les données.
` : '';

      const prompt = `${context}

HISTORIQUE DE CONVERSATION :
${conversationHistory}
${chartContext}
QUESTION ACTUELLE :
${question}

Réponds de manière précise et professionnelle en utilisant le format Markdown pour mettre en valeur les informations importantes. Si la question concerne des praticiens spécifiques, utilise les données fournies ci-dessus.`;

      const aiResponse = await complete([{ role: 'user', content: prompt }]);

      if (aiResponse) {
        // Réponse IA réussie
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse,
          chart: chartConfig || undefined,
          timestamp: new Date(),
          isMarkdown: true,
          source: 'llm'
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Text-to-speech si activé
        if (autoSpeak) {
          speak(aiResponse);
        }
      } else {
        throw new Error('Pas de réponse de l\'IA');
      }
    } catch (error) {
      console.log('Mode local activé (Groq non configuré)');

      // Utiliser le système intelligent local
      await new Promise(resolve => setTimeout(resolve, 500));

      // Si un graphique est demandé, générer une réponse adaptée
      let response;
      if (wantsChart && chartConfig) {
        const dataPoints = chartConfig.data.slice(0, 3);
        const topItem = dataPoints[0];
        response = {
          message: `Voici le graphique demandé.\n\n**Points clés :**\n- **${topItem.name}** arrive en tête avec ${topItem.value} ${chartConfig.yLabel || 'unités'}\n- ${dataPoints.length > 1 ? `Suivi par **${dataPoints[1].name}** (${dataPoints[1].value})` : ''}\n- Total de ${chartConfig.data.length} éléments analysés`,
          practitioners: undefined,
          insights: [`📊 Graphique "${chartConfig.title}" généré avec succès`],
          isMarkdown: true
        };
      } else {
        response = generateCoachResponse(
          question,
          practitioners,
          currentUser.objectives
        );
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        practitioners: response.practitioners,
        insights: response.insights,
        chart: chartConfig || undefined,
        timestamp: new Date(),
        isMarkdown: response.isMarkdown,
        source: 'local'
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (autoSpeak && response.message) {
        speak(response.message);
      }
    }

    setIsTyping(false);
  };

  const clearConversation = () => {
    if (confirm('Êtes-vous sûr de vouloir effacer toute la conversation ?')) {
      setMessages([]);
      stopSpeaking();
    }
  };

  const exportConversation = () => {
    const text = messages
      .map(m => `[${m.timestamp.toLocaleTimeString('fr-FR')}] ${m.role === 'user' ? 'Vous' : 'Coach IA'}: ${m.content}`)
      .join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coach-ia-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-al-blue-500 via-purple-500 to-al-sky flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <span className="bg-gradient-to-r from-al-blue-600 to-purple-600 bg-clip-text text-transparent">
                Coach IA Avancé
              </span>
            </h1>
            <p className="text-slate-600 text-sm sm:text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Assistant stratégique intelligent avec accès complet aux données
            </p>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <>
                <button
                  onClick={exportConversation}
                  className="btn-secondary px-3 py-2 text-sm flex items-center gap-2"
                  title="Exporter la conversation"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={clearConversation}
                  className="btn-secondary px-3 py-2 text-sm flex items-center gap-2"
                  title="Effacer la conversation"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Effacer</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Controls vocaux */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={toggleAutoSpeak}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              autoSpeak
                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                : 'bg-slate-100 text-slate-600 border-2 border-slate-200'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            Lecture auto {autoSpeak ? 'ON' : 'OFF'}
          </button>

          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium border-2 border-red-300 flex items-center gap-2 animate-pulse"
            >
              <VolumeX className="w-4 h-4" />
              Arrêter la lecture
            </button>
          )}

          {groqError && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs border border-amber-200">
              <AlertCircle className="w-4 h-4" />
              <span>Mode local (LLM non configuré)</span>
            </div>
          )}

          <span className="text-xs text-slate-500 px-2 hidden sm:inline">
            Posez n'importe quelle question sur vos praticiens
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 glass-card flex flex-col overflow-hidden border-2 border-slate-200/50">
        {/* Suggestions (si pas de messages) */}
        {messages.length === 0 && (
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              <p className="text-sm font-semibold text-slate-700">
                Dialogue libre activé - Posez n'importe quelle question !
              </p>
            </div>
            <p className="text-sm text-slate-500 mb-3">Exemples de questions :</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTION_CHIPS.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => setInput(chip)}
                  className="px-3 py-2 bg-white text-slate-700 rounded-full text-xs sm:text-sm font-medium
                           hover:bg-gradient-to-r hover:from-purple-100 hover:to-blue-100 hover:text-purple-700
                           transition-all hover:shadow-md border border-slate-200 hover:border-purple-300"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 sm:gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-al-blue-500 via-purple-500 to-al-sky flex items-center justify-center flex-shrink-0 shadow-md">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-al-blue-500 to-purple-500 text-white rounded-2xl rounded-tr-md px-3 sm:px-4 py-2 sm:py-3 shadow-md'
                    : 'space-y-3'
                }`}>
                  {/* Message content */}
                  <div className="flex items-start justify-between gap-2">
                    {message.role === 'assistant' ? (
                      <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-slate-100">
                        {message.isMarkdown ? (
                          <MarkdownText className="text-sm sm:text-base text-slate-700 leading-relaxed">
                            {message.content}
                          </MarkdownText>
                        ) : (
                          <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        )}

                        {/* Source indicator */}
                        {message.source && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              message.source === 'llm'
                                ? 'bg-purple-100 text-purple-600'
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              {message.source === 'llm' ? 'Groq AI' : 'Intelligence locale'}
                            </span>
                            <button
                              onClick={() => speak(message.content)}
                              className="p-1 hover:bg-slate-100 rounded transition-colors"
                              title="Lire à voix haute"
                            >
                              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm sm:text-base whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>

                  {/* Cartes praticiens dans la réponse */}
                  {message.practitioners && message.practitioners.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {message.practitioners.map((p, i) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-white rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 cursor-pointer hover:scale-[1.01] hover:shadow-lg transition-all border border-slate-100 shadow-sm"
                          onClick={() => navigate(`/practitioner/${p.id}`)}
                        >
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            i === 0 ? 'bg-gradient-to-br from-red-500 to-rose-500' :
                            i < 3 ? 'bg-gradient-to-br from-orange-500 to-amber-500' :
                            'bg-gradient-to-br from-amber-400 to-yellow-400'
                          }`}>
                            {i + 1}
                          </div>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-al-blue-500 to-al-blue-600 flex items-center justify-center text-white font-bold text-sm hidden sm:flex">
                            {p.firstName[0]}{p.lastName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm sm:text-base text-slate-800 truncate">
                                {p.title} {p.firstName} {p.lastName}
                              </p>
                              {p.isKOL && (
                                <Badge variant="warning" size="sm">KOL</Badge>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500">
                              {p.specialty} • Vingtile {p.vingtile} • {(p.volumeL / 1000).toFixed(0)}K L/an
                            </p>
                          </div>
                          {p.daysSinceVisit !== undefined && p.daysSinceVisit < 999 && (
                            <span className={`text-xs sm:text-sm font-medium whitespace-nowrap px-2 py-1 rounded-lg ${
                              p.daysSinceVisit > 90 ? 'bg-red-100 text-red-600' :
                              p.daysSinceVisit > 60 ? 'bg-orange-100 text-orange-600' :
                              'bg-green-100 text-green-600'
                            }`}>
                              {p.daysSinceVisit}j
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" />
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* TALK TO MY DATA: Graphique interactif */}
                  {message.chart && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 bg-white rounded-xl p-4 shadow-sm border border-slate-200"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {message.chart.type === 'pie' ? (
                          <PieChartIcon className="w-5 h-5 text-purple-500" />
                        ) : message.chart.type === 'line' ? (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : (
                          <BarChart3 className="w-5 h-5 text-blue-500" />
                        )}
                        <h4 className="font-semibold text-slate-800">{message.chart.title}</h4>
                      </div>

                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {message.chart.type === 'pie' ? (
                            <PieChart>
                              <Pie
                                data={message.chart.data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {message.chart.data.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                              <Legend />
                            </PieChart>
                          ) : message.chart.type === 'line' ? (
                            <LineChart data={message.chart.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#8B5CF6"
                                strokeWidth={2}
                                dot={{ fill: '#8B5CF6', strokeWidth: 2 }}
                                name={message.chart.yLabel || 'Valeur'}
                              />
                              {message.chart.data[0]?.secondaryValue !== undefined && (
                                <Line
                                  type="monotone"
                                  dataKey="secondaryValue"
                                  stroke="#10B981"
                                  strokeWidth={2}
                                  dot={{ fill: '#10B981', strokeWidth: 2 }}
                                  name={message.chart.secondaryLabel || 'Secondaire'}
                                />
                              )}
                            </LineChart>
                          ) : (
                            <BarChart data={message.chart.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" angle={-45} textAnchor="end" height={60} />
                              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                              <Legend />
                              <Bar
                                dataKey="value"
                                fill="#3B82F6"
                                radius={[4, 4, 0, 0]}
                                name={message.chart.yLabel || 'Valeur'}
                              >
                                {message.chart.data.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Bar>
                              {message.chart.data[0]?.secondaryValue !== undefined && (
                                <Bar
                                  dataKey="secondaryValue"
                                  fill="#10B981"
                                  radius={[4, 4, 0, 0]}
                                  name={message.chart.secondaryLabel || 'Secondaire'}
                                />
                              )}
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      </div>

                      {/* Légende des données */}
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          {message.chart.data.slice(0, 5).map((d, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                              />
                              {d.name}: {d.value}
                            </span>
                          ))}
                          {message.chart.data.length > 5 && (
                            <span className="text-slate-400">+{message.chart.data.length - 5} autres</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Insights */}
                  {message.insights && message.insights.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.insights.map((insight, i) => (
                        <InsightBox
                          key={i}
                          variant={
                            insight.toLowerCase().includes('urgent') || insight.toLowerCase().includes('risque') ? 'warning' :
                            insight.toLowerCase().includes('objectif atteint') ? 'success' :
                            insight.toLowerCase().includes('volume') || insight.toLowerCase().includes('opportunité') ? 'warning' :
                            insight.toLowerCase().includes('graphique') ? 'success' :
                            'info'
                          }
                        >
                          {insight}
                        </InsightBox>
                      ))}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-2">
                    <span>{message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-al-blue-500 via-purple-500 to-al-sky flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-slate-100">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="ml-2 text-xs text-slate-400">Analyse en cours...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white/80 backdrop-blur-sm rounded-b-2xl">
          <div className="flex gap-2 sm:gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(input)}
              placeholder="Posez votre question sur vos praticiens..."
              className="input-field flex-1 text-sm sm:text-base"
              disabled={isTyping}
            />
            <button
              onClick={toggleListening}
              disabled={isTyping}
              className={`p-2 sm:px-4 sm:py-2 rounded-lg transition-all flex items-center gap-2 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                  : 'btn-secondary'
              } disabled:opacity-50`}
              title={isListening ? 'Arrêter l\'écoute' : 'Dicter la question'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isTyping}
              className="btn-primary px-4 sm:px-6 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-al-blue-500 to-purple-500 hover:from-al-blue-600 hover:to-purple-600 shadow-lg shadow-purple-500/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {isListening && (
            <p className="text-xs text-red-600 mt-2 animate-pulse font-medium flex items-center gap-2">
              <Mic className="w-3 h-3" />
              Écoute en cours... Parlez maintenant
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
