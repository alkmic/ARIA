/**
 * Coach Data Explorer - Service unifié pour le Coach IA
 *
 * Architecture optimisée:
 * 1. UN SEUL appel LLM qui analyse ET décide de l'action
 * 2. Exécution locale des requêtes de données (précision garantie)
 * 3. Réponse unifiée avec message + visualisation optionnelle
 *
 * Avantages vs ancienne architecture:
 * - 1 appel LLM au lieu de 2 (2x plus rapide, 2x moins cher)
 * - Code unifié (plus maintenable)
 * - Réponses cohérentes (format unifié)
 * - Mémoire conversationnelle (contexte préservé)
 */

import { DataService } from './dataService';

// ============================================
// TYPES UNIFIÉS
// ============================================

export type ActionType =
  | 'chart'           // Générer un graphique
  | 'search'          // Rechercher un praticien
  | 'list'            // Lister des praticiens
  | 'stats'           // Donner des statistiques
  | 'advice'          // Donner un conseil
  | 'conversation';   // Réponse conversationnelle simple

export type ChartType = 'bar' | 'pie' | 'line' | 'composed';

export interface ChartAction {
  type: 'chart';
  chartType: ChartType;
  title: string;
  groupBy?: string;
  metric: 'volume' | 'count' | 'loyalty';
  filters?: Array<{ field: string; value: string | number | boolean }>;
  sortOrder: 'asc' | 'desc';
  limit?: number;
  isCompound?: boolean;
  compoundTopN?: number;
}

export interface SearchAction {
  type: 'search';
  searchTerms: string[];
  dataNeeded: ('profile' | 'news' | 'visits' | 'stats')[];
}

export interface ListAction {
  type: 'list';
  filter: 'all' | 'kol' | 'atRisk' | 'undervisited' | 'topVolume' | 'lowLoyalty';
  sortBy: 'volume' | 'loyalty' | 'lastVisit' | 'name';
  limit: number;
}

export interface StatsAction {
  type: 'stats';
  metrics: string[];
}

export interface AdviceAction {
  type: 'advice';
  topic: string;
}

export interface ConversationAction {
  type: 'conversation';
}

export type LLMAction = ChartAction | SearchAction | ListAction | StatsAction | AdviceAction | ConversationAction;

export interface LLMResponse {
  message: string;
  action: LLMAction;
  suggestions: string[];
  confidence: number;
}

export interface ChartData {
  name: string;
  [key: string]: string | number;
}

export interface PractitionerResult {
  id: string;
  name: string;
  specialty: string;
  city: string;
  volume: number;
  loyalty: number;
  isKOL: boolean;
  lastVisit?: string;
  news?: Array<{ title: string; date: string; source: string }>;
}

export interface UnifiedResponse {
  // Message principal (toujours présent)
  message: string;

  // Graphique (optionnel)
  chart?: {
    type: ChartType;
    title: string;
    data: ChartData[];
    insights: string[];
  };

  // Données praticiens (optionnel)
  practitioners?: PractitionerResult[];

  // Statistiques (optionnel)
  stats?: Record<string, number | string>;

  // Suggestions de suivi
  suggestions: string[];

  // Métadonnées
  source: 'llm' | 'local' | 'hybrid';
  actionType: ActionType;
}

// ============================================
// MÉMOIRE CONVERSATIONNELLE
// ============================================

interface ConversationTurn {
  question: string;
  actionType: ActionType;
  chartTitle?: string;
  timestamp: Date;
}

const conversationMemory: ConversationTurn[] = [];
const MAX_MEMORY = 10;

export function addToMemory(turn: ConversationTurn): void {
  conversationMemory.push(turn);
  if (conversationMemory.length > MAX_MEMORY) {
    conversationMemory.shift();
  }
}

export function getConversationContext(): string {
  if (conversationMemory.length === 0) return '';

  return `
HISTORIQUE DE CONVERSATION RÉCENT:
${conversationMemory.slice(-5).map((turn, i) =>
  `${i + 1}. Q: "${turn.question}" → ${turn.actionType}${turn.chartTitle ? ` (${turn.chartTitle})` : ''}`
).join('\n')}
`;
}

export function clearMemory(): void {
  conversationMemory.length = 0;
}

