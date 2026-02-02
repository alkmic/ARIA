/**
 * Service d'Intelligence Conversationnelle
 *
 * Ce service utilise une approche agentique où le LLM :
 * 1. Analyse la question pour comprendre l'intent
 * 2. Décide du type de réponse (graphique, texte, données)
 * 3. Génère la réponse appropriée
 */

import { DataService } from './dataService';
import {
  type ChartSpec,
  type ChartResult,
  executeCompoundQuery,
  generateChartFromSpec
} from './agenticChartEngine';

// Interface pour le format de réponse du LLM (structure aplatie)
interface LLMChartSpec {
  chartType?: 'bar' | 'pie' | 'line' | 'composed';
  title?: string;
  groupBy?: string;
  metrics?: string[];
  filters?: Array<{ field: string; value: unknown }>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  suggestions?: string[];
}

// Types pour l'analyse d'intent
export type ResponseIntent =
  | 'chart_simple'      // Graphique simple (top N, répartition par X)
  | 'chart_compound'    // Graphique composé (top N puis grouper par Y)
  | 'data_lookup'       // Recherche d'information sur un praticien/entité
  | 'text_response'     // Réponse textuelle générale
  | 'comparison'        // Comparaison entre entités
  | 'list'              // Liste de praticiens selon critères

export interface IntentAnalysis {
  intent: ResponseIntent;
  confidence: number;

  // Pour les graphiques (format LLM aplati)
  chartSpec?: LLMChartSpec;
  compoundQuery?: {
    topN: number;
    sortField: string;
    groupByField: string;
  };

  // Pour les recherches de données
  searchTerms?: string[];
  practitionerName?: string;
  dataType?: 'news' | 'certifications' | 'visits' | 'profile' | 'all';

  // Pour les listes
  listCriteria?: {
    filter?: string;
    sortBy?: string;
    limit?: number;
  };

  // Résumé de la compréhension
  understanding: string;
}

export interface IntelligentResponse {
  type: 'chart' | 'text' | 'mixed';

  // Pour les graphiques
  chart?: ChartResult;

  // Pour le texte
  textContent?: string;

  // Données contextuelles trouvées
  contextData?: {
    practitioners?: ReturnType<typeof DataService.getAllPractitioners>;
    news?: Array<{ title: string; date: string; source: string }>;
    stats?: Record<string, unknown>;
  };

  // Suggestions de suivi
  suggestions?: string[];
}

// Prompt pour l'analyse d'intent
export const INTENT_ANALYSIS_PROMPT = `Tu es un assistant IA expert en analyse de questions pour un CRM pharmaceutique.

Analyse la question de l'utilisateur et détermine :
1. Le TYPE de réponse attendue (graphique, texte, recherche de données)
2. Les PARAMÈTRES spécifiques de la requête
3. Comment y répondre au mieux

## Types de réponses possibles

### chart_simple
Pour les demandes de visualisation directes :
- "Top 20 prescripteurs par volume"
- "Répartition par ville"
- "Distribution par fidélité"

### chart_compound
Pour les visualisations avec filtrage puis regroupement :
- "Répartition par ville des 25 meilleurs prescripteurs"
- "Distribution par spécialité des top 30"

### data_lookup
Pour les recherches d'information sur une entité :
- "Quelles sont les actualités du Dr Martin ?"
- "Informations sur le Dr Dupont"
- "Dernières visites de Marie Robert"

### text_response
Pour les questions générales ou conseils :
- "Comment améliorer ma fidélité client ?"
- "Que dois-je faire aujourd'hui ?"

### comparison
Pour les comparaisons :
- "Compare les KOLs aux autres praticiens"
- "Différence entre pneumologues et généralistes"

### list
Pour les listes filtrées :
- "Liste des praticiens à risque"
- "Tous les KOLs non visités depuis 60 jours"

## Format de réponse OBLIGATOIRE

Réponds UNIQUEMENT avec ce JSON :

\`\`\`json
{
  "intent": "chart_simple|chart_compound|data_lookup|text_response|comparison|list",
  "confidence": 0.95,
  "understanding": "Brève description de ce que l'utilisateur demande",

  // Pour chart_simple ou comparison
  "chartSpec": {
    "chartType": "bar|pie|line|composed",
    "title": "Titre du graphique",
    "groupBy": "city|specialty|vingtileBucket|loyaltyBucket|riskLevel|isKOL|null",
    "metrics": ["volume", "count", "loyalty"],
    "filters": [{"field": "isKOL", "value": true}],
    "sortBy": "volume|count|loyalty",
    "sortOrder": "desc|asc",
    "limit": 10
  },

  // Pour chart_compound
  "compoundQuery": {
    "topN": 25,
    "sortField": "volumeL",
    "groupByField": "city|specialty"
  },

  // Pour data_lookup
  "searchTerms": ["Robert", "Denis"],
  "practitionerName": "Dr Robert Denis",
  "dataType": "news|certifications|visits|profile|all",

  // Pour list
  "listCriteria": {
    "filter": "isKOL|atRisk|undervisited",
    "sortBy": "volume|loyalty|lastVisit",
    "limit": 20
  },

  // Suggestions de questions de suivi
  "suggestions": [
    "Question de suivi 1",
    "Question de suivi 2"
  ]
}
\`\`\`
`;

