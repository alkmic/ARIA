import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Lightbulb,
  BookOpen,
  ExternalLink,
  Database,
  FileText,
  X,
  Shield
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
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { useAppStore } from '../stores/useAppStore';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import {
  processQuestion,
  isLLMConfigured,
  hasExternalLLMKey,
  getLLMProviderName,
  getRAGStats,
  getKnowledgeSources,
  type ConversationMessage
} from '../services/aiCoachEngine';
import { useWebLLM } from '../hooks/useWebLLM';
import {
  DEFAULT_CHART_COLORS,
  clearChartHistory,
  type ChartSpec
} from '../services/agenticChartEngine';
import type { Practitioner } from '../types';
import { Badge } from '../components/ui/Badge';
import { useUserDataStore } from '../stores/useUserDataStore';
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
  usedRAG?: boolean;
  ragSources?: { title: string; sourceUrl: string; source: string }[];
}

// Couleurs pour les graphiques
const CHART_COLORS = DEFAULT_CHART_COLORS;

// Palette dégradée pour barres — chaque couleur a un stop clair et foncé
const CHART_GRADIENTS = CHART_COLORS.map((color, i) => ({
  id: `chartGrad${i}`,
  from: color,
  to: adjustColor(color, -25),
}));

// Ajuster la luminosité d'une couleur hex
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Style commun des tooltips
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  backdropFilter: 'blur(8px)',
  borderRadius: '12px',
  border: '1px solid rgba(0, 102, 179, 0.12)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 102, 179, 0.06)',
  padding: '10px 14px',
  fontSize: '13px',
};

