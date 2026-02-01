import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  ChevronRight,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Download,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { useGroq } from '../hooks/useGroq';
import { generateCoachResponse } from '../services/coachAI';
import { useAppStore } from '../stores/useAppStore';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import { calculatePeriodMetrics, getTopPractitioners } from '../services/metricsCalculator';
import { DataService } from '../services/dataService';
import { generateQueryContext, generateFullSiteContext, executeQuery } from '../services/dataQueryEngine';
import type { Practitioner } from '../types';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  practitioners?: (Practitioner & { daysSinceVisit?: number })[];
  insights?: string[];
  timestamp: Date;
}

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
  const { complete } = useGroq();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Suggestions contextuelles basées sur la période - diversifiées pour montrer les capacités
  const SUGGESTION_CHIPS = [
    `Qui dois-je voir en priorité ${periodLabel.toLowerCase()} ?`,
    "Quel médecin prénommé Bernard a le plus de publications ?",
    "Combien de pneumologues à Lyon ?",
    "Quels KOLs n'ai-je pas vus depuis 60 jours ?",
    "Top 5 prescripteurs par volume",
    "Praticiens à risque de churn",
    "Quel est le vingtile moyen par ville ?",
    "Opportunités nouveaux prescripteurs",
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

    // Arrêter toute synthèse en cours
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
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

    // NOUVEAU: Utiliser le moteur de requêtes intelligent pour analyser la question
    let queryContext = '';
    let specificPractitionerContext = '';

    if (userQuestion) {
      // Exécuter la requête intelligente basée sur la question
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
    const fullSiteContext = generateFullSiteContext();

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
   Volume: ${(p.volumeL / 1000).toFixed(0)}K L/an | Fidélité: ${p.loyaltyScore}/10 | Vingtile: ${p.vingtile}${p.isKOL ? ' | KOL ⭐' : ''}`
).join('\n')}

PRATICIENS À RISQUE :
${atRiskPractitioners.length > 0 ? atRiskPractitioners.slice(0, 5).map(p =>
  `- ${p.title} ${p.lastName} (${p.address.city}): Fidélité ${p.metrics.loyaltyScore}/10, Volume ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an${p.metrics.isKOL ? ', KOL' : ''}`
).join('\n') : '- Aucun praticien à risque critique'}

KOLS SOUS-VISITÉS (>90 jours) :
${undervisitedKOLs.length > 0 ? undervisitedKOLs.slice(0, 5).map(p =>
  `- ${p.title} ${p.firstName} ${p.lastName} (${p.address.city}): ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an`
).join('\n') : '- Tous les KOLs sont à jour'}

${queryContext}
${specificPractitionerContext}
${fullSiteContext}

INSTRUCTIONS IMPORTANTES :
- Réponds de manière concise et professionnelle avec des recommandations concrètes
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

    try {
      // D'abord essayer avec Groq AI pour une vraie conversation
      const context = buildContext(question);
      const conversationHistory = messages
        .slice(-4) // Garder les 4 derniers échanges pour le contexte
        .map(m => `${m.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const prompt = `${context}

HISTORIQUE DE CONVERSATION :
${conversationHistory}

QUESTION ACTUELLE :
${question}

Réponds de manière précise et professionnelle. Si la question concerne des praticiens spécifiques, utilise les données fournies ci-dessus.`;

      const aiResponse = await complete([{ role: 'user', content: prompt }]);

      if (aiResponse) {
        // Réponse IA réussie
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date()
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
      console.error('Erreur IA, utilisation du fallback:', error);

      // Fallback sur l'ancien système basé sur des règles
      await new Promise(resolve => setTimeout(resolve, 800));

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
        timestamp: new Date()
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-al-blue-500 to-al-sky flex items-center justify-center shadow-lg">
                <Bot className="w-7 h-7 text-white" />
              </div>
              Coach IA Avancé
            </h1>
            <p className="text-slate-600 text-sm sm:text-base">
              Assistant stratégique avec dialogue libre et commandes vocales
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

          <span className="text-xs text-slate-500 px-2">
            💡 Cliquez sur 🎤 pour dicter votre question
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 glass-card flex flex-col overflow-hidden">
        {/* Suggestions (si pas de messages) */}
        {messages.length === 0 && (
          <div className="p-4 sm:p-6 border-b border-slate-200">
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
                  className="px-3 py-2 bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 rounded-full text-xs sm:text-sm font-medium
                           hover:from-purple-100 hover:to-blue-100 transition-all hover:shadow-md border border-purple-200"
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
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-al-blue-500 to-al-sky flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-al-blue-500 to-al-sky text-white rounded-2xl rounded-tr-md px-3 sm:px-4 py-2 sm:py-3'
                    : 'space-y-4'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`${message.role === 'assistant' ? 'text-slate-700 leading-relaxed' : ''} text-sm sm:text-base whitespace-pre-wrap`}>
                      {message.content}
                    </p>
                    {message.role === 'assistant' && (
                      <button
                        onClick={() => speak(message.content)}
                        className="flex-shrink-0 p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Lire à voix haute"
                      >
                        <Volume2 className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                  </div>

                  {/* Cartes praticiens dans la réponse */}
                  {message.practitioners && message.practitioners.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {message.practitioners.map((p, i) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="glass-card p-3 sm:p-4 flex items-center gap-3 sm:gap-4 cursor-pointer hover:scale-[1.01] hover:shadow-lg transition-all"
                          onClick={() => navigate(`/practitioner/${p.id}`)}
                        >
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            i === 0 ? 'bg-red-500' : i < 3 ? 'bg-orange-500' : 'bg-amber-500'
                          }`}>
                            {i + 1}
                          </div>
                          <Avatar
                            src={p.avatarUrl}
                            alt={p.lastName}
                            size="md"
                            className="hidden sm:block"
                          />
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
                            <span className="text-xs sm:text-sm text-red-500 font-medium whitespace-nowrap">
                              {p.daysSinceVisit}j
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" />
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Insights */}
                  {message.insights && message.insights.length > 0 && (
                    <div className="mt-4 p-3 sm:p-4 bg-al-blue-50 rounded-xl space-y-2">
                      {message.insights.map((insight, i) => (
                        <p key={i} className="text-xs sm:text-sm text-al-navy leading-relaxed">{insight}</p>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-slate-400 mt-2">
                    {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-al-blue-500 to-al-sky flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="glass-card px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white rounded-b-2xl">
          <div className="flex gap-2 sm:gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(input)}
              placeholder="Posez votre question... (ou utilisez 🎤)"
              className="input-field flex-1 text-sm sm:text-base"
              disabled={isTyping}
            />
            <button
              onClick={toggleListening}
              disabled={isTyping}
              className={`p-2 sm:px-4 sm:py-2 rounded-lg transition-all flex items-center gap-2 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'btn-secondary'
              } disabled:opacity-50`}
              title={isListening ? 'Arrêter l\'écoute' : 'Dicter la question'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isTyping}
              className="btn-primary px-4 sm:px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {isListening && (
            <p className="text-xs text-red-600 mt-2 animate-pulse font-medium">
              🎤 Écoute en cours... Parlez maintenant
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
