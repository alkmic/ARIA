/**
 * Agentic Chart Engine - Talk to My Data v2
 *
 * Ce moteur permet au LLM de générer dynamiquement des visualisations
 * en écrivant des spécifications de requêtes qui sont exécutées sur les données.
 *
 * V2: Améliorations majeures pour la pertinence et le contexte
 */

import { DataService } from './dataService';
import { getLanguage } from '../i18n/LanguageContext';

// Types pour les spécifications de graphiques générées par le LLM
export interface ChartSpec {
  chartType: 'bar' | 'pie' | 'line' | 'composed' | 'radar';
  title: string;
  description: string;
  query: DataQuery;
  formatting?: ChartFormatting;
}

export interface DataQuery {
  // Source de données
  source: 'practitioners' | 'visits' | 'kols';

  // Filtres à appliquer
  filters?: DataFilter[];

  // Agrégation
  groupBy?: string; // 'city' | 'specialty' | 'vingtile' | 'loyaltyBucket' | 'riskLevel' | 'visitBucket'

  // Métriques à calculer
  metrics: MetricSpec[];

  // Tri et limite
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface DataFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: string | number | boolean | string[] | number[];
}

export interface MetricSpec {
  name: string;        // Nom affiché
  field: string;       // Champ source
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  format?: 'number' | 'percent' | 'currency' | 'k';
}

