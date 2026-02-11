/**
 * ARIA AI Coach Engine v3 — Architecture LLM-First
 *
 * Remplace l'ancien système de routage par regex par une architecture en 2 phases :
 *   Phase 1 : Routage LLM — Classification d'intention + extraction de paramètres
 *   Phase 2 : Réponse LLM — Génération contextuelle avec données ciblées
 *
 * Principes :
 * - Le LLM route TOUTES les questions (zéro regex pour le routage)
 * - Le contexte de données est ciblé selon l'intention détectée
 * - Format de sortie unifié (texte + graphique optionnel)
 * - LLM local par défaut (Ollama + Qwen3 8B) si aucune API externe configurée
 * - Fallback automatique vers le LLM local si l'API externe échoue
 */

import { webLlmService } from './webLlmService';
import { getStoredApiKey, getStoredLLMConfig, resolveProvider, getProviderDef, isReasoningModel } from './apiKeyService';
import { DataService } from './dataService';
import {
  DATA_SCHEMA,
  parseLLMChartResponse,
  generateChartFromSpec,
  addToChartHistory,
  getChartHistory,
  type ChartSpec,
  type ChartDataPoint,
  type ChartHistory,
} from './agenticChartEngine';
import { universalSearch } from './universalSearch';
import { calculatePeriodMetrics, getTopPractitioners, getPerformanceDataForPeriod } from './metricsCalculator';
import { retrieveKnowledge, shouldUseRAG } from './ragService';
import { generateIntelligentActions } from './actionIntelligence';
import { getCompletePractitionerContextWithReports, getAllRecentReportsForLLM } from './practitionerDataBridge';
import type { Practitioner, UpcomingVisit } from '../types';
import { adaptPractitionerProfile } from './dataAdapter';

