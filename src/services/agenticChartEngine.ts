/**
 * Agentic Chart Engine - Talk to My Data v2
 *
 * Ce moteur permet au LLM de générer dynamiquement des visualisations
 * en écrivant des spécifications de requêtes qui sont exécutées sur les données.
 *
 * V2: Améliorations majeures pour la pertinence et le contexte
 */

import { DataService } from './dataService';

// Types pour les spécifications de graphiques générées par le LLM
export interface ChartSpec {
  chartType: 'bar' | 'pie' | 'line' | 'composed' | 'radar' | 'area';
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
export const DATA_SCHEMA = `
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
- lastName eq "Vincent" (insensible à la casse)
- firstName contains "Marie"
`;

// Prompt système AMÉLIORÉ pour la génération de graphiques
export const CHART_GENERATION_PROMPT = `Tu es un expert en visualisation de données pour un CRM pharmaceutique Air Liquide Healthcare.

${DATA_SCHEMA}

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
   - "pie" : pour répartitions/proportions (max 8 catégories). Utilise "pie" si l'utilisateur dit "camembert", "répartition", "proportion"
   - "composed" : pour comparer 2 métriques (ex: volume ET fidélité)
   - "line" : pour évolutions temporelles uniquement
   - "radar" : pour profils multi-dimensionnels, comparaisons sur plusieurs axes. Utilise "radar" si l'utilisateur dit "spider", "radar", "toile d'araignée", "araignée"
   - "area" : comme line mais avec l'aire sous la courbe remplie (pour évolutions avec emphasis sur le volume)

3. **Si l'utilisateur demande de MODIFIER un graphique précédent** (ex: "en camembert", "au format barres", "modifie ce graphique") :
   - REPRENDS EXACTEMENT la même query (mêmes filtres, métriques, groupBy, limit)
   - Change UNIQUEMENT le chartType demandé
   - Adapte le titre et la description au nouveau format

4. **Pour les comparaisons KOLs vs Autres** :
   - groupBy: "isKOL" (donnera 2 catégories: "KOLs" et "Autres")

5. **Pour les répartitions par spécialité** :
   - groupBy: "specialty"
   - Avec filtre si besoin (ex: isKOL: true pour "KOLs par spécialité")

## Format de Sortie OBLIGATOIRE
Réponds UNIQUEMENT avec ce bloc JSON, sans texte avant ni après :

\`\`\`json
{
  "chartType": "bar",
  "title": "Titre descriptif du graphique",
  "description": "Description courte factuelle de ce que montre le graphique",
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
  }
}
\`\`\`

NE PAS inclure "insights" ni "suggestions" dans le JSON — ils seront générés automatiquement à partir des données réelles.

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

**"Volumes par ville en camembert"** :
- groupBy: "city"
- metrics: [{ name: "Volume (K L)", field: "volumeL", aggregation: "sum", format: "k" }]
- chartType: "pie"
- sortBy: "Volume (K L)"
- sortOrder: "desc"

**"Volumes des médecins dont le nom est Vincent"** :
- filters: [{ field: "lastName", operator: "eq", value: "Vincent" }]
- groupBy: null (pas de groupement → chaque praticien individuellement avec son nom complet)
- metrics: [{ name: "Volume (K L)", field: "volumeL", aggregation: "sum", format: "k" }]
- chartType: "bar"

**IMPORTANT** : Pour afficher des praticiens individuellement (pas groupés par ville/spécialité), utiliser groupBy: null.
Ne JAMAIS utiliser groupBy: "id" — utiliser null pour que les noms complets s'affichent.
`;

// Prompt pour l'analyse conversationnelle (réponse aux questions de suivi)
export const CONVERSATION_ANALYSIS_PROMPT = `Tu es un assistant expert en analyse de données CRM pharmaceutique.

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

// Détecter si c'est une question de suivi TEXTUELLE (pas de modification de graphique)
export function isFollowUpQuestion(question: string): boolean {
  const q = question.toLowerCase();
  // Only match genuine text follow-ups about a previous chart, NOT chart modifications
  const followUpPatterns = [
    /ce n'est pas ce que|tu as montre|tu m'as montre|tu viens de montrer/,
    /explique.*graphique|pourquoi.*graphique|comment.*graphique/,
    /que signifie|qu'est-ce que.*veut dire/,
    /tous les.*sont|aucun.*n'est/
  ];
  return followUpPatterns.some(p => p.test(q));
}

// Détecter si l'utilisateur veut MODIFIER le graphique précédent
export function isChartModificationRequest(question: string): boolean {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const modificationPatterns = [
    /modifie.*graphi|change.*graphi|transforme.*graphi/,
    /en (camembert|barres?|courbe|ligne|histogramme|radar|spider|toile|araignee|aire|area)/,
    /au format (camembert|barres?|courbe|ligne|histogramme|pie|bar|radar|spider|toile|aire|area)/,
    /le meme en|pareil (mais )?en|refais.*(en|au format)/,
    /format (camembert|barres?|courbe|pie|bar|histogramme|radar|spider|toile|aire|area)/,
    /passe.*en (camembert|barres?|courbe|ligne|radar|spider|toile|aire|area)/,
    /je.*attendais.*camembert|je.*attendais.*barres/,
    /un\s+autre(\s+(format|type|graphique))?(\s|$)/,
    /autre\s+(format|type|graphique)/,
  ];
  return modificationPatterns.some(p => p.test(q));
}

// Construire le contexte des graphiques précédents pour le LLM
export function buildChartContextForLLM(): string {
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

    // Calculer le niveau de risque
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (daysSinceVisit > 90 || p.metrics.loyaltyScore < 4) riskLevel = 'high';
    else if (daysSinceVisit > 60 || p.metrics.loyaltyScore < 6) riskLevel = 'medium';

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
          case 'eq':
            // Case-insensitive comparison for strings
            if (typeof value === 'string' && typeof filter.value === 'string') {
              return value.toLowerCase() === filter.value.toLowerCase();
            }
            return value === filter.value;
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
    const grouped = new Map<string, typeof filteredData>();

    for (const item of filteredData) {
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

    // Limiter les résultats
    if (query.limit) {
      return results.slice(0, query.limit);
    }

    return results;
  }

  // Sans groupBy, retourner les items individuels (top N)
  const results: ChartDataPoint[] = filteredData.map(item => {
    const point: ChartDataPoint = {
      name: `${item.title} ${item.firstName} ${item.lastName}`
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

// Parser la réponse JSON du LLM avec meilleure tolérance
export function parseLLMChartResponse(response: string): ChartSpec | null {
  try {
    // Essayer d'extraire le JSON du markdown
    let jsonStr = response;

    // Pattern 1: ```json ... ```
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Pattern 2: ``` ... ```
      const codeMatch = response.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        jsonStr = codeMatch[1];
      } else {
        // Pattern 3: JSON brut commençant par {
        const rawMatch = response.match(/\{[\s\S]*\}/);
        if (rawMatch) {
          jsonStr = rawMatch[0];
        }
      }
    }

    // Nettoyer le JSON
    jsonStr = jsonStr.trim();

    // Parser le JSON
    const parsed = JSON.parse(jsonStr);

    // Valider et normaliser la structure
    if (!parsed.chartType || !parsed.query || !parsed.query.metrics) {
      console.error('Invalid chart spec structure:', parsed);
      return null;
    }

    // S'assurer que les metrics ont le bon format
    if (!Array.isArray(parsed.query.metrics)) {
      parsed.query.metrics = [parsed.query.metrics];
    }

    // S'assurer que les filtres sont un tableau
    if (parsed.query.filters && !Array.isArray(parsed.query.filters)) {
      parsed.query.filters = [parsed.query.filters];
    }

    // Normaliser le chartType
    const validTypes = ['bar', 'pie', 'line', 'composed', 'radar', 'area'];
    if (!validTypes.includes(parsed.chartType)) {
      parsed.chartType = 'bar';
    }

    // Normaliser groupBy: "id" → null (pour que les individus montrent leur nom, pas l'ID)
    if (parsed.query.groupBy === 'id' || parsed.query.groupBy === 'firstName' || parsed.query.groupBy === 'lastName') {
      parsed.query.groupBy = null;
    }

    return parsed as ChartSpec;
  } catch (error) {
    console.error('Failed to parse LLM chart response:', error);
    console.error('Raw response:', response);
    return null;
  }
}

// Générer un graphique complet à partir d'une spec
export function generateChartFromSpec(spec: ChartSpec): ChartResult {
  const data = executeDataQuery(spec.query);

  // Toujours générer les insights à partir des données RÉELLES (pas ceux du LLM qui ne voit pas les données)
  const insights = generateAutoInsights(spec, data);
  const suggestions = generateAutoSuggestions(spec);

  return {
    spec,
    data,
    insights,
    suggestions,
    rawQuery: JSON.stringify(spec.query, null, 2)
  };
}

// Générer des insights automatiques améliorés — basés sur les DONNÉES RÉELLES
function generateAutoInsights(spec: ChartSpec, data: ChartDataPoint[]): string[] {
  const insights: string[] = [];

  if (data.length === 0) {
    return ['Aucune donnée ne correspond aux critères'];
  }

  const firstMetric = spec.query.metrics[0]?.name;
  if (!firstMetric) return insights;

  const suffix = spec.formatting?.valueSuffix || '';

  // Top item with actual value
  const topItem = data[0];
  const topValue = topItem?.[firstMetric];
  if (topItem && topValue !== undefined) {
    insights.push(`**${topItem.name}** arrive en tête avec ${topValue}${suffix}`);
  }

  // Pie chart: show top 2-3 shares
  if (spec.chartType === 'pie' && data.length > 1) {
    const total = data.reduce((sum, d) => sum + ((d[firstMetric] as number) || 0), 0);
    if (total > 0) {
      const top3 = data.slice(0, 3);
      const shares = top3.map(d => {
        const pct = Math.round(((d[firstMetric] as number || 0) / total) * 100);
        return `${d.name} (${pct}%)`;
      });
      insights.push(`Répartition : ${shares.join(', ')}`);
      const topNPct = Math.round(top3.reduce((s, d) => s + ((d[firstMetric] as number) || 0), 0) / total * 100);
      if (data.length > 3) {
        insights.push(`Les ${top3.length} premiers représentent ${topNPct}% du total`);
      }
    }
  }

  // Bar/composed: show range and total
  if ((spec.chartType === 'bar' || spec.chartType === 'composed') && data.length > 1) {
    const lastItem = data[data.length - 1];
    const lastValue = lastItem?.[firstMetric] as number;
    if (topValue && lastValue && lastValue > 0) {
      const ratio = Math.round((topValue as number) / lastValue);
      if (ratio > 1 && ratio < 200) {
        insights.push(`Écart de x${ratio} entre **${topItem.name}** (${topValue}${suffix}) et **${lastItem.name}** (${lastValue}${suffix})`);
      }
    }
    // Total
    const total = data.reduce((sum, d) => sum + ((d[firstMetric] as number) || 0), 0);
    if (total > 0 && spec.query.metrics[0]?.aggregation === 'sum') {
      const formattedTotal = spec.query.metrics[0]?.format === 'k'
        ? `${Math.round(total)}K L` : `${total}`;
      insights.push(`Total cumulé : ${formattedTotal}`);
    }
  }

  // KOL vs Autres comparison
  if (spec.query.groupBy === 'isKOL') {
    const kolData = data.find(d => d.name.includes('KOL'));
    const autresData = data.find(d => d.name.includes('Autres'));
    if (kolData && autresData) {
      const kolValue = kolData[firstMetric] as number;
      const autresValue = autresData[firstMetric] as number;
      const total = kolValue + autresValue;
      if (total > 0) {
        insights.push(`Les KOLs représentent ${Math.round(kolValue / total * 100)}% du ${firstMetric.toLowerCase()}`);
      }
    }
  }

  // Count-specific: total items
  if (spec.query.metrics[0]?.aggregation === 'count' && data.length > 0) {
    const total = data.reduce((sum, d) => sum + ((d[firstMetric] as number) || 0), 0);
    insights.push(`${total} praticiens au total répartis en ${data.length} catégories`);
  }

  return insights;
}

// Générer des suggestions de suivi améliorées
function generateAutoSuggestions(spec: ChartSpec): string[] {
  const suggestions: string[] = [];
  const groupBy = spec.query.groupBy;
  const hasKOLFilter = spec.query.filters?.some(f => f.field === 'isKOL');

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
    // Top N individuel
    suggestions.push('Répartition par ville');
    suggestions.push('Comparaison KOLs vs autres');
  }

  // Suggestions génériques si vide
  if (!suggestions.length) {
    suggestions.push('Analyse par ville');
    suggestions.push('Répartition par segment');
  }

  return suggestions;
}

// Créer le contexte de données pour le LLM
export function getDataContextForLLM(): string {
  const stats = DataService.getGlobalStats();
  const practitioners = DataService.getAllPractitioners();

  // Compter les KOLs par spécialité
  const kolsBySpecialty = practitioners
    .filter(p => p.metrics.isKOL)
    .reduce((acc, p) => {
      acc[p.specialty] = (acc[p.specialty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  // Volume par ville (pour que le LLM puisse donner des insights précis)
  const cityStats = practitioners.reduce((acc, p) => {
    const city = p.address.city;
    if (!acc[city]) acc[city] = { count: 0, volume: 0, kols: 0 };
    acc[city].count++;
    acc[city].volume += p.metrics.volumeL;
    if (p.metrics.isKOL) acc[city].kols++;
    return acc;
  }, {} as Record<string, { count: number; volume: number; kols: number }>);

  const citySummary = Object.entries(cityStats)
    .sort((a, b) => b[1].volume - a[1].volume)
    .map(([city, s]) => `  - ${city}: ${s.count} praticiens, ${Math.round(s.volume / 1000)}K L, ${s.kols} KOL(s)`)
    .join('\n');

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

VOLUMES PAR VILLE :
${citySummary}
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
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Extraire les paramètres
  const params = extractQueryParameters(question);
  const limit = params.limit || 10;

  // Patterns pour détecter le type de requête
  const isTopPrescribers = /top|prescri|volume|plus\s*(de\s*)?volume|qui\s+prescri/i.test(q);
  const isKOLComparison = /kols?\s*(vs|versus|contre|compar|aux autres)/i.test(q);
  const isKOLDistribution = /kols?\s*(par|selon|repartition|distribution)/i.test(q);
  const isKOLOnly = /\bkols?\b/i.test(q) && !isKOLComparison && !isKOLDistribution;
  const isByCity = /par\s*ville|ville/i.test(q);
  const isBySpecialty = /par\s*specialite|specialite|pneumo|generaliste/i.test(q);
  const isBySegment = /par\s*segment|vingtile|segment/i.test(q);
  const isByLoyalty = /fidelite|fidele|loyal/i.test(q);
  const isByRisk = /risque|a\s*risque/i.test(q);
  const wantsPie = /repartition|distribution|camembert|pie|proportion|pourcentage/i.test(q);

  let spec: ChartSpec;
  let confidence = 0.7;

  // ============================================
  // TOP N PRESCRIPTEURS (défaut le plus courant)
  // ============================================
  if (isTopPrescribers && !isByCity && !isBySpecialty && !isKOLDistribution) {
    spec = {
      chartType: 'bar',
      title: `Top ${limit} prescripteurs par volume`,
      description: `Les ${limit} praticiens qui prescrivent le plus en volume d'oxygène`,
      query: {
        source: 'practitioners',
        filters: params.wantsKOL ? [{ field: 'isKOL', operator: 'eq', value: true }] : [],
        metrics: [
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' },
          { name: 'Fidélité', field: 'loyaltyScore', aggregation: 'avg' }
        ],
        sortBy: 'Volume (K L)',
        sortOrder: 'desc',
        limit: limit
      },
      formatting: {
        xAxisLabel: 'Praticien',
        yAxisLabel: 'Volume (K L/an)',
        showLegend: true
      }
    };
    confidence = 0.9;
  }
  // ============================================
  // COMPARAISON KOLs vs AUTRES
  // ============================================
  else if (isKOLComparison) {
    spec = {
      chartType: 'bar',
      title: 'Comparaison KOLs vs Autres praticiens',
      description: 'Comparaison du volume entre les Key Opinion Leaders et les autres praticiens',
      query: {
        source: 'practitioners',
        groupBy: 'isKOL',
        metrics: [
          { name: 'Volume Total (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' },
          { name: 'Nombre', field: 'id', aggregation: 'count' }
        ],
        sortBy: 'Volume Total (K L)',
        sortOrder: 'desc'
      },
      formatting: {
        xAxisLabel: 'Catégorie',
        yAxisLabel: 'Volume (K L)',
        showLegend: true
      }
    };
    confidence = 0.95;
  }
  // ============================================
  // DISTRIBUTION KOLs PAR SPÉCIALITÉ
  // ============================================
  else if (isKOLDistribution && isBySpecialty) {
    spec = {
      chartType: wantsPie ? 'pie' : 'bar',
      title: 'Répartition des KOLs par spécialité',
      description: 'Distribution des Key Opinion Leaders selon leur spécialité médicale',
      query: {
        source: 'practitioners',
        filters: [{ field: 'isKOL', operator: 'eq', value: true }],
        groupBy: 'specialty',
        metrics: [
          { name: 'Nombre de KOLs', field: 'id', aggregation: 'count' }
        ],
        sortBy: 'Nombre de KOLs',
        sortOrder: 'desc'
      },
      formatting: {
        showLegend: true
      }
    };
    confidence = 0.95;
  }
  // ============================================
  // PAR VILLE
  // ============================================
  else if (isByCity) {
    spec = {
      chartType: wantsPie ? 'pie' : 'bar',
      title: params.wantsKOL ? 'KOLs par ville' : 'Praticiens par ville',
      description: 'Répartition géographique des praticiens',
      query: {
        source: 'practitioners',
        filters: params.wantsKOL ? [{ field: 'isKOL', operator: 'eq', value: true }] : [],
        groupBy: 'city',
        metrics: [
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' },
          { name: 'Nombre', field: 'id', aggregation: 'count' }
        ],
        sortBy: 'Volume (K L)',
        sortOrder: 'desc',
        limit: limit
      },
      formatting: {
        xAxisLabel: 'Ville',
        yAxisLabel: 'Volume (K L)',
        showLegend: true
      }
    };
    confidence = 0.85;
  }
  // ============================================
  // PAR SPÉCIALITÉ
  // ============================================
  else if (isBySpecialty) {
    spec = {
      chartType: wantsPie ? 'pie' : 'bar',
      title: 'Répartition par spécialité',
      description: 'Distribution des praticiens par spécialité médicale',
      query: {
        source: 'practitioners',
        filters: params.wantsKOL ? [{ field: 'isKOL', operator: 'eq', value: true }] : [],
        groupBy: 'specialty',
        metrics: [
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' },
          { name: 'Nombre', field: 'id', aggregation: 'count' }
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
  // PAR SEGMENT (VINGTILE)
  // ============================================
  else if (isBySegment) {
    spec = {
      chartType: wantsPie ? 'pie' : 'bar',
      title: 'Répartition par segment de potentiel',
      description: 'Distribution des praticiens par vingtile',
      query: {
        source: 'practitioners',
        groupBy: 'vingtileBucket',
        metrics: [
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' },
          { name: 'Nombre', field: 'id', aggregation: 'count' }
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
  // PAR FIDÉLITÉ
  // ============================================
  else if (isByLoyalty) {
    spec = {
      chartType: wantsPie ? 'pie' : 'bar',
      title: 'Distribution par niveau de fidélité',
      description: 'Répartition des praticiens selon leur score de fidélité',
      query: {
        source: 'practitioners',
        groupBy: 'loyaltyBucket',
        metrics: [
          { name: 'Nombre', field: 'id', aggregation: 'count' },
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' }
        ],
        sortBy: 'Nombre',
        sortOrder: 'desc'
      },
      formatting: {
        showLegend: true
      }
    };
    confidence = 0.85;
  }
  // ============================================
  // PAR RISQUE
  // ============================================
  else if (isByRisk) {
    spec = {
      chartType: 'pie',
      title: 'Répartition par niveau de risque',
      description: 'Distribution des praticiens selon leur niveau de risque de désengagement',
      query: {
        source: 'practitioners',
        groupBy: 'riskLevel',
        metrics: [
          { name: 'Nombre', field: 'id', aggregation: 'count' },
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' }
        ],
        sortBy: 'Nombre',
        sortOrder: 'desc'
      },
      formatting: {
        showLegend: true
      }
    };
    confidence = 0.85;
  }
  // ============================================
  // KOLs SEULEMENT (liste ou stats)
  // ============================================
  else if (isKOLOnly) {
    spec = {
      chartType: 'bar',
      title: `Top ${limit} KOLs par volume`,
      description: 'Les Key Opinion Leaders les plus importants en volume',
      query: {
        source: 'practitioners',
        filters: [{ field: 'isKOL', operator: 'eq', value: true }],
        metrics: [
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' },
          { name: 'Fidélité', field: 'loyaltyScore', aggregation: 'avg' }
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
  // DÉFAUT: TOP PRESCRIPTEURS
  // ============================================
  else {
    spec = {
      chartType: 'bar',
      title: `Top ${limit} prescripteurs par volume`,
      description: `Les ${limit} praticiens avec le plus grand volume de prescription`,
      query: {
        source: 'practitioners',
        metrics: [
          { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' },
          { name: 'Fidélité', field: 'loyaltyScore', aggregation: 'avg' }
        ],
        sortBy: 'Volume (K L)',
        sortOrder: 'desc',
        limit: limit
      },
      formatting: {
        xAxisLabel: 'Praticien',
        yAxisLabel: 'Volume (K L/an)',
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

// ============================================
// CHART TYPE CYCLING
// ============================================
const ALL_CHART_TYPES: ChartSpec['chartType'][] = ['bar', 'pie', 'radar', 'line', 'area', 'composed'];

/** Returns the next chart type in the cycling order */
export function getNextChartType(current: ChartSpec['chartType']): ChartSpec['chartType'] {
  const idx = ALL_CHART_TYPES.indexOf(current);
  return ALL_CHART_TYPES[(idx + 1) % ALL_CHART_TYPES.length];
}

/** Detects "un autre format" / "un autre" without specifying which format */
export function isGenericFormatChangeRequest(question: string): boolean {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return /^un\s+autre(\s+(format|type|graphique))?$/.test(q) ||
    /autre\s+(format|type|graphique)/.test(q);
}

// ============================================
// PRACTITIONER TIME SERIES DETECTION
// ============================================

/** Detects if the question asks for a practitioner's time series (volume over time) */
export function detectPractitionerTimeSeries(question: string): { practitionerName: string } | null {
  // Patterns that indicate time series intent — all require BOTH time-series keywords AND a practitioner name
  // Important: patterns use /i for keywords but name capture requires initial uppercase (no /i on name part)
  const timeSeriesPatterns: Array<{ regex: RegExp; nameGroup: number }> = [
    // "évolution/volumes mensuels/prescriptions mensuelles de/du [Dr] Leroy"
    { regex: /(?:evolution|evolutions|volumes?\s+mensuels?|prescriptions?\s+mensuelles?|historique\s+(?:de|des|du)|tendance)\s+(?:de|du|d['']|pour)\s*(?:le\s+)?(?:dr\.?\s+)?([A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ]+(?:\s+[A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ]+)?)/i, nameGroup: 1 },
    // "Dr Leroy ... évolution/au cours du temps/mensuel"
    { regex: /(?:dr\.?\s+)([A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ]+(?:\s+[A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ]+)?)\s+.*(?:evolution|au\s+cours|temps|mensuel|mois\s+par\s+mois|sur\s+\d+\s+mois)/i, nameGroup: 1 },
    // "prescriptions de/du [Dr] Leroy au cours du temps"
    { regex: /prescriptions?\s+(?:de|du|d[''])\s*(?:le\s+)?(?:dr\.?\s+)?([A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ]+(?:\s+[A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ]+)?)\s+(?:au\s+cours|dans\s+le\s+temps|sur\s+\d+|mois)/i, nameGroup: 1 },
    // "volumes du Dr Leroy" (without explicit time keyword — assumes time series for volume of a specific Dr)
    { regex: /volumes?\s+(?:de|du|d[''])\s*(?:le\s+)?dr\.?\s+([A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ]+(?:\s+[A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ]+)?)/, nameGroup: 1 },
  ];

  // Common French words that should NOT be treated as practitioner names
  const excluded = new Set([
    'Quelles', 'Quels', 'Quel', 'Quelle', 'Comment', 'Pourquoi', 'Est',
    'Les', 'Des', 'Pour', 'Dans', 'Sur', 'Avec', 'Tous', 'Toutes',
    'Mon', 'Mes', 'Leur', 'Leurs', 'Notre', 'Nos', 'Votre', 'Vos',
    'Ville', 'Villes', 'France', 'Lyon', 'Paris', 'Grenoble',
    'Volume', 'Volumes', 'Total', 'Mois', 'Analyse', 'Graphique',
    'Prescripteurs', 'Prescripteur', 'Praticiens', 'Praticien',
  ]);

  for (const { regex, nameGroup } of timeSeriesPatterns) {
    const match = question.match(regex);
    if (match && match[nameGroup]) {
      const name = match[nameGroup].trim();
      if (!excluded.has(name)) {
        return { practitionerName: name };
      }
    }
  }

  return null;
}

/** Detects if the user wants to visualize previously discussed data ("montre les avec un graphique") */
export function isContextualChartRequest(question: string): boolean {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /(?:montre|affiche|visualise|fais).*(?:les|le|la|ces|cette|ce).*(?:graphique|chart|graph|courbe|diagramme)/i.test(q) ||
    /(?:montre|affiche|visualise|fais).*(?:avec|en|sous\s+forme)\s+(?:un\s+)?(?:graphique|chart|graph|courbe|diagramme)/i.test(q) ||
    /(?:en|sous\s+forme\s+de?)\s+graphique/i.test(q);
}