// Formateur de valeurs numériques (accepte undefined pour compatibilité Recharts Formatter)
function formatChartValue(value: number | undefined): string {
  if (value == null) return '—';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

export default function AICoach() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [showKnowledgePanel, setShowKnowledgePanel] = useState(false);
  const { practitioners, currentUser, upcomingVisits } = useAppStore();
  const { visitReports, userNotes } = useUserDataStore();
  const { periodLabel } = useTimePeriod();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const llmConfigured = isLLMConfigured();
  const autoSentRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  // Conversation history for the engine (role + content, no UI metadata)
  const conversationHistoryRef = useRef<ConversationMessage[]>([]);
  // RAG Knowledge Base stats
  const ragStats = getRAGStats();
  const knowledgeSources = getKnowledgeSources();
  // WebLLM state
  const { status: webLlmStatus, progress: webLlmProgress, isReady: webLlmReady } = useWebLLM();

  // Suggestions contextuelles — 3 catégories : Data, Stratégie, Connaissances
  const SUGGESTION_CHIPS = [
    // Data & Charts
    "📊 Top 15 praticiens par volume",
    "📊 Compare KOLs vs autres en volume et fidélité",
    "📊 Répartition par ville et spécialité",
    // Stratégie
    `🎯 Qui voir en priorité ${periodLabel.toLowerCase()} ?`,
    "🎯 Quels praticiens sont à risque de churn ?",
    "🎯 Mes KOLs non vus depuis 60 jours",
    // Connaissances métier
    "📖 Quels produits propose Air Liquide Santé ?",
    "📖 Classification GOLD ABE 2025 et traitements",
    "📖 Concurrents sur le marché PSAD en France",
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

  // ════════════════════════════════════════════════════════════════════════════
  // NOUVEAU : Pipeline unifié via aiCoachEngine
  // Le routage, la construction de contexte, et la génération de réponse
  // sont entièrement gérés par le moteur LLM-First (2 phases).
  // ════════════════════════════════════════════════════════════════════════════

  const handleSend = useCallback(async (question: string) => {
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

    try {
      // Appel au moteur LLM-First (pipeline résilient)
      // L'historique est passé SANS la question courante — le moteur l'ajoute lui-même
      const result = await processQuestion(
        question,
        conversationHistoryRef.current,
        periodLabel,
        practitioners,
        upcomingVisits,
        currentUser.objectives,
        { visitReports, userNotes }
      );

      // Construire le message assistant
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.textContent,
        practitioners: result.practitioners,
        agenticChart: result.chart ? {
          spec: result.chart.spec,
          data: result.chart.data,
          insights: result.chart.insights,
          suggestions: result.chart.suggestions,
          generatedByLLM: result.chart.generatedByLLM
        } : undefined,
        insights: result.chart?.insights,
        suggestions: result.suggestions || result.chart?.suggestions,
        timestamp: new Date(),
        isMarkdown: true,
        source: result.source === 'llm' ? (result.chart ? 'agentic' : 'llm') : 'local',
        usedRAG: result.usedRAG,
        ragSources: result.ragSources,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Mettre à jour l'historique APRÈS la réponse (pas avant)
      conversationHistoryRef.current.push(
        { role: 'user', content: question },
        {
          role: 'assistant',
          content: result.textContent,
          hasChart: !!result.chart,
          chartSummary: result.chart ? `[Graphique: ${result.chart.spec.title}]` : '',
        }
      );

      // Garder les 20 derniers messages dans l'historique
      if (conversationHistoryRef.current.length > 20) {
        conversationHistoryRef.current = conversationHistoryRef.current.slice(-20);
      }

      if (autoSpeak) {
        speak(result.textContent);
      }
    } catch (error) {
      console.error('[AICoach] Unexpected error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Désolé, une erreur inattendue est survenue. Veuillez réessayer.',
        timestamp: new Date(),
        isMarkdown: false,
        source: 'local'
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsTyping(false);
  }, [periodLabel, practitioners, upcomingVisits, currentUser.objectives, autoSpeak]);

  // Auto-send question from URL ?q= parameter (e.g., from "Demander au Coach IA" button)
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !autoSentRef.current && llmConfigured) {
      autoSentRef.current = true;
      setSearchParams({}, { replace: true }); // Clear URL param
      // Small delay to let component mount
      setTimeout(() => handleSend(q), 300);
    }
  }, [searchParams, handleSend, llmConfigured, setSearchParams]);

  const clearConversation = () => {
    if (confirm('Êtes-vous sûr de vouloir effacer toute la conversation ?')) {
      setMessages([]);
      clearChartHistory();
      conversationHistoryRef.current = [];
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
                Coach IA
              </span>
            </h1>
            <p className="text-slate-600 text-sm sm:text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Assistant stratégique avec base de connaissances BPCO, O₂ & Air Liquide
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKnowledgePanel(!showKnowledgePanel)}
              className={`px-3 py-2 text-sm flex items-center gap-2 rounded-lg transition-all border-2 ${
                showKnowledgePanel
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
              }`}
              title="Base de connaissances"
            >
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Connaissances</span>
              <span className="text-[11px] font-bold bg-emerald-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                {ragStats.totalChunks}
              </span>
            </button>
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

          {!hasExternalLLMKey() && (
            webLlmStatus === 'loading' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs border border-purple-200">
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span>WebLLM {(webLlmProgress.progress * 100).toFixed(0)}%</span>
                <div className="w-16 bg-purple-200 rounded-full h-1.5 ml-1">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(webLlmProgress.progress * 100, 2)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${
                webLlmReady
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                <AlertCircle className="w-4 h-4" />
                <span>{getLLMProviderName()}</span>
              </div>
            )
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs border border-emerald-200">
            <Shield className="w-4 h-4" />
            <span>RAG actif — {ragStats.totalChunks} docs</span>
          </div>

          <span className="text-xs text-slate-500 px-2 hidden sm:inline">
            CRM + connaissances BPCO, O₂, concurrence, réglementation
          </span>
        </div>
      </div>

      {/* Knowledge Base Panel */}
      <AnimatePresence>
        {showKnowledgePanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-emerald-800">Base de connaissances RAG</h3>
                  <span className="text-[11px] px-2 py-0.5 bg-emerald-200 text-emerald-700 rounded-full font-medium">
                    ~{ragStats.estimatedTokens.toLocaleString()} tokens
                  </span>
                </div>
                <button
                  onClick={() => setShowKnowledgePanel(false)}
                  className="p-1 hover:bg-emerald-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-emerald-600" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <div className="bg-white rounded-lg px-3 py-2 text-center border border-emerald-100">
                  <div className="text-lg font-bold text-emerald-700">{ragStats.totalChunks}</div>
                  <div className="text-[11px] text-slate-500">Documents</div>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 text-center border border-emerald-100">
                  <div className="text-lg font-bold text-emerald-700">{ragStats.totalSources}</div>
                  <div className="text-[11px] text-slate-500">Sources</div>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 text-center border border-emerald-100">
                  <div className="text-lg font-bold text-emerald-700">{Object.keys(ragStats.byCategory).length}</div>
                  <div className="text-[11px] text-slate-500">Catégories</div>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 text-center border border-emerald-100">
                  <div className="text-lg font-bold text-emerald-700">{ragStats.downloadableSources}</div>
                  <div className="text-[11px] text-slate-500">Téléchargeables</div>
                </div>
              </div>

              {/* Tags */}
              <div className="mb-4">
                <p className="text-xs font-medium text-emerald-700 mb-2">Domaines couverts :</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(ragStats.byTag)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 12)
                    .map(([tag, count]) => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 bg-white text-emerald-600 rounded-full border border-emerald-200">
                        {tag.replace(/_/g, ' ')} ({count})
                      </span>
                    ))}
                </div>
              </div>

              {/* Sources with download */}
              <div>
                <p className="text-xs font-medium text-emerald-700 mb-2 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  Sources de référence ({knowledgeSources.length}) :
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {knowledgeSources
                    .sort((a, b) => a.priority - b.priority)
                    .map((src) => (
                      <div
                        key={src.id}
                        className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 text-xs border border-emerald-100 hover:border-emerald-300 transition-colors group"
                      >
                        <span className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${
                          src.priority === 1 ? 'bg-emerald-500 text-white' :
                          src.priority === 2 ? 'bg-emerald-200 text-emerald-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          P{src.priority}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-700 truncate">{src.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{src.description}</p>
                        </div>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors flex-shrink-0"
                          title={src.downloadable ? 'Télécharger / Consulter' : 'Consulter la source'}
                        >
                          {src.downloadable ? (
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                          )}
                        </a>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">
                                {message.source === 'agentic' ? 'ARIA Engine + LLM' : 'ARIA Engine'}
                              </span>
                              {message.usedRAG && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                  <BookOpen className="w-2.5 h-2.5" />
                                  Base de connaissances
                                </span>
                              )}
                              <button
                                onClick={() => speak(message.content)}
                                className="p-1 hover:bg-slate-100 rounded transition-colors"
                                title="Lire à voix haute"
                              >
                                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                            </div>
                            {/* RAG Sources */}
                            {message.ragSources && message.ragSources.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-[11px] text-slate-400 font-medium">Sources :</p>
                                {message.ragSources.slice(0, 3).map((src, i) => (
                                  <a
                                    key={i}
                                    href={src.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-[11px] text-blue-500 hover:text-blue-700 hover:underline transition-colors"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                                    <span className="truncate">{src.title}</span>
                                  </a>
                                ))}
                              </div>
                            )}
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
                          className="bg-white rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 cursor-pointer hover:shadow-lg transition-shadow border border-slate-100 shadow-sm"
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
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/pitch?practitionerId=${p.id}`); }}
                              title="Générer un pitch"
                              className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 self-center" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* TALK TO MY DATA: Graphique Agentique */}
                  {message.agenticChart && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 bg-gradient-to-br from-white via-white to-slate-50/50 rounded-2xl p-5 shadow-md border border-slate-200/80"
                    >
                      {/* En-tête avec indicateur agentique */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${
                            message.agenticChart.spec.chartType === 'pie' ? 'bg-gradient-to-br from-violet-500 to-purple-600' :
                            message.agenticChart.spec.chartType === 'line' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
                            message.agenticChart.spec.chartType === 'composed' ? 'bg-gradient-to-br from-indigo-500 to-blue-600' :
                            message.agenticChart.spec.chartType === 'radar' ? 'bg-gradient-to-br from-violet-500 to-indigo-600' :
                            'bg-gradient-to-br from-al-blue-500 to-al-blue-700'
                          }`}>
                            {message.agenticChart.spec.chartType === 'pie' ? (
                              <PieChartIcon className="w-4 h-4 text-white" />
                            ) : message.agenticChart.spec.chartType === 'line' ? (
                              <TrendingUp className="w-4 h-4 text-white" />
                            ) : (
                              <BarChart3 className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <h4 className="font-semibold text-slate-800 text-[15px]">{message.agenticChart.spec.title}</h4>
                        </div>
                        {message.agenticChart.generatedByLLM && (
                          <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-gradient-to-r from-purple-50 to-blue-50 text-purple-600 rounded-full border border-purple-100/50 font-medium">
                            <Code2 className="w-3 h-3" />
                            IA
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
                                  <defs>
                                    {CHART_GRADIENTS.map((g) => (
                                      <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor={g.from} stopOpacity={0.95} />
                                        <stop offset="100%" stopColor={g.to} stopOpacity={1} />
                                      </linearGradient>
                                    ))}
                                  </defs>
                                  <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={95}
                                    paddingAngle={2}
                                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                    fill="#8884d8"
                                    dataKey={primaryMetric}
                                    strokeWidth={0}
                                  >
                                    {data.map((_, index) => (
                                      <Cell key={`cell-${index}`} fill={`url(#${CHART_GRADIENTS[index % CHART_GRADIENTS.length].id})`} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    contentStyle={TOOLTIP_STYLE}
                                    formatter={(value: number | undefined) => [formatChartValue(value), primaryMetric]}
                                  />
                                  <Legend
                                    wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                                    iconType="circle"
                                    iconSize={8}
                                  />
                                </PieChart>
                              );
                            }

                            if (chart.spec.chartType === 'line') {
                              return (
                                <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                  <defs>
                                    <linearGradient id="lineGradPrimary" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.15} />
                                      <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="lineGradSecondary" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.1} />
                                      <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" angle={-45} textAnchor="end" height={60} />
                                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" tickFormatter={(v) => formatChartValue(v)} />
                                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number | undefined) => formatChartValue(value)} />
                                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }} iconType="plainline" />
                                  <Line
                                    type="monotone"
                                    dataKey={primaryMetric}
                                    stroke={CHART_COLORS[0]}
                                    strokeWidth={2.5}
                                    dot={{ fill: '#fff', stroke: CHART_COLORS[0], strokeWidth: 2, r: 4 }}
                                    activeDot={{ fill: CHART_COLORS[0], stroke: '#fff', strokeWidth: 2, r: 6 }}
                                    name={primaryMetric}
                                  />
                                  {secondaryMetric && (
                                    <Line
                                      type="monotone"
                                      dataKey={secondaryMetric}
                                      stroke={CHART_COLORS[1]}
                                      strokeWidth={2.5}
                                      strokeDasharray="6 3"
                                      dot={{ fill: '#fff', stroke: CHART_COLORS[1], strokeWidth: 2, r: 4 }}
                                      activeDot={{ fill: CHART_COLORS[1], stroke: '#fff', strokeWidth: 2, r: 6 }}
                                      name={secondaryMetric}
                                    />
                                  )}
                                </LineChart>
                              );
                            }

                            if (chart.spec.chartType === 'composed') {
                              return (
                                <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                  <defs>
                                    {CHART_GRADIENTS.map((g) => (
                                      <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={g.from} stopOpacity={0.9} />
                                        <stop offset="100%" stopColor={g.to} stopOpacity={1} />
                                      </linearGradient>
                                    ))}
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" angle={-45} textAnchor="end" height={60} />
                                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" tickFormatter={(v) => formatChartValue(v)} />
                                  {secondaryMetric && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" tickFormatter={(v) => formatChartValue(v)} />}
                                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number | undefined) => formatChartValue(value)} />
                                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }} />
                                  <Bar dataKey={primaryMetric} yAxisId="left" radius={[6, 6, 0, 0]} name={primaryMetric} barSize={32}>
                                    {data.map((_, index) => (
                                      <Cell key={`cell-${index}`} fill={`url(#${CHART_GRADIENTS[index % CHART_GRADIENTS.length].id})`} />
                                    ))}
                                  </Bar>
                                  {secondaryMetric && (
                                    <Line
                                      type="monotone"
                                      dataKey={secondaryMetric}
                                      yAxisId={secondaryMetric ? 'right' : 'left'}
                                      stroke={CHART_COLORS[3]}
                                      strokeWidth={2.5}
                                      dot={{ fill: '#fff', stroke: CHART_COLORS[3], strokeWidth: 2, r: 4 }}
                                      name={secondaryMetric}
                                    />
                                  )}
                                </ComposedChart>
                              );
                            }

                            if (chart.spec.chartType === 'radar') {
                              return (
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                                  <defs>
                                    <linearGradient id="radarGradPrimary" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.4} />
                                      <stop offset="100%" stopColor={CHART_COLORS[2]} stopOpacity={0.1} />
                                    </linearGradient>
                                    <linearGradient id="radarGradSecondary" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={CHART_COLORS[1]} stopOpacity={0.3} />
                                      <stop offset="100%" stopColor={CHART_COLORS[1]} stopOpacity={0.05} />
                                    </linearGradient>
                                  </defs>
                                  <PolarGrid stroke="#e2e8f0" strokeOpacity={0.8} />
                                  <PolarAngleAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    stroke="#cbd5e1"
                                    tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 16) + '…' : v}
                                  />
                                  <PolarRadiusAxis tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#e2e8f0" />
                                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number | undefined) => formatChartValue(value)} />
                                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }} />
                                  <Radar
                                    name={primaryMetric}
                                    dataKey={primaryMetric}
                                    stroke={CHART_COLORS[0]}
                                    strokeWidth={2}
                                    fill="url(#radarGradPrimary)"
                                    fillOpacity={1}
                                  />
                                  {secondaryMetric && (
                                    <Radar
                                      name={secondaryMetric}
                                      dataKey={secondaryMetric}
                                      stroke={CHART_COLORS[1]}
                                      strokeWidth={2}
                                      fill="url(#radarGradSecondary)"
                                      fillOpacity={1}
                                    />
                                  )}
                                </RadarChart>
                              );
                            }

                            // Default: Bar chart
                            return (
                              <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                <defs>
                                  {CHART_GRADIENTS.map((g) => (
                                    <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={g.from} stopOpacity={0.9} />
                                      <stop offset="100%" stopColor={g.to} stopOpacity={1} />
                                    </linearGradient>
                                  ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" angle={-45} textAnchor="end" height={60} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" tickFormatter={(v) => formatChartValue(v)} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number | undefined) => formatChartValue(value)} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }} />
                                <Bar dataKey={primaryMetric} radius={[6, 6, 0, 0]} name={primaryMetric} barSize={32}>
                                  {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={`url(#${CHART_GRADIENTS[index % CHART_GRADIENTS.length].id})`} />
                                  ))}
                                </Bar>
                                {secondaryMetric && (
                                  <Bar dataKey={secondaryMetric} fill={CHART_COLORS[1]} radius={[6, 6, 0, 0]} name={secondaryMetric} barSize={32} fillOpacity={0.8} />
                                )}
                              </BarChart>
                            );
                          })()}
                        </ResponsiveContainer>
                      </div>

                      {/* Description du graphique */}
                      {message.agenticChart.spec.description && (
                        <p className="text-xs text-slate-500 mt-2 px-1 italic">{message.agenticChart.spec.description}</p>
                      )}

                      {/* Insights générés */}
                      {message.agenticChart.insights.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100/80 space-y-1.5">
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
                        <div className="mt-3 pt-3 border-t border-slate-100/80">
                          <p className="text-xs text-slate-500 mb-2 font-medium">Pour approfondir :</p>
                          <div className="flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, i) => (
                              <button
                                key={i}
                                onClick={() => setInput(suggestion)}
                                className="px-2.5 py-1.5 text-xs bg-gradient-to-r from-slate-50 to-white hover:from-al-blue-50 hover:to-blue-50 text-slate-600 hover:text-al-blue-700 rounded-lg transition-all border border-slate-200 hover:border-al-blue-200 font-medium"
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

                  <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-2">
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
              placeholder="Question sur vos praticiens, la BPCO, l'oxygénothérapie, la concurrence..."
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