// Prompt pour générer une réponse textuelle basée sur les données
export const TEXT_RESPONSE_PROMPT = `Tu es un assistant IA pour un délégué pharmaceutique Air Liquide Healthcare.

DONNÉES CONTEXTUELLES TROUVÉES :
{CONTEXT_DATA}

QUESTION DE L'UTILISATEUR :
{QUESTION}

Réponds de manière précise et professionnelle en Markdown.
- Utilise les données fournies pour appuyer ta réponse
- Sois concis mais complet
- Si les données ne permettent pas de répondre, dis-le clairement
`;

/**
 * Recherche un praticien par son nom (fuzzy search)
 */
export function searchPractitionerByName(searchTerms: string[]): ReturnType<typeof DataService.getAllPractitioners> {
  const allPractitioners = DataService.getAllPractitioners();

  // Normaliser les termes de recherche
  const normalizedTerms = searchTerms.map(t =>
    t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );

  return allPractitioners.filter(p => {
    const fullName = `${p.title} ${p.firstName} ${p.lastName}`.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Vérifier si tous les termes sont présents
    return normalizedTerms.every(term => fullName.includes(term));
  });
}

/**
 * Récupère les actualités d'un praticien
 */
export function getPractitionerNews(practitionerId: string): Array<{ title: string; date: string; source: string; summary?: string }> {
  const practitioner = DataService.getPractitionerById(practitionerId);
  if (!practitioner) return [];

  // Les actualités sont dans le champ 'news' du praticien
  const news = (practitioner as unknown as { news?: Array<{ title: string; date: string; source: string; summary?: string }> }).news || [];

  return news.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Génère le contexte complet d'un praticien pour le LLM
 */
export function getPractitionerFullContext(practitionerId: string): string {
  const p = DataService.getPractitionerById(practitionerId);
  if (!p) return 'Praticien non trouvé';

  const news = getPractitionerNews(practitionerId);
  const newsText = news.length > 0
    ? news.map(n => `- ${n.date}: ${n.title} (${n.source})`).join('\n')
    : 'Aucune actualité récente';

  const lastVisit = p.lastVisitDate
    ? new Date(p.lastVisitDate).toLocaleDateString('fr-FR')
    : 'Jamais visité';

  return `
## ${p.title} ${p.firstName} ${p.lastName}
- **Spécialité** : ${p.specialty}
- **Ville** : ${p.address.city}
- **Volume annuel** : ${Math.round(p.metrics.volumeL / 1000)}K L/an
- **Score de fidélité** : ${p.metrics.loyaltyScore}/10
- **Vingtile** : V${p.metrics.vingtile}
- **KOL** : ${p.metrics.isKOL ? 'Oui' : 'Non'}
- **Dernière visite** : ${lastVisit}

### Actualités récentes
${newsText}
`;
}

/**
 * Parse la réponse JSON d'analyse d'intent
 */
export function parseIntentAnalysis(response: string): IntentAnalysis | null {
  try {
    // Extraire le JSON
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                      response.match(/```\s*([\s\S]*?)\s*```/) ||
                      response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) return null;

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    return {
      intent: parsed.intent || 'text_response',
      confidence: parsed.confidence || 0.5,
      understanding: parsed.understanding || '',
      chartSpec: parsed.chartSpec,
      compoundQuery: parsed.compoundQuery,
      searchTerms: parsed.searchTerms,
      practitionerName: parsed.practitionerName,
      dataType: parsed.dataType,
      listCriteria: parsed.listCriteria
    };
  } catch (error) {
    console.error('Failed to parse intent analysis:', error);
    return null;
  }
}

