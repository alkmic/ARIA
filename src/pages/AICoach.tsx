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
  TrendingUp,
  Code2,
  Lightbulb
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
  Legend,
  ComposedChart
} from 'recharts';
import { useGroq } from '../hooks/useGroq';
import { generateCoachResponse } from '../services/coachAI';
import { useAppStore } from '../stores/useAppStore';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import { calculatePeriodMetrics, getTopPractitioners } from '../services/metricsCalculator';
import { DataService } from '../services/dataService';
import { generateQueryContext, generateFullSiteContext, executeQuery } from '../services/dataQueryEngine';
import { universalSearch, getFullDatabaseContext } from '../services/universalSearch';
import {
  CHART_GENERATION_PROMPT,
  getDataContextForLLM,
  parseLLMChartResponse,
  generateChartFromSpec,
  generateChartLocally,
  DEFAULT_CHART_COLORS,
  addToChartHistory,
  getChartHistory,
  buildChartContextForLLM,
  isFollowUpQuestion,
  extractQueryParameters,
  clearChartHistory,
  type ChartSpec
} from '../services/agenticChartEngine';
import type { Practitioner } from '../types';
import { Badge } from '../components/ui/Badge';
import { MarkdownText, InsightBox } from '../components/ui/MarkdownText';

// Types pour les graphiques agentiques
interface AgenticChartData {
  spec: ChartSpec;
  data: Array<{ name: string; [key: string]: string | number }>;
  insights: string[];
  suggestions: string[];
  generatedByLLM: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  practitioners?: (Practitioner & { daysSinceVisit?: number })[];
  insights?: string[];
  agenticChart?: AgenticChartData;
  suggestions?: string[];
  timestamp: Date;
  isMarkdown?: boolean;
  source?: 'llm' | 'local' | 'agentic';
}