export interface ChartFormatting {
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

export interface ChartResult {
  spec: ChartSpec;
  data: ChartDataPoint[];
  insights: string[];
  suggestions: string[];
  rawQuery: string;
}

export interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

// Historique des graphiques pour la mémoire conversationnelle
export interface ChartHistory {
  question: string;
  spec: ChartSpec;
  data: ChartDataPoint[];
  insights: string[];
  timestamp: Date;
}

// Stockage en mémoire des graphiques récents
let chartHistoryStore: ChartHistory[] = [];

export function addToChartHistory(history: ChartHistory): void {
  chartHistoryStore.unshift(history);
  // Garder les 5 derniers
  if (chartHistoryStore.length > 5) {
    chartHistoryStore = chartHistoryStore.slice(0, 5);
  }
}

export function getChartHistory(): ChartHistory[] {
  return chartHistoryStore;
}

export function clearChartHistory(): void {
  chartHistoryStore = [];
}

// Schéma de données exposé au LLM
const DATA_SCHEMA_FR = `
## Schéma des Données Disponibles

### Praticiens (practitioners)
Champs disponibles :
- id: string (identifiant unique)
- title: string ("Dr" | "Pr")
- firstName: string
- lastName: string
- specialty: string ("Pneumologue" | "Médecin généraliste")
- city: string (ville d'exercice)
- postalCode: string
- volumeL: number (volume annuel en litres O2)
- loyaltyScore: number (0-10, score de fidélité)
- vingtile: number (1-20, segmentation potentiel)
- isKOL: boolean (Key Opinion Leader)
- lastVisitDate: string | null (date ISO)
- daysSinceVisit: number (jours depuis dernière visite)
- publicationsCount: number
- riskLevel: "low" | "medium" | "high" (calculé)

### Agrégations possibles (groupBy)
- "city" : par ville
- "specialty" : par spécialité médicale
- "vingtile" : par segment de potentiel (1-20)
- "vingtileBucket" : par groupe de vingtile (V1-2 Top, V3-5 Haut, V6-10 Moyen, V11+ Bas)
- "loyaltyBucket" : par niveau de fidélité (Très faible, Faible, Moyenne, Bonne, Excellente)
- "riskLevel" : par niveau de risque (Faible, Moyen, Élevé)
- "visitBucket" : par ancienneté de visite (<30j, 30-60j, 60-90j, >90j, Jamais)
- "isKOL" : KOLs vs Autres

### Métriques calculables
- count : nombre d'éléments
- sum(volumeL) : volume total
- avg(loyaltyScore) : fidélité moyenne
- avg(vingtile) : vingtile moyen
- sum(publicationsCount) : total publications

### Filtres disponibles
- specialty eq "Pneumologue"
- isKOL eq true
- vingtile lte 5
- loyaltyScore gte 7
- daysSinceVisit gt 60
- city contains "Lyon"
`;

const DATA_SCHEMA_EN = `
## Available Data Schema

### Practitioners
Available fields:
- id: string (unique identifier)
- title: string ("Dr" | "Pr")
- firstName: string
- lastName: string
- specialty: string ("Pneumologue" | "Médecin généraliste")
- city: string (practice city)
- postalCode: string
- volumeL: number (annual volume in liters O2)
- loyaltyScore: number (0-10, loyalty score)
- vingtile: number (1-20, potential segmentation)
- isKOL: boolean (Key Opinion Leader)
- lastVisitDate: string | null (ISO date)
- daysSinceVisit: number (days since last visit)
- publicationsCount: number
- riskLevel: "low" | "medium" | "high" (computed)

### Possible Aggregations (groupBy)
- "city": by city
- "specialty": by medical specialty
- "vingtile": by potential segment (1-20)
- "vingtileBucket": by vingtile group (V1-2 Top, V3-5 High, V6-10 Medium, V11+ Low)
- "loyaltyBucket": by loyalty level (Very low, Low, Medium, Good, Excellent)
- "riskLevel": by risk level (Low, Medium, High)
- "visitBucket": by visit recency (<30d, 30-60d, 60-90d, >90d, Never)
- "isKOL": KOLs vs Others

### Computable Metrics
- count: number of elements
- sum(volumeL): total volume
- avg(loyaltyScore): average loyalty
- avg(vingtile): average vingtile
- sum(publicationsCount): total publications

### Available Filters
- specialty eq "Pneumologue"
- isKOL eq true
- vingtile lte 5
- loyaltyScore gte 7
- daysSinceVisit gt 60
- city contains "Lyon"
`;

export function getDataSchema(): string {
  return getLanguage() === 'en' ? DATA_SCHEMA_EN : DATA_SCHEMA_FR;
}

// Keep DATA_SCHEMA as a default export for backward compatibility
export const DATA_SCHEMA = DATA_SCHEMA_FR;

// Prompt système AMÉLIORÉ pour la génération de graphiques
const CHART_GENERATION_PROMPT_FR = `Tu es un expert en visualisation de données pour un CRM pharmaceutique Air Liquide Healthcare.

${DATA_SCHEMA_FR}

## Ta Mission
Analyse la demande de l'utilisateur et génère une spécification JSON PRÉCISE pour créer le graphique demandé.

## RÈGLES CRITIQUES
1. **RESPECTE EXACTEMENT les paramètres demandés** :
   - Si l'utilisateur demande "15 praticiens" → limit: 15
   - Si l'utilisateur demande "top 20" → limit: 20
   - Si l'utilisateur demande "KOLs" → filtre isKOL: true
   - Si l'utilisateur demande "pneumologues" → filtre specialty: "Pneumologue"

2. **Choisis le type de graphique approprié** :
   - "bar" : pour classements, top N, comparaisons de valeurs
   - "pie" : pour répartitions/proportions (max 8 catégories)
   - "composed" : pour comparer 2 métriques (ex: volume ET fidélité)
   - "line" : pour évolutions temporelles uniquement

3. **Pour les comparaisons KOLs vs Autres** :
   - groupBy: "isKOL" (donnera 2 catégories: "KOLs" et "Autres")

4. **Pour les répartitions par spécialité** :
   - groupBy: "specialty"
   - Avec filtre si besoin (ex: isKOL: true pour "KOLs par spécialité")

## Format de Sortie OBLIGATOIRE
Réponds UNIQUEMENT avec ce bloc JSON, sans texte avant ni après :

\`\`\`json
{
  "chartType": "bar",
  "title": "Titre descriptif du graphique",
  "description": "Ce graphique montre...",
  "query": {
    "source": "practitioners",
    "filters": [],
    "groupBy": "city",
    "metrics": [
      { "name": "Volume (K L)", "field": "volumeL", "aggregation": "sum", "format": "k" }
    ],
    "sortBy": "Volume (K L)",
    "sortOrder": "desc",
    "limit": 10
  },
  "formatting": {
    "showLegend": true,
    "xAxisLabel": "Label X",
    "yAxisLabel": "Label Y"
  },
  "insights": [
    "Insight basé sur ce que les données montreront",
    "Deuxième insight pertinent"
  ],
  "suggestions": [
    "Question de suivi 1",
    "Question de suivi 2"
  ]
}
\`\`\`

## Exemples de requêtes

**"Compare les KOLs aux autres praticiens en volume"** :
- groupBy: "isKOL"
- metrics: [{ name: "Volume Total (K L)", field: "volumeL", aggregation: "sum", format: "k" }]
- chartType: "bar"

**"Répartition des KOLs par spécialité"** :
- filters: [{ field: "isKOL", operator: "eq", value: true }]
- groupBy: "specialty"
- metrics: [{ name: "Nombre de KOLs", field: "id", aggregation: "count" }]
- chartType: "pie"

**"Top 15 praticiens par volume"** :
- groupBy: null (pas de groupement, individus)
- metrics: [{ name: "Volume (K L)", field: "volumeL", aggregation: "sum", format: "k" }]
- limit: 15
- chartType: "bar"
`;

const CHART_GENERATION_PROMPT_EN = `You are a data visualization expert for an Air Liquide Healthcare pharmaceutical CRM.

${DATA_SCHEMA_EN}

## Your Mission
Analyze the user's request and generate a PRECISE JSON specification to create the requested chart.

## CRITICAL RULES
1. **RESPECT EXACTLY the requested parameters**:
   - If the user asks for "15 practitioners" → limit: 15
   - If the user asks for "top 20" → limit: 20
   - If the user asks for "KOLs" → filter isKOL: true
   - If the user asks for "pulmonologists" → filter specialty: "Pneumologue"

2. **Choose the appropriate chart type**:
   - "bar": for rankings, top N, value comparisons
   - "pie": for distributions/proportions (max 8 categories)
   - "composed": to compare 2 metrics (e.g., volume AND loyalty)
   - "line": for time series only

3. **For KOLs vs Others comparisons**:
   - groupBy: "isKOL" (will give 2 categories: "KOLs" and "Others")

4. **For distributions by specialty**:
   - groupBy: "specialty"
   - With filter if needed (e.g., isKOL: true for "KOLs by specialty")

## MANDATORY Output Format
Respond ONLY with this JSON block, no text before or after:

\`\`\`json
{
  "chartType": "bar",
  "title": "Descriptive chart title",
  "description": "This chart shows...",
  "query": {
    "source": "practitioners",
    "filters": [],
    "groupBy": "city",
    "metrics": [
      { "name": "Volume (K L)", "field": "volumeL", "aggregation": "sum", "format": "k" }
    ],
    "sortBy": "Volume (K L)",
    "sortOrder": "desc",
    "limit": 10
  },
  "formatting": {
    "showLegend": true,
    "xAxisLabel": "X Label",
    "yAxisLabel": "Y Label"
  },
  "insights": [
    "Insight based on what the data will show",
    "Second relevant insight"
  ],
  "suggestions": [
    "Follow-up question 1",
    "Follow-up question 2"
  ]
}
\`\`\`

## Query Examples

**"Compare KOLs to other practitioners by volume"**:
- groupBy: "isKOL"
- metrics: [{ name: "Total Volume (K L)", field: "volumeL", aggregation: "sum", format: "k" }]
- chartType: "bar"

**"Distribution of KOLs by specialty"**:
- filters: [{ field: "isKOL", operator: "eq", value: true }]
- groupBy: "specialty"
- metrics: [{ name: "Number of KOLs", field: "id", aggregation: "count" }]
- chartType: "pie"

**"Top 15 practitioners by volume"**:
- groupBy: null (no grouping, individuals)
- metrics: [{ name: "Volume (K L)", field: "volumeL", aggregation: "sum", format: "k" }]
- limit: 15
- chartType: "bar"
`;

export function getChartGenerationPrompt(): string {
  return getLanguage() === 'en' ? CHART_GENERATION_PROMPT_EN : CHART_GENERATION_PROMPT_FR;
}

// Keep CHART_GENERATION_PROMPT for backward compatibility
export const CHART_GENERATION_PROMPT = CHART_GENERATION_PROMPT_FR;

// Prompt pour l'analyse conversationnelle (réponse aux questions de suivi)
const CONVERSATION_ANALYSIS_PROMPT_FR = `Tu es un assistant expert en analyse de données CRM pharmaceutique.

L'utilisateur a posé une question qui fait suite à un graphique précédemment généré.

## Graphique précédent
{CHART_CONTEXT}

## Question de l'utilisateur
{USER_QUESTION}

## Instructions
1. Analyse la question en relation avec le graphique précédent
2. Si la question contredit ce que montre le graphique, explique poliment la différence
3. Si la question demande des précisions, fournis-les en te basant sur les données
4. Sois précis et utilise les données du graphique pour appuyer ta réponse

Réponds en Markdown de façon concise et précise.
`;

const CONVERSATION_ANALYSIS_PROMPT_EN = `You are an expert assistant in pharmaceutical CRM data analysis.

The user has asked a follow-up question about a previously generated chart.

## Previous Chart
{CHART_CONTEXT}

## User's Question
{USER_QUESTION}

## Instructions
1. Analyze the question in relation to the previous chart
2. If the question contradicts what the chart shows, politely explain the difference
3. If the question asks for details, provide them based on the data
4. Be precise and use the chart data to support your response

Respond in Markdown concisely and precisely.
`;

export function getConversationAnalysisPrompt(): string {
  return getLanguage() === 'en' ? CONVERSATION_ANALYSIS_PROMPT_EN : CONVERSATION_ANALYSIS_PROMPT_FR;
}

// Keep CONVERSATION_ANALYSIS_PROMPT for backward compatibility
export const CONVERSATION_ANALYSIS_PROMPT = CONVERSATION_ANALYSIS_PROMPT_FR;

// Extraire les paramètres spécifiques de la question
export function extractQueryParameters(question: string): {
  limit?: number;
  wantsKOL?: boolean;
  wantsSpecialty?: string;
  wantsComparison?: boolean;
  wantsDistribution?: boolean;
} {
  const q = question.toLowerCase();
  const params: ReturnType<typeof extractQueryParameters> = {};

  // Extraire le nombre demandé (top N, X praticiens, etc.)
  const numberMatch = q.match(/top\s*(\d+)|(\d+)\s*(?:praticiens?|medecins?|docteurs?|premiers?)/i);
  if (numberMatch) {
    params.limit = parseInt(numberMatch[1] || numberMatch[2], 10);
  }

  // Détecter si on parle de KOLs
  if (/\bkols?\b|key opinion|leaders?\b/i.test(q)) {
    params.wantsKOL = true;
  }

  // Détecter la spécialité
  if (/pneumo/i.test(q)) {
    params.wantsSpecialty = 'Pneumologue';
  } else if (/generaliste|mg\b/i.test(q)) {
    params.wantsSpecialty = 'Médecin généraliste';
  }

  // Détecter si c'est une comparaison
  if (/compar|versus|vs\b|contre|par rapport/i.test(q)) {
    params.wantsComparison = true;
  }

  // Détecter si c'est une répartition
  if (/repartition|distribution|proportion|pourcentage/i.test(q)) {
    params.wantsDistribution = true;
  }

  return params;
}

// Détecter si c'est une question de suivi sur un graphique précédent
export function isFollowUpQuestion(question: string): boolean {
  const q = question.toLowerCase();
  const followUpPatterns = [
    /ce n'est pas|mais.*graphique|precedent|sur ton|le graphique/,
    /tu as montre|tu m'as|tu viens de/,
    /donc|alors|pourtant|comment ça/,
    /tous les.*sont|aucun.*n'est/
  ];
  return followUpPatterns.some(p => p.test(q));
}

// Construire le contexte des graphiques précédents pour le LLM
export function buildChartContextForLLM(): string {
  const lang = getLanguage();
  const history = getChartHistory();
  if (history.length === 0) return '';

  const lastChart = history[0];
  const dataPreview = lastChart.data.slice(0, 10).map(d => {
    const metrics = Object.entries(d)
      .filter(([k]) => k !== 'name')
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    return `  - ${d.name}: ${metrics}`;
  }).join('\n');

  if (lang === 'en') {
    return `
## LAST GENERATED CHART
Question: "${lastChart.question}"
Type: ${lastChart.spec.chartType}
Title: ${lastChart.spec.title}

Displayed data:
${dataPreview}

Insights: ${lastChart.insights.join(' | ')}
`;
  }

  return `
## DERNIER GRAPHIQUE GÉNÉRÉ
Question: "${lastChart.question}"
Type: ${lastChart.spec.chartType}
Titre: ${lastChart.spec.title}

Données affichées:
${dataPreview}

Insights: ${lastChart.insights.join(' | ')}
`;
}

// Exécuter une requête de données
export function executeDataQuery(query: DataQuery): ChartDataPoint[] {
  const practitioners = DataService.getAllPractitioners();
  const today = new Date();

  // Enrichir les données avec des champs calculés
  const enrichedData = practitioners.map(p => {
    const lastVisit = p.lastVisitDate ? new Date(p.lastVisitDate) : null;
    const daysSinceVisit = lastVisit
      ? Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Calculer le niveau de risque (aligné avec actionIntelligence: >60j/loyalty<5 = high)
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (daysSinceVisit > 60 || p.metrics.loyaltyScore < 5) riskLevel = 'high';
    else if (daysSinceVisit > 30 || p.metrics.loyaltyScore < 7) riskLevel = 'medium';

    return {
      ...p,
      city: p.address.city,
      postalCode: p.address.postalCode,
      volumeL: p.metrics.volumeL,
      loyaltyScore: p.metrics.loyaltyScore,
      vingtile: p.metrics.vingtile,
      isKOL: p.metrics.isKOL,
      daysSinceVisit,
      riskLevel,
      publicationsCount: (p as { news?: unknown[] }).news?.length || 0
    };
  });

  // Appliquer les filtres
  let filteredData = enrichedData;
  if (query.filters) {
    for (const filter of query.filters) {
      filteredData = filteredData.filter(item => {
        const value = (item as Record<string, unknown>)[filter.field];
        switch (filter.operator) {
          case 'eq': return value === filter.value;
          case 'ne': return value !== filter.value;
          case 'gt': return typeof value === 'number' && value > (filter.value as number);
          case 'gte': return typeof value === 'number' && value >= (filter.value as number);
          case 'lt': return typeof value === 'number' && value < (filter.value as number);
          case 'lte': return typeof value === 'number' && value <= (filter.value as number);
          case 'contains': return typeof value === 'string' && value.toLowerCase().includes((filter.value as string).toLowerCase());
          case 'in': return Array.isArray(filter.value) && (filter.value as (string | number)[]).includes(value as string | number);
          default: return true;
        }
      });
    }
  }

  // Grouper les données si nécessaire
  if (query.groupBy) {
    // Quand limit + groupBy sont combinés, appliquer le limit aux items INDIVIDUELS
    // AVANT le groupement. Ex: "top 15 praticiens par ville" → prendre les 15 meilleurs,
    // puis les grouper par ville (les comptes doivent sommer à 15).
    let dataToGroup = filteredData;
    if (query.limit && query.sortBy) {
      // Déterminer le champ de tri à partir des métriques
      const sortMetric = query.metrics.find(m => m.name === query.sortBy);
      if (sortMetric) {
        const sortField = sortMetric.field;
        const order = query.sortOrder === 'asc' ? 1 : -1;
        const sorted = [...filteredData].sort((a, b) => {
          const aVal = (a as Record<string, unknown>)[sortField] as number || 0;
          const bVal = (b as Record<string, unknown>)[sortField] as number || 0;
          return (aVal - bVal) * order;
        });
        dataToGroup = sorted.slice(0, query.limit);
      }
    }

    const grouped = new Map<string, typeof filteredData>();

    for (const item of dataToGroup) {
      let key: string;

      switch (query.groupBy) {
        case 'vingtileBucket': {
          const v = item.vingtile;
          key = v <= 2 ? 'V1-2 (Top)' : v <= 5 ? 'V3-5 (Haut)' : v <= 10 ? 'V6-10 (Moyen)' : 'V11+ (Bas)';
          break;
        }
        case 'loyaltyBucket': {
          const l = item.loyaltyScore;
          key = l <= 2 ? 'Très faible' : l <= 4 ? 'Faible' : l <= 6 ? 'Moyenne' : l <= 8 ? 'Bonne' : 'Excellente';
          break;
        }
        case 'visitBucket': {
          const d = item.daysSinceVisit;
          key = d < 30 ? '<30j' : d < 60 ? '30-60j' : d < 90 ? '60-90j' : d < 999 ? '>90j' : 'Jamais';
          break;
        }
        case 'riskLevel': {
          key = item.riskLevel === 'high' ? 'Élevé' : item.riskLevel === 'medium' ? 'Moyen' : 'Faible';
          break;
        }
        case 'isKOL': {
          key = item.isKOL ? 'KOLs' : 'Autres praticiens';
          break;
        }
        default: {
          key = String((item as Record<string, unknown>)[query.groupBy] || 'Autre');
        }
      }

      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    }

    // Calculer les métriques pour chaque groupe
    const results: ChartDataPoint[] = [];

    for (const [name, items] of grouped) {
      const point: ChartDataPoint = { name };

      for (const metric of query.metrics) {
        let value: number;

        switch (metric.aggregation) {
          case 'count':
            value = items.length;
            break;
          case 'sum':
            value = items.reduce((sum, item) => sum + ((item as Record<string, unknown>)[metric.field] as number || 0), 0);
            break;
          case 'avg':
            value = items.reduce((sum, item) => sum + ((item as Record<string, unknown>)[metric.field] as number || 0), 0) / items.length;
            break;
          case 'min':
            value = Math.min(...items.map(item => (item as Record<string, unknown>)[metric.field] as number || 0));
            break;
          case 'max':
            value = Math.max(...items.map(item => (item as Record<string, unknown>)[metric.field] as number || 0));
            break;
          default:
            value = 0;
        }

        // Formater la valeur
        if (metric.format === 'k') value = Math.round(value / 1000);
        else if (metric.format === 'percent') value = Math.round(value * 100);
        else value = Math.round(value * 10) / 10;

        point[metric.name] = value;
      }

      results.push(point);
    }

    // Trier les résultats
    if (query.sortBy) {
      const sortField = query.sortBy;
      const order = query.sortOrder === 'asc' ? 1 : -1;
      results.sort((a, b) => {
        const aVal = a[sortField] as number || 0;
        const bVal = b[sortField] as number || 0;
        return (aVal - bVal) * order;
      });
    }

    return results;
  }

  // Sans groupBy, retourner les items individuels (top N)
  const results: ChartDataPoint[] = filteredData.map(item => {
    const point: ChartDataPoint = {
      name: `${item.title} ${item.firstName} ${item.lastName}`.trim()
    };

    for (const metric of query.metrics) {
      let value = (item as Record<string, unknown>)[metric.field] as number || 0;
      if (metric.format === 'k') value = Math.round(value / 1000);
      point[metric.name] = Math.round(value * 10) / 10;
    }

    // Ajouter des métadonnées utiles
    point['_specialty'] = item.specialty;
    point['_city'] = item.city;
    point['_isKOL'] = item.isKOL ? 'Oui' : 'Non';

    return point;
  });

  // Trier
  if (query.sortBy) {
    const sortField = query.sortBy;
    const order = query.sortOrder === 'asc' ? 1 : -1;
    results.sort((a, b) => ((a[sortField] as number) - (b[sortField] as number)) * order);
  }

  return query.limit ? results.slice(0, query.limit) : results;
}

// Parser la réponse JSON du LLM avec tolérance maximale
// Les modèles de raisonnement (o-series) peuvent entourer le JSON de texte de réflexion.
export function parseLLMChartResponse(response: string): ChartSpec | null {
  try {
    let parsed: Record<string, unknown> | null = null;

    // Pattern 1: ```json ... ```
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[1].trim()); } catch { /* continue */ }
    }

    // Pattern 2: ``` ... ```
    if (!parsed) {
      const codeMatch = response.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        try { parsed = JSON.parse(codeMatch[1].trim()); } catch { /* continue */ }
      }
    }

    // Pattern 3: direct parse
    if (!parsed) {
      try { parsed = JSON.parse(response.trim()); } catch { /* continue */ }
    }

    // Pattern 4: balanced brace extraction (handles reasoning text before/after JSON)
    if (!parsed) {
      const firstBrace = response.indexOf('{');
      if (firstBrace !== -1) {
        let depth = 0;
        let inString = false;
        let escape = false;
        for (let i = firstBrace; i < response.length; i++) {
          const ch = response[i];
          if (escape) { escape = false; continue; }
          if (ch === '\\' && inString) { escape = true; continue; }
          if (ch === '"') { inString = !inString; continue; }
          if (inString) continue;
          if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              try { parsed = JSON.parse(response.substring(firstBrace, i + 1)); } catch { /* malformed */ }
              break;
            }
          }
        }
      }
    }

    if (!parsed) {
      console.error('Failed to extract JSON from LLM chart response:', response.substring(0, 300));
      return null;
    }

    // Valider et normaliser la structure
    if (!parsed.chartType || !parsed.query || !(parsed.query as Record<string, unknown>).metrics) {
      console.error('Invalid chart spec structure:', parsed);
      return null;
    }

    // S'assurer que les metrics ont le bon format
    const query = parsed.query as Record<string, unknown>;
    if (!Array.isArray(query.metrics)) {
      query.metrics = [query.metrics];
    }

    // S'assurer que les filtres sont un tableau
    if (query.filters && !Array.isArray(query.filters)) {
      query.filters = [query.filters];
    }

    // Normaliser le chartType
    const validTypes = ['bar', 'pie', 'line', 'composed', 'radar'];
    if (!validTypes.includes(parsed.chartType as string)) {
      parsed.chartType = 'bar';
    }

    return parsed as unknown as ChartSpec;
  } catch (error) {
    console.error('Failed to parse LLM chart response:', error);
    console.error('Raw response:', response.substring(0, 500));
    return null;
  }
}