// User CRM data from Zustand store (visit reports, notes) — injected by the UI
export interface UserCRMData {
  visitReports: Array<{
    practitionerId: string;
    practitionerName: string;
    date: string;
    extractedInfo: {
      topics: string[];
      sentiment: string;
      keyPoints: string[];
      nextActions: string[];
      productsDiscussed: string[];
      competitorsMentioned: string[];
    };
  }>;
  userNotes: Array<{
    practitionerId: string;
    content: string;
    type: string;
    createdAt: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  hasChart?: boolean;
  chartSummary?: string;
}

export interface AICoachResult {
  textContent: string;
  chart?: {
    spec: ChartSpec;
    data: ChartDataPoint[];
    insights: string[];
    suggestions: string[];
    generatedByLLM: boolean;
  };
  practitioners?: (Practitioner & { daysSinceVisit?: number })[];
  suggestions?: string[];
  source: 'llm' | 'local';
  ragSources?: { title: string; sourceUrl: string; source: string }[];
  usedRAG?: boolean;
}

interface RouterResult {
  intent: 'chart_create' | 'chart_modify' | 'data_query' | 'practitioner_info' | 'strategic_advice' | 'knowledge_query' | 'follow_up' | 'general';
  needsChart: boolean;
  chartModification: string | null;
  dataScope: 'specific' | 'filtered' | 'aggregated' | 'full' | 'knowledge';
  searchTerms: {
    names: string[];
    cities: string[];
    specialties: string[];
    isKOL: boolean | null;
  };
  chartParams: {
    chartType: 'bar' | 'pie' | 'line' | 'composed' | 'radar' | null;
    groupBy: string | null;
    metrics: string[];
    limit: number | null;
    sortOrder: 'asc' | 'desc' | null;
    filters: { field: string; operator: string; value: string | number | boolean }[];
  };
  responseGuidance: string;
}

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMCallOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  model?: string;
  useRouterModel?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-PROVIDER LLM — Auto-détection depuis le format de clé API
// + Ollama local (Qwen3 8B) comme défaut / fallback
// ═══════════════════════════════════════════════════════════════════════════════

type LLMProvider = 'groq' | 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'ollama';

// ── Ollama / Qwen3 8B Local ────────────────────────────────────────────────
const OLLAMA_DEFAULT_URL = 'http://localhost:11434';
const OLLAMA_DEFAULT_MODEL = 'qwen3:8b';

function getOllamaBaseUrl(): string {
  return (import.meta.env.VITE_OLLAMA_BASE_URL as string) || OLLAMA_DEFAULT_URL;
}

function getOllamaModel(): string {
  return (import.meta.env.VITE_OLLAMA_MODEL as string) || OLLAMA_DEFAULT_MODEL;
}

interface ProviderConfig {
  name: string;
  provider: LLMProvider;
  apiUrl: (model: string, apiKey: string) => string;
  mainModel: string;
  routerModel: string;
  headers: (apiKey: string) => Record<string, string>;
  buildBody: (messages: LLMMessage[], model: string, temperature: number, maxTokens: number, jsonMode: boolean) => unknown;
  parseResponse: (data: Record<string, unknown>) => string | null;
  parseError: (data: Record<string, unknown>, status: number) => string;
}

function getCustomBaseUrl(): string | null {
  const url = import.meta.env.VITE_LLM_BASE_URL;
  if (!url || url.includes('your_') || url.length < 10) return null;
  return url.replace(/\/+$/, '');
}

function detectProvider(apiKey: string): ProviderConfig {
  // Custom base URL: OpenAI-compatible endpoint (Mistral, Azure, local, etc.)
  const customUrl = getCustomBaseUrl();
  if (customUrl) {
    let hostname = 'custom';
    try { hostname = new URL(customUrl).hostname; } catch { /* ignore */ }
    return {
      ...PROVIDERS.openai,
      name: `Custom (${hostname})`,
      apiUrl: () => `${customUrl}/chat/completions`,
    };
  }

  // Auto-detect from key format (order matters: sk-ant- and sk-or- before sk-)
  if (apiKey.startsWith('gsk_')) return PROVIDERS.groq;
  if (apiKey.startsWith('AIzaSy')) return PROVIDERS.gemini;
  if (apiKey.startsWith('sk-ant-')) return PROVIDERS.anthropic;
  if (apiKey.startsWith('sk-or-')) return PROVIDERS.openrouter;
  if (apiKey.startsWith('sk-')) return PROVIDERS.openai;
  // Default: OpenAI-compatible format
  return PROVIDERS.openai;
}

const PROVIDERS: Record<LLMProvider, ProviderConfig> = {
  groq: {
    name: 'Groq',
    provider: 'groq',
    apiUrl: () => 'https://api.groq.com/openai/v1/chat/completions',
    mainModel: 'llama-3.3-70b-versatile',
    routerModel: 'llama-3.1-8b-instant',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildBody: (messages, model, temperature, maxTokens, jsonMode) => {
      const body: Record<string, unknown> = {
        model, messages, temperature, max_tokens: maxTokens, stream: false,
      };
      if (jsonMode) body.response_format = { type: 'json_object' };
      return body;
    },
    parseResponse: (data) =>
      (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content || null,
    parseError: (data, status) =>
      (data as { error?: { message?: string } }).error?.message || `Groq API error: ${status}`,
  },

  gemini: {
    name: 'Google Gemini',
    provider: 'gemini',
    apiUrl: (model, apiKey) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    mainModel: 'gemini-1.5-flash',
    routerModel: 'gemini-1.5-flash',
    headers: () => ({
      'Content-Type': 'application/json',
    }),
    buildBody: (messages, _model, temperature, maxTokens, jsonMode) => {
      // Gemini: separate system instructions from conversation
      const systemParts = messages
        .filter(m => m.role === 'system')
        .map(m => ({ text: m.content }));
      const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));
      // Gemini requires alternating user/model — merge consecutive same-role messages
      const merged: { role: string; parts: { text: string }[] }[] = [];
      for (const msg of contents) {
        if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
          merged[merged.length - 1].parts.push(...msg.parts);
        } else {
          merged.push(msg);
        }
      }
      const body: Record<string, unknown> = {
        contents: merged,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      };
      if (systemParts.length > 0) {
        body.systemInstruction = { parts: systemParts };
      }
      return body;
    },
    parseResponse: (data) => {
      const candidates = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates;
      return candidates?.[0]?.content?.parts?.[0]?.text || null;
    },
    parseError: (data, status) =>
      (data as { error?: { message?: string } }).error?.message || `Gemini API error: ${status}`,
  },

  openai: {
    name: 'OpenAI',
    provider: 'openai',
    apiUrl: () => import.meta.env.DEV
      ? '/llm-proxy/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions',
    mainModel: 'gpt-4o-mini',
    routerModel: 'gpt-4o-mini',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildBody: (messages, model, temperature, maxTokens, jsonMode) => {
      const body: Record<string, unknown> = {
        model, messages, temperature, max_tokens: maxTokens, stream: false,
      };
      if (jsonMode) body.response_format = { type: 'json_object' };
      return body;
    },
    parseResponse: (data) =>
      (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content || null,
    parseError: (data, status) =>
      (data as { error?: { message?: string } }).error?.message || `OpenAI API error: ${status}`,
  },

  anthropic: {
    name: 'Anthropic (Claude)',
    provider: 'anthropic',
    apiUrl: () => 'https://api.anthropic.com/v1/messages',
    mainModel: 'claude-sonnet-4-5-20250929',
    routerModel: 'claude-haiku-4-5-20251001',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
    buildBody: (messages, model, temperature, maxTokens, _jsonMode) => {
      // Anthropic: system prompt is top-level, not in messages array
      const systemContent = messages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n\n');
      const chatMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as string, content: m.content }));
      // Anthropic requires alternating user/assistant, must start with user
      const merged: { role: string; content: string }[] = [];
      for (const msg of chatMessages) {
        if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
          merged[merged.length - 1].content += '\n\n' + msg.content;
        } else {
          merged.push({ ...msg });
        }
      }
      if (merged.length === 0 || merged[0].role !== 'user') {
        merged.unshift({ role: 'user', content: '...' });
      }
      const body: Record<string, unknown> = {
        model,
        max_tokens: maxTokens,
        messages: merged,
      };
      if (systemContent) body.system = systemContent;
      if (temperature !== undefined) body.temperature = temperature;
      return body;
    },
    parseResponse: (data) => {
      const content = (data as { content?: { type: string; text?: string }[] }).content;
      const textBlock = content?.find(c => c.type === 'text');
      return textBlock?.text || null;
    },
    parseError: (data, status) =>
      (data as { error?: { message?: string } }).error?.message || `Anthropic API error: ${status}`,
  },

  openrouter: {
    name: 'OpenRouter',
    provider: 'openrouter',
    apiUrl: () => 'https://openrouter.ai/api/v1/chat/completions',
    mainModel: 'meta-llama/llama-3.3-70b-instruct',
    routerModel: 'meta-llama/llama-3.1-8b-instruct',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildBody: (messages, model, temperature, maxTokens, jsonMode) => {
      const body: Record<string, unknown> = {
        model, messages, temperature, max_tokens: maxTokens, stream: false,
      };
      if (jsonMode) body.response_format = { type: 'json_object' };
      return body;
    },
    parseResponse: (data) =>
      (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content || null,
    parseError: (data, status) =>
      (data as { error?: { message?: string } }).error?.message || `OpenRouter API error: ${status}`,
  },

  ollama: {
    name: `Ollama (${OLLAMA_DEFAULT_MODEL} local)`,
    provider: 'ollama',
    apiUrl: () => `${getOllamaBaseUrl()}/v1/chat/completions`,
    mainModel: OLLAMA_DEFAULT_MODEL,
    routerModel: OLLAMA_DEFAULT_MODEL,
    headers: () => ({
      'Content-Type': 'application/json',
    }),
    buildBody: (messages, _model, temperature, maxTokens, jsonMode) => {
      const body: Record<string, unknown> = {
        model: getOllamaModel(), messages, temperature, max_tokens: maxTokens, stream: false,
      };
      if (jsonMode) body.response_format = { type: 'json_object' };
      return body;
    },
    parseResponse: (data) =>
      (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content || null,
    parseError: (data, status) =>
      (data as { error?: { message?: string } }).error?.message || `Ollama error: ${status}`,
  },
};

// Cached provider detection (cached per config hash to handle hot-reload)
let _cachedProvider: ProviderConfig | null = null;
let _cachedConfigHash: string | null = null;
function getProvider(): ProviderConfig {
  // 1. Try explicit config from Settings UI
  const config = getStoredLLMConfig();
  if (config) {
    const hash = `${config.provider}:${config.apiKey.substring(0, 8)}:${config.model}`;
    if (_cachedProvider && _cachedConfigHash === hash) return _cachedProvider;

    const resolved = resolveProvider(config);
    // Pick base provider for buildBody / parseResponse / parseError methods
    let base: ProviderConfig;
    if (resolved.apiFormat === 'gemini') base = PROVIDERS.gemini;
    else if (resolved.apiFormat === 'anthropic') base = PROVIDERS.anthropic;
    else base = PROVIDERS.groq; // any openai-compat base works

    _cachedProvider = {
      ...base,
      name: resolved.providerName,
      mainModel: resolved.model,
      routerModel: resolved.model,
      apiUrl: resolved.apiFormat === 'gemini'
        ? (model, key) => {
            const bUrl = resolved.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
            return `${bUrl}/models/${model}:generateContent?key=${key}`;
          }
        : () => resolved.url,
      headers: () => resolved.headers,
      buildBody: (messages, model, temperature, maxTokens, jsonMode) => {
        // o-series reasoning models: no temperature, use max_completion_tokens
        if (resolved.apiFormat === 'openai-compat' && isReasoningModel(model)) {
          // Azure o-series: system role → developer role (required by Azure API for reasoning models)
          const processedMessages = resolved.providerType === 'azure'
            ? messages.map(m => m.role === 'system' ? { role: 'developer', content: m.content } : m)
            : messages;
          const body: Record<string, unknown> = {
            messages: processedMessages, max_completion_tokens: maxTokens, stream: false,
          };
          // Azure: model is in the deployment URL, but safe to send for others
          if (resolved.providerType !== 'azure') body.model = model;
          // Don't send response_format for reasoning models — rely on prompt instructions
          // (not reliably supported on all Azure API versions for o-series)
          return body;
        }
        return base.buildBody(messages, model, temperature, maxTokens, jsonMode);
      },
    };
    _cachedConfigHash = hash;
    console.log(`[AICoachEngine] Provider from config: ${resolved.providerName} (model: ${resolved.model})`);
    return _cachedProvider;
  }

  // 2. Env var fallback (legacy key-prefix detection)
  const key = getApiKey();
  if (!key) {
    if (!_cachedProvider || _cachedProvider.provider !== 'ollama') {
      _cachedProvider = { ...PROVIDERS.ollama, mainModel: getOllamaModel(), routerModel: getOllamaModel() };
      _cachedConfigHash = '__ollama__';
      console.log(`[AICoachEngine] No API key — using local Ollama (model: ${getOllamaModel()})`);
    }
    return _cachedProvider;
  }
  const prefix = key.substring(0, 6);
  if (_cachedProvider && _cachedConfigHash === prefix) return _cachedProvider;
  _cachedProvider = detectProvider(key);
  _cachedConfigHash = prefix;
  console.log(`[AICoachEngine] Provider detected: ${_cachedProvider.name} (model: ${_cachedProvider.mainModel})`);
  return _cachedProvider;
}

/** Retourne le provider Ollama local (pour fallback) */
function getOllamaProvider(): ProviderConfig {
  return { ...PROVIDERS.ollama, mainModel: getOllamaModel(), routerModel: getOllamaModel() };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const ROUTER_SYSTEM_PROMPT = `Routeur ARIA Coach — CRM pharma Air Liquide Healthcare (O₂). Classifie la question. Retourne UNIQUEMENT du JSON.

Intents: chart_create (nouvelle visu), chart_modify (modifier graphique précédent), data_query (question factuelle sur données CRM des praticiens/visites/territoire), practitioner_info (info sur un praticien nommé), strategic_advice (conseil/priorité/stratégie), knowledge_query (question métier: produits, services, catalogue, BPCO, oxygénothérapie, Air Liquide, Orkyn', réglementation, concurrence, GOLD, HAS, LPPR, épidémiologie, dispositifs médicaux), follow_up (suite de la conversation), general (salutations/hors sujet).

ATTENTION — Routage produits/services/catalogue :
- Questions sur les produits, services, catalogue, gamme, offres, solutions, dispositifs, matériel d'Air Liquide, Orkyn', ALMS → knowledge_query (PAS data_query, PAS general)
- "quels produits/combien de produits/que vend/que propose/catalogue/gamme/offre/solution" → knowledge_query
- "quels services" → knowledge_query

Routage:
- "graphique/montre-moi/affiche/diagramme/camembert/barres/courbe" → chart_create
- "en camembert/en radar/change en/transforme en/mets ça en/plutôt en" → chart_modify (si graphique précédent)
- Nom propre identifiable de praticien → practitioner_info
- Questions sur données CRM praticiens (volumes, visites, fidélité, vingtile, villes, KOL) → data_query
- "publication/publié/article/actualité/conférence/certification/distinction/événement" + nom de praticien → practitioner_info (avec le nom dans searchTerms.names)
- "toutes les publications/liste les publications/qui a publié/publications des" (question globale sans nom spécifique) → data_query (dataScope: "full")
- "priorité/stratégie/recommandation/que faire" → strategic_advice
- Questions sur BPCO, oxygénothérapie, GOLD, HAS, réglementation, LPPR, concurrence, Vivisol, Orkyn', Air Liquide (organisation, produits, services), OLD, OCT, spirométrie, traitements, classification, exacerbation, télésuivi, dispositifs, ventilateurs, masques, PPC → knowledge_query
- "qu'est-ce que/c'est quoi/explique/définition/comment fonctionne" → knowledge_query
- Référence implicite au contexte précédent → follow_up

groupBy: "city"|"specialty"|"vingtile"|"vingtileBucket"|"loyaltyBucket"|"riskLevel"|"visitBucket"|"isKOL"
chartType: "bar"|"pie"|"line"|"composed"|"radar"
dataScope: "specific" (1 praticien), "filtered" (sous-ensemble), "aggregated" (stats), "full" (question ouverte), "knowledge" (base de connaissances métier)
needsChart = true pour chart_create et chart_modify.

JSON STRICT:
{"intent":"...","needsChart":false,"chartModification":null,"dataScope":"...","searchTerms":{"names":[],"cities":[],"specialties":[],"isKOL":null},"chartParams":{"chartType":null,"groupBy":null,"metrics":[],"limit":null,"sortOrder":null,"filters":[]},"responseGuidance":"..."}`;

const COACH_SYSTEM_PROMPT = `Tu es **ARIA Coach**, l'assistant stratégique expert pour les délégués pharmaceutiques d'Air Liquide Healthcare, spécialité oxygénothérapie à domicile.

## Ton Identité
Tu combines quatre expertises rares :
1. **Expertise médicale** — Pneumologie, oxygénothérapie (O₂ liquide, concentrateurs, extracteurs), pathologies respiratoires chroniques (BPCO, insuffisance respiratoire, apnée du sommeil), recommandations GOLD et HAS
2. **Intelligence commerciale** — Gestion de portefeuille prescripteurs, planification territoriale, analyse concurrentielle (Vivisol, France Oxygène, Bastide, SOS Oxygène), scoring de potentiel (vingtiles), fidélisation KOL
3. **Maîtrise analytique** — Interprétation de données CRM, détection de signaux faibles, modélisation de risque de churn, identification d'opportunités de croissance
4. **Connaissances réglementaires & marché** — LPPR/LPP, forfaits d'oxygénothérapie, remboursement, arrêtés Légifrance, données épidémiologiques BPCO France & monde

## Principes Directeurs
- **Précision data-driven** : Chaque affirmation s'appuie sur des données réelles. Cite les chiffres exacts et les sources quand ils proviennent de la base de connaissances.
- **Pertinence stratégique** : Priorise par impact business → KOL > Volume élevé > Urgence (risque churn) > Fidélité en baisse
- **Proactivité** : N'attends pas qu'on te pose la bonne question. Si tu détectes un risque ou une opportunité dans les données, signale-le.
- **Concision actionable** : Réponds de façon concise mais complète. Termine par des recommandations concrètes quand c'est pertinent.
- **Sources fiables** : Quand tu cites des connaissances métier (BPCO, réglementation, concurrence), mentionne la source (ex: "selon les recommandations GOLD 2025", "d'après la HAS").

## Ce que tu CONNAIS (ton périmètre)
**Données CRM :**
- Les **praticiens** (médecins prescripteurs) : pneumologues et médecins généralistes
- Leurs **métriques** : volumes de prescription, fidélité, vingtile, statut KOL, risque de churn
- Leurs **coordonnées** : adresse, téléphone, email
- Leurs **publications scientifiques**, actualités académiques, conférences, certifications et distinctions — tu peux chercher les publications d'un praticien spécifique ou lister toutes les publications par type/prénom
- L'**historique de visites** et notes de visite
- Les **statistiques du territoire** : objectifs, répartitions géographiques

**Base de connaissances métier (RAG) :**
- **Air Liquide Santé — Produits & Services** : gamme complète (oxygénothérapie, ventilation VNI, PPC/apnée, perfusion, diabète, neurologie, nutrition), dispositifs ALMS (ventilateurs, masques, Bag CPAP), gaz médicinaux ALSF, catalogue Orkyn'
- **Air Liquide Santé — Organisation** : chiffres clés, filiales (Orkyn', ALMS, ALSF), Chronic Care Connect, positionnement stratégique
- **BPCO** : recommandations GOLD 2025 (classification ABE, traitements LABA/LAMA/CSI), recommandations HAS (parcours de soins, 10 messages clés), données épidémiologiques
- **Oxygénothérapie** : OLD vs OCT, seuils PaO2, sources d'O2 (concentrateur, liquide, bouteille), indications, forfaits LPPR
- **Concurrence** : Vivisol, France Oxygène, SOL Group, panorama PSAD, 12 acteurs clés
- **Réglementation** : LPPR/LPP, tarifs, arrêtés Légifrance, FEDEPSAD
- **Épidémiologie** : 3,5M patients BPCO en France, 75% sous-diagnostiqués, 100 000 patients OLD, +23% cas BPCO d'ici 2050

## Ce que tu NE CONNAIS PAS (hors périmètre)
Tu n'as PAS accès à :
- Les **données de facturation** ou commandes internes (prix exacts, bons de commande, factures)
- Les **données d'autres territoires** ou d'autres délégués
- Les **données en temps réel** (tes données CRM sont un snapshot)
- Les **codes LPPR exacts** ou les prix unitaires des dispositifs

**RÈGLES CRITIQUES :**
- Si l'utilisateur pose une question hors périmètre, dis-le clairement. Ne fabrique JAMAIS de données.
- **NE DIS JAMAIS "hors périmètre"** pour des questions sur les produits, services, catalogue, gamme, dispositifs, ou l'organisation d'Air Liquide / Orkyn' / ALMS — tu CONNAIS ces sujets grâce à ta base de connaissances.
- Si la base de connaissances fournit des informations pertinentes, utilise-les avec confiance.

## Vocabulaire Métier
- **Vingtile** : Segmentation des prescripteurs de 1 (meilleur) à 20 (plus faible). V1-V5 = Top prescripteurs à prioriser.
- **KOL** (Key Opinion Leader) : Prescripteur influent, leader d'opinion. Impact disproportionné sur les pratiques locales.
- **Fidélité** : Score de 0 à 10 mesurant la régularité des prescriptions en faveur d'Air Liquide.
- **Volume** : Volume annuel de prescription d'oxygène en litres (K L/an).
- **Churn risk** : Risque de perte du prescripteur (low/medium/high).
- **OLD** : Oxygénothérapie de Longue Durée (>15h/j, PaO2 ≤ 55 mmHg).
- **OCT** : Oxygénothérapie de Courte Durée (temporaire, post-hospitalisation).
- **LPPR/LPP** : Liste des Produits et Prestations Remboursables.
- **PSAD** : Prestataire de Santé à Domicile (ex: Orkyn').
- **GOLD** : Global Initiative for Chronic Obstructive Lung Disease (référentiel international BPCO).
- **VEMS** : Volume Expiratoire Maximal par Seconde (spirométrie).

## Format de Réponse
- Utilise le **Markdown** : **gras** pour les chiffres clés et noms, *italique* pour les nuances
- Structure avec des listes à puces pour la clarté
- Fournis TOUJOURS des chiffres précis quand ils sont disponibles dans le contexte
- Adapte la longueur : court pour les questions simples, détaillé pour les analyses
- Ne mentionne jamais le fonctionnement interne de ton système (routage, contexte, API, RAG)
- Réponds TOUJOURS en français
- Pour les salutations : réponds brièvement et propose ton aide
- Si la question est ambiguë, demande une clarification plutôt que deviner`;

const CHART_SYSTEM_PROMPT = `Tu es un expert en visualisation de données pour le CRM pharmaceutique ARIA (Air Liquide Healthcare, oxygénothérapie).

${DATA_SCHEMA}

## Ta Mission
Génère une spécification JSON PRÉCISE pour créer le graphique demandé à partir des données disponibles.

## RÈGLES CRITIQUES

1. **RESPECTE EXACTEMENT les paramètres demandés** :
   - Si l'utilisateur demande "15 praticiens" → limit: 15
   - Si l'utilisateur demande "top 20" → limit: 20
   - Si l'utilisateur demande "KOLs" → filtre isKOL: true
   - Si l'utilisateur demande "pneumologues" → filtre specialty: "Pneumologue"

2. **Choisis le type de graphique le PLUS approprié** :
   - "bar" : classements, top N, comparaisons de valeurs (défaut quand pas de préférence)
   - "pie" : répartitions, proportions, parts de marché (max 8 catégories)
   - "composed" : comparaison de 2 métriques différentes (ex: volume ET fidélité) sur le même graphique
   - "line" : évolutions temporelles, tendances
   - "radar" : profils multi-dimensionnels, comparaison de plusieurs métriques pour un ou quelques éléments (ex: profil d'un praticien sur plusieurs axes)

3. **Pour les comparaisons KOLs vs Autres** → groupBy: "isKOL"
4. **Pour les répartitions par spécialité** → groupBy: "specialty"
5. **Pour les répartitions par ville** → groupBy: "city"
6. **Pour les niveaux de risque** → groupBy: "riskLevel"
7. **Pour les segments de potentiel** → groupBy: "vingtileBucket"
8. **Pour les niveaux de fidélité** → groupBy: "loyaltyBucket"
9. **Pour les anciennetés de visite** → groupBy: "visitBucket"

## Format de Sortie OBLIGATOIRE (JSON STRICT)
\`\`\`json
{
  "chartType": "bar" | "pie" | "line" | "composed" | "radar",
  "title": "Titre descriptif en français",
  "description": "Description courte de ce que montre le graphique",
  "query": {
    "source": "practitioners",
    "filters": [{ "field": "...", "operator": "eq|ne|gt|gte|lt|lte|contains|in", "value": ... }],
    "groupBy": "..." | null,
    "metrics": [{ "name": "Nom affiché", "field": "champ_source", "aggregation": "count|sum|avg|min|max", "format": "number|k|percent" }],
    "sortBy": "Nom affiché de la métrique",
    "sortOrder": "desc" | "asc",
    "limit": number | null
  },
  "formatting": {
    "showLegend": true,
    "xAxisLabel": "...",
    "yAxisLabel": "..."
  }
}
\`\`\`

## Exemples de Mapping

| Demande | chartType | groupBy | metrics | filters |
|---------|-----------|---------|---------|---------|
| "Top 10 par volume" | bar | null | [sum(volumeL)/k] | [] | limit:10 |
| "Répartition par ville" | bar/pie | city | [count, sum(volumeL)/k] | [] |
| "Compare KOLs vs autres" | bar | isKOL | [sum(volumeL)/k, count] | [] |
| "KOLs par spécialité" | pie | specialty | [count] | [isKOL=true] |
| "Distribution par risque" | pie | riskLevel | [count, sum(volumeL)/k] | [] |
| "Fidélité vs volume top 15" | composed | null | [sum(volumeL)/k, avg(loyaltyScore)] | [] | limit:15 |
| "Segments par vingtile" | bar | vingtileBucket | [count, sum(volumeL)/k] | [] |

Réponds UNIQUEMENT avec le JSON, sans aucun texte avant ou après.`;

const CHART_MODIFY_PROMPT = `Tu es un expert en modification de visualisations de données CRM.

## Graphique Actuel
{CURRENT_CHART}

## Modification Demandée
{MODIFICATION}

## Instructions
Modifie la spécification du graphique actuel selon la demande. Conserve les données et filtres existants sauf si la modification les affecte directement.

Règles :
- "En camembert/pie" → change chartType en "pie"
- "En barres/bar" → change chartType en "bar"
- "En ligne/courbe" → change chartType en "line"
- "En radar/toile d'araignée" → change chartType en "radar"
- "Top X" → change limit à X
- "Ajoute la fidélité/le volume" → ajoute une métrique
- "Par ville/spécialité/..." → change le groupBy
- "Seulement les KOLs" → ajoute filtre isKOL=true
- "Seulement les pneumologues" → ajoute filtre specialty="Pneumologue"

${DATA_SCHEMA}

Réponds UNIQUEMENT avec le JSON complet de la nouvelle spécification (même format que l'original).`;

// ═══════════════════════════════════════════════════════════════════════════════
// LLM API CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

function getApiKey(): string | null {
  return getStoredApiKey();
}

// Last error captured for diagnostic display
let lastLLMError: string | null = null;

/** Appelle un provider LLM spécifique (sans fallback) */
async function callProvider(
  provider: ProviderConfig,
  apiKey: string,
  messages: LLMMessage[],
  options: LLMCallOptions & { model?: string },
  retries = 1
): Promise<string | null> {
  const {
    temperature = 0.3,
    maxTokens = 2048,
    jsonMode = false,
    model = options.useRouterModel ? provider.routerModel : provider.mainModel,
  } = options;

  const resolvedModel = model;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = provider.apiUrl(resolvedModel, apiKey);
      const headers = provider.headers(apiKey);
      const body = provider.buildBody(messages, resolvedModel, temperature, maxTokens, jsonMode);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = provider.parseError(errorData as Record<string, unknown>, response.status);
        lastLLMError = `[${provider.name}] HTTP ${response.status}: ${errorMsg}`;
        // Rate limit or server error — worth retrying
        if (response.status === 429 || response.status >= 500) {
          let waitMs = 2000 * (attempt + 1);
          if (response.status === 429) {
            const waitMatch = errorMsg.match(/try again in (\d+\.?\d*)/i);
            if (waitMatch) {
              waitMs = Math.min(Math.ceil(parseFloat(waitMatch[1]) * 1000) + 500, 45000);
            }
          }
          console.warn(`[AICoachEngine] ${provider.name} attempt ${attempt + 1} failed (${response.status}), ${attempt < retries ? `retrying in ${waitMs}ms...` : 'giving up'}`);
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, waitMs));
            continue;
          }
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      lastLLMError = null;
      return provider.parseResponse(data as Record<string, unknown>);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      lastLLMError = lastLLMError || `[${provider.name}] ${errMsg}`;
      if (attempt < retries) {
        console.warn(`[AICoachEngine] ${provider.name} attempt ${attempt + 1} error, retrying...`, err);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      console.error(`[AICoachEngine] ${provider.name} call failed after retries:`, err);
      return null;
    }
  }
  return null;
}