/**
 * Convertit l'analyse d'intent en ChartSpec exécutable
 */
export function intentToChartSpec(analysis: IntentAnalysis): ChartSpec | null {
  if (!analysis.chartSpec) return null;

  const cs = analysis.chartSpec;

  // Construire les métriques
  const metrics: ChartSpec['query']['metrics'] = [];
  if (cs.metrics?.includes('volume')) {
    metrics.push({ name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' });
  }
  if (cs.metrics?.includes('count')) {
    metrics.push({ name: 'Nombre', field: 'id', aggregation: 'count' });
  }
  if (cs.metrics?.includes('loyalty')) {
    metrics.push({ name: 'Fidélité', field: 'loyaltyScore', aggregation: 'avg' });
  }
  if (metrics.length === 0) {
    metrics.push({ name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' });
  }

  // Construire les filtres
  const filters: ChartSpec['query']['filters'] = [];
  if (cs.filters) {
    for (const f of cs.filters) {
      filters.push({
        field: f.field,
        operator: 'eq',
        value: f.value as string | number | boolean | string[] | number[]
      });
    }
  }

  return {
    chartType: (cs.chartType as 'bar' | 'pie' | 'line' | 'composed') || 'bar',
    title: cs.title || 'Graphique',
    description: analysis.understanding,
    query: {
      source: 'practitioners',
      filters: filters.length > 0 ? filters : undefined,
      groupBy: cs.groupBy || undefined,
      metrics,
      sortBy: cs.sortBy === 'volume' ? 'Volume (K L)' :
              cs.sortBy === 'count' ? 'Nombre' :
              cs.sortBy === 'loyalty' ? 'Fidélité' : 'Volume (K L)',
      sortOrder: (cs.sortOrder as 'asc' | 'desc') || 'desc',
      limit: cs.limit
    },
    formatting: {
      showLegend: true
    }
  };
}

/**
 * Génère une réponse basée sur l'analyse d'intent
 * Cette fonction est appelée APRÈS l'analyse LLM
 */
export function executeIntent(analysis: IntentAnalysis): IntelligentResponse {
  switch (analysis.intent) {
    case 'chart_simple':
    case 'comparison': {
      const spec = intentToChartSpec(analysis);
      if (spec) {
        const chart = generateChartFromSpec(spec);
        return {
          type: 'chart',
          chart,
          suggestions: analysis.chartSpec?.suggestions as string[] || chart.suggestions
        };
      }
      break;
    }

    case 'chart_compound': {
      if (analysis.compoundQuery) {
        const { topN, sortField, groupByField } = analysis.compoundQuery;
        const data = executeCompoundQuery(topN, sortField, groupByField);

        const groupByLabel = groupByField === 'city' ? 'ville' :
          groupByField === 'specialty' ? 'spécialité' : 'segment';

        const chart: ChartResult = {
          spec: {
            chartType: data.length <= 6 ? 'pie' : 'bar',
            title: `Répartition par ${groupByLabel} des Top ${topN} prescripteurs`,
            description: analysis.understanding,
            query: {
              source: 'practitioners',
              groupBy: groupByField,
              metrics: [
                { name: 'Nombre', field: 'id', aggregation: 'count' },
                { name: 'Volume (K L)', field: 'volumeL', aggregation: 'sum', format: 'k' }
              ]
            }
          },
          data,
          insights: [
            `**${data[0]?.name}** concentre ${data[0]?.['Nombre']} des ${topN} meilleurs`,
            `Répartis sur ${data.length} ${groupByLabel}s`
          ],
          suggestions: [
            `Détail des praticiens par ${groupByLabel}`,
            `Top ${topN} par fidélité`
          ],
          rawQuery: JSON.stringify(analysis.compoundQuery)
        };

        return { type: 'chart', chart };
      }
      break;
    }

    case 'data_lookup': {
      if (analysis.searchTerms && analysis.searchTerms.length > 0) {
        const practitioners = searchPractitionerByName(analysis.searchTerms);

        if (practitioners.length > 0) {
          const p = practitioners[0];
          const news = getPractitionerNews(p.id);
          const context = getPractitionerFullContext(p.id);

          return {
            type: 'mixed',
            textContent: context,
            contextData: {
              practitioners,
              news
            },
            suggestions: [
              `Voir le volume de ${p.lastName} par mois`,
              `Comparer ${p.lastName} aux autres ${p.specialty}s`,
              `Historique des visites de ${p.lastName}`
            ]
          };
        } else {
          return {
            type: 'text',
            textContent: `Aucun praticien trouvé pour "${analysis.searchTerms.join(' ')}". Vérifiez l'orthographe du nom.`,
            suggestions: [
              'Rechercher un autre praticien',
              'Liste de tous les praticiens'
            ]
          };
        }
      }
      break;
    }

    case 'list': {
      const criteria = analysis.listCriteria || {};
      let practitioners = DataService.getAllPractitioners();

      // Appliquer les filtres
      if (criteria.filter === 'isKOL') {
        practitioners = practitioners.filter(p => p.metrics.isKOL);
      } else if (criteria.filter === 'atRisk') {
        practitioners = DataService.getAtRiskPractitioners();
      } else if (criteria.filter === 'undervisited') {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        practitioners = practitioners.filter(p => {
          if (!p.lastVisitDate) return true;
          return new Date(p.lastVisitDate) < sixtyDaysAgo;
        });
      }

      // Trier
      if (criteria.sortBy === 'volume') {
        practitioners.sort((a, b) => b.metrics.volumeL - a.metrics.volumeL);
      } else if (criteria.sortBy === 'loyalty') {
        practitioners.sort((a, b) => b.metrics.loyaltyScore - a.metrics.loyaltyScore);
      }

      // Limiter
      if (criteria.limit) {
        practitioners = practitioners.slice(0, criteria.limit);
      }

      const listText = practitioners.slice(0, 10).map((p, i) =>
        `${i + 1}. **${p.title} ${p.lastName}** (${p.specialty}) - ${Math.round(p.metrics.volumeL / 1000)}K L/an - Fidélité: ${p.metrics.loyaltyScore}/10`
      ).join('\n');

      return {
        type: 'text',
        textContent: `## ${analysis.understanding}\n\n${listText}\n\n*${practitioners.length} praticiens au total*`,
        contextData: { practitioners },
        suggestions: [
          'Voir en graphique',
          'Filtrer par ville',
          'Exporter la liste'
        ]
      };
    }

    default:
      break;
  }

  // Fallback : réponse textuelle
  return {
    type: 'text',
    textContent: analysis.understanding,
    suggestions: ['Reformuler la question', 'Voir les données disponibles']
  };
}

/**
 * Construit le contexte de données pour le prompt
 */
export function buildDataContextForPrompt(): string {
  const stats = DataService.getGlobalStats();
  const kols = DataService.getKOLs();
  const atRisk = DataService.getAtRiskPractitioners();

  return `
DONNÉES DISPONIBLES :
- ${stats.totalPractitioners} praticiens (${stats.pneumologues} pneumo, ${stats.generalistes} généralistes)
- ${stats.totalKOLs} KOLs identifiés
- ${atRisk.length} praticiens à risque
- Volume total : ${Math.round(stats.totalVolume / 1000)}K L/an
- Fidélité moyenne : ${stats.averageLoyalty.toFixed(1)}/10

EXEMPLES DE PRATICIENS :
${kols.slice(0, 3).map(k => `- ${k.title} ${k.firstName} ${k.lastName} (${k.specialty}, ${k.address.city})`).join('\n')}
`;
}