// Générer un graphique complet à partir d'une spec
export function generateChartFromSpec(spec: ChartSpec): ChartResult {
  const data = executeDataQuery(spec.query);

  // Générer des insights automatiques si non fournis
  const insights = (spec as ChartSpec & { insights?: string[] }).insights || generateAutoInsights(spec, data);
  const suggestions = (spec as ChartSpec & { suggestions?: string[] }).suggestions || generateAutoSuggestions(spec);

  return {
    spec,
    data,
    insights,
    suggestions,
    rawQuery: JSON.stringify(spec.query, null, 2)
  };
}

// Générer des insights automatiques améliorés
function generateAutoInsights(spec: ChartSpec, data: ChartDataPoint[]): string[] {
  const lang = getLanguage();
  const insights: string[] = [];

  if (data.length === 0) {
    return [lang === 'en' ? 'No data matches the criteria' : 'Aucune donnée ne correspond aux critères'];
  }

  const firstMetric = spec.query.metrics[0]?.name;
  if (!firstMetric) return insights;

  // Top item
  const topItem = data[0];
  if (topItem) {
    insights.push(lang === 'en'
      ? `**${topItem.name}** leads with ${topItem[firstMetric]} ${spec.formatting?.valueSuffix || ''}`
      : `**${topItem.name}** arrive en tête avec ${topItem[firstMetric]} ${spec.formatting?.valueSuffix || ''}`);
  }

  // Total ou moyenne selon le contexte
  if (spec.chartType === 'pie' && data.length > 0) {
    const total = data.reduce((sum, d) => sum + (d[firstMetric] as number || 0), 0);
    const topShare = Math.round(((topItem[firstMetric] as number) / total) * 100);
    insights.push(lang === 'en'
      ? `${topItem.name} represents ${topShare}% of the total`
      : `${topItem.name} représente ${topShare}% du total`);
  }

  // Comparaison KOL vs Autres
  if (spec.query.groupBy === 'isKOL') {
    const kolData = data.find(d => d.name.includes('KOL'));
    const autresData = data.find(d => d.name.includes('Autres'));
    if (kolData && autresData) {
      const kolValue = kolData[firstMetric] as number;
      const autresValue = autresData[firstMetric] as number;
      const total = kolValue + autresValue;
      insights.push(lang === 'en'
        ? `KOLs represent ${Math.round(kolValue / total * 100)}% of ${firstMetric.toLowerCase()}`
        : `Les KOLs représentent ${Math.round(kolValue / total * 100)}% du ${firstMetric.toLowerCase()}`);
    }
  }

  // Comparaison premier/dernier
  if (data.length > 2) {
    const lastItem = data[data.length - 1];
    const ratio = Math.round((topItem[firstMetric] as number) / (lastItem[firstMetric] as number || 1));
    if (ratio > 1 && ratio < 100) {
      insights.push(lang === 'en'
        ? `x${ratio} gap between ${topItem.name} and ${lastItem.name}`
        : `Écart de x${ratio} entre ${topItem.name} et ${lastItem.name}`);
    }
  }

  return insights;
}