// ============================================
// CONTEXTE DE DONNÉES POUR LE LLM
// ============================================

export function buildDataSummary(): string {
  const stats = DataService.getGlobalStats();
  const atRisk = DataService.getAtRiskPractitioners();
  const allPractitioners = DataService.getAllPractitioners();

  // Top 5 par volume
  const topByVolume = [...allPractitioners]
    .sort((a, b) => b.metrics.volumeL - a.metrics.volumeL)
    .slice(0, 5);

  // Villes uniques
  const cities = [...new Set(allPractitioners.map(p => p.address.city))];

  return `
BASE DE DONNÉES PRATICIENS:
- Total: ${stats.totalPractitioners} praticiens
- Pneumologues: ${stats.pneumologues} | Généralistes: ${stats.generalistes}
- KOLs (Key Opinion Leaders): ${stats.totalKOLs}
- Praticiens à risque: ${atRisk.length}
- Volume total: ${Math.round(stats.totalVolume / 1000)}K L/an
- Fidélité moyenne: ${stats.averageLoyalty.toFixed(1)}/10
- Villes: ${cities.slice(0, 10).join(', ')}${cities.length > 10 ? ` (+${cities.length - 10})` : ''}

TOP 5 PRATICIENS (volume):
${topByVolume.map((p, i) =>
  `${i + 1}. ${p.title} ${p.firstName} ${p.lastName} - ${p.specialty}, ${p.address.city} - ${Math.round(p.metrics.volumeL / 1000)}K L/an${p.metrics.isKOL ? ' [KOL]' : ''}`
).join('\n')}

PRATICIENS À RISQUE (top 3):
${atRisk.slice(0, 3).map(p =>
  `- ${p.title} ${p.lastName} (${p.address.city}): Fidélité ${p.metrics.loyaltyScore}/10`
).join('\n')}
`;
}

// ============================================
// PROMPT UNIQUE OPTIMISÉ
// ============================================

export const UNIFIED_PROMPT = `Tu es l'assistant IA d'un délégué pharmaceutique Air Liquide Healthcare (oxygénothérapie).

Tu as deux rôles combinés:
1. COACH STRATÉGIQUE: Conseils, priorités, recommandations
2. DATA EXPLORER: Analyser et visualiser les données praticiens

{DATA_SUMMARY}
{CONVERSATION_CONTEXT}

CAPACITÉS DE VISUALISATION:
- Graphiques: bar (barres), pie (camembert), line (courbes)
- Regroupements: ville, spécialité, vingtile, risque, fidélité
- Métriques: volume (L O2/an), count (nombre), loyalty (fidélité /10)
- Filtres: KOL, spécialité, ville, etc.
- Requêtes composées: "top N par X" puis "grouper par Y"

QUESTION DE L'UTILISATEUR:
"{QUESTION}"

INSTRUCTIONS:
1. Analyse ce que l'utilisateur veut VRAIMENT
2. Choisis l'ACTION la plus appropriée
3. Réponds avec un JSON VALIDE (pas de texte avant/après)

FORMAT DE RÉPONSE (JSON uniquement):
\`\`\`json
{
  "message": "Ton message à l'utilisateur en Markdown. Sois concis et professionnel.",
  "action": {
    // UNE des structures suivantes:

    // Pour un GRAPHIQUE:
    "type": "chart",
    "chartType": "bar|pie|line",
    "title": "Titre du graphique",
    "groupBy": "city|specialty|vingtileBucket|loyaltyBucket|riskLevel|isKOL|null",
    "metric": "volume|count|loyalty",
    "sortOrder": "desc|asc",
    "limit": 10,
    "filters": [{"field": "isKOL", "value": true}],
    "isCompound": false,
    "compoundTopN": null

    // Pour une RECHERCHE de praticien:
    "type": "search",
    "searchTerms": ["Robert", "Denis"],
    "dataNeeded": ["profile", "news", "visits"]

    // Pour une LISTE:
    "type": "list",
    "filter": "all|kol|atRisk|undervisited|topVolume|lowLoyalty",
    "sortBy": "volume|loyalty|lastVisit|name",
    "limit": 10

    // Pour des STATISTIQUES:
    "type": "stats",
    "metrics": ["totalVolume", "kolCount", "atRiskCount"]

    // Pour un CONSEIL:
    "type": "advice",
    "topic": "priorités|fidélisation|prospection"

    // Pour une CONVERSATION simple:
    "type": "conversation"
  },
  "suggestions": [
    "Question de suivi 1",
    "Question de suivi 2",
    "Question de suivi 3"
  ],
  "confidence": 0.95
}
\`\`\`

RÈGLES IMPORTANTES:
- Pour "top N" ou "meilleurs N", utilise limit: N avec le bon nombre
- Pour "répartition/distribution par X des top N", utilise isCompound: true et compoundTopN: N
- Pour les noms de praticiens, utilise action.type: "search"
- Toujours 3 suggestions pertinentes
- Message en français, Markdown autorisé
- NE GÉNÈRE QUE DU JSON, rien d'autre`;