// Couleurs pour les graphiques
const CHART_COLORS = DEFAULT_CHART_COLORS;

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

  // Suggestions contextuelles - Talk to My Data (approche agentique)
  const SUGGESTION_CHIPS = [
    "Montre-moi un graphique des volumes par ville",
    "Quelle est la répartition des praticiens par niveau de risque ?",
    "Compare les KOLs aux autres praticiens en volume",
    "Top 10 prescripteurs avec leur fidélité",
    "Distribution des praticiens par ancienneté de visite",
    "Analyse les pneumologues vs généralistes",
    "Camembert des segments par vingtile",
    `Qui dois-je voir en priorité ${periodLabel.toLowerCase()} ?`,
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

  // NOTE: La génération de graphiques est maintenant gérée par agenticChartEngine.ts
  // avec les fonctions generateChartLocally() et interpretQuestionLocally()

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

  // Détecter si la question demande une visualisation
  const isVisualizationRequest = (q: string): boolean => {
    const normalized = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const patterns = [
      /graphique|graph|chart|diagramme|visualis|courbe|barres?|camembert|histogramme/,
      /montre[- ]?moi|affiche|fais[- ]?moi voir|presente|dessine/,
      /📊|📈|🥧|📉/,
      /repartition|distribution|top\s*\d+|classement|compare/,
      /combien|nombre de|total de|analyse/,
      /par ville|par specialite|par segment|par vingtile|par risque/
    ];
    return patterns.some(p => p.test(normalized));
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

    // Détecter le type de question
    const wantsVisualization = isVisualizationRequest(question);
    const isFollowUp = isFollowUpQuestion(question);
    const chartHistory = getChartHistory();
    const hasRecentChart = chartHistory.length > 0;

    try {
      // ============================================
      // MODE 1: Question de suivi sur un graphique précédent
      // ============================================
      if (isFollowUp && hasRecentChart) {
        console.log('🔄 Mode suivi - question sur graphique précédent');

        const chartContext = buildChartContextForLLM();
        const context = buildContext(question);

        // Construire le prompt avec contexte du graphique
        const followUpPrompt = `${context}

${chartContext}

L'utilisateur pose une question de SUIVI concernant le graphique précédent.

QUESTION DE L'UTILISATEUR :
"${question}"

INSTRUCTIONS :
1. Analyse la question par rapport aux données du graphique précédent
2. Si la question semble contredire les données, explique la réalité des données
3. Sois précis et utilise les chiffres du graphique pour appuyer ta réponse
4. Utilise le format Markdown

Réponds de manière précise et contextuelle.`;

        const aiResponse = await complete([{ role: 'user', content: followUpPrompt }]);

        if (aiResponse) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date(),
            isMarkdown: true,
            source: 'llm'
          };

          setMessages(prev => [...prev, assistantMessage]);

          if (autoSpeak) {
            speak(aiResponse);
          }
        } else {
          throw new Error('Pas de réponse du LLM');
        }
      }
      // ============================================
      // MODE 2: Demande de visualisation/graphique
      // ============================================
      else if (wantsVisualization) {
        console.log('🤖 Mode agentique activé - génération de graphique');

        const dataContext = getDataContextForLLM();
        const extractedParams = extractQueryParameters(question);

        // Ajouter les paramètres extraits au prompt pour guider le LLM
        let paramHints = '';
        if (extractedParams.limit) {
          paramHints += `\n⚠️ L'utilisateur demande EXACTEMENT ${extractedParams.limit} éléments (limit: ${extractedParams.limit})`;
        }
        if (extractedParams.wantsKOL) {
          paramHints += `\n⚠️ L'utilisateur s'intéresse aux KOLs`;
        }
        if (extractedParams.wantsSpecialty) {
          paramHints += `\n⚠️ Spécialité ciblée : ${extractedParams.wantsSpecialty}`;
        }

        const chartPrompt = `${CHART_GENERATION_PROMPT}

${dataContext}

DEMANDE DE L'UTILISATEUR :
"${question}"
${paramHints}

Génère la spécification JSON du graphique demandé. RESPECTE EXACTEMENT les paramètres demandés (nombre d'éléments, filtres, etc.).`;

        const chartResponse = await complete([{ role: 'user', content: chartPrompt }]);

        if (chartResponse) {
          // Parser la réponse du LLM pour extraire la spec
          let spec = parseLLMChartResponse(chartResponse);

          if (spec) {
            // Forcer le limit si extrait de la question mais pas dans la spec
            if (extractedParams.limit && (!spec.query.limit || spec.query.limit !== extractedParams.limit)) {
              console.log(`📊 Forcing limit to ${extractedParams.limit} as requested`);
              spec.query.limit = extractedParams.limit;
            }

            // Exécuter la spec contre les vraies données
            const chartResult = generateChartFromSpec(spec);

            // Sauvegarder dans l'historique pour les questions de suivi
            addToChartHistory({
              question,
              spec: chartResult.spec,
              data: chartResult.data,
              insights: chartResult.insights,
              timestamp: new Date()
            });

            // Générer une description enrichie basée sur les vraies données
            const dataInsight = chartResult.data.length > 0
              ? `\n\n**Résumé des données :**\n${chartResult.insights.map(i => `• ${i}`).join('\n')}`
              : '';

            // Créer le message avec le graphique généré dynamiquement
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `**${spec.title}**\n\n${spec.description || ''}${dataInsight}`,
              agenticChart: {
                spec: chartResult.spec,
                data: chartResult.data,
                insights: chartResult.insights,
                suggestions: chartResult.suggestions,
                generatedByLLM: true
              },
              insights: chartResult.insights,
              suggestions: chartResult.suggestions,
              timestamp: new Date(),
              isMarkdown: true,
              source: 'agentic'
            };

            setMessages(prev => [...prev, assistantMessage]);

            if (autoSpeak) {
              speak(`${spec.title}. ${chartResult.insights.join('. ')}`);
            }
          } else {
            // Fallback si le parsing échoue
            console.error('Parsing LLM response failed, trying fallback');
            throw new Error('Impossible de parser la réponse du LLM');
          }
        } else {
          throw new Error('Pas de réponse du LLM');
        }
      }
      // ============================================
      // MODE 3: Conversation textuelle classique
      // ============================================
      else {
        const context = buildContext(question);
        const chartContext = hasRecentChart ? buildChartContextForLLM() : '';

        const conversationHistory = messages
          .slice(-6)
          .map(m => `${m.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${m.content}`)
          .join('\n\n');

        const prompt = `${context}
${chartContext}

HISTORIQUE DE CONVERSATION :
${conversationHistory}

QUESTION ACTUELLE :
${question}

Réponds de manière précise et professionnelle en utilisant le format Markdown. Si la question concerne des données précises, utilise les informations disponibles.`;

        const aiResponse = await complete([{ role: 'user', content: prompt }]);

        if (aiResponse) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date(),
            isMarkdown: true,
            source: 'llm'
          };

          setMessages(prev => [...prev, assistantMessage]);

          if (autoSpeak) {
            speak(aiResponse);
          }
        } else {
          throw new Error('Pas de réponse de l\'IA');
        }
      }
    } catch (error) {
      console.log('Mode local activé (LLM non disponible)', error);

      // ============================================
      // FALLBACK LOCAL : Utiliser le moteur de génération intelligent
      // ============================================
      await new Promise(resolve => setTimeout(resolve, 300));

      if (wantsVisualization) {
        // Utiliser le nouveau système d'interprétation locale intelligent
        const chartResult = generateChartLocally(question);

        if (chartResult && chartResult.data.length > 0) {
          const firstMetric = chartResult.spec.query.metrics[0]?.name || 'value';
          const topItems = chartResult.data.slice(0, 3);

          // Convertir au format agentique pour l'affichage
          const agenticData: AgenticChartData = {
            spec: chartResult.spec,
            data: chartResult.data,
            insights: chartResult.insights,
            suggestions: chartResult.suggestions,
            generatedByLLM: false
          };

          // Sauvegarder dans l'historique pour les questions de suivi
          addToChartHistory({
            question,
            spec: chartResult.spec,
            data: chartResult.data,
            insights: chartResult.insights,
            timestamp: new Date()
          });

          // Générer un message descriptif
          const response = {
            message: `**${chartResult.spec.title}**\n\n${chartResult.spec.description}\n\n**Résumé :**\n${chartResult.insights.map(i => `• ${i}`).join('\n')}\n\n**Top ${Math.min(3, topItems.length)} :**\n${topItems.map((item, i) => `${i + 1}. **${item.name}** : ${item[firstMetric]}`).join('\n')}`,
            insights: chartResult.insights,
            suggestions: chartResult.suggestions
          };

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.message,
            agenticChart: agenticData,
            insights: response.insights,
            suggestions: response.suggestions,
            timestamp: new Date(),
            isMarkdown: true,
            source: 'local'
          };

          setMessages(prev => [...prev, assistantMessage]);

          if (autoSpeak) {
            speak(response.message);
          }
        }
      } else {
        // Fallback conversation
        const response = generateCoachResponse(
          question,
          practitioners,
          currentUser.objectives
        );

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message,
          practitioners: response.practitioners,
          insights: response.insights,
          timestamp: new Date(),
          isMarkdown: response.isMarkdown,
          source: 'local'
        };

        setMessages(prev => [...prev, assistantMessage]);

        if (autoSpeak && response.message) {
          speak(response.message);
        }
      }
    }

    setIsTyping(false);
  };

  const clearConversation = () => {
    if (confirm('Êtes-vous sûr de vouloir effacer toute la conversation ?')) {
      setMessages([]);
      clearChartHistory(); // Effacer aussi l'historique des graphiques
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

                  {/* TALK TO MY DATA: Graphique Agentique */}
                  {message.agenticChart && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 bg-white rounded-xl p-4 shadow-sm border border-slate-200"
                    >
                      {/* En-tête avec indicateur agentique */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {message.agenticChart.spec.chartType === 'pie' ? (
                            <PieChartIcon className="w-5 h-5 text-purple-500" />
                          ) : message.agenticChart.spec.chartType === 'line' ? (
                            <TrendingUp className="w-5 h-5 text-green-500" />
                          ) : message.agenticChart.spec.chartType === 'composed' ? (
                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                          ) : (
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                          )}
                          <h4 className="font-semibold text-slate-800">{message.agenticChart.spec.title}</h4>
                        </div>
                        {message.agenticChart.generatedByLLM && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-full">
                            <Code2 className="w-3 h-3" />
                            Généré par IA
                          </span>
                        )}
                      </div>

                      {/* Graphique dynamique */}
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {(() => {
                            const chart = message.agenticChart!;
                            const data = chart.data;
                            const metrics = chart.spec.query.metrics;
                            const primaryMetric = metrics[0]?.name || Object.keys(data[0] || {}).find(k => k !== 'name') || 'value';
                            const secondaryMetric = metrics[1]?.name;

                            if (chart.spec.chartType === 'pie') {
                              return (
                                <PieChart>
                                  <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                    outerRadius={90}
                                    fill="#8884d8"
                                    dataKey={primaryMetric}
                                  >
                                    {data.map((_, index) => (
                                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                  <Legend />
                                </PieChart>
                              );
                            }

                            if (chart.spec.chartType === 'line') {
                              return (
                                <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                  <Legend />
                                  <Line
                                    type="monotone"
                                    dataKey={primaryMetric}
                                    stroke="#8B5CF6"
                                    strokeWidth={2}
                                    dot={{ fill: '#8B5CF6', strokeWidth: 2 }}
                                    name={primaryMetric}
                                  />
                                  {secondaryMetric && (
                                    <Line
                                      type="monotone"
                                      dataKey={secondaryMetric}
                                      stroke="#10B981"
                                      strokeWidth={2}
                                      dot={{ fill: '#10B981', strokeWidth: 2 }}
                                      name={secondaryMetric}
                                    />
                                  )}
                                </LineChart>
                              );
                            }

                            if (chart.spec.chartType === 'composed') {
                              return (
                                <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" angle={-45} textAnchor="end" height={60} />
                                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                  <Legend />
                                  <Bar dataKey={primaryMetric} fill="#3B82F6" radius={[4, 4, 0, 0]} name={primaryMetric}>
                                    {data.map((_, index) => (
                                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                  </Bar>
                                  {secondaryMetric && (
                                    <Line type="monotone" dataKey={secondaryMetric} stroke="#EF4444" strokeWidth={2} name={secondaryMetric} />
                                  )}
                                </ComposedChart>
                              );
                            }

                            // Default: Bar chart
                            return (
                              <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" angle={-45} textAnchor="end" height={60} />
                                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                <Legend />
                                <Bar dataKey={primaryMetric} fill="#3B82F6" radius={[4, 4, 0, 0]} name={primaryMetric}>
                                  {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                  ))}
                                </Bar>
                                {secondaryMetric && (
                                  <Bar dataKey={secondaryMetric} fill="#10B981" radius={[4, 4, 0, 0]} name={secondaryMetric} />
                                )}
                              </BarChart>
                            );
                          })()}
                        </ResponsiveContainer>
                      </div>

                      {/* Insights générés */}
                      {message.agenticChart.insights.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                          {message.agenticChart.insights.map((insight, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                              <MarkdownText className="text-sm">{insight}</MarkdownText>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Suggestions de suivi */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-xs text-slate-500 mb-2">Pour approfondir :</p>
                          <div className="flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, i) => (
                              <button
                                key={i}
                                onClick={() => setInput(suggestion)}
                                className="px-2 py-1 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors border border-slate-200"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Insights standalone (sans graphique) */}
                  {message.insights && message.insights.length > 0 && !message.agenticChart && (
                    <div className="mt-3 space-y-2">
                      {message.insights.map((insight, i) => (
                        <InsightBox
                          key={i}
                          variant={
                            insight.toLowerCase().includes('urgent') || insight.toLowerCase().includes('risque') ? 'warning' :
                            insight.toLowerCase().includes('objectif atteint') ? 'success' :
                            insight.toLowerCase().includes('volume') || insight.toLowerCase().includes('opportunité') ? 'warning' :
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
