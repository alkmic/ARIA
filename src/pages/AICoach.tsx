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
  Lightbulb,
  Search,
  List
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
import { useAppStore } from '../stores/useAppStore';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import {
  processQuestion,
  processLocally,
  clearMemory,
  CHART_COLORS,
  type UnifiedResponse,
  type ChartData,
  type ActionType
} from '../services/coachDataExplorer';
import { Badge } from '../components/ui/Badge';
import { MarkdownText } from '../components/ui/MarkdownText';

// ============================================
// TYPES
// ============================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;

  // Données de réponse unifiées
  chart?: {
    type: 'bar' | 'pie' | 'line' | 'composed';
    title: string;
    data: ChartData[];
    insights: string[];
  };

  practitioners?: Array<{
    id: string;
    name: string;
    specialty: string;
    city: string;
    volume: number;
    loyalty: number;
    isKOL: boolean;
    lastVisit?: string;
  }>;

  suggestions?: string[];
  source?: 'llm' | 'local' | 'hybrid';
  actionType?: ActionType;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function AICoach() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  useAppStore(); // Keep store connected for future use
  const { periodLabel } = useTimePeriod();
  const navigate = useNavigate();
  const { complete, error: groqError } = useGroq();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Suggestions contextuelles
  const SUGGESTION_CHIPS = [
    "Top 20 prescripteurs par volume",
    "Répartition des praticiens par ville",
    "Compare les KOLs aux autres praticiens",
    "Qui sont les praticiens à risque ?",
    "Distribution par niveau de fidélité",
    "Quelles sont les actualités du Dr Martin ?",
    "Analyse les pneumologues vs généralistes",
    `Qui dois-je voir en priorité ${periodLabel.toLowerCase()} ?`,
  ];

  // Auto-scroll
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

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('La reconnaissance vocale n\'est pas supportée par votre navigateur.');
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
    if (!('speechSynthesis' in window)) return;

    const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').replace(/`/g, '').replace(/#{1,6}\s/g, '');

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
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

  // ============================================
  // GESTION DES MESSAGES - ARCHITECTURE UNIFIÉE
  // ============================================

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

    try {
      // UN SEUL appel au service unifié
      let response: UnifiedResponse;

      if (groqError) {
        // Mode local si LLM non disponible
        console.log('🔧 Mode local (LLM non configuré)');
        response = processLocally(question);
      } else {
        // Mode LLM avec fallback automatique
        console.log('🧠 Traitement intelligent de la question...');
        response = await processQuestion(question, complete);
      }

      console.log('📊 Action:', response.actionType, '| Source:', response.source);

      // Créer le message de réponse
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        chart: response.chart,
        practitioners: response.practitioners,
        suggestions: response.suggestions,
        source: response.source,
        actionType: response.actionType
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Lecture automatique
      if (autoSpeak) {
        const textToSpeak = response.chart
          ? `${response.chart.title}. ${response.chart.insights[0] || ''}`
          : response.message;
        speak(textToSpeak);
      }

    } catch (error) {
      console.error('Erreur:', error);

      // Fallback ultime
      const fallbackResponse = processLocally(question);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackResponse.message,
        timestamp: new Date(),
        chart: fallbackResponse.chart,
        suggestions: fallbackResponse.suggestions,
        source: 'local',
        actionType: fallbackResponse.actionType
      };

      setMessages(prev => [...prev, assistantMessage]);
    }

    setIsTyping(false);
  };

  const clearConversation = () => {
    if (confirm('Êtes-vous sûr de vouloir effacer toute la conversation ?')) {
      setMessages([]);
      clearMemory();
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

  // ============================================
  // RENDU DU GRAPHIQUE
  // ============================================

  const renderChart = (chart: Message['chart']) => {
    if (!chart || !chart.data || chart.data.length === 0) return null;

    const data = chart.data;
    const primaryMetric = Object.keys(data[0]).find(k => k !== 'name') || 'value';
    const secondaryMetric = Object.keys(data[0]).find(k => k !== 'name' && k !== primaryMetric);

    if (chart.type === 'pie') {
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

    if (chart.type === 'line') {
      return (
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
          <Legend />
          <Line type="monotone" dataKey={primaryMetric} stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6' }} />
          {secondaryMetric && (
            <Line type="monotone" dataKey={secondaryMetric} stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
          )}
        </LineChart>
      );
    }

    if (chart.type === 'composed') {
      return (
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" angle={-45} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
          <Legend />
          <Bar dataKey={primaryMetric} fill="#3B82F6" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
          {secondaryMetric && (
            <Line type="monotone" dataKey={secondaryMetric} stroke="#EF4444" strokeWidth={2} />
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
        <Bar dataKey={primaryMetric} fill="#3B82F6" radius={[4, 4, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
        {secondaryMetric && (
          <Bar dataKey={secondaryMetric} fill="#10B981" radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    );
  };

  // ============================================
  // RENDU DE L'ICÔNE D'ACTION
  // ============================================

  const getActionIcon = (actionType?: ActionType) => {
    switch (actionType) {
      case 'chart': return <BarChart3 className="w-5 h-5 text-blue-500" />;
      case 'search': return <Search className="w-5 h-5 text-purple-500" />;
      case 'list': return <List className="w-5 h-5 text-green-500" />;
      case 'stats': return <TrendingUp className="w-5 h-5 text-orange-500" />;
      default: return <Sparkles className="w-5 h-5 text-al-blue-500" />;
    }
  };

  // ============================================
  // RENDU PRINCIPAL
  // ============================================

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
              Assistant stratégique + Explorateur de données
            </p>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <>
                <button onClick={exportConversation} className="btn-secondary px-3 py-2 text-sm flex items-center gap-2" title="Exporter">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button onClick={clearConversation} className="btn-secondary px-3 py-2 text-sm flex items-center gap-2" title="Effacer">
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Effacer</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Contrôles */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => { if (autoSpeak && isSpeaking) stopSpeaking(); setAutoSpeak(!autoSpeak); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              autoSpeak ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-slate-100 text-slate-600 border-2 border-slate-200'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            Lecture auto {autoSpeak ? 'ON' : 'OFF'}
          </button>

          {isSpeaking && (
            <button onClick={stopSpeaking} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium border-2 border-red-300 flex items-center gap-2 animate-pulse">
              <VolumeX className="w-4 h-4" />
              Arrêter
            </button>
          )}

          {groqError && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs border border-amber-200">
              <AlertCircle className="w-4 h-4" />
              <span>Mode local</span>
            </div>
          )}

          <span className="text-xs text-slate-500 px-2 hidden sm:inline">
            Posez n'importe quelle question sur vos praticiens
          </span>
        </div>
      </div>

      {/* Container principal */}
      <div className="flex-1 glass-card flex flex-col overflow-hidden border-2 border-slate-200/50">
        {/* Suggestions initiales */}
        {messages.length === 0 && (
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              <p className="text-sm font-semibold text-slate-700">Dialogue intelligent - Graphiques, recherches, conseils</p>
            </div>
            <p className="text-sm text-slate-500 mb-3">Exemples de questions :</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTION_CHIPS.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => setInput(chip)}
                  className="px-3 py-2 bg-white text-slate-700 rounded-full text-xs sm:text-sm font-medium hover:bg-gradient-to-r hover:from-purple-100 hover:to-blue-100 hover:text-purple-700 transition-all hover:shadow-md border border-slate-200 hover:border-purple-300"
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
                    {getActionIcon(message.actionType)}
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-al-blue-500 to-purple-500 text-white rounded-2xl rounded-tr-md px-3 sm:px-4 py-2 sm:py-3 shadow-md'
                    : 'space-y-3'
                }`}>
                  {/* Contenu du message */}
                  <div className="flex items-start justify-between gap-2">
                    {message.role === 'assistant' ? (
                      <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-slate-100">
                        <MarkdownText className="text-sm sm:text-base text-slate-700 leading-relaxed">
                          {message.content}
                        </MarkdownText>

                        {/* Indicateur source */}
                        {message.source && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              message.source === 'llm' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {message.source === 'llm' ? 'Groq AI' : 'Intelligence locale'}
                            </span>
                            <button onClick={() => speak(message.content)} className="p-1 hover:bg-slate-100 rounded transition-colors" title="Lire">
                              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm sm:text-base whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>

                  {/* Praticiens trouvés */}
                  {message.practitioners && message.practitioners.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {message.practitioners.slice(0, 5).map((p, i) => (
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
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm sm:text-base text-slate-800 truncate">{p.name}</p>
                              {p.isKOL && <Badge variant="warning" size="sm">KOL</Badge>}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500">
                              {p.specialty} • {p.city} • {p.volume}K L/an • Fidélité: {p.loyalty}/10
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" />
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Graphique */}
                  {message.chart && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 bg-white rounded-xl p-4 shadow-sm border border-slate-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {message.chart.type === 'pie' ? (
                            <PieChartIcon className="w-5 h-5 text-purple-500" />
                          ) : message.chart.type === 'line' ? (
                            <TrendingUp className="w-5 h-5 text-green-500" />
                          ) : (
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                          )}
                          <h4 className="font-semibold text-slate-800">{message.chart.title}</h4>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-full">
                          {message.chart.data.length} éléments
                        </span>
                      </div>

                      {/* Graphique Recharts */}
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {renderChart(message.chart)}
                        </ResponsiveContainer>
                      </div>

                      {/* Insights */}
                      {message.chart.insights && message.chart.insights.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                          {message.chart.insights.map((insight, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                              <MarkdownText className="text-sm">{insight}</MarkdownText>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Suggestions */}
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

                  {/* Suggestions sans graphique */}
                  {!message.chart && message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mb-2">Suggestions :</p>
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

                  <div className="text-[10px] text-slate-400 mt-2">
                    {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
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

          {/* Indicateur de frappe */}
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
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
                isListening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : 'btn-secondary'
              } disabled:opacity-50`}
              title={isListening ? 'Arrêter' : 'Dicter'}
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