// ============================================
// PARSING DE LA RÉPONSE LLM
// ============================================

export function parseLLMResponse(response: string): LLMResponse | null {
  try {
    // Extraire le JSON
    let jsonStr = response;

    // Pattern: ```json ... ```
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Pattern: ``` ... ```
      const codeMatch = response.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        jsonStr = codeMatch[1];
      } else {
        // Pattern: { ... } direct
        const objectMatch = response.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonStr = objectMatch[0];
        }
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Valider la structure
    if (!parsed.message || !parsed.action || !parsed.action.type) {
      console.error('Invalid LLM response structure:', parsed);
      return null;
    }

    return {
      message: parsed.message,
      action: parsed.action,
      suggestions: parsed.suggestions || [],
      confidence: parsed.confidence || 0.5
    };
  } catch (error) {
    console.error('Failed to parse LLM response:', error);
    console.error('Raw response:', response);
    return null;
  }
}

// ============================================
// EXÉCUTION DES ACTIONS
// ============================================

export function executeAction(action: LLMAction): Partial<UnifiedResponse> {
  switch (action.type) {
    case 'chart':
      return executeChartAction(action);
    case 'search':
      return executeSearchAction(action);
    case 'list':
      return executeListAction(action);
    case 'stats':
      return executeStatsAction(action);
    case 'advice':
    case 'conversation':
      return {}; // Pas de données supplémentaires
    default:
      return {};
  }
}