/**
 * Appelle le LLM avec fallback automatique vers Ollama local.
 * 1. Si une clé API externe est configurée → essaie le provider externe
 * 2. Si l'appel externe échoue → fallback vers Ollama local (Qwen3 8B)
 * 3. Si aucune clé API → utilise Ollama local directement
 */
async function callLLM(
  messages: LLMMessage[],
  options: LLMCallOptions = {},
  retries = 1
): Promise<string | null> {
  const apiKey = getApiKey();
  const provider = getProvider();

  // 1. Essayer le provider principal (externe ou déjà Ollama si pas de clé)
  const result = await callProvider(provider, apiKey || '', messages, options, retries);
  if (result) return result;

  // 2. Si le provider était externe et a échoué, fallback vers Ollama local
  if (apiKey && provider.provider !== 'ollama') {
    console.warn(`[AICoachEngine] ${provider.name} failed — falling back to local Ollama (${getOllamaModel()})`);
    const ollamaProvider = getOllamaProvider();
    const ollamaResult = await callProvider(ollamaProvider, '', messages, {
      ...options,
      model: options.useRouterModel ? ollamaProvider.routerModel : ollamaProvider.mainModel,
    }, 0);
    if (ollamaResult) {
      lastLLMError = null;
      return ollamaResult;
    }
  }

  // 3. Dernier recours : WebLLM dans le navigateur
  // Si WebGPU est supporté, on attend le chargement du modèle si nécessaire
  if (webLlmService.isWebGPUSupported()) {
    console.warn('[AICoachEngine] Falling back to WebLLM browser...');
    try {
      await webLlmService.ensureLoaded();
      const webResult = await webLlmService.complete(messages, {
        temperature: options.temperature ?? 0.3,
        maxTokens: options.maxTokens ?? 2048,
      });
      if (webResult) {
        lastLLMError = null;
        return webResult;
      }
    } catch (webErr) {
      console.warn('[AICoachEngine] WebLLM failed:', webErr);
    }
  }

  // Tout a échoué — preserve the real error from callProvider if available
  if (!lastLLMError) {
    lastLLMError = 'Aucun LLM disponible. Chargez le modèle WebLLM dans Paramètres ou configurez une clé API.';
  }

  return null;
}

