/**
 * Agentic Chart Engine - Talk to My Data
 *
 * Ce moteur permet au LLM de générer dynamiquement des visualisations
 * en écrivant des spécifications de requêtes qui sont exécutées sur les données.
 *
 * Approche agentique : le LLM "code" les graphiques à la demande.
 */

import { DataService } from './dataService';

// Types pour les spécifications de graphiques générées par le LLM
export interface ChartSpec {
  chartType: 'bar' | 'pie' | 'line' | 'composed';
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
`;

// Prompt système pour la génération de graphiques
export const CHART_GENERATION_PROMPT = `Tu es un expert en visualisation de données pour un CRM pharmaceutique.

${DATA_SCHEMA}

## Ta Mission
Analyse la demande de l'utilisateur et génère une spécification JSON pour créer le graphique approprié.

## Format de Sortie
Réponds UNIQUEMENT avec un bloc JSON valide suivant ce format :

\`\`\`json
{
  "chartType": "bar" | "pie" | "line" | "composed",
  "title": "Titre du graphique",
  "description": "Brève description de ce que montre le graphique",
  "query": {
    "source": "practitioners",
    "filters": [
      { "field": "specialty", "operator": "eq", "value": "Pneumologue" }
    ],
    "groupBy": "city",
    "metrics": [
      { "name": "Volume (K L)", "field": "volumeL", "aggregation": "sum", "format": "k" },
      { "name": "Fidélité moy.", "field": "loyaltyScore", "aggregation": "avg" }
    ],
    "sortBy": "Volume (K L)",
    "sortOrder": "desc",
    "limit": 10
  },
  "formatting": {
    "showLegend": true,
    "xAxisLabel": "Ville",
    "yAxisLabel": "Volume"
  },
  "insights": [
    "Point clé 1 basé sur les données",
    "Point clé 2 basé sur les données"
  ],
  "suggestions": [
    "Question de suivi suggérée 1",
    "Question de suivi suggérée 2"
  ]
}
\`\`\`

## Règles
1. Choisis le type de graphique le plus adapté :
   - pie : pour les répartitions/proportions (max 6-8 catégories)
   - bar : pour les comparaisons, classements, top N
   - line : pour les évolutions temporelles
   - composed : pour combiner barres et lignes

2. Limite les données :
   - Top 10 maximum pour les barres
   - 6-8 catégories max pour les camemberts

3. Ajoute toujours des insights pertinents basés sur ce que les données pourraient révéler

4. Suggère des questions de suivi pour approfondir l'analyse

5. Si la demande est ambiguë, choisis l'interprétation la plus utile pour un commercial pharma
`;

// Exécuter une requête de données
export function executeDataQuery(query: DataQuery): ChartDataPoint[] {
  let practitioners = DataService.getAllPractitioners();
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
          key = item.isKOL ? 'KOLs' : 'Autres';
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
      name: `${item.lastName}`
    };

    for (const metric of query.metrics) {
      let value = (item as Record<string, unknown>)[metric.field] as number || 0;
      if (metric.format === 'k') value = Math.round(value / 1000);
      point[metric.name] = Math.round(value * 10) / 10;
    }

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

// Parser la réponse JSON du LLM
export function parseLLMChartResponse(response: string): ChartSpec | null {
  try {
    // Extraire le JSON du markdown si présent
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;

    // Parser le JSON
    const parsed = JSON.parse(jsonStr);

    // Valider la structure minimale
    if (!parsed.chartType || !parsed.query || !parsed.query.metrics) {
      console.error('Invalid chart spec structure');
      return null;
    }

    return parsed as ChartSpec;
  } catch (error) {
    console.error('Failed to parse LLM chart response:', error);
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

// Générer des insights automatiques
function generateAutoInsights(spec: ChartSpec, data: ChartDataPoint[]): string[] {
  const insights: string[] = [];

  if (data.length === 0) {
    return ['Aucune donnée ne correspond aux critères'];
  }

  const firstMetric = spec.query.metrics[0]?.name;
  if (!firstMetric) return insights;

  // Top item
  const topItem = data[0];
  if (topItem) {
    insights.push(`**${topItem.name}** arrive en tête avec ${topItem[firstMetric]} ${spec.formatting?.valueSuffix || ''}`);
  }

  // Total ou moyenne selon le contexte
  if (spec.chartType === 'pie' && data.length > 0) {
    const total = data.reduce((sum, d) => sum + (d[firstMetric] as number || 0), 0);
    const topShare = Math.round(((topItem[firstMetric] as number) / total) * 100);
    insights.push(`${topItem.name} représente ${topShare}% du total`);
  }

  // Comparaison premier/dernier
  if (data.length > 2) {
    const lastItem = data[data.length - 1];
    const ratio = Math.round((topItem[firstMetric] as number) / (lastItem[firstMetric] as number || 1));
    if (ratio > 1) {
      insights.push(`Écart de x${ratio} entre ${topItem.name} et ${lastItem.name}`);
    }
  }

  return insights;
}

// Générer des suggestions de suivi
function generateAutoSuggestions(spec: ChartSpec): string[] {
  const suggestions: string[] = [];

  const groupBy = spec.query.groupBy;

  if (groupBy === 'city') {
    suggestions.push('Détail des KOLs par ville');
    suggestions.push('Praticiens à risque par ville');
  } else if (groupBy === 'specialty') {
    suggestions.push('Top 10 par spécialité');
    suggestions.push('Fidélité par spécialité');
  } else if (groupBy === 'vingtileBucket' || groupBy === 'vingtile') {
    suggestions.push('Détail du segment Top');
    suggestions.push('KOLs par segment');
  } else if (groupBy === 'riskLevel') {
    suggestions.push('Liste des praticiens à risque élevé');
    suggestions.push('Actions prioritaires');
  }

  // Suggestions génériques
  if (!suggestions.length) {
    suggestions.push('Répartition par ville');
    suggestions.push('Analyse par segment');
  }

  return suggestions;
}

// Créer le contexte de données pour le LLM
export function getDataContextForLLM(): string {
  const stats = DataService.getGlobalStats();
  const cities = [...new Set(DataService.getAllPractitioners().map(p => p.address.city))];

  return `
CONTEXTE DONNÉES ACTUELLES :
- ${stats.totalPractitioners} praticiens (${stats.pneumologues} pneumologues, ${stats.generalistes} généralistes)
- ${stats.totalKOLs} KOLs
- Volume total : ${Math.round(stats.totalVolume / 1000)}K L/an
- Fidélité moyenne : ${stats.averageLoyalty.toFixed(1)}/10
- Villes présentes : ${cities.slice(0, 10).join(', ')}${cities.length > 10 ? '...' : ''}
`;
}

// Couleurs par défaut pour les graphiques
export const DEFAULT_CHART_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
];