function executeChartAction(action: ChartAction): Partial<UnifiedResponse> {
  const practitioners = DataService.getAllPractitioners();
  const today = new Date();

  // Enrichir les données
  let data = practitioners.map(p => {
    const lastVisit = p.lastVisitDate ? new Date(p.lastVisitDate) : null;
    const daysSinceVisit = lastVisit
      ? Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    let riskLevel: string = 'low';
    if (daysSinceVisit > 90 || p.metrics.loyaltyScore < 4) riskLevel = 'high';
    else if (daysSinceVisit > 60 || p.metrics.loyaltyScore < 6) riskLevel = 'medium';

    let loyaltyBucket: string;
    if (p.metrics.loyaltyScore >= 8) loyaltyBucket = 'Très fidèle (8-10)';
    else if (p.metrics.loyaltyScore >= 6) loyaltyBucket = 'Fidèle (6-7)';
    else if (p.metrics.loyaltyScore >= 4) loyaltyBucket = 'Moyen (4-5)';
    else loyaltyBucket = 'À risque (0-3)';

    let vingtileBucket: string;
    const v = p.metrics.vingtile;
    if (v <= 2) vingtileBucket = 'V1-2 (Top)';
    else if (v <= 5) vingtileBucket = 'V3-5 (Haut)';
    else if (v <= 10) vingtileBucket = 'V6-10 (Moyen)';
    else vingtileBucket = 'V11+ (Bas)';

    return {
      id: p.id,
      name: `${p.title} ${p.lastName}`,
      fullName: `${p.title} ${p.firstName} ${p.lastName}`,
      specialty: p.specialty,
      city: p.address.city,
      volume: p.metrics.volumeL,
      loyalty: p.metrics.loyaltyScore,
      vingtile: p.metrics.vingtile,
      isKOL: p.metrics.isKOL,
      riskLevel,
      loyaltyBucket,
      vingtileBucket,
      daysSinceVisit
    };
  });

  // Appliquer les filtres
  if (action.filters) {
    for (const filter of action.filters) {
      data = data.filter(item => {
        const value = (item as Record<string, unknown>)[filter.field];
        return value === filter.value;
      });
    }
  }

  // Requête composée: d'abord sélectionner top N, puis grouper
  if (action.isCompound && action.compoundTopN) {
    // Trier et prendre les top N
    data.sort((a, b) => {
      const aVal = action.metric === 'volume' ? a.volume :
                   action.metric === 'loyalty' ? a.loyalty : 1;
      const bVal = action.metric === 'volume' ? b.volume :
                   action.metric === 'loyalty' ? b.loyalty : 1;
      return action.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    data = data.slice(0, action.compoundTopN);
  }

  // Grouper si nécessaire
  let chartData: ChartData[];

  if (action.groupBy) {
    const grouped = new Map<string, typeof data>();

    for (const item of data) {
      let key: string;
      switch (action.groupBy) {
        case 'city': key = item.city; break;
        case 'specialty': key = item.specialty; break;
        case 'vingtileBucket': key = item.vingtileBucket; break;
        case 'loyaltyBucket': key = item.loyaltyBucket; break;
        case 'riskLevel': key = item.riskLevel === 'high' ? 'Risque élevé' :
                                item.riskLevel === 'medium' ? 'Risque moyen' : 'Risque faible'; break;
        case 'isKOL': key = item.isKOL ? 'KOLs' : 'Autres'; break;
        default: key = String((item as Record<string, unknown>)[action.groupBy] || 'Autre');
      }

      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    }

    chartData = [];
    for (const [name, items] of grouped) {
      const entry: ChartData = { name };

      switch (action.metric) {
        case 'volume':
          entry['Volume (K L)'] = Math.round(items.reduce((sum, i) => sum + i.volume, 0) / 1000);
          break;
        case 'count':
          entry['Nombre'] = items.length;
          break;
        case 'loyalty':
          entry['Fidélité moy.'] = Math.round(items.reduce((sum, i) => sum + i.loyalty, 0) / items.length * 10) / 10;
          break;
      }

      // Ajouter métrique secondaire
      if (action.metric !== 'count') {
        entry['Nombre'] = items.length;
      }
      if (action.metric !== 'volume') {
        entry['Volume (K L)'] = Math.round(items.reduce((sum, i) => sum + i.volume, 0) / 1000);
      }

      chartData.push(entry);
    }

    // Trier
    const sortKey = action.metric === 'volume' ? 'Volume (K L)' :
                    action.metric === 'count' ? 'Nombre' : 'Fidélité moy.';
    chartData.sort((a, b) => {
      const aVal = (a[sortKey] as number) || 0;
      const bVal = (b[sortKey] as number) || 0;
      return action.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

  } else {
    // Pas de groupement - liste individuelle
    data.sort((a, b) => {
      const aVal = action.metric === 'volume' ? a.volume :
                   action.metric === 'loyalty' ? a.loyalty : 1;
      const bVal = action.metric === 'volume' ? b.volume :
                   action.metric === 'loyalty' ? b.loyalty : 1;
      return action.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    const limited = action.limit ? data.slice(0, action.limit) : data;

    chartData = limited.map(item => {
      const entry: ChartData = { name: item.name };

      switch (action.metric) {
        case 'volume':
          entry['Volume (K L)'] = Math.round(item.volume / 1000);
          entry['Fidélité'] = item.loyalty;
          break;
        case 'loyalty':
          entry['Fidélité'] = item.loyalty;
          entry['Volume (K L)'] = Math.round(item.volume / 1000);
          break;
        case 'count':
          entry['Volume (K L)'] = Math.round(item.volume / 1000);
          break;
      }

      return entry;
    });
  }

  // Limiter si groupBy
  if (action.groupBy && action.limit) {
    chartData = chartData.slice(0, action.limit);
  }

  // Générer des insights
  const insights: string[] = [];
  if (chartData.length > 0) {
    const top = chartData[0];
    const metricKey = action.metric === 'volume' ? 'Volume (K L)' :
                      action.metric === 'count' ? 'Nombre' : 'Fidélité moy.';
    insights.push(`**${top.name}** arrive en tête avec ${top[metricKey]} ${action.metric === 'volume' ? 'K L/an' : action.metric === 'count' ? 'praticiens' : '/10'}`);

    if (chartData.length > 1) {
      const total = chartData.reduce((sum, d) => sum + ((d[metricKey] as number) || 0), 0);
      const topShare = Math.round(((top[metricKey] as number) / total) * 100);
      insights.push(`Représente ${topShare}% du total`);
    }

    insights.push(`${chartData.length} catégories analysées`);
  }

  return {
    chart: {
      type: action.chartType,
      title: action.title,
      data: chartData,
      insights
    }
  };
}

function executeSearchAction(action: SearchAction): Partial<UnifiedResponse> {
  const allPractitioners = DataService.getAllPractitioners();

  // Normaliser les termes de recherche
  const normalizedTerms = action.searchTerms.map(t =>
    t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );

  // Recherche fuzzy
  const matches = allPractitioners.filter(p => {
    const fullName = `${p.title} ${p.firstName} ${p.lastName}`.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedTerms.every(term => fullName.includes(term));
  });

  if (matches.length === 0) {
    return { practitioners: [] };
  }

  const practitioners: PractitionerResult[] = matches.slice(0, 5).map(p => {
    const result: PractitionerResult = {
      id: p.id,
      name: `${p.title} ${p.firstName} ${p.lastName}`,
      specialty: p.specialty,
      city: p.address.city,
      volume: Math.round(p.metrics.volumeL / 1000),
      loyalty: p.metrics.loyaltyScore,
      isKOL: p.metrics.isKOL,
      lastVisit: p.lastVisitDate
    };

    // Ajouter les actualités si demandées
    if (action.dataNeeded.includes('news') && p.news) {
      result.news = p.news.slice(0, 5).map(n => ({
        title: n.title,
        date: n.date,
        source: n.source || 'ARIA'
      }));
    }

    return result;
  });

  return { practitioners };
}

function executeListAction(action: ListAction): Partial<UnifiedResponse> {
  let practitioners = DataService.getAllPractitioners();
  const today = new Date();
  const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Appliquer le filtre
  switch (action.filter) {
    case 'kol':
      practitioners = practitioners.filter(p => p.metrics.isKOL);
      break;
    case 'atRisk':
      practitioners = DataService.getAtRiskPractitioners();
      break;
    case 'undervisited':
      practitioners = practitioners.filter(p => {
        if (!p.lastVisitDate) return true;
        return new Date(p.lastVisitDate) < sixtyDaysAgo;
      });
      break;
    case 'topVolume':
      practitioners = [...practitioners].sort((a, b) => b.metrics.volumeL - a.metrics.volumeL);
      break;
    case 'lowLoyalty':
      practitioners = practitioners.filter(p => p.metrics.loyaltyScore < 5);
      break;
  }

  // Trier
  switch (action.sortBy) {
    case 'volume':
      practitioners.sort((a, b) => b.metrics.volumeL - a.metrics.volumeL);
      break;
    case 'loyalty':
      practitioners.sort((a, b) => b.metrics.loyaltyScore - a.metrics.loyaltyScore);
      break;
    case 'lastVisit':
      practitioners.sort((a, b) => {
        const aDate = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
        const bDate = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
        return aDate - bDate; // Plus ancien d'abord
      });
      break;
    case 'name':
      practitioners.sort((a, b) => a.lastName.localeCompare(b.lastName));
      break;
  }

  // Limiter
  const limited = practitioners.slice(0, action.limit);

  return {
    practitioners: limited.map(p => ({
      id: p.id,
      name: `${p.title} ${p.firstName} ${p.lastName}`,
      specialty: p.specialty,
      city: p.address.city,
      volume: Math.round(p.metrics.volumeL / 1000),
      loyalty: p.metrics.loyaltyScore,
      isKOL: p.metrics.isKOL,
      lastVisit: p.lastVisitDate
    }))
  };
}

function executeStatsAction(action: StatsAction): Partial<UnifiedResponse> {
  const globalStats = DataService.getGlobalStats();
  const atRisk = DataService.getAtRiskPractitioners();
  const kols = DataService.getKOLs();

  const stats: Record<string, number | string> = {};

  for (const metric of action.metrics) {
    switch (metric) {
      case 'totalVolume':
        stats['Volume total'] = `${Math.round(globalStats.totalVolume / 1000)}K L/an`;
        break;
      case 'totalPractitioners':
        stats['Total praticiens'] = globalStats.totalPractitioners;
        break;
      case 'kolCount':
        stats['Nombre de KOLs'] = kols.length;
        break;
      case 'atRiskCount':
        stats['Praticiens à risque'] = atRisk.length;
        break;
      case 'averageLoyalty':
        stats['Fidélité moyenne'] = `${globalStats.averageLoyalty.toFixed(1)}/10`;
        break;
      case 'pneumologues':
        stats['Pneumologues'] = globalStats.pneumologues;
        break;
      case 'generalistes':
        stats['Généralistes'] = globalStats.generalistes;
        break;
    }
  }

  return { stats };
}

// ============================================
// FALLBACK LOCAL (sans LLM)
// ============================================

export function processLocally(question: string): UnifiedResponse {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Extraire les paramètres numériques
  const numMatch = q.match(/top\s*(\d+)|(\d+)\s*(meilleur|premier|prescri)/i);
  const limit = numMatch ? parseInt(numMatch[1] || numMatch[2], 10) : 10;

  // Détection du type de requête
  const wantsChart = /graphique|graph|chart|diagramme|visualis|montre|affiche|repartition|distribution|camembert/i.test(q);
  const wantsSearch = /actualite|news|info|profil|qui\s+est|recherche/i.test(q);
  const wantsList = /liste|lister|tous\s+les|quels\s+sont/i.test(q);

  // Détection des filtres
  const wantsKOL = /\bkol/i.test(q);
  const wantsRisk = /risque|a\s+risque/i.test(q);
  const byCity = /par\s+ville|ville/i.test(q);
  const bySpecialty = /par\s+specialite|specialite|pneumo|generaliste/i.test(q);
  const byLoyalty = /fidelite|fidele/i.test(q);

  // Recherche de nom de praticien
  const namePatterns = [
    /(?:dr|docteur|professeur|pr)\s+([a-zéèêëàâùûôîïç]+(?:\s+[a-zéèêëàâùûôîïç]+)?)/i,
    /actualites?\s+(?:du|de)\s+(?:dr\s+)?([a-zéèêëàâùûôîïç]+(?:\s+[a-zéèêëàâùûôîïç]+)?)/i
  ];

  let searchTerms: string[] = [];
  for (const pattern of namePatterns) {
    const match = q.match(pattern);
    if (match) {
      searchTerms = match[1].split(/\s+/).filter(t => t.length > 1);
      break;
    }
  }

  // Si on a trouvé un nom, faire une recherche
  if (searchTerms.length > 0 || wantsSearch) {
    if (searchTerms.length === 0) {
      // Extraire tous les mots capitalisés comme potentiels noms
      const words = question.split(/\s+/).filter(w => w.length > 2 && /^[A-ZÉÈÊËÀÂÙÛÔÎÏÇ]/.test(w));
      searchTerms = words.map(w => w.toLowerCase());
    }

    const searchAction: SearchAction = {
      type: 'search',
      searchTerms,
      dataNeeded: ['profile', 'news', 'visits']
    };

    const result = executeSearchAction(searchAction);

    if (result.practitioners && result.practitioners.length > 0) {
      const p = result.practitioners[0];
      let message = `## ${p.name}\n\n`;
      message += `**Spécialité:** ${p.specialty}\n`;
      message += `**Ville:** ${p.city}\n`;
      message += `**Volume:** ${p.volume}K L/an\n`;
      message += `**Fidélité:** ${p.loyalty}/10\n`;
      if (p.isKOL) message += `**Statut:** KOL\n`;

      if (p.news && p.news.length > 0) {
        message += `\n### Actualités récentes\n`;
        p.news.forEach(n => {
          message += `- **${n.date}**: ${n.title}\n`;
        });
      }

      return {
        message,
        practitioners: result.practitioners,
        suggestions: [
          `Voir le volume de ${p.name.split(' ').pop()} par mois`,
          `Comparer à d'autres ${p.specialty}s`,
          `Historique des visites`
        ],
        source: 'local',
        actionType: 'search'
      };
    } else {
      return {
        message: `Je n'ai pas trouvé de praticien correspondant à "${searchTerms.join(' ')}". Vérifiez l'orthographe.`,
        suggestions: ['Liste des KOLs', 'Top 10 prescripteurs', 'Praticiens à risque'],
        source: 'local',
        actionType: 'search'
      };
    }
  }

  // Graphique ou liste
  if (wantsChart || wantsList || byCity || bySpecialty || byLoyalty || wantsKOL || wantsRisk) {
    const chartAction: ChartAction = {
      type: 'chart',
      chartType: byCity || bySpecialty ? 'bar' : 'bar',
      title: '',
      metric: 'volume',
      sortOrder: 'desc',
      limit
    };

    // Configurer selon la demande
    if (byCity) {
      chartAction.groupBy = 'city';
      chartAction.title = `Répartition par ville`;
    } else if (bySpecialty) {
      chartAction.groupBy = 'specialty';
      chartAction.title = `Répartition par spécialité`;
    } else if (byLoyalty) {
      chartAction.groupBy = 'loyaltyBucket';
      chartAction.title = `Distribution par fidélité`;
      chartAction.chartType = 'pie';
    } else if (wantsRisk) {
      chartAction.groupBy = 'riskLevel';
      chartAction.title = `Répartition par niveau de risque`;
      chartAction.chartType = 'pie';
    } else {
      chartAction.title = `Top ${limit} prescripteurs par volume`;
    }

    if (wantsKOL) {
      chartAction.filters = [{ field: 'isKOL', value: true }];
      chartAction.title = chartAction.title.replace('prescripteurs', 'KOLs');
    }

    const result = executeChartAction(chartAction);

    return {
      message: `**${chartAction.title}**\n\n${result.chart?.insights.map(i => `• ${i}`).join('\n') || ''}`,
      chart: result.chart,
      suggestions: [
        'Voir par spécialité',
        'Comparer KOLs vs autres',
        `Top ${limit * 2} prescripteurs`
      ],
      source: 'local',
      actionType: 'chart'
    };
  }

  // Réponse par défaut: top prescripteurs
  const defaultAction: ChartAction = {
    type: 'chart',
    chartType: 'bar',
    title: `Top ${limit} prescripteurs par volume`,
    metric: 'volume',
    sortOrder: 'desc',
    limit
  };

  const result = executeChartAction(defaultAction);

  return {
    message: `Voici les **${limit} plus gros prescripteurs** en volume d'oxygène.\n\n${result.chart?.insights.map(i => `• ${i}`).join('\n') || ''}`,
    chart: result.chart,
    suggestions: [
      'Répartition par ville',
      'Comparer KOLs vs autres',
      'Praticiens à risque'
    ],
    source: 'local',
    actionType: 'chart'
  };
}

// ============================================
// FONCTION PRINCIPALE
// ============================================

export async function processQuestion(
  question: string,
  llmComplete: (messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) => Promise<string | null>
): Promise<UnifiedResponse> {

  // Construire le prompt
  const prompt = UNIFIED_PROMPT
    .replace('{DATA_SUMMARY}', buildDataSummary())
    .replace('{CONVERSATION_CONTEXT}', getConversationContext())
    .replace('{QUESTION}', question);

  try {
    // Appel LLM unique
    const response = await llmComplete([{ role: 'user', content: prompt }]);

    if (!response) {
      console.log('LLM returned null, using local fallback');
      return processLocally(question);
    }

    // Parser la réponse
    const parsed = parseLLMResponse(response);

    if (!parsed) {
      console.log('Failed to parse LLM response, using local fallback');
      return processLocally(question);
    }

    // Exécuter l'action
    const actionResult = executeAction(parsed.action);

    // Sauvegarder dans la mémoire
    addToMemory({
      question,
      actionType: parsed.action.type,
      chartTitle: actionResult.chart?.title,
      timestamp: new Date()
    });

    // Construire la réponse unifiée
    return {
      message: parsed.message,
      chart: actionResult.chart,
      practitioners: actionResult.practitioners,
      stats: actionResult.stats,
      suggestions: parsed.suggestions,
      source: 'llm',
      actionType: parsed.action.type
    };

  } catch (error) {
    console.error('Error processing question:', error);
    return processLocally(question);
  }
}

// ============================================
// COULEURS POUR LES GRAPHIQUES
// ============================================

export const CHART_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
];