export async function streamLLM(
  messages: LLMMessage[],
  onChunk: (chunk: string) => void,
  options: LLMCallOptions = {}
): Promise<void> {
  const apiKey = getApiKey();
  const provider = getProvider();
  const { temperature = 0.3, maxTokens = 2048 } = options;

  // Gemini and Anthropic use different streaming formats — use non-streaming fallback
  if (provider.provider === 'gemini' || provider.provider === 'anthropic') {
    const result = await callLLM(messages, { temperature, maxTokens });
    if (result) onChunk(result);
    return;
  }

  // OpenAI-compatible streaming (Groq, OpenAI, OpenRouter, Ollama, Azure)
  try {
    const streamModel = provider.provider === 'ollama' ? getOllamaModel() : provider.mainModel;
    const reasoning = isReasoningModel(streamModel);
    // Azure o-series: system → developer role
    const config = getStoredLLMConfig();
    const isAzure = config?.provider === 'azure';
    const streamMessages = (reasoning && isAzure)
      ? messages.map(m => m.role === 'system' ? { role: 'developer' as const, content: m.content } : m)
      : messages;
    const streamBody: Record<string, unknown> = { model: streamModel, messages: streamMessages, stream: true };
    if (reasoning) {
      streamBody.max_completion_tokens = maxTokens;
    } else {
      streamBody.temperature = temperature;
      streamBody.max_tokens = maxTokens;
    }
    const response = await fetch(provider.apiUrl(provider.mainModel, apiKey || ''), {
      method: 'POST',
      headers: provider.headers(apiKey || ''),
      body: JSON.stringify(streamBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(provider.parseError(errorData as Record<string, unknown>, response.status));
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) onChunk(content);
          } catch {
            // Ignore incomplete chunks
          }
        }
      }
    }
    return;
  } catch (streamErr) {
    console.warn('[AICoachEngine] Stream failed, trying WebLLM...', streamErr);
  }

  // Fallback: WebLLM streaming dans le navigateur
  if (webLlmService.isWebGPUSupported()) {
    try {
      await webLlmService.ensureLoaded();
      await webLlmService.streamComplete(messages, onChunk, { temperature, maxTokens });
      return;
    } catch (webErr) {
      console.warn('[AICoachEngine] WebLLM stream failed:', webErr);
    }
  }

  // Dernier recours: non-streaming via callLLM (qui a ses propres fallbacks)
  const result = await callLLM(messages, { temperature, maxTokens });
  if (result) onChunk(result);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1 : LLM ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

