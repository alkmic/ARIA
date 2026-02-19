import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Mic,
  MicOff,
  Sparkles,
  User,
  MapPin,
  FileText,
  Route,
  Brain,
  X,
  ChevronRight,
  Loader2,
  Zap,
  Command,
  MessageSquare,
  ClipboardList
} from 'lucide-react';
import { quickSearch } from '../../services/universalSearch';
import { useGroq } from '../../hooks/useGroq';
import { DataService } from '../../services/dataService';
import type { PractitionerProfile } from '../../types/database';
import { useTranslation, useLanguage } from '../../i18n';
import { localizeSpecialty } from '../../utils/localizeData';

interface CommandResult {
  type: 'practitioner' | 'action' | 'navigation' | 'answer' | 'loading';
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  highlight?: boolean;
}

interface UniversalCommandBarProps {
  className?: string;
}

export const UniversalCommandBar: React.FC<UniversalCommandBarProps> = ({ className = '' }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [results, setResults] = useState<CommandResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { complete } = useGroq();
  const { t } = useTranslation();
  const { language } = useLanguage();

  // Quick actions available — titles use translation keys
  const QUICK_ACTIONS = [
    {
      id: 'pitch',
      keywords: ['pitch', 'génère', 'genere', 'créer', 'creer', 'présentation', 'presentation', 'generate'],
      title: t('common.commandBar.generatePitch'),
      icon: <FileText className="w-4 h-4" />,
      path: '/pitch',
      requiresPractitioner: true
    },
    {
      id: 'tour',
      keywords: ['tournée', 'tournee', 'route', 'trajet', 'optimiser', 'planifier', 'tour', 'plan', 'optimize'],
      title: t('common.commandBar.planTour'),
      icon: <Route className="w-4 h-4" />,
      path: '/tour-optimization'
    },
    {
      id: 'coach',
      keywords: ['coach', 'question', 'aide', 'conseil', 'analyse', 'analyser', 'help', 'ask', 'analyze'],
      title: t('common.commandBar.askCoachQuestion'),
      icon: <Brain className="w-4 h-4" />,
      path: '/coach'
    },
    {
      id: 'report',
      keywords: ['compte', 'rendu', 'rapport', 'visite', 'enregistrer', 'noter', 'report', 'visit', 'record'],
      title: t('common.commandBar.makeVisitReport'),
      icon: <ClipboardList className="w-4 h-4" />,
      path: '/visit-report'
    },
    {
      id: 'actions',
      keywords: ['actions', 'priorité', 'priorite', 'faire', 'todo', 'tâches', 'taches', 'priority', 'tasks'],
      title: t('common.commandBar.seePriorityActions'),
      icon: <Zap className="w-4 h-4" />,
      path: '/next-actions'
    },
    {
      id: 'kol',
      keywords: ['kol', 'leader', 'opinion', 'clé', 'cle', 'key'],
      title: t('common.commandBar.kolPlanning'),
      icon: <User className="w-4 h-4" />,
      path: '/kol-planning'
    },
    {
      id: 'map',
      keywords: ['carte', 'map', 'territoire', 'géographie', 'geographie', 'territory'],
      title: t('common.commandBar.seeMap'),
      icon: <MapPin className="w-4 h-4" />,
      path: '/map'
    }
  ];

  // Voice navigation commands
  const VOICE_COMMANDS = [
    { pattern: /ouvre?r?\s+(?:le\s+)?profil\s+(?:du?\s+)?(?:dr\.?\s+)?(.+)/i, type: 'profile' },
    { pattern: /(?:montre|voir|affiche)\s+(?:les?\s+)?praticiens?\s+(?:de\s+|à\s+)?(.+)/i, type: 'city' },
    { pattern: /génère?\s+(?:un\s+)?pitch\s+(?:pour\s+)?(?:le?\s+)?(?:dr\.?\s+)?(.+)/i, type: 'pitch' },
    { pattern: /(?:va\s+)?(?:sur\s+)?(?:le\s+)?dashboard/i, type: 'nav' as const, path: '/dashboard' },
    { pattern: /(?:va\s+)?(?:sur\s+)?(?:le\s+)?coach/i, type: 'nav' as const, path: '/coach' },
    { pattern: /(?:planifier?|organiser?)\s+(?:une?\s+)?tournée/i, type: 'nav' as const, path: '/tour-optimization' },
    { pattern: /compte[- ]?rendu|rapport\s+(?:de\s+)?visite/i, type: 'nav' as const, path: '/visit-report' },
    { pattern: /(?:mes\s+)?actions?\s+(?:prioritaires?)?/i, type: 'nav' as const, path: '/next-actions' },
    // English voice commands
    { pattern: /open\s+(?:the\s+)?profile\s+(?:of\s+|for\s+)?(?:dr\.?\s+)?(.+)/i, type: 'profile' },
    { pattern: /(?:show|display)\s+(?:the\s+)?practitioners?\s+(?:in\s+|from\s+)?(.+)/i, type: 'city' },
    { pattern: /generate\s+(?:a\s+)?pitch\s+(?:for\s+)?(?:dr\.?\s+)?(.+)/i, type: 'pitch' },
    { pattern: /(?:go\s+)?(?:to\s+)?(?:the\s+)?dashboard/i, type: 'nav' as const, path: '/dashboard' },
    { pattern: /(?:go\s+)?(?:to\s+)?(?:the\s+)?coach/i, type: 'nav' as const, path: '/coach' },
    { pattern: /(?:plan|optimize)\s+(?:a\s+)?tour/i, type: 'nav' as const, path: '/tour-optimization' },
    { pattern: /visit\s+report/i, type: 'nav' as const, path: '/visit-report' },
    { pattern: /(?:my\s+)?(?:priority\s+)?actions?/i, type: 'nav' as const, path: '/next-actions' },
  ];

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language === 'en' ? 'en-US' : 'fr-FR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);

        if (event.results[0].isFinal) {
          setIsListening(false);
          handleVoiceCommand(transcript);
        }
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [language]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Process voice commands
  const handleVoiceCommand = useCallback(async (transcript: string) => {
    const normalizedTranscript = transcript.toLowerCase().trim();

    for (const cmd of VOICE_COMMANDS) {
      const match = normalizedTranscript.match(cmd.pattern);
      if (match) {
        if (cmd.type === 'nav' && cmd.path) {
          navigate(cmd.path);
          setIsOpen(false);
          setQuery('');
          return;
        }
        if (cmd.type === 'profile' && match[1]) {
          const practitioners = quickSearch(match[1], 1);
          if (practitioners.length > 0) {
            navigate(`/practitioner/${practitioners[0].id}`);
            setIsOpen(false);
            setQuery('');
            return;
          }
        }
        if (cmd.type === 'city' && match[1]) {
          navigate(`/practitioners?city=${encodeURIComponent(match[1])}`);
          setIsOpen(false);
          setQuery('');
          return;
        }
        if (cmd.type === 'pitch' && match[1]) {
          const practitioners = quickSearch(match[1], 1);
          if (practitioners.length > 0) {
            navigate(`/pitch?practitioner=${practitioners[0].id}`);
            setIsOpen(false);
            setQuery('');
            return;
          }
        }
      }
    }

    // If no direct command, check if it's a question
    if (isQuestion(normalizedTranscript)) {
      await handleQuestion(transcript);
    }
  }, [navigate, language]);

  // Check if query is a question
  const isQuestion = (q: string): boolean => {
    const questionPatterns = [
      // French
      /^(qui|que|quoi|comment|combien|quel|quelle|quels|quelles|où|pourquoi)/i,
      /\?$/,
      /^(est-ce|y a-t-il|puis-je)/i,
      // English
      /^(who|what|how|when|where|why|which|can|could|is|are|do|does)/i,
    ];
    return questionPatterns.some(p => p.test(q));
  };

  // Handle natural language question
  const handleQuestion = async (question: string) => {
    setIsProcessing(true);
    setAiAnswer(null);

    try {
      // Build context - adapt system prompt based on language
      const stats = DataService.getGlobalStats();
      const systemPromptFr = `Tu es ARIA, l'assistant IA d'Air Liquide Healthcare.

DONNEES TERRITOIRE:
- ${stats.totalPractitioners} praticiens (${stats.pneumologues} pneumologues, ${stats.generalistes} generalistes)
- ${stats.totalKOLs} KOLs
- Volume total: ${(stats.totalVolume / 1000).toFixed(0)}K L/an
- Fidelite moyenne: ${stats.averageLoyalty.toFixed(1)}/10

Reponds de maniere TRES CONCISE (1-2 phrases max). Question: ${question}`;

      const systemPromptEn = `You are ARIA, Air Liquide Healthcare's AI assistant.

TERRITORY DATA:
- ${stats.totalPractitioners} practitioners (${stats.pneumologues} pulmonologists, ${stats.generalistes} GPs)
- ${stats.totalKOLs} KOLs
- Total volume: ${(stats.totalVolume / 1000).toFixed(0)}K L/year
- Average loyalty: ${stats.averageLoyalty.toFixed(1)}/10

Answer VERY CONCISELY (1-2 sentences max). Question: ${question}`;

      const context = language === 'en' ? systemPromptEn : systemPromptFr;

      const response = await complete([{ role: 'user', content: context }]);
      if (response) {
        setAiAnswer(response);
      }
    } catch {
      // Fallback to local
      setAiAnswer(t('common.commandBar.fallbackAnswer'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Search and build results
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setAiAnswer(null);
      return;
    }

    const q = query.toLowerCase();
    const newResults: CommandResult[] = [];

    // Search practitioners
    const practitioners = quickSearch(query, 5);
    practitioners.forEach((p: PractitionerProfile) => {
      newResults.push({
        type: 'practitioner',
        id: p.id,
        title: `${p.title} ${p.firstName} ${p.lastName}`,
        subtitle: `${localizeSpecialty(p.specialty)} \u2022 ${p.address.city}${p.metrics.isKOL ? ' \u2022 KOL' : ''}`,
        icon: <User className="w-4 h-4" />,
        action: () => {
          navigate(`/practitioner/${p.id}`);
          setIsOpen(false);
          setQuery('');
        },
        highlight: p.metrics.isKOL
      });
    });

    // Search actions
    QUICK_ACTIONS.forEach(action => {
      const matches = action.keywords.some(kw => q.includes(kw));
      if (matches) {
        newResults.push({
          type: 'action',
          id: action.id,
          title: action.title,
          subtitle: t('common.commandBar.quickAction'),
          icon: action.icon,
          action: () => {
            if (action.requiresPractitioner && practitioners.length > 0) {
              navigate(`${action.path}?practitioner=${practitioners[0].id}`);
            } else {
              navigate(action.path);
            }
            setIsOpen(false);
            setQuery('');
          }
        });
      }
    });

    // Add AI question option if it looks like a question
    if (isQuestion(q) && !aiAnswer && !isProcessing) {
      newResults.push({
        type: 'action',
        id: 'ask-ai',
        title: t('common.commandBar.askCoachIA'),
        subtitle: `"${query}"`,
        icon: <Brain className="w-4 h-4" />,
        action: () => {
          navigate(`/coach?q=${encodeURIComponent(query)}`);
          setIsOpen(false);
          setQuery('');
        }
      });
    }

    setResults(newResults);
    setSelectedIndex(0);
  }, [query, navigate, aiAnswer, isProcessing, t, language]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].action();
      } else if (isQuestion(query)) {
        handleQuestion(query);
      }
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(t('common.commandBar.voiceNotSupported'));
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Update lang on each start in case language changed
      recognitionRef.current.lang = language === 'en' ? 'en-US' : 'fr-FR';
      recognitionRef.current.start();
      setIsListening(true);
      setIsOpen(true);
      inputRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Main Input */}
      <div
        className={`relative flex items-center transition-all duration-200 ${
          isOpen ? 'ring-2 ring-al-blue-500 shadow-lg' : ''
        }`}
      >
        <div className="absolute left-3 flex items-center gap-2">
          {isListening ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <Mic className="w-5 h-5 text-red-500" />
            </motion.div>
          ) : (
            <Search className="w-5 h-5 text-slate-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? t('common.commandBar.listening') : t('common.commandBar.searchOrSpeak')}
          className={`w-full pl-11 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl
                     text-sm focus:outline-none focus:border-al-blue-500 focus:bg-white
                     transition-all placeholder:text-slate-400 ${
                       isListening ? 'bg-red-50 border-red-200' : ''
                     }`}
        />

        <div className="absolute right-2 flex items-center gap-1">
          {query && (
            <button
              onClick={() => { setQuery(''); setAiAnswer(null); }}
              className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
          <button
            onClick={toggleListening}
            className={`p-2 rounded-lg transition-all ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'hover:bg-al-blue-100 text-al-blue-600'
            }`}
            title={isListening ? t('common.commandBar.stopListening') : t('common.commandBar.speakToAria')}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Dropdown Results */}
      <AnimatePresence>
        {isOpen && (query || isListening) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
          >
            {/* Voice feedback */}
            {isListening && (
              <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center"
                  >
                    <Mic className="w-5 h-5 text-white" />
                  </motion.div>
                  <div>
                    <p className="font-medium text-red-700">{t('common.commandBar.listening')}</p>
                    <p className="text-sm text-red-600">{t('common.commandBar.speakNow')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Processing */}
            {isProcessing && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-100">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                  <p className="text-purple-700">{t('common.commandBar.ariaAnalyzing')}</p>
                </div>
              </div>
            )}

            {/* AI Answer */}
            {aiAnswer && (
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-cyan-50 border-b border-emerald-100">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium mb-1">{t('common.commandBar.ariaResponse')}</p>
                    <p className="text-slate-700 text-sm leading-relaxed">{aiAnswer}</p>
                    <button
                      onClick={() => {
                        navigate(`/coach?q=${encodeURIComponent(query)}`);
                        setIsOpen(false);
                        setQuery('');
                      }}
                      className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                    >
                      {t('common.commandBar.continueInCoach')} <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick suggestions when empty */}
            {!query && !isListening && (
              <div className="p-3 border-b border-slate-100">
                <p className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1">
                  <Command className="w-3 h-3" /> {t('common.commandBar.trySayOrType')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Dr Martin",
                    language === 'en' ? "Practitioners in Lyon" : "Praticiens \u00e0 Lyon",
                    language === 'en' ? "Generate a pitch" : "G\u00e9n\u00e8re un pitch",
                    language === 'en' ? "My priority actions" : "Mes actions prioritaires"
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(suggestion)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-al-blue-100 text-slate-600 hover:text-al-blue-700 rounded-full transition-colors"
                    >
                      "{suggestion}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={result.action}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                      index === selectedIndex
                        ? 'bg-al-blue-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      result.type === 'practitioner'
                        ? result.highlight
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-slate-100 text-slate-600'
                        : result.type === 'action'
                          ? 'bg-al-blue-100 text-al-blue-600'
                          : 'bg-purple-100 text-purple-600'
                    }`}>
                      {result.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-slate-800 text-sm">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-slate-500">{result.subtitle}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {query && results.length === 0 && !isProcessing && !aiAnswer && (
              <div className="p-6 text-center">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">{t('common.commandBar.noResults', { query })}</p>
                <button
                  onClick={() => handleQuestion(query)}
                  className="mt-3 text-sm text-al-blue-600 hover:text-al-blue-700 font-medium"
                >
                  {t('common.commandBar.askCoachArrow')}
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">&uarr;&darr;</kbd>
                {t('common.commandBar.navigate')}
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">&crarr;</kbd>
                {t('common.commandBar.select')}
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                {t('common.poweredByAria')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