// Générer des suggestions de suivi améliorées
function generateAutoSuggestions(spec: ChartSpec): string[] {
  const lang = getLanguage();
  const suggestions: string[] = [];
  const groupBy = spec.query.groupBy;
  const hasKOLFilter = spec.query.filters?.some(f => f.field === 'isKOL');

  if (lang === 'en') {
    if (groupBy === 'city') {
      suggestions.push('KOL detail by city');
      suggestions.push('At-risk practitioners by city');
    } else if (groupBy === 'specialty') {
      if (hasKOLFilter) {
        suggestions.push('Compare KOLs vs other practitioners');
        suggestions.push('Volume by specialty (all practitioners)');
      } else {
        suggestions.push('KOLs by specialty');
        suggestions.push('Average loyalty by specialty');
      }
    } else if (groupBy === 'isKOL') {
      suggestions.push('KOL distribution by specialty');
      suggestions.push('Top 10 KOLs by volume');
    } else if (groupBy === 'vingtileBucket' || groupBy === 'vingtile') {
      suggestions.push('Top segment detail (V1-2)');
      suggestions.push('KOLs by potential segment');
    } else if (groupBy === 'riskLevel') {
      suggestions.push('List of high-risk practitioners');
      suggestions.push('Priority actions by risk');
    } else if (!groupBy) {
      suggestions.push('Distribution by city');
      suggestions.push('KOLs vs others comparison');
    }
    if (!suggestions.length) {
      suggestions.push('Analysis by city');
      suggestions.push('Distribution by segment');
    }
  } else {
    if (groupBy === 'city') {
      suggestions.push('Détail des KOLs par ville');
      suggestions.push('Praticiens à risque par ville');
    } else if (groupBy === 'specialty') {
      if (hasKOLFilter) {
        suggestions.push('Comparer KOLs vs autres praticiens');
        suggestions.push('Volume par spécialité (tous praticiens)');
      } else {
        suggestions.push('KOLs par spécialité');
        suggestions.push('Fidélité moyenne par spécialité');
      }
    } else if (groupBy === 'isKOL') {
      suggestions.push('Répartition des KOLs par spécialité');
      suggestions.push('Top 10 KOLs par volume');
    } else if (groupBy === 'vingtileBucket' || groupBy === 'vingtile') {
      suggestions.push('Détail du segment Top (V1-2)');
      suggestions.push('KOLs par segment de potentiel');
    } else if (groupBy === 'riskLevel') {
      suggestions.push('Liste des praticiens à risque élevé');
      suggestions.push('Actions prioritaires par risque');
    } else if (!groupBy) {
      suggestions.push('Répartition par ville');
      suggestions.push('Comparaison KOLs vs autres');
    }
    if (!suggestions.length) {
      suggestions.push('Analyse par ville');
      suggestions.push('Répartition par segment');
    }
  }

  return suggestions;
}

