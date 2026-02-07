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
  ComposedChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area
} from 'recharts';
import { useGroq } from '../hooks/useGroq';
import { generateCoachResponse } from '../services/coachAI';
import { useAppStore } from '../stores/useAppStore';
import { useTimePeriod } from '../contexts/TimePeriodContext';
import { calculatePeriodMetrics, getTopPractitioners } from '../services/metricsCalculator';
import { DataService } from '../services/dataService';
import { generateCoachSystemPrompt, generateCompactContext, injectUserData } from '../services/llmDataContext';
import { generateQueryContext, generateFullSiteContext, executeQuery } from '../services/dataQueryEngine';
import { universalSearch, getFullDatabaseContext, analyzeQuery } from '../services/universalSearch';
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
  isChartModificationRequest,
  extractQueryParameters,
  clearChartHistory,
  getNextChartType,
  isGenericFormatChangeRequest,
  detectPractitionerTimeSeries,
  isContextualChartRequest,
  detectRequestedChartType,
  type ChartSpec
} from '../services/agenticChartEngine';
import { useUserDataStore } from '../stores/useUserDataStore';
import { useDocumentStore } from '../stores/useDocumentStore';
import { buildRAGContext, searchChunks, getBuiltinChunks, type SearchResult } from '../services/ragService';
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

/** Label lisible pour les catégories RAG */
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'air_liquide': 'Air Liquide',
    'clinique': 'Données cliniques',
    'reglementaire': 'Réglementaire',
    'concurrence': 'Veille concurrentielle',
    'epidemiologie': 'Épidémiologie',
    'produit': 'Produit',
    'interne': 'Document interne',
  };
  return labels[category] || category || 'Document';
}

/**
 * Détecte si une question porte sur des connaissances métier/médicales/entreprise
 * plutôt que sur les données CRM des praticiens.
 * Utilisé pour prioriser la recherche RAG sur le handler local praticiens.
 */
function isKnowledgeQuestion(question: string): boolean {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /\b(bpco|has|recommandation|guideline|protocole|parcours de soins|epidemio|prevalence|incidence|mortalite|traitement|molecule|medicament|therapie|therapeutique|oxygene|o2|ald|ventilation|vni|ppc|apnee|insuffisance\s+respiratoire|produit|gamme|offre|solution|service|catalogue|air\s*liquide|formation|certification|norme|reglementation|remboursement|prise\s+en\s+charge|ssiad|had|prestataire|dispositif\s+medical|matiere\s+medicale|pharmacovigilance|iec|etude|essai\s+clinique|publication scientifique)\b/.test(q);
}

/** Construit une réponse locale à partir des résultats de recherche RAG */
function buildLocalRAGResponse(results: SearchResult[]): string {
  if (results.length === 0) return '';

  const parts: string[] = [];
  const topScore = results[0].score;

  // === PRIMARY RESULT: full content, no aggressive truncation ===
  const primary = results[0];
  const section = primary.chunk.metadata.section || '';
  const source = primary.chunk.metadata.source || 'Document interne';
  const category = primary.chunk.metadata.category || '';

  parts.push(`Voici ce que j'ai trouvé dans la **base de connaissances entreprise** :\n`);

  if (section) {
    parts.push(`### ${section}`);
  }

  const categoryLabel = getCategoryLabel(category);
  parts.push(`> ${categoryLabel} — ${source}\n`);

  // Full content for primary source (builtin chunks are already curated/short)
  let content = primary.chunk.content;
  if (section && content.startsWith(section)) {
    content = content.substring(section.length).replace(/^\n+/, '');
  }
  // Only truncate very long user-uploaded chunks
  const isBuiltin = primary.chunk.documentId === 'builtin';
  if (!isBuiltin && content.length > 1500) {
    content = content.substring(0, 1500) + '...';
  }
  parts.push(content);

  // === SECONDARY RESULTS: only if score >= 60% of top, shown as compact "Voir aussi" ===
  const relevantSecondary = results.slice(1).filter(r => r.score >= topScore * 0.6);

  if (relevantSecondary.length > 0) {
    parts.push('\n---\n');
    parts.push('**Voir aussi :**\n');

    for (const result of relevantSecondary.slice(0, 2)) {
      const secSection = result.chunk.metadata.section || '';
      const secSource = result.chunk.metadata.source || '';
      const secCategory = getCategoryLabel(result.chunk.metadata.category || '');

      // Brief excerpt for secondary sources
      let secContent = result.chunk.content;
      if (secSection && secContent.startsWith(secSection)) {
        secContent = secContent.substring(secSection.length).replace(/^\n+/, '');
      }
      const firstSentence = secContent.split(/[.\n]/)[0]?.trim() || secContent.substring(0, 150);
      const excerpt = firstSentence.length > 200
        ? firstSentence.substring(0, 200) + '...'
        : firstSentence;

      parts.push(`- **${secSection}** *(${secCategory} — ${secSource})*`);
      parts.push(`  ${excerpt}`);
    }
  }

  // Footer: remaining sources not shown
  const shownCount = 1 + Math.min(relevantSecondary.length, 2);
  const remaining = results.length - shownCount;
  if (remaining > 0) {
    parts.push(`\n> ${remaining} autre(s) source(s) disponible(s) — posez une question plus précise pour affiner.`);
  }

  return parts.join('\n');
}