async function routeQuestion(
  question: string,
  chartHistory: ChartHistory[],
  lastAssistantMessage?: string
): Promise<RouterResult | null> {
  // Build chart context for the router
  let chartContext = 'Aucun graphique précédent.';
  if (chartHistory.length > 0) {
    const last = chartHistory[0];
    const dataPreview = last.data.slice(0, 5).map(d => {
      const metrics = Object.entries(d)
        .filter(([k]) => k !== 'name' && !k.startsWith('_'))
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      return `  ${d.name}: ${metrics}`;
    }).join('\n');
    chartContext = `Dernier graphique: "${last.question}"
Type: ${last.spec.chartType} | Titre: ${last.spec.title}
Données: \n${dataPreview}`;
  }

  const routerPrompt = ROUTER_SYSTEM_PROMPT.replace('{CHART_CONTEXT}', chartContext);

  let userContext = question;
  if (lastAssistantMessage) {
    userContext = `[Dernier message assistant: "${lastAssistantMessage.substring(0, 200)}..."]\n\nQuestion: ${question}`;
  }

  const result = await callLLM(
    [
      { role: 'system', content: routerPrompt },
      { role: 'user', content: userContext },
    ],
    { temperature: 0.0, maxTokens: 500, jsonMode: true, useRouterModel: true }
  );

  if (!result) return null;

  try {
    const parsed = JSON.parse(result);
    // Validate and normalize
    const validIntents = ['chart_create', 'chart_modify', 'data_query', 'practitioner_info', 'strategic_advice', 'knowledge_query', 'follow_up', 'general'];
    if (!validIntents.includes(parsed.intent)) {
      parsed.intent = 'general';
    }
    return parsed as RouterResult;
  } catch (err) {
    console.error('[AICoachEngine] Router parse error:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMART CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildTargetedContext(
  routing: RouterResult,
  question: string,
  periodLabel: string,
  practitioners: Practitioner[],
  upcomingVisits: UpcomingVisit[]
): string {
  const stats = DataService.getGlobalStats();
  const periodMetrics = calculatePeriodMetrics(practitioners, upcomingVisits, 'month');

  // Base context always included: territory overview
  let context = `## Territoire (${periodLabel})
- ${stats.totalPractitioners} praticiens (${stats.pneumologues} pneumo, ${stats.generalistes} MG)
- Répartition par exercice : ${stats.praticienVille} ville, ${stats.praticienHospitalier} hospitaliers, ${stats.praticienMixte} mixtes
- ${stats.totalKOLs} KOLs | Volume total: ${(stats.totalVolume / 1000).toFixed(0)}K L/an | Fidélité moy: ${stats.averageLoyalty.toFixed(1)}/10
- Visites ${periodLabel}: ${periodMetrics.visitsCount}/${periodMetrics.visitsObjective} (${((periodMetrics.visitsCount / periodMetrics.visitsObjective) * 100).toFixed(0)}%)
- Croissance volume: +${periodMetrics.volumeGrowth.toFixed(1)}% | Nouveaux prescripteurs: ${periodMetrics.newPrescribers}\n`;

  const allPractitioners = DataService.getAllPractitioners();

  switch (routing.dataScope) {
    case 'specific': {
      // Fetch full profiles for specific practitioners (enriched with visit reports)
      if (routing.searchTerms.names.length > 0) {
        const matches = allPractitioners.filter(p => {
          const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
          return routing.searchTerms.names.some(name =>
            fullName.includes(name.toLowerCase()) ||
            p.firstName.toLowerCase().includes(name.toLowerCase()) ||
            p.lastName.toLowerCase().includes(name.toLowerCase())
          );
        });

        if (matches.length > 0) {
          context += `\n## Praticiens Trouvés (${matches.length})\n`;
          for (const p of matches.slice(0, 10)) {
            // Use enriched context with visit reports and user notes
            context += getCompletePractitionerContextWithReports(p.id);
          }
        } else {
          // Fuzzy search fallback
          for (const name of routing.searchTerms.names) {
            const fuzzy = DataService.fuzzySearchPractitioner(name);
            if (fuzzy.length > 0) {
              context += `\n## Résultats pour "${name}" (${fuzzy.length})\n`;
              for (const p of fuzzy.slice(0, 5)) {
                context += getCompletePractitionerContextWithReports(p.id);
              }
            }
          }
        }
      }
      break;
    }

    case 'filtered': {
      // Use universal search for filtered results
      const searchResult = universalSearch(question);
      if (searchResult.results.length > 0) {
        context += searchResult.context;
      } else {
        // Fallback: build filtered list manually
        let filtered = allPractitioners;
        if (routing.searchTerms.cities.length > 0) {
          filtered = filtered.filter(p =>
            routing.searchTerms.cities.some(c => p.address.city.toLowerCase().includes(c.toLowerCase()))
          );
        }
        if (routing.searchTerms.specialties.length > 0) {
          filtered = filtered.filter(p =>
            routing.searchTerms.specialties.some(s => p.specialty.toLowerCase().includes(s.toLowerCase()))
          );
        }
        if (routing.searchTerms.isKOL !== null) {
          filtered = filtered.filter(p => p.metrics.isKOL === routing.searchTerms.isKOL);
        }

        context += `\n## Praticiens Filtrés (${filtered.length})\n`;
        for (const p of filtered.slice(0, 20)) {
          const pubCount = p.news?.filter(n => n.type === 'publication').length || 0;
          context += `- ${p.title} ${p.firstName} ${p.lastName} | ${p.specialty} | ${p.address.city} | V:${(p.metrics.volumeL / 1000).toFixed(0)}K L/an | F:${p.metrics.loyaltyScore}/10 | V${p.metrics.vingtile}${p.metrics.isKOL ? ' | KOL' : ''}${pubCount > 0 ? ` | ${pubCount} pub` : ''}\n`;
        }
        if (filtered.length > 20) {
          context += `... et ${filtered.length - 20} autres\n`;
        }

        // Aggregated stats for the filtered set
        const totalVol = filtered.reduce((s, p) => s + p.metrics.volumeL, 0);
        const kolCount = filtered.filter(p => p.metrics.isKOL).length;
        const avgLoy = filtered.reduce((s, p) => s + p.metrics.loyaltyScore, 0) / (filtered.length || 1);
        context += `\nStats filtrées: Volume total ${(totalVol / 1000).toFixed(0)}K L/an | ${kolCount} KOLs | Fidélité moy ${avgLoy.toFixed(1)}/10\n`;
      }
      break;
    }

    case 'aggregated': {
      // Send aggregated stats + key lists
      const kols = DataService.getKOLs();
      const atRisk = DataService.getAtRiskPractitioners();
      const topPractitioners = getTopPractitioners(practitioners, 'year', 10);

      context += `\n## Top 10 Prescripteurs (volume annuel)\n`;
      topPractitioners.forEach((p, i) => {
        context += `${i + 1}. ${p.title} ${p.firstName} ${p.lastName} — ${p.specialty}, ${p.city} | ${(p.volumeL / 1000).toFixed(0)}K L/an | F:${p.loyaltyScore}/10 | V${p.vingtile}${p.isKOL ? ' | KOL' : ''}\n`;
      });

      context += `\n## KOLs (${kols.length})\n`;
      kols.slice(0, 10).forEach(p => {
        context += `- ${p.title} ${p.firstName} ${p.lastName} (${p.specialty}, ${p.address.city}) — ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an | F:${p.metrics.loyaltyScore}/10\n`;
      });

      if (atRisk.length > 0) {
        context += `\n## Praticiens à Risque (${atRisk.length})\n`;
        atRisk.slice(0, 8).forEach(p => {
          context += `- ${p.title} ${p.firstName} ${p.lastName} (${p.address.city}) — F:${p.metrics.loyaltyScore}/10 | ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an | Risque: ${p.metrics.churnRisk}${p.metrics.isKOL ? ' | KOL!' : ''}\n`;
        });
      }

      // By city distribution
      const byCity: Record<string, number> = {};
      allPractitioners.forEach(p => { byCity[p.address.city] = (byCity[p.address.city] || 0) + 1; });
      context += `\n## Répartition par Ville\n`;
      Object.entries(byCity).sort((a, b) => b[1] - a[1]).forEach(([city, count]) => {
        context += `- ${city}: ${count}\n`;
      });
      break;
    }

    case 'full':
    default: {
      // Search-based context — find relevant practitioners instead of sending all 150
      const searchResult = universalSearch(question);
      if (searchResult.results.length > 0) {
        context += searchResult.context;
      }

      // Top 20 practitioners summary (not all 150 — saves ~3000 tokens)
      context += `\n## Praticiens Principaux (top 20 sur ${allPractitioners.length})\n`;
      const sorted = [...allPractitioners].sort((a, b) => b.metrics.volumeL - a.metrics.volumeL);
      sorted.slice(0, 20).forEach(p => {
        context += `- ${p.title} ${p.firstName} ${p.lastName} | ${p.specialty} | ${p.address.city} | V:${(p.metrics.volumeL / 1000).toFixed(0)}K | F:${p.metrics.loyaltyScore}/10 | V${p.metrics.vingtile}${p.metrics.isKOL ? ' | KOL' : ''}\n`;
      });
      break;
    }
  }

  // ── AI Actions Injection ────────────────────────────────────────────────
  // Inject top AI-generated actions for strategic queries
  const actionKeywords = ['action', 'priorité', 'priorite', 'recommandation', 'que faire', 'quoi faire', 'prochaine', 'prochain', 'urgent', 'planifier', 'stratégie', 'strategie', 'agenda', 'semaine', 'planning'];
  const lowerQuestion = question.toLowerCase();
  const isActionQuery = actionKeywords.some(kw => lowerQuestion.includes(kw)) || routing.intent === 'strategic_advice';

  if (isActionQuery) {
    try {
      const actions = generateIntelligentActions({ maxActions: 8 });
      if (actions.length > 0) {
        const priorityLabels: Record<string, string> = { critical: 'CRITIQUE', high: 'Haute', medium: 'Moyenne', low: 'Faible' };
        context += `\n## Actions IA Recommandées (${actions.length})\n`;
        actions.forEach((a, i) => {
          const practitioner = DataService.getPractitionerById(a.practitionerId);
          const pName = practitioner ? `${practitioner.title} ${practitioner.firstName} ${practitioner.lastName}` : a.practitionerId;
          context += `${i + 1}. [${priorityLabels[a.priority] || a.priority}] ${a.title} — ${pName}\n`;
          context += `   Raison: ${a.reason} | Score: ${a.scores.overall}/100 | Date suggérée: ${a.suggestedDate}\n`;
        });
      }
    } catch { /* ignore action generation errors */ }
  }

  // ── Upcoming Visits Injection ──────────────────────────────────────────
  const visitKeywords = ['visite', 'visites', 'rendez-vous', 'rdv', 'agenda', 'aujourd', 'demain', 'semaine', 'planning', 'tournée', 'tournee', 'jour'];
  const isVisitQuery = visitKeywords.some(kw => lowerQuestion.includes(kw));

  if (isVisitQuery && upcomingVisits.length > 0) {
    context += `\n## Visites Planifiées (${upcomingVisits.length} prochaines)\n`;
    upcomingVisits.slice(0, 10).forEach(v => {
      const p = v.practitioner;
      context += `- ${v.date} ${v.time} — ${p.title} ${p.firstName} ${p.lastName} (${p.specialty}, ${p.city})\n`;
    });
  }

  // ── Performance Trends Injection ───────────────────────────────────────
  const perfKeywords = ['performance', 'résultat', 'resultat', 'volume', 'tendance', 'trend', 'progression', 'évolution', 'evolution', 'objectif', 'atteinte', 'kpi'];
  const isPerfQuery = perfKeywords.some(kw => lowerQuestion.includes(kw));

  if (isPerfQuery) {
    const perfData = getPerformanceDataForPeriod('month');
    if (perfData.length > 0) {
      const totalVol = perfData.reduce((s, d) => s + d.yourVolume, 0);
      const totalObj = perfData.reduce((s, d) => s + (d.objective || 0), 0);
      const totalTeam = perfData.reduce((s, d) => s + (d.teamAverage || 0), 0);
      context += `\n## Performance Mensuelle\n`;
      context += `- Volume total mois: ${(totalVol / 1000).toFixed(0)}K L\n`;
      if (totalObj > 0) context += `- Vs Objectif: ${((totalVol / totalObj - 1) * 100).toFixed(1)}%\n`;
      if (totalTeam > 0) context += `- Vs Moyenne équipe: ${((totalVol / totalTeam - 1) * 100).toFixed(1)}%\n`;
      context += `- Détail: ${perfData.map(d => `${d.month}: ${(d.yourVolume / 1000).toFixed(0)}K`).join(', ')}\n`;
    }
  }

  // ── News/Publications Injection ─────────────────────────────────────────
  // For questions about publications, actualités, news across practitioners
  const newsKeywords = ['publication', 'publié', 'article', 'actualité', 'actualites', 'news', 'conférence', 'conference', 'certification', 'distinction', 'award', 'événement', 'evenement', 'dernière publication', 'derniere publication', 'publications des', 'a publié', 'a publie'];
  const isNewsQuery = newsKeywords.some(kw => lowerQuestion.includes(kw));

  if (isNewsQuery) {
    // If the question targets a specific practitioner, their news is already in context via getCompletePractitionerContext
    // But for cross-practitioner queries ("toutes les publications des Bernard"), we need the full digest
    const hasSpecificName = routing.searchTerms.names.length > 0;

    if (!hasSpecificName || routing.dataScope === 'filtered' || routing.dataScope === 'full') {
      // Full news digest for cross-practitioner queries
      context += DataService.getNewsDigestForLLM(60);
    } else {
      // For specific names, also search news specifically in case the context missed something
      for (const name of routing.searchTerms.names) {
        const newsResults = DataService.searchNews(name);
        if (newsResults.length > 0) {
          context += `\n## Actualités trouvées pour "${name}" (${newsResults.length})\n`;
          for (const item of newsResults.slice(0, 10)) {
            const dateStr = new Date(item.news.date).toLocaleDateString('fr-FR');
            context += `- [${dateStr}] ${item.practitioner.title} ${item.practitioner.firstName} ${item.practitioner.lastName} : "${item.news.title}" (${item.news.type})`;
            if (item.news.content) context += ` — ${item.news.content}`;
            if (item.news.source) context += ` | Source: ${item.news.source}`;
            context += '\n';
          }
        }
      }
    }
  }

  // ── Recent Visit Reports Injection (cross-practitioner) ─────────────────
  // Inject recent visit reports for strategic/action/global queries
  const reportKeywords = ['compte-rendu', 'compte rendu', 'rapport', 'crv', 'dernière visite', 'derniere visite', 'retour visite', 'bilan visite'];
  const isReportQuery = reportKeywords.some(kw => lowerQuestion.includes(kw));
  if (isReportQuery || isActionQuery || isPerfQuery) {
    context += getAllRecentReportsForLLM(90);
  }

  // ── RAG Knowledge Injection ──────────────────────────────────────────────
  // For knowledge queries or when the question touches métier topics,
  // retrieve relevant chunks from the knowledge base and append them.
  if (routing.dataScope === 'knowledge' || routing.intent === 'knowledge_query' || shouldUseRAG(question)) {
    const ragResult = retrieveKnowledge(question, 5, 10);
    if (ragResult.chunks.length > 0) {
      context += ragResult.context;
    }
  }

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2A : CHART GENERATION / MODIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

async function generateChart(
  question: string,
  routing: RouterResult,
  chartHistory: ChartHistory[]
): Promise<AICoachResult['chart'] | null> {
  const dataContext = buildChartDataContext();

  let messages: LLMMessage[];

  if (routing.intent === 'chart_modify' && chartHistory.length > 0) {
    // Chart modification: pass current spec + modification request
    const currentChart = chartHistory[0];
    const currentSpec = JSON.stringify(currentChart.spec, null, 2);
    const modPrompt = CHART_MODIFY_PROMPT
      .replace('{CURRENT_CHART}', currentSpec)
      .replace('{MODIFICATION}', routing.chartModification || question);

    messages = [
      { role: 'system', content: modPrompt },
      { role: 'user', content: `Question originale: "${currentChart.question}"\nModification demandée: "${question}"\n\n${dataContext}` },
    ];
  } else {
    // New chart creation
    let paramHints = '';
    if (routing.chartParams.limit) {
      paramHints += `\nATTENTION: L'utilisateur demande EXACTEMENT ${routing.chartParams.limit} éléments.`;
    }
    if (routing.chartParams.chartType) {
      paramHints += `\nATTENTION: L'utilisateur veut un graphique de type "${routing.chartParams.chartType}".`;
    }
    if (routing.chartParams.groupBy) {
      paramHints += `\nATTENTION: Grouper par "${routing.chartParams.groupBy}".`;
    }
    if (routing.searchTerms.isKOL === true) {
      paramHints += `\nATTENTION: Filtrer uniquement les KOLs.`;
    }

    messages = [
      { role: 'system', content: CHART_SYSTEM_PROMPT },
      { role: 'user', content: `${dataContext}\n\nDEMANDE: "${question}"${paramHints}\n\nGénère la spécification JSON du graphique.` },
    ];
  }

  const chartResponse = await callLLM(messages, {
    temperature: 0.0,
    maxTokens: 1000,
  });

  if (!chartResponse) return null;

  let spec = parseLLMChartResponse(chartResponse);
  if (!spec) return null;

  // Force limit from router if LLM didn't respect it
  if (routing.chartParams.limit && spec.query.limit !== routing.chartParams.limit) {
    spec.query.limit = routing.chartParams.limit;
  }

  // Force chart type from router if specified
  if (routing.chartParams.chartType && spec.chartType !== routing.chartParams.chartType) {
    spec.chartType = routing.chartParams.chartType;
  }

  const chartResult = generateChartFromSpec(spec);

  // Save to history
  addToChartHistory({
    question,
    spec: chartResult.spec,
    data: chartResult.data,
    insights: chartResult.insights,
    timestamp: new Date(),
  });

  return {
    spec: chartResult.spec,
    data: chartResult.data,
    insights: chartResult.insights,
    suggestions: chartResult.suggestions,
    generatedByLLM: true,
  };
}

function buildChartDataContext(): string {
  const stats = DataService.getGlobalStats();
  const allPractitioners = DataService.getAllPractitioners();
  const cities = [...new Set(allPractitioners.map(p => p.address.city))];

  const kolsBySpecialty = allPractitioners
    .filter(p => p.metrics.isKOL)
    .reduce((acc, p) => {
      acc[p.specialty] = (acc[p.specialty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  return `DONNÉES ACTUELLES :
- ${stats.totalPractitioners} praticiens (${stats.pneumologues} Pneumologues, ${stats.generalistes} MG)
- ${stats.totalKOLs} KOLs (Pneumo: ${kolsBySpecialty['Pneumologue'] || 0}, MG: ${kolsBySpecialty['Médecin généraliste'] || 0})
- Volume total: ${Math.round(stats.totalVolume / 1000)}K L/an
- Fidélité moyenne: ${stats.averageLoyalty.toFixed(1)}/10
- Villes: ${cities.join(', ')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2B : TEXT RESPONSE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

async function generateTextResponse(
  question: string,
  routing: RouterResult,
  dataContext: string,
  conversationHistory: ConversationMessage[],
  chartResult: AICoachResult['chart'] | null,
  periodLabel: string
): Promise<string | null> {
  const messages: LLMMessage[] = [
    { role: 'system', content: COACH_SYSTEM_PROMPT },
  ];

  // Add data context as a system message (clear separation from conversation)
  messages.push({
    role: 'system',
    content: `## Données Disponibles (${periodLabel})\n${dataContext}`,
  });

  // Add chart context if a chart was just generated
  if (chartResult) {
    const chartSummary = chartResult.data.slice(0, 8).map(d => {
      const metrics = Object.entries(d)
        .filter(([k]) => k !== 'name' && !k.startsWith('_'))
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      return `  ${d.name}: ${metrics}`;
    }).join('\n');

    messages.push({
      role: 'system',
      content: `## Graphique Généré
Titre: ${chartResult.spec.title}
Type: ${chartResult.spec.chartType}
Données:\n${chartSummary}
Insights: ${chartResult.insights.join(' | ')}

INSTRUCTIONS: Un graphique a été généré et sera affiché. Ta réponse textuelle doit COMPLÉTER le graphique avec une analyse, pas le décrire entièrement. Sois synthétique — le graphique parle de lui-même.`,
    });
  }

  // Add conversation history (last 10 turns max)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Add current question
  messages.push({
    role: 'user',
    content: question,
  });

  // Adjust temperature based on intent
  let temperature = 0.3;
  if (routing.intent === 'strategic_advice') temperature = 0.5;
  if (routing.intent === 'general') temperature = 0.6;

  return callLLM(messages, { temperature, maxTokens: 2048 });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECT LLM RESPONSE (Resilient fallback — bypasses routing)
// Used when the router fails but the LLM API is still reachable
// ═══════════════════════════════════════════════════════════════════════════════

function buildGeneralContext(
  periodLabel: string,
  practitioners: Practitioner[],
  upcomingVisits: UpcomingVisit[],
  question: string
): string {
  const stats = DataService.getGlobalStats();
  const periodMetrics = calculatePeriodMetrics(practitioners, upcomingVisits, 'month');
  const allPractitioners = DataService.getAllPractitioners();
  const kols = DataService.getKOLs();
  const atRisk = DataService.getAtRiskPractitioners();
  const topPractitioners = getTopPractitioners(practitioners, 'year', 10);

  // Try universal search for relevant context
  const searchResult = universalSearch(question);
  const searchContext = searchResult.results.length > 0 ? searchResult.context : '';

  // By city distribution
  const byCity: Record<string, number> = {};
  allPractitioners.forEach(p => { byCity[p.address.city] = (byCity[p.address.city] || 0) + 1; });

  let context = `## Territoire (${periodLabel})
- ${stats.totalPractitioners} praticiens (${stats.pneumologues} pneumo, ${stats.generalistes} MG)
- ${stats.totalKOLs} KOLs | Volume total: ${(stats.totalVolume / 1000).toFixed(0)}K L/an | Fidélité moy: ${stats.averageLoyalty.toFixed(1)}/10
- Visites ${periodLabel}: ${periodMetrics.visitsCount}/${periodMetrics.visitsObjective} (${((periodMetrics.visitsCount / periodMetrics.visitsObjective) * 100).toFixed(0)}%)
- Croissance volume: +${periodMetrics.volumeGrowth.toFixed(1)}% | Nouveaux prescripteurs: ${periodMetrics.newPrescribers}

## Top 10 Prescripteurs
${topPractitioners.map((p, i) => `${i + 1}. ${p.title} ${p.firstName} ${p.lastName} — ${p.specialty}, ${p.city} | ${(p.volumeL / 1000).toFixed(0)}K L/an | F:${p.loyaltyScore}/10 | V${p.vingtile}${p.isKOL ? ' | KOL' : ''}`).join('\n')}

## KOLs (${kols.length})
${kols.slice(0, 10).map(p => `- ${p.title} ${p.firstName} ${p.lastName} (${p.specialty}, ${p.address.city}) — ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an | F:${p.metrics.loyaltyScore}/10`).join('\n')}

## Praticiens à Risque (${atRisk.length})
${atRisk.slice(0, 8).map(p => `- ${p.title} ${p.firstName} ${p.lastName} (${p.address.city}) — F:${p.metrics.loyaltyScore}/10 | ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an | Risque: ${p.metrics.churnRisk}${p.metrics.isKOL ? ' | KOL!' : ''}`).join('\n')}

## Répartition par Ville
${Object.entries(byCity).sort((a, b) => b[1] - a[1]).map(([city, count]) => `- ${city}: ${count}`).join('\n')}
${searchContext}`;

  // ── AI Actions Injection (fallback path) ────────────────────────────────
  const actionKeywords = ['action', 'priorité', 'priorite', 'recommandation', 'que faire', 'quoi faire', 'prochaine', 'prochain', 'urgent', 'planifier', 'stratégie', 'strategie'];
  const lowerQ = question.toLowerCase();
  if (actionKeywords.some(kw => lowerQ.includes(kw))) {
    try {
      const actions = generateIntelligentActions({ maxActions: 5 });
      if (actions.length > 0) {
        context += `\n## Actions IA Recommandées (${actions.length})\n`;
        actions.forEach((a, i) => {
          const practitioner = DataService.getPractitionerById(a.practitionerId);
          const pName = practitioner ? `${practitioner.title} ${practitioner.firstName} ${practitioner.lastName}` : a.practitionerId;
          context += `${i + 1}. [${a.priority}] ${a.title} — ${pName} | Score: ${a.scores.overall}/100\n`;
        });
      }
    } catch { /* ignore */ }
  }

  // ── Upcoming Visits Injection (fallback path) ──────────────────────────
  const visitKeywords = ['visite', 'visites', 'rendez-vous', 'rdv', 'agenda', 'aujourd', 'demain', 'semaine', 'planning', 'tournée', 'tournee'];
  if (visitKeywords.some(kw => lowerQ.includes(kw)) && upcomingVisits.length > 0) {
    context += `\n## Visites Planifiées (${upcomingVisits.length})\n`;
    upcomingVisits.slice(0, 8).forEach(v => {
      const p = v.practitioner;
      context += `- ${v.date} ${v.time} — ${p.title} ${p.firstName} ${p.lastName}\n`;
    });
  }

  // ── News/Publications Injection (fallback path) ────────────────────────
  const newsKeywords = ['publication', 'publié', 'article', 'actualité', 'actualites', 'news', 'conférence', 'conference', 'certification', 'distinction', 'événement', 'evenement', 'dernière publication', 'derniere publication', 'a publié', 'a publie'];
  if (newsKeywords.some(kw => lowerQ.includes(kw))) {
    context += DataService.getNewsDigestForLLM(40);
  }

  // ── Recent Visit Reports Injection (fallback path) ──────────────────────
  const reportKeywords2 = ['compte-rendu', 'compte rendu', 'rapport', 'crv', 'dernière visite', 'derniere visite', 'bilan'];
  if (reportKeywords2.some(kw => lowerQ.includes(kw)) || actionKeywords.some(kw => lowerQ.includes(kw))) {
    context += getAllRecentReportsForLLM(90);
  }

  // ── RAG Knowledge Injection (fallback path) ────────────────────────────
  if (shouldUseRAG(question)) {
    const ragResult = retrieveKnowledge(question, 5, 10);
    if (ragResult.chunks.length > 0) {
      context += ragResult.context;
    }
  }

  return context;
}

async function generateDirectResponse(
  question: string,
  conversationHistory: ConversationMessage[],
  periodLabel: string,
  practitioners: Practitioner[],
  upcomingVisits: UpcomingVisit[]
): Promise<string | null> {
  const context = buildGeneralContext(periodLabel, practitioners, upcomingVisits, question);

  const messages: LLMMessage[] = [
    { role: 'system', content: COACH_SYSTEM_PROMPT },
    { role: 'system', content: `## Données Disponibles (${periodLabel})\n${context}` },
  ];

  // Add conversation history (excluding current question — it will be added separately)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: 'user', content: question });

  return callLLM(messages, { temperature: 0.4, maxTokens: 2048 }, 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// USER CRM DATA CONTEXT — Inject visit reports and notes from user's session
// ═══════════════════════════════════════════════════════════════════════════════

function formatUserCRMContext(data: UserCRMData, question: string): string {
  if (!data.visitReports.length && !data.userNotes.length) return '';

  const lowerQ = question.toLowerCase();
  let context = '\n\n## Données CRM Utilisateur (comptes-rendus de visite et notes)\n';

  // Include recent visit reports (last 10)
  if (data.visitReports.length > 0) {
    context += `\n### Comptes-rendus de visite récents (${data.visitReports.length} total)\n`;
    const relevantReports = data.visitReports
      .filter(r => {
        // If question mentions a specific practitioner name, prioritize their reports
        const nameParts = r.practitionerName.toLowerCase().split(' ');
        const nameMatch = nameParts.some(part => part.length > 2 && lowerQ.includes(part));
        return nameMatch || data.visitReports.indexOf(r) < 5;
      })
      .slice(0, 8);

    relevantReports.forEach(r => {
      context += `- [${r.date}] ${r.practitionerName} (${r.extractedInfo.sentiment}) : `;
      if (r.extractedInfo.keyPoints.length > 0) {
        context += `Points clés: ${r.extractedInfo.keyPoints.join('; ')}. `;
      }
      if (r.extractedInfo.productsDiscussed.length > 0) {
        context += `Produits: ${r.extractedInfo.productsDiscussed.join(', ')}. `;
      }
      if (r.extractedInfo.competitorsMentioned.length > 0) {
        context += `Concurrents: ${r.extractedInfo.competitorsMentioned.join(', ')}. `;
      }
      if (r.extractedInfo.nextActions.length > 0) {
        context += `Actions: ${r.extractedInfo.nextActions.join('; ')}. `;
      }
      context += '\n';
    });
  }

  // Include user notes (last 10)
  if (data.userNotes.length > 0) {
    context += `\n### Notes utilisateur (${data.userNotes.length} total)\n`;
    data.userNotes.slice(0, 10).forEach(n => {
      const date = new Date(n.createdAt).toLocaleDateString('fr-FR');
      context += `- [${date}] (${n.type}) ${n.content.substring(0, 200)}${n.content.length > 200 ? '...' : ''}\n`;
    });
  }

  return context;
}

export async function processQuestion(
  question: string,
  conversationHistory: ConversationMessage[],
  periodLabel: string,
  practitioners: Practitioner[],
  upcomingVisits: UpcomingVisit[],
  _userObjectives: { visitsMonthly: number; visitsCompleted: number },
  userCRMData?: UserCRMData
): Promise<AICoachResult> {
  const chartHistory = getChartHistory();
  const lastAssistant = conversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content;

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE 100% LLM : Router → Targeted LLM → Direct LLM → Error
  //
  // Si Phase 1 (routeur) échoue → on essaie quand même le LLM direct
  // Si Phase 2 (réponse) échoue → on essaie le LLM direct sans routing
  // Si tout échoue → message d'erreur explicite (PAS de fallback local)
  // ═══════════════════════════════════════════════════════════════════════════

  // Note: pas d'early exit si aucune clé API — on utilise Ollama ou WebLLM comme fallback

  // ─── Phase 1: LLM Routing ────────────────────────────────────────────────
  const routing = await routeQuestion(question, chartHistory, lastAssistant);

  if (routing) {
    console.log('[AICoachEngine] Router:', routing.intent, routing.dataScope, routing.needsChart ? '📊' : '💬');

    // ─── Build Targeted Context ────────────────────────────────────────────
    let dataContext = buildTargetedContext(routing, question, periodLabel, practitioners, upcomingVisits);

    // ─── Inject User CRM Data (visit reports, notes) ─────────────────────
    if (userCRMData) {
      dataContext += formatUserCRMContext(userCRMData, question);
    }

    // ─── Track RAG usage ───────────────────────────────────────────────────
    let ragSources: AICoachResult['ragSources'] = undefined;
    let usedRAG = false;
    if (routing.intent === 'knowledge_query' || routing.dataScope === 'knowledge' || shouldUseRAG(question)) {
      const ragResult = retrieveKnowledge(question, 5, 10);
      if (ragResult.chunks.length > 0) {
        usedRAG = true;
        ragSources = ragResult.chunks.map(c => ({
          title: c.chunk.title,
          sourceUrl: c.chunk.sourceUrl,
          source: c.chunk.source,
        }));
        console.log(`[AICoachEngine] RAG: ${ragResult.chunks.length} chunks retrieved (scores: ${ragResult.chunks.map(c => c.score.toFixed(0)).join(', ')})`);
      }
    }

    // ─── Phase 2A: Chart Generation (if needed) ────────────────────────────
    let chartResult: AICoachResult['chart'] | null = null;
    if (routing.needsChart) {
      chartResult = await generateChart(question, routing, chartHistory);
      if (!chartResult) {
        console.warn('[AICoachEngine] Chart LLM failed — no local fallback, chart will be skipped');
      }
    }

    // ─── Phase 2B: Text Response Generation ────────────────────────────────
    const textResponse = await generateTextResponse(
      question,
      routing,
      dataContext,
      conversationHistory,
      chartResult,
      periodLabel
    );

    if (textResponse) {
      // ─── SUCCESS: Full pipeline worked ────────────────────────────────
      const result: AICoachResult = {
        textContent: textResponse,
        source: 'llm',
        usedRAG,
        ragSources,
      };

      if (chartResult) {
        result.chart = chartResult;
        result.suggestions = chartResult.suggestions;
      }

      // For practitioner_info intent, extract matching practitioners for card display
      if (routing.intent === 'practitioner_info' && routing.searchTerms.names.length > 0) {
        result.practitioners = findPractitionerCards(routing.searchTerms.names);
      }

      return result;
    }

    // Text response failed — fall through to direct LLM
    console.log('[AICoachEngine] Text LLM failed after routing, trying direct LLM...');
  } else {
    console.log('[AICoachEngine] Router failed, trying direct LLM...');
  }

  // ─── FALLBACK: Direct LLM (no routing) ──────────────────────────────────
  // The router or text response failed, but the API might still work.
  // Try a direct call with general context.
  const directResponse = await generateDirectResponse(
    question,
    conversationHistory,
    periodLabel,
    practitioners,
    upcomingVisits
  );

  if (directResponse) {
    console.log('[AICoachEngine] Direct LLM succeeded');
    // Check if RAG was used in the direct path
    let directRAGSources: AICoachResult['ragSources'] = undefined;
    let directUsedRAG = false;
    if (shouldUseRAG(question)) {
      const ragResult = retrieveKnowledge(question, 5, 10);
      if (ragResult.chunks.length > 0) {
        directUsedRAG = true;
        directRAGSources = ragResult.chunks.map(c => ({
          title: c.chunk.title,
          sourceUrl: c.chunk.sourceUrl,
          source: c.chunk.source,
        }));
      }
    }
    return {
      textContent: directResponse,
      source: 'llm',
      usedRAG: directUsedRAG,
      ragSources: directRAGSources,
    };
  }

  // ─── ALL LLM CALLS FAILED: Explicit error with diagnostic ──────────────
  const errorDetail = lastLLMError || 'Aucune réponse du serveur';
  console.error('[AICoachEngine] All LLM calls failed:', errorDetail);
  return {
    textContent: `**Désolé, le service d'intelligence artificielle est indisponible.**\n\n**Erreur :** \`${errorDetail}\`\n\nCauses possibles :\n- Ollama n'est pas lancé en local\n- Le modèle \`${getOllamaModel()}\` n'est pas installé\n- Le modèle WebLLM n'est pas chargé dans le navigateur\n- Clé API externe invalide ou expirée\n\n**Actions :**\n1. Chargez le modèle WebLLM dans **Paramètres** (zéro installation)\n2. Ou installez Ollama : \`ollama run ${getOllamaModel()}\`\n3. Ou configurez une clé API externe dans \`VITE_LLM_API_KEY\``,
    source: 'llm',
  };
}

// Helper: find practitioner cards for display
function findPractitionerCards(names: string[]): (Practitioner & { daysSinceVisit?: number })[] {
  const allPractitioners = DataService.getAllPractitioners();
  const matches = allPractitioners.filter(p => {
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    return names.some(name =>
      fullName.includes(name.toLowerCase()) ||
      p.firstName.toLowerCase().includes(name.toLowerCase()) ||
      p.lastName.toLowerCase().includes(name.toLowerCase())
    );
  });

  if (matches.length === 0) return [];

  const today = new Date();
  return matches.slice(0, 5).map(p => {
    const adapted = adaptPractitionerProfile(p);
    const lastVisit = p.lastVisitDate ? new Date(p.lastVisitDate) : null;
    const daysSinceVisit = lastVisit
      ? Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    return { ...adapted, daysSinceVisit };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export function isLLMConfigured(): boolean {
  // Toujours true: soit API externe, soit Ollama local
  return true;
}

export function hasExternalLLMKey(): boolean {
  return getApiKey() !== null;
}

export function getLLMProviderName(): string {
  const config = getStoredLLMConfig();
  if (config) {
    const def = getProviderDef(config.provider);
    return `${def?.name || config.provider} (${config.model})`;
  }
  const key = getApiKey();
  if (!key) {
    if (webLlmService.isReady()) {
      const modelId = webLlmService.getCurrentModelId();
      return `WebLLM navigateur (${modelId})`;
    }
    return `Ollama local (${getOllamaModel()})`;
  }
  return detectProvider(key).name;
}

export { getRAGStats, getKnowledgeSources, getDownloadableSources } from './ragService';
export type { KnowledgeSource } from '../data/ragKnowledgeBase';