// Créer le contexte de données pour le LLM
export function getDataContextForLLM(): string {
  const lang = getLanguage();
  const stats = DataService.getGlobalStats();
  const practitioners = DataService.getAllPractitioners();
  const cities = [...new Set(practitioners.map(p => p.address.city))];

  // Compter les KOLs par spécialité
  const kolsBySpecialty = practitioners
    .filter(p => p.metrics.isKOL)
    .reduce((acc, p) => {
      acc[p.specialty] = (acc[p.specialty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  if (lang === 'en') {
    return `
CURRENT DATA CONTEXT:
- ${stats.totalPractitioners} total practitioners
  - ${stats.pneumologues} Pulmonologists
  - ${stats.generalistes} General Practitioners
- ${stats.totalKOLs} identified KOLs
  - Pulmonologists: ${kolsBySpecialty['Pneumologue'] || 0} KOLs
  - GPs: ${kolsBySpecialty['Médecin généraliste'] || 0} KOLs
- Total volume: ${Math.round(stats.totalVolume / 1000)}K L/yr
- Average loyalty: ${stats.averageLoyalty.toFixed(1)}/10
- Cities present: ${cities.slice(0, 8).join(', ')}${cities.length > 8 ? ` (+${cities.length - 8} others)` : ''}
`;
  }

  return `
CONTEXTE DONNÉES ACTUELLES :
- ${stats.totalPractitioners} praticiens au total
  - ${stats.pneumologues} Pneumologues
  - ${stats.generalistes} Médecins généralistes
- ${stats.totalKOLs} KOLs identifiés
  - Pneumologues: ${kolsBySpecialty['Pneumologue'] || 0} KOLs
  - Généralistes: ${kolsBySpecialty['Médecin généraliste'] || 0} KOLs
- Volume total : ${Math.round(stats.totalVolume / 1000)}K L/an
- Fidélité moyenne : ${stats.averageLoyalty.toFixed(1)}/10
- Villes présentes : ${cities.slice(0, 8).join(', ')}${cities.length > 8 ? ` (+${cities.length - 8} autres)` : ''}
`;
}

// ============================================
// INTERPRÉTATION LOCALE DES QUESTIONS
// Génère une ChartSpec sans appel LLM
// ============================================

export interface LocalInterpretation {
  spec: ChartSpec;
  confidence: number; // 0-1, how confident we are in the interpretation
}

/**
 * Interprète localement une question et génère une ChartSpec
 * Utilisé comme fallback quand le LLM n'est pas disponible
 */
export function interpretQuestionLocally(question: string): LocalInterpretation {
  const lang = getLanguage();
  const en = lang === 'en';
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Extraire les paramètres
  const params = extractQueryParameters(question);
  const limit = params.limit || 10;

  // Patterns pour détecter le type de requête (FR + EN patterns)
  const isTopPrescribers = /top|prescri|volume|plus\s*(de\s*)?volume|qui\s+prescri|highest/i.test(q);
  const isKOLComparison = /kols?\s*(vs|versus|contre|compar|aux autres|compared|against)/i.test(q);
  const isKOLDistribution = /kols?\s*(par|selon|repartition|distribution|by)/i.test(q);
  const isKOLOnly = /\bkols?\b/i.test(q) && !isKOLComparison && !isKOLDistribution;
  const isByCity = /par\s*ville|ville|by\s*city|city/i.test(q);
  const isBySpecialty = /par\s*specialite|specialite|pneumo|generaliste|by\s*specialty|specialty/i.test(q);
  const isBySegment = /par\s*segment|vingtile|segment|by\s*segment/i.test(q);
  const isByLoyalty = /fidelite|fidele|loyal/i.test(q);
  const isByRisk = /risque|a\s*risque|risk|at.risk/i.test(q);
  const wantsPie = /repartition|distribution|camembert|pie|proportion|pourcentage|percentage/i.test(q);

  // Bilingual metric names
  const loyaltyName = en ? 'Loyalty' : 'Fidélité';
  const countName = en ? 'Count' : 'Nombre';

  let spec: ChartSpec;
  let confidence = 0.7;

  // ============================================
  // TOP N PRESCRIBERS
  // ============================================
  if (isTopPrescribers && !isByCity && !isBySpecialty && !isKOLDistribution) {
    spec = {
      chartType: 'bar',
      title: en ? `Top ${limit} prescribers by volume` : `Top ${limit} prescripteurs par volume`,
      description: en ? `The ${limit} practitioners with the highest oxygen prescription volume` : `Les ${limit} praticiens qui prescrivent le plus en volume d'oxygène`,
      query: {
        source: 'practitioners',
        filters: params.wantsKOL ? [{ field: 'isKOL', operator: 'eq', value: true }] : [],
        metrics: [
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' },
          { name: loyaltyName, field: 'loyaltyScore', aggregation: 'avg' }
        ],
        sortBy: 'Volume (K L)',
        sortOrder: 'desc',
        limit: limit
      },
      formatting: {
        xAxisLabel: en ? 'Practitioner' : 'Praticien',
        yAxisLabel: en ? 'Volume (K L/yr)' : 'Volume (K L/an)',
        showLegend: true
      }
    };
    confidence = 0.9;
  }
  // ============================================
  // KOLs vs OTHERS COMPARISON
  // ============================================
  else if (isKOLComparison) {
    spec = {
      chartType: 'bar',
      title: en ? 'KOLs vs Other Practitioners Comparison' : 'Comparaison KOLs vs Autres praticiens',
      description: en ? 'Volume comparison between Key Opinion Leaders and other practitioners' : 'Comparaison du volume entre les Key Opinion Leaders et les autres praticiens',
      query: {
        source: 'practitioners',
        groupBy: 'isKOL',
        metrics: [
          { name: en ? 'Total Volume (K L)' : 'Volume Total (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' },
          { name: countName, field: 'id', aggregation: 'count' }
        ],
        sortBy: en ? 'Total Volume (K L)' : 'Volume Total (K L)',
        sortOrder: 'desc'
      },
      formatting: {
        xAxisLabel: en ? 'Category' : 'Catégorie',
        yAxisLabel: 'Volume (K L)',
        showLegend: true
      }
    };
    confidence = 0.95;
  }
  // ============================================
  // KOLs DISTRIBUTION BY SPECIALTY
  // ============================================
  else if (isKOLDistribution && isBySpecialty) {
    const metricName = en ? 'Number of KOLs' : 'Nombre de KOLs';
    spec = {
      chartType: wantsPie ? 'pie' : 'bar',
      title: en ? 'KOL Distribution by Specialty' : 'Répartition des KOLs par spécialité',
      description: en ? 'Distribution of Key Opinion Leaders by medical specialty' : 'Distribution des Key Opinion Leaders selon leur spécialité médicale',
      query: {
        source: 'practitioners',
        filters: [{ field: 'isKOL', operator: 'eq', value: true }],
        groupBy: 'specialty',
        metrics: [
          { name: metricName, field: 'id', aggregation: 'count' }
        ],
        sortBy: metricName,
        sortOrder: 'desc'
      },
      formatting: {
        showLegend: true
      }
    };
    confidence = 0.95;
  }
  // ============================================
  // BY CITY
  // ============================================
  else if (isByCity) {
    spec = {
      chartType: wantsPie ? 'pie' : 'bar',
      title: en ? (params.wantsKOL ? 'KOLs by City' : 'Practitioners by City') : (params.wantsKOL ? 'KOLs par ville' : 'Praticiens par ville'),
      description: en ? 'Geographic distribution of practitioners' : 'Répartition géographique des praticiens',
      query: {
        source: 'practitioners',
        filters: params.wantsKOL ? [{ field: 'isKOL', operator: 'eq', value: true }] : [],
        groupBy: 'city',
        metrics: [
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' },
          { name: countName, field: 'id', aggregation: 'count' }
        ],
        sortBy: 'Volume (K L)',
        sortOrder: 'desc',
        limit: limit
      },
      formatting: {
        xAxisLabel: en ? 'City' : 'Ville',
        yAxisLabel: 'Volume (K L)',
        showLegend: true
      }
    };
    confidence = 0.85;
  }
  // ============================================
  // BY SPECIALTY
  // ============================================
  else if (isBySpecialty) {
    spec = {
      chartType: wantsPie ? 'pie' : 'bar',
      title: en ? 'Distribution by Specialty' : 'Répartition par spécialité',
      description: en ? 'Practitioner distribution by medical specialty' : 'Distribution des praticiens par spécialité médicale',
      query: {
        source: 'practitioners',
        filters: params.wantsKOL ? [{ field: 'isKOL', operator: 'eq', value: true }] : [],
        groupBy: 'specialty',
        metrics: [
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' },
          { name: countName, field: 'id', aggregation: 'count' }
        ],
        sortBy: 'Volume (K L)',
        sortOrder: 'desc'
      },
      formatting: {
        showLegend: true
      }
    };
    confidence = 0.85;
  }
  // ============================================
  // BY SEGMENT (VINGTILE)
  // ============================================
  else if (isBySegment) {
    spec = {
      chartType: wantsPie ? 'pie' : 'bar',
      title: en ? 'Distribution by Potential Segment' : 'Répartition par segment de potentiel',
      description: en ? 'Practitioner distribution by vingtile' : 'Distribution des praticiens par vingtile',
      query: {
        source: 'practitioners',
        groupBy: 'vingtileBucket',
        metrics: [
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' },
          { name: countName, field: 'id', aggregation: 'count' }
        ],
        sortBy: 'Volume (K L)',
        sortOrder: 'desc'
      },
      formatting: {
        showLegend: true
      }
    };
    confidence = 0.85;
  }
  // ============================================
  // BY LOYALTY
  // ============================================
  else if (isByLoyalty) {
    spec = {
      chartType: wantsPie ? 'pie' : 'bar',
      title: en ? 'Distribution by Loyalty Level' : 'Distribution par niveau de fidélité',
      description: en ? 'Practitioner distribution by loyalty score' : 'Répartition des praticiens selon leur score de fidélité',
      query: {
        source: 'practitioners',
        groupBy: 'loyaltyBucket',
        metrics: [
          { name: countName, field: 'id', aggregation: 'count' },
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' }
        ],
        sortBy: countName,
        sortOrder: 'desc'
      },
      formatting: {
        showLegend: true
      }
    };
    confidence = 0.85;
  }
  // ============================================
  // BY RISK
  // ============================================
  else if (isByRisk) {
    spec = {
      chartType: 'pie',
      title: en ? 'Distribution by Risk Level' : 'Répartition par niveau de risque',
      description: en ? 'Practitioner distribution by churn risk level' : 'Distribution des praticiens selon leur niveau de risque de désengagement',
      query: {
        source: 'practitioners',
        groupBy: 'riskLevel',
        metrics: [
          { name: countName, field: 'id', aggregation: 'count' },
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' }
        ],
        sortBy: countName,
        sortOrder: 'desc'
      },
      formatting: {
        showLegend: true
      }
    };
    confidence = 0.85;
  }
  // ============================================
  // KOLs ONLY
  // ============================================
  else if (isKOLOnly) {
    spec = {
      chartType: 'bar',
      title: en ? `Top ${limit} KOLs by Volume` : `Top ${limit} KOLs par volume`,
      description: en ? 'The most important Key Opinion Leaders by volume' : 'Les Key Opinion Leaders les plus importants en volume',
      query: {
        source: 'practitioners',
        filters: [{ field: 'isKOL', operator: 'eq', value: true }],
        metrics: [
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' },
          { name: loyaltyName, field: 'loyaltyScore', aggregation: 'avg' }
        ],
        sortBy: 'Volume (K L)',
        sortOrder: 'desc',
        limit: limit
      },
      formatting: {
        xAxisLabel: 'KOL',
        yAxisLabel: 'Volume (K L)',
        showLegend: true
      }
    };
    confidence = 0.8;
  }
  // ============================================
  // DEFAULT: TOP PRESCRIBERS
  // ============================================
  else {
    spec = {
      chartType: 'bar',
      title: en ? `Top ${limit} prescribers by volume` : `Top ${limit} prescripteurs par volume`,
      description: en ? `The ${limit} practitioners with the highest prescription volume` : `Les ${limit} praticiens avec le plus grand volume de prescription`,
      query: {
        source: 'practitioners',
        metrics: [
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' },
          { name: loyaltyName, field: 'loyaltyScore', aggregation: 'avg' }
        ],
        sortBy: 'Volume (K L)',
        sortOrder: 'desc',
        limit: limit
      },
      formatting: {
        xAxisLabel: en ? 'Practitioner' : 'Praticien',
        yAxisLabel: en ? 'Volume (K L/yr)' : 'Volume (K L/an)',
        showLegend: true
      }
    };
    confidence = 0.6;
  }

  return { spec, confidence };
}

/**
 * Génère un graphique complet à partir d'une interprétation locale
 */
export function generateChartLocally(question: string): ChartResult {
  const { spec } = interpretQuestionLocally(question);
  return generateChartFromSpec(spec);
}

// Couleurs par défaut pour les graphiques
export const DEFAULT_CHART_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
];