/** Enrichit une question de suivi avec le contexte conversationnel */
function enrichQueryWithContext(
  question: string,
  previousMessages: Message[]
): { query: string; pointExtract?: { num: number; content: string } } {
  const lastAssistant = [...previousMessages].reverse().find(m => m.role === 'assistant');
  if (!lastAssistant?.content) return { query: question };

  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Numbered point reference: "point 7", "développe le 7", "détaille le n°3"
  const pointMatch = q.match(/(?:point|numero|n[°o]|le|du)\s*(\d+)/);
  if (pointMatch) {
    const pointNum = parseInt(pointMatch[1]);
    const lineMatch = lastAssistant.content.match(new RegExp(`${pointNum}\\.\\s*(.+?)(?:\\n|$)`));
    if (lineMatch) {
      const pointContent = lineMatch[1].trim();
      return {
        query: pointContent,
        pointExtract: { num: pointNum, content: pointContent }
      };
    }
  }

  // General short follow-up: enrich with previous heading/topic
  if (question.length < 80) {
    const followUpPattern = /developpe|explique|detaille|precise|plus de detail|approfondi|c.est quoi|comment|pourquoi|et pour|et concernant|parle/;
    if (followUpPattern.test(q)) {
      // Try ### heading
      const headingMatch = lastAssistant.content.match(/###\s+(.+)/);
      if (headingMatch) {
        return { query: `${question} ${headingMatch[1]}` };
      }
      // Try **bold heading** at start of message
      const boldMatch = lastAssistant.content.match(/^\*\*(.+?)\*\*/);
      if (boldMatch) {
        return { query: `${question} ${boldMatch[1]}` };
      }
    }
  }

  return { query: question };
}

/** Construit une réponse ciblée pour un drill-down sur un point numéroté */
function buildPointFollowUpResponse(
  pointExtract: { num: number; content: string },
  results: SearchResult[]
): string {
  const parts: string[] = [];

  parts.push(`**Point ${pointExtract.num}** — ${pointExtract.content}\n`);

  // Filter out the chunk that contained the original numbered list (user already saw it)
  const pointPrefix = `${pointExtract.num}. ${pointExtract.content.substring(0, 20)}`;
  const newResults = results.filter(r => !r.chunk.content.includes(pointPrefix));

  if (newResults.length > 0) {
    parts.push(`Voici des informations complémentaires de la **base de connaissances** :\n`);

    for (let i = 0; i < Math.min(newResults.length, 2); i++) {
      const result = newResults[i];
      const section = result.chunk.metadata.section || '';
      const source = result.chunk.metadata.source || '';
      const category = getCategoryLabel(result.chunk.metadata.category || '');

      if (i > 0) parts.push('\n---\n');

      if (section) parts.push(`### ${section}`);
      parts.push(`> ${category} — ${source}\n`);

      let content = result.chunk.content;
      if (section && content.startsWith(section)) {
        content = content.substring(section.length).replace(/^\n+/, '');
      }

      const isBuiltin = result.chunk.documentId === 'builtin';
      if (!isBuiltin && content.length > 1200) {
        content = content.substring(0, 1200) + '...';
      }
      parts.push(content);
    }
  } else {
    parts.push(`La base de connaissances ne contient pas de détails supplémentaires au-delà de ce qui a déjà été présenté.`);
    parts.push(`\nPour des informations approfondies, configurez une clé API LLM (Groq, OpenAI ou Anthropic) dans les **Paramètres** pour bénéficier de réponses enrichies par l'IA.`);
  }

  return parts.join('\n');
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
  const { complete, error: groqError } = useGroq();
  const { visitReports, userNotes } = useUserDataStore();
  const documentChunks = useDocumentStore(s => s.chunks);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Suggestions contextuelles - Talk to My Data (approche agentique)
  const SUGGESTION_CHIPS = [
    "Montre-moi un graphique des volumes par ville",
    "Quels sont les produits d'Air Liquide Santé ?",
    "Quel médecin dont le prénom est Bernard a le plus de publications ?",
    "Données épidémiologiques BPCO en France",
    "Top 10 prescripteurs avec leur fidélité",
    "Quels pneumologues à Lyon ont un risque de churn élevé ?",
    "Analyse les pneumologues vs généralistes",
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
      setInput('⚠ Reconnaissance vocale non supportée. Essayez Chrome ou Edge.');
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

  // Extraire le dernier praticien discuté dans l'historique de conversation
  const extractLastDiscussedPractitioner = (conversationMessages: Message[]): string | null => {
    // Parcourir les messages récents (du plus récent au plus ancien)
    const recentMessages = [...conversationMessages].reverse().slice(0, 10);

    for (const msg of recentMessages) {
      const text = msg.content;
      // Chercher des noms de praticiens mentionnés dans les réponses de l'assistant
      if (msg.role === 'assistant') {
        // Chercher "Dr Prénom Nom" ou "**Dr Prénom Nom**"
        const drMatch = text.match(/\*{0,2}Dr\.?\s+([A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ]+)\s+([A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ]+)\*{0,2}/);
        if (drMatch) {
          return `${drMatch[1]} ${drMatch[2]}`;
        }
      }
      // Chercher aussi dans les questions utilisateur
      if (msg.role === 'user') {
        const drMatch = text.match(/Dr\.?\s+([A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ]+)\s+([A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ]+)/);
        if (drMatch) {
          return `${drMatch[1]} ${drMatch[2]}`;
        }
      }
    }
    return null;
  };

  // Détecter si la question utilise des pronoms référençant un praticien précédent
  const usesPractitionerPronoun = (question: string): boolean => {
    const q = question.toLowerCase();
    return /\bl['']|(?:^|\s)(le |la |l'|lui |elle |son |sa |ses |ce (praticien|médecin|docteur)|cette (praticienne|médecin))/.test(q) &&
      /(visit|vu|tendance|volume|prescri|fidéli|fidelit|risque|adresse|contact|actualit|news|note|dernièr|dernier|augment|baiss|croiss)/.test(q);
  };

  // Créer un contexte ultra-enrichi pour l'IA avec accès complet aux données
  // et moteur de requêtes intelligent
  const buildContext = (userQuestion?: string, conversationMessages?: Message[]) => {
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
    let hasSpecificPractitioner = false;

    if (userQuestion) {
      // 1. Analyse sémantique pour extraire les noms de la question
      const queryAnalysis = analyzeQuery(userQuestion);
      const extractedNames = queryAnalysis.entities.names;

      // 2. Recherche de praticiens spécifiques par noms extraits
      if (extractedNames.length > 0) {
        // Recherche ciblée avec chaque nom extrait
        const allMatches: Map<string, typeof practitioners[0] extends never ? never : ReturnType<typeof DataService.getAllPractitioners>[0]> = new Map();

        for (const name of extractedNames) {
          const matches = DataService.fuzzySearchPractitioner(name);
          matches.forEach(m => allMatches.set(m.id, m));
        }

        // Si plusieurs noms extraits, filtrer pour garder ceux qui matchent TOUS les noms
        let finalMatches = Array.from(allMatches.values());
        if (extractedNames.length >= 2 && finalMatches.length > 1) {
          const refined = finalMatches.filter(p => {
            const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
            return extractedNames.every(name =>
              fullName.includes(name.toLowerCase())
            );
          });
          if (refined.length > 0) {
            finalMatches = refined;
          }
        }

        if (finalMatches.length > 0 && finalMatches.length <= 5) {
          hasSpecificPractitioner = true;
          specificPractitionerContext = finalMatches.map(p =>
            DataService.getCompletePractitionerContext(p.id)
          ).join('\n');
        }
      }

      // 3. Utiliser la recherche universelle pour des résultats complets
      const universalResult = universalSearch(userQuestion);
      if (universalResult.results.length > 0) {
        universalSearchContext = universalResult.context;
      }

      // 4. Exécuter aussi la requête classique pour compatibilité
      const queryResult = executeQuery(userQuestion);
      if (queryResult.practitioners.length > 0 && queryResult.practitioners.length < practitioners.length) {
        queryContext = generateQueryContext(userQuestion);
      }

      // 5. Résolution de pronoms : si pas de praticien trouvé, chercher dans l'historique de conversation
      if (!hasSpecificPractitioner && conversationMessages && usesPractitionerPronoun(userQuestion)) {
        const lastDiscussed = extractLastDiscussedPractitioner(conversationMessages);
        if (lastDiscussed) {
          const nameParts = lastDiscussed.split(' ');
          const allMatches = new Map<string, ReturnType<typeof DataService.getAllPractitioners>[0]>();
          for (const part of nameParts) {
            const matches = DataService.fuzzySearchPractitioner(part);
            matches.forEach(m => allMatches.set(m.id, m));
          }
          // Refine to match ALL name parts
          let finalMatches = Array.from(allMatches.values());
          if (nameParts.length >= 2 && finalMatches.length > 1) {
            const refined = finalMatches.filter(p => {
              const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
              return nameParts.every(name => fullName.includes(name.toLowerCase()));
            });
            if (refined.length > 0) finalMatches = refined;
          }
          if (finalMatches.length > 0 && finalMatches.length <= 3) {
            hasSpecificPractitioner = true;
            specificPractitionerContext = finalMatches.map(p =>
              DataService.getCompletePractitionerContext(p.id)
            ).join('\n');
          }
        }
      }

      // 6. Fallback : si aucun praticien spécifique trouvé, essayer la recherche floue par mots capitalisés
      if (!hasSpecificPractitioner) {
        const capitalizedWords = userQuestion.match(/\b[A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ]+\b/g) || [];
        const nameCandidate = capitalizedWords.filter(w =>
          !['Dr', 'Docteur', 'Pr', 'Professeur', 'Quelles', 'Quels', 'Quel', 'Quelle', 'Comment', 'Pourquoi', 'Est'].includes(w)
        );

        if (nameCandidate.length > 0) {
          const allMatches = new Map<string, ReturnType<typeof DataService.getAllPractitioners>[0]>();
          for (const word of nameCandidate) {
            const matches = DataService.fuzzySearchPractitioner(word);
            matches.forEach(m => allMatches.set(m.id, m));
          }

          let finalMatches = Array.from(allMatches.values());
          if (nameCandidate.length >= 2 && finalMatches.length > 1) {
            const refined = finalMatches.filter(p => {
              const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
              return nameCandidate.some(name =>
                fullName.includes(name.toLowerCase())
              );
            });
            if (refined.length > 0 && refined.length <= 5) {
              finalMatches = refined;
            }
          }

          if (finalMatches.length > 0 && finalMatches.length <= 5) {
            hasSpecificPractitioner = true;
            specificPractitionerContext = finalMatches.map(p =>
              DataService.getCompletePractitionerContext(p.id)
            ).join('\n');
          }
        }
      }
    }

    // Générer le contexte selon la spécificité de la question
    // Si un praticien spécifique est identifié, SKIP les dumps massifs de DB
    // pour garder le prompt dans les limites du LLM
    let fullSiteContext = '';
    let fullDataCtx = '';

    if (hasSpecificPractitioner) {
      // Question ciblée : pas besoin du dump complet, le contexte praticien suffit
      // On ajoute juste un mini résumé du territoire
      fullSiteContext = '';
      fullDataCtx = '';
    } else {
      // Question générale : inclure le contexte complet
      fullSiteContext = userQuestion ? getFullDatabaseContext() : generateFullSiteContext();
      fullDataCtx = userQuestion ? generateCompactContext(userQuestion) : '';

      // Injecter les données utilisateur (notes et comptes-rendus de visite) dans le contexte
      if (fullDataCtx && (userNotes.length > 0 || visitReports.length > 0)) {
        fullDataCtx = injectUserData(
          fullDataCtx,
          userNotes.map(n => ({
            practitionerId: n.practitionerId,
            content: n.content,
            type: n.type,
            createdAt: n.createdAt,
          })),
          visitReports.map(r => ({
            practitionerId: r.practitionerId,
            practitionerName: r.practitionerName,
            date: r.date,
            transcript: r.transcript,
            extractedInfo: {
              topics: r.extractedInfo.topics,
              sentiment: r.extractedInfo.sentiment,
              nextActions: r.extractedInfo.nextActions,
              keyPoints: r.extractedInfo.keyPoints,
            },
          }))
        );
      }
    }

    return `${generateCoachSystemPrompt()}

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
${fullDataCtx}
${userQuestion ? buildRAGContext(userQuestion, documentChunks, 5) : ''}

DONNÉES UTILISATEUR (rapports de visite et notes du délégué) :
- Nombre de comptes-rendus de visite : ${visitReports.length}
- Nombre de notes stratégiques : ${userNotes.length}
${visitReports.length > 0 ? `- Derniers comptes-rendus : ${visitReports.slice(0, 3).map(r => `${r.practitionerName} (${r.date})`).join(', ')}` : '- Aucun compte-rendu enregistré'}

INSTRUCTIONS IMPORTANTES :
- Réponds UNIQUEMENT à ce qui est demandé — pas de bonus, pas de recommandations non sollicitées
- Utilise le format Markdown pour mettre en valeur les informations (**gras**, *italique*)
- Fournis des chiffres précis basés sur les données réelles ci-dessus
- Si on demande une tendance de volumes, utilise l'ÉVOLUTION DES VOLUMES MENSUELS de la fiche
${hasSpecificPractitioner ? `
PRATICIEN SPÉCIFIQUE IDENTIFIÉ — La FICHE COMPLÈTE est ci-dessus. Utilise-la pour répondre :
- Question sur l'adresse → donne UNIQUEMENT l'adresse
- Question sur les actualités → liste les actualités de la fiche
- Question sur la tendance/volumes → utilise l'ÉVOLUTION DES VOLUMES MENSUELS
- Question sur la dernière visite → utilise l'HISTORIQUE DE RELATION
- NE RAJOUTE PAS de sections "Recommandations" ou "Métriques" non demandées` : ''}`;
  };

  // Détecter si la question demande une visualisation
  const isVisualizationRequest = (q: string): boolean => {
    const normalized = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const patterns = [
      // Explicit chart/graph keywords
      /graphique|graph|chart|diagramme|visualis|courbe|barres?|camembert|histogramme|radar|spider|toile|araignee|aire/,
      // "montre-moi", "affiche", "dessine" — explicit show verbs
      /montre[- ]?moi|affiche|fais[- ]?moi voir|presente|dessine/,
      // Emojis
      /📊|📈|🥧|📉/,
      // Data organization keywords that imply charts
      /repartition|distribution|top\s*\d+|classement|compar|versus|\bvs\b/,
      // "par [dimension]" — grouping implies chart
      /par ville|par specialite|par segment|par vingtile|par risque/,
      // "combien/nombre de" ONLY when paired with a grouping dimension (not standalone)
      /(?:combien|nombre\s+de|total\s+de).*(?:par\s+\w+|par ville|par specialite|chaque|par segment)/,
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
    const wantsChartModification = isChartModificationRequest(question);
    const chartHistory = getChartHistory();
    const hasRecentChart = chartHistory.length > 0;

    // Détecter les suivis implicites de graphique ("et pour Vincent ?", "et les pneumologues ?")
    const trimmedQ = question.trim().toLowerCase();
    const isImplicitChartFollowUp = hasRecentChart && !wantsVisualization && !wantsChartModification &&
      question.trim().split(/\s+/).length <= 10 &&
      /^(et\s|pareil|meme\s?chose|même\s?chose|idem|pour\s|et\s+les\s|et\s+pour\s|et\s+à\s|et\s+a\s)/i.test(trimmedQ);

    try {
      // ============================================
      // MODE 1: Question de suivi TEXTUELLE sur un graphique (pas une modification)
      // ============================================
      if (isFollowUp && hasRecentChart && !wantsVisualization && !wantsChartModification && !isImplicitChartFollowUp) {
        console.log('🔄 Mode suivi - question sur graphique précédent');

        const chartContext = buildChartContextForLLM();
        const context = buildContext(question, messages);

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
      // MODE 2: Demande de visualisation/graphique (ou modification/suivi implicite)
      // ============================================
      else if (wantsVisualization || wantsChartModification || isImplicitChartFollowUp) {
        console.log('🤖 Mode agentique activé - génération de graphique');

        // FAST PATH: Si c'est une modification de format (type de chart) ET qu'on a un chart précédent,
        // on modifie programmatiquement sans appeler le LLM
        if (wantsChartModification && hasRecentChart) {
          const lastChart = chartHistory[0];
          const requestedType = detectRequestedChartType(question);
          const newChartType = requestedType
            || (isGenericFormatChangeRequest(question) ? getNextChartType(lastChart.spec.chartType) : lastChart.spec.chartType);

          if (newChartType !== lastChart.spec.chartType) {
            const chartTypeLabels: Record<string, string> = {
              pie: 'en camembert',
              bar: 'en barres',
              line: 'en courbe',
              radar: 'en radar',
              area: 'en aires',
              composed: 'en composé',
            };
            const modifiedSpec: ChartSpec = {
              ...lastChart.spec,
              chartType: newChartType,
              title: lastChart.spec.title.replace(
                /\s+en (camembert|barres?|courbe|ligne|histogramme|radar|spider|spider\s*chart|toile|araign[ée]e|aires?|area|compos[ée])/i, ''
              ).trim() + (chartTypeLabels[newChartType] ? ` ${chartTypeLabels[newChartType]}` : ''),
            };

            const chartResult = generateChartFromSpec(modifiedSpec);
            addToChartHistory({
              question,
              spec: chartResult.spec,
              data: chartResult.data,
              insights: chartResult.insights,
              timestamp: new Date()
            });

            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `**${modifiedSpec.title}**\n\n${modifiedSpec.description || ''}`,
              agenticChart: {
                spec: chartResult.spec,
                data: chartResult.data,
                insights: chartResult.insights,
                suggestions: chartResult.suggestions,
                generatedByLLM: false
              },
              suggestions: chartResult.suggestions,
              timestamp: new Date(),
              isMarkdown: true,
              source: 'agentic'
            };

            setMessages(prev => [...prev, assistantMessage]);
            if (autoSpeak) speak(`${modifiedSpec.title}. ${chartResult.insights.join('. ')}`);
            setIsTyping(false);
            return;
          }
        }

        // TIME SERIES: Detect practitioner-specific time series requests
        const timeSeriesMatch = detectPractitionerTimeSeries(question);
        // Also handle contextual requests like "montre les avec un graphique" after discussing a practitioner
        const isContextualViz = !timeSeriesMatch && isContextualChartRequest(question);
        const contextPractitionerName = isContextualViz ? extractLastDiscussedPractitioner(messages) : null;
        const timeSeriesName = timeSeriesMatch?.practitionerName || contextPractitionerName;

        if (timeSeriesName) {
          const practitionerMatches = DataService.fuzzySearchPractitioner(timeSeriesName);
          if (practitionerMatches.length > 0) {
            const p = practitionerMatches[0];
            const volumeHistory = DataService.generateVolumeHistory(p.metrics.volumeL, p.id);

            // Allow user to request specific chart type for time series (e.g. "évolution en aires")
            const timeSeriesChartType = detectRequestedChartType(question) || 'line';
            const timeSeriesSpec: ChartSpec = {
              chartType: timeSeriesChartType,
              title: `Évolution des volumes — ${p.title} ${p.firstName} ${p.lastName}`,
              description: `Prescriptions mensuelles d'oxygène sur 12 mois (${p.specialty}, ${p.address.city})`,
              query: {
                source: 'practitioners',
                metrics: [
                  { name: 'Volume (L)', field: 'volumeL', aggregation: 'sum' },
                  { name: 'Moyenne vingtile', field: 'vingtileAvg', aggregation: 'avg' }
                ]
              },
              formatting: {
                xAxisLabel: 'Mois',
                yAxisLabel: 'Volume (L/mois)',
                showLegend: true
              }
            };

            const timeSeriesData = volumeHistory.map(vh => ({
              name: vh.month,
              'Volume (L)': vh.volume,
              'Moyenne vingtile': vh.vingtileAvg
            }));

            // Compute insights from actual data
            const maxMonth = volumeHistory.reduce((max, vh) => vh.volume > max.volume ? vh : max, volumeHistory[0]);
            const minMonth = volumeHistory.reduce((min, vh) => vh.volume < min.volume ? vh : min, volumeHistory[0]);
            const avgVolume = Math.round(volumeHistory.reduce((s, vh) => s + vh.volume, 0) / volumeHistory.length);
            const tsInsights = [
              `Volume annuel total : **${Math.round(p.metrics.volumeL / 1000)}K L/an** (${avgVolume} L/mois en moyenne)`,
              `Pic : **${maxMonth.month}** (${maxMonth.volume} L) — Creux : **${minMonth.month}** (${minMonth.volume} L)`,
              `Vingtile : ${p.metrics.vingtile} | Fidélité : ${p.metrics.loyaltyScore}/10`
            ];

            addToChartHistory({
              question,
              spec: timeSeriesSpec,
              data: timeSeriesData,
              insights: tsInsights,
              timestamp: new Date()
            });

            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `**${timeSeriesSpec.title}**\n\n${timeSeriesSpec.description}`,
              agenticChart: {
                spec: timeSeriesSpec,
                data: timeSeriesData,
                insights: tsInsights,
                suggestions: [
                  `Volumes par ville`,
                  `Top 10 prescripteurs`,
                  `Comparer KOLs vs autres`
                ],
                generatedByLLM: false
              },
              suggestions: [
                `Volumes par ville`,
                `Top 10 prescripteurs`,
                `Comparer KOLs vs autres`
              ],
              timestamp: new Date(),
              isMarkdown: true,
              source: 'agentic'
            };

            setMessages(prev => [...prev, assistantMessage]);
            if (autoSpeak) speak(`${timeSeriesSpec.title}. ${tsInsights.join('. ')}`);
            setIsTyping(false);
            return;
          }
        }

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

        // Inclure le graphique précédent si disponible (pour les modifications)
        let previousChartContext = '';
        if (hasRecentChart) {
          const lastChart = chartHistory[0];
          previousChartContext = `\n\n## GRAPHIQUE PRÉCÉDENT — REPRENDS CETTE QUERY SI MODIFICATION DEMANDÉE
Question originale: "${lastChart.question}"
Spec JSON du graphique précédent (à COPIER si modification de format) :
\`\`\`json
${JSON.stringify({ chartType: lastChart.spec.chartType, title: lastChart.spec.title, query: lastChart.spec.query, formatting: lastChart.spec.formatting }, null, 2)}
\`\`\`
⚠️ SI l'utilisateur demande un changement de FORMAT (camembert, barres, etc.), tu DOIS copier la query ci-dessus EXACTEMENT et ne changer QUE le chartType.`;
        }

        // Pour les suivis implicites, ajouter des instructions d'expansion
        let implicitFollowUpHint = '';
        if (isImplicitChartFollowUp && hasRecentChart) {
          const lastChart = chartHistory[0];
          implicitFollowUpHint = `\n⚠️ SUIVI IMPLICITE : L'utilisateur demande "${question}" en référence à son graphique précédent : "${lastChart.question}".
Cela signifie qu'il veut le MÊME TYPE de graphique avec le MÊME type de métriques, mais en changeant le SUJET/FILTRE selon sa nouvelle demande.
Garde le même chartType (${lastChart.spec.chartType}), les mêmes métriques, et adapte les filtres selon la nouvelle demande.`;
        }

        const chartPrompt = `${CHART_GENERATION_PROMPT}
${previousChartContext}

${dataContext}

DEMANDE DE L'UTILISATEUR :
"${question}"
${paramHints}${implicitFollowUpHint}

Génère la spécification JSON du graphique demandé. RESPECTE EXACTEMENT les paramètres demandés (nombre d'éléments, filtres, etc.).`;

        const chartResponse = await complete([{ role: 'user', content: chartPrompt }]);

        if (chartResponse) {
          // Parser la réponse du LLM pour extraire la spec
          const spec = parseLLMChartResponse(chartResponse);

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

            // Créer le message avec le graphique généré dynamiquement
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `**${spec.title}**\n\n${spec.description || ''}`,
              agenticChart: {
                spec: chartResult.spec,
                data: chartResult.data,
                insights: chartResult.insights,
                suggestions: chartResult.suggestions,
                generatedByLLM: true
              },
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
        const context = buildContext(question, messages);
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

RAPPEL : Réponds UNIQUEMENT à la question posée. Si on demande une adresse, donne l'adresse. Si on demande une tendance, décris la tendance. Ne rajoute PAS d'informations non demandées.`;

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

      // FAST PATH: Chart modification (convert existing chart to new type)
      // This is client-side only, no LLM needed
      let chartHandled = false;
      if ((wantsChartModification || wantsVisualization) && hasRecentChart) {
        const requestedType = detectRequestedChartType(question);
        const isGenericChange = isGenericFormatChangeRequest(question);

        if (requestedType || isGenericChange) {
          const lastChart = chartHistory[0];
          const newChartType = requestedType || getNextChartType(lastChart.spec.chartType);

          if (newChartType !== lastChart.spec.chartType || isGenericChange) {
            const chartTypeLabels: Record<string, string> = {
              pie: 'en camembert', bar: 'en barres', line: 'en courbe',
              radar: 'en radar', area: 'en aires', composed: 'en composé',
            };
            const modifiedSpec: ChartSpec = {
              ...lastChart.spec,
              chartType: newChartType,
              title: lastChart.spec.title.replace(
                /\s+en (camembert|barres?|courbe|ligne|histogramme|radar|spider|spider\s*chart|toile|araign[ée]e|aires?|area|compos[ée])/i, ''
              ).trim() + (chartTypeLabels[newChartType] ? ` ${chartTypeLabels[newChartType]}` : ''),
            };

            const chartResult = generateChartFromSpec(modifiedSpec);
            addToChartHistory({
              question,
              spec: chartResult.spec,
              data: chartResult.data,
              insights: chartResult.insights,
              timestamp: new Date()
            });

            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `**${modifiedSpec.title}**\n\n${modifiedSpec.description || ''}`,
              agenticChart: {
                spec: chartResult.spec,
                data: chartResult.data,
                insights: chartResult.insights,
                suggestions: chartResult.suggestions,
                generatedByLLM: false
              },
              suggestions: chartResult.suggestions,
              timestamp: new Date(),
              isMarkdown: true,
              source: 'local'
            };

            setMessages(prev => [...prev, assistantMessage]);
            if (autoSpeak) speak(`${modifiedSpec.title}. ${chartResult.insights.join('. ')}`);
            chartHandled = true;
          }
        }
      }

      // Safety net: Knowledge questions should NEVER generate charts,
      // even if isVisualizationRequest matched due to broad patterns.
      // Check RAG first for knowledge questions before any chart generation.
      if (!chartHandled && isKnowledgeQuestion(question)) {
        const builtinChunks = getBuiltinChunks();
        const ragResults = searchChunks(question, documentChunks, builtinChunks, 5);
        if (ragResults.length > 0 && ragResults[0].score > 0.4) {
          const ragContent = buildLocalRAGResponse(ragResults);
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: ragContent,
            insights: [`${ragResults.length} source(s) trouvée(s) dans la base de connaissances`],
            timestamp: new Date(),
            isMarkdown: true,
            source: 'local'
          };
          setMessages(prev => [...prev, assistantMessage]);
          if (autoSpeak) speak(ragContent);
          chartHandled = true; // Skip chart generation
        }
      }

      // Generate a new chart if visualization was requested and not a modification
      if (!chartHandled && wantsVisualization) {
        const chartResult = generateChartLocally(question);

        if (chartResult && chartResult.data.length > 0) {
          const agenticData: AgenticChartData = {
            spec: chartResult.spec,
            data: chartResult.data,
            insights: chartResult.insights,
            suggestions: chartResult.suggestions,
            generatedByLLM: false
          };

          addToChartHistory({
            question,
            spec: chartResult.spec,
            data: chartResult.data,
            insights: chartResult.insights,
            timestamp: new Date()
          });

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `**${chartResult.spec.title}**\n\n${chartResult.spec.description}`,
            agenticChart: agenticData,
            suggestions: chartResult.suggestions,
            timestamp: new Date(),
            isMarkdown: true,
            source: 'local'
          };

          setMessages(prev => [...prev, assistantMessage]);

          if (autoSpeak) {
            speak(`${chartResult.spec.title}. ${chartResult.insights.join('. ')}`);
          }
          chartHandled = true;
        }
        // If chart generation failed, fall through to text response below
      }

      if (!chartHandled) {
        // Enrich follow-up questions with conversation context
        const { query: searchQuery, pointExtract } = enrichQueryWithContext(question, messages);

        // Search RAG knowledge base with enriched query
        const builtinChunks = getBuiltinChunks();
        const ragResults = searchChunks(searchQuery, documentChunks, builtinChunks, 5);
        const hasGoodRAG = ragResults.length > 0 && ragResults[0].score > 0.5;

        // Layer 1: Point drill-down follow-ups (e.g. "développe le point 7")
        // Always prefer RAG since enrichQueryWithContext already extracted the specific content
        if (pointExtract && ragResults.length > 0 && ragResults[0].score > 0.3) {
          const ragContent = buildPointFollowUpResponse(pointExtract, ragResults);
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: ragContent,
            insights: [`${ragResults.length} source(s) trouvée(s) dans la base de connaissances`],
            timestamp: new Date(),
            isMarkdown: true,
            source: 'local'
          };
          setMessages(prev => [...prev, assistantMessage]);
          if (autoSpeak) speak(ragContent);
        }
        // Layer 2: Knowledge questions (BPCO, produits, HAS, etc.) → RAG first
        else if (isKnowledgeQuestion(question) && hasGoodRAG) {
          const ragContent = buildLocalRAGResponse(ragResults);
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: ragContent,
            insights: [`${ragResults.length} source(s) trouvée(s) dans la base de connaissances`],
            timestamp: new Date(),
            isMarkdown: true,
            source: 'local'
          };
          setMessages(prev => [...prev, assistantMessage]);
          if (autoSpeak) speak(ragContent);
        }
        // Layer 3: Practitioner/data questions → local handler, with RAG as fallback
        else {
          const localResponse = generateCoachResponse(
            question,
            practitioners,
            currentUser.objectives
          );

          // If local handler couldn't give a specific answer, prefer RAG results
          const useRAG = (localResponse.isGenericHelp || localResponse.isNoMatch)
            && hasGoodRAG;

          if (useRAG) {
            const ragContent = buildLocalRAGResponse(ragResults);
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: ragContent,
              insights: [`${ragResults.length} source(s) trouvée(s) dans la base de connaissances`],
              timestamp: new Date(),
              isMarkdown: true,
              source: 'local'
            };
            setMessages(prev => [...prev, assistantMessage]);
            if (autoSpeak) speak(ragContent);
          } else {
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: localResponse.message,
              practitioners: localResponse.practitioners,
              insights: localResponse.insights,
              timestamp: new Date(),
              isMarkdown: localResponse.isMarkdown,
              source: 'local'
            };
            setMessages(prev => [...prev, assistantMessage]);
            if (autoSpeak && localResponse.message) speak(localResponse.message);
          }
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-al-blue-500 to-al-sky flex items-center justify-center shadow-lg shadow-al-blue-500/20">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <span className="bg-gradient-to-r from-al-blue-600 to-al-navy bg-clip-text text-transparent">
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
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs border border-blue-200">
              <Sparkles className="w-4 h-4" />
              <span>Intelligence locale</span>
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
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-al-blue-50/50 to-sky-50/50">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-al-blue-500" />
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
                           hover:bg-gradient-to-r hover:from-al-blue-50 hover:to-sky-50 hover:text-al-blue-700
                           transition-all hover:shadow-md border border-slate-200 hover:border-al-blue-300"
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
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-al-blue-500 to-al-sky flex items-center justify-center flex-shrink-0 shadow-md">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className={`${
                  message.role === 'user'
                    ? 'max-w-[85%] sm:max-w-[80%] bg-gradient-to-r from-al-blue-500 to-al-blue-600 text-white rounded-2xl rounded-tr-md px-3 sm:px-4 py-2 sm:py-3 shadow-md'
                    : `${message.agenticChart ? 'flex-1 min-w-0' : 'max-w-[85%] sm:max-w-[80%]'} space-y-3`
                }`}>
                  {/* Message content */}
                  {!message.agenticChart && (
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
                                  ? 'bg-al-blue-100 text-al-blue-600'
                                  : message.source === 'agentic'
                                  ? 'bg-purple-100 text-purple-600'
                                  : 'bg-blue-100 text-blue-600'
                              }`}>
                                {message.source === 'llm' ? 'Groq AI' : message.source === 'agentic' ? 'IA Agentique' : 'Intelligence locale'}
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
                  )}

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
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {message.agenticChart.spec.chartType === 'pie' ? (
                            <PieChartIcon className="w-5 h-5 text-al-blue-500" />
                          ) : message.agenticChart.spec.chartType === 'line' ? (
                            <TrendingUp className="w-5 h-5 text-green-500" />
                          ) : message.agenticChart.spec.chartType === 'composed' ? (
                            <BarChart3 className="w-5 h-5 text-al-navy" />
                          ) : message.agenticChart.spec.chartType === 'radar' ? (
                            <TrendingUp className="w-5 h-5 text-purple-500" />
                          ) : message.agenticChart.spec.chartType === 'area' ? (
                            <TrendingUp className="w-5 h-5 text-cyan-500" />
                          ) : (
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                          )}
                          <h4 className="font-semibold text-slate-800">{message.agenticChart.spec.title}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {message.agenticChart.generatedByLLM && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-gradient-to-r from-al-blue-100 to-sky-100 text-al-blue-700 rounded-full">
                              <Code2 className="w-3 h-3" />
                              Généré par IA
                            </span>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            message.source === 'llm'
                              ? 'bg-al-blue-100 text-al-blue-600'
                              : message.source === 'agentic'
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {message.source === 'llm' ? 'Groq AI' : message.source === 'agentic' ? 'IA Agentique' : 'Intelligence locale'}
                          </span>
                        </div>
                      </div>
                      {/* Description */}
                      {message.agenticChart.spec.description && (
                        <p className="text-sm text-slate-500 mb-3">{message.agenticChart.spec.description}</p>
                      )}

                      {/* Graphique dynamique */}
                      <div className="h-52 sm:h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {(() => {
                            const chart = message.agenticChart!;
                            const data = chart.data;
                            const metrics = chart.spec.query.metrics;
                            const primaryMetric = metrics[0]?.name || Object.keys(data[0] || {}).find(k => k !== 'name') || 'value';
                            const secondaryMetric = metrics[1]?.name;

                            if (chart.spec.chartType === 'pie') {
                              // Limit to 7 segments for readability, group rest as "Autres"
                              let pieData = data;
                              if (data.length > 7) {
                                const sorted = [...data].sort((a, b) => (Number(b[primaryMetric]) || 0) - (Number(a[primaryMetric]) || 0));
                                const top6 = sorted.slice(0, 6);
                                const othersTotal = sorted.slice(6).reduce((sum, item) => sum + (Number(item[primaryMetric]) || 0), 0);
                                pieData = [...top6, { name: `Autres (${data.length - 6})`, [primaryMetric]: othersTotal }];
                              }
                              return (
                                <PieChart>
                                  <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={true}
                                    label={({ name, percent }) => {
                                      const pct = (percent || 0) * 100;
                                      return pct >= 5 ? `${name} (${pct.toFixed(0)}%)` : '';
                                    }}
                                    outerRadius={90}
                                    fill="#8884d8"
                                    dataKey={primaryMetric}
                                  >
                                    {pieData.map((_, index) => (
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

                            if (chart.spec.chartType === 'radar') {
                              return (
                                <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
                                  <PolarGrid stroke="#e2e8f0" />
                                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                                  <PolarRadiusAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                  <Legend />
                                  <Radar
                                    dataKey={primaryMetric}
                                    stroke="#8B5CF6"
                                    fill="#8B5CF6"
                                    fillOpacity={0.3}
                                    name={primaryMetric}
                                  />
                                  {secondaryMetric && (
                                    <Radar
                                      dataKey={secondaryMetric}
                                      stroke="#10B981"
                                      fill="#10B981"
                                      fillOpacity={0.2}
                                      name={secondaryMetric}
                                    />
                                  )}
                                </RadarChart>
                              );
                            }

                            if (chart.spec.chartType === 'area') {
                              return (
                                <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                  <Legend />
                                  <Area
                                    type="monotone"
                                    dataKey={primaryMetric}
                                    stroke="#3B82F6"
                                    fill="#3B82F6"
                                    fillOpacity={0.3}
                                    strokeWidth={2}
                                    name={primaryMetric}
                                  />
                                  {secondaryMetric && (
                                    <Area
                                      type="monotone"
                                      dataKey={secondaryMetric}
                                      stroke="#10B981"
                                      fill="#10B981"
                                      fillOpacity={0.2}
                                      strokeWidth={2}
                                      name={secondaryMetric}
                                    />
                                  )}
                                </AreaChart>
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-al-blue-500 to-al-sky flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-slate-100">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-al-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-al-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-al-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
              className="btn-primary px-4 sm:px-6 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-al-blue-500 to-al-blue-600 hover:from-al-blue-600 hover:to-al-navy shadow-lg shadow-al-blue-500/20"
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
