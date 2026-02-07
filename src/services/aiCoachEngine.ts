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
 * - Fallback local robuste si le LLM est indisponible
 */

import { DataService } from './dataService';
import {
  DATA_SCHEMA,
  parseLLMChartResponse,
  generateChartFromSpec,
  generateChartLocally,
  addToChartHistory,
  getChartHistory,
  type ChartSpec,
  type ChartDataPoint,
  type ChartHistory,
} from './agenticChartEngine';
import { universalSearch } from './universalSearch';
import { generateCoachResponse } from './coachAI';
import { calculatePeriodMetrics, getTopPractitioners } from './metricsCalculator';
import type { Practitioner, UpcomingVisit } from '../types';
import { adaptPractitionerProfile } from './dataAdapter';

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
}

interface RouterResult {
  intent: 'chart_create' | 'chart_modify' | 'data_query' | 'practitioner_info' | 'strategic_advice' | 'follow_up' | 'general';
  needsChart: boolean;
  chartModification: string | null;
  dataScope: 'specific' | 'filtered' | 'aggregated' | 'full';
  searchTerms: {
    names: string[];
    cities: string[];
    specialties: string[];
    isKOL: boolean | null;
  };
  chartParams: {
    chartType: 'bar' | 'pie' | 'line' | 'composed' | null;
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const ROUTER_SYSTEM_PROMPT = `Tu es le routeur intelligent d'ARIA Coach, un assistant CRM pharmaceutique pour Air Liquide Healthcare (oxygénothérapie à domicile).

Analyse la question de l'utilisateur et classifie-la. Retourne UNIQUEMENT un objet JSON valide.

## Intentions Disponibles

1. **chart_create** — L'utilisateur veut une NOUVELLE visualisation (graphique, répartition, top N visuel, comparaison visuelle, camembert, diagramme, barres)
2. **chart_modify** — L'utilisateur veut MODIFIER le dernier graphique (changer type, ajouter métrique, changer nombre d'éléments, filtrer). Requiert un graphique précédent.
3. **data_query** — Question factuelle sur les données (combien, qui, quel, total, moyenne, liste de praticiens)
4. **practitioner_info** — Info spécifique sur UN praticien identifié par nom/prénom
5. **strategic_advice** — Conseil stratégique, planification, priorités, recommandations d'action
6. **follow_up** — Question de suivi sur la réponse précédente
7. **general** — Salutations, remerciements, hors sujet, questions sur l'assistant

## Champs groupBy Disponibles
"city", "specialty", "vingtile", "vingtileBucket", "loyaltyBucket", "riskLevel", "visitBucket", "isKOL"

## Métriques Disponibles
"volume" (volumeL), "loyalty" (loyaltyScore), "count" (nombre), "vingtile", "publications" (publicationsCount)

## Règles de Routage
- Si l'utilisateur mentionne "graphique", "montre-moi", "affiche", "diagramme", "camembert", "barres", "courbe" → intent=chart_create
- Si "en camembert", "change en", "transforme en", "plutôt en", "ajoute", "fais un top X au lieu de" → intent=chart_modify (si graphique précédent)
- Si question contient un nom propre identifiable → intent=practitioner_info
- Si "combien", "qui a le plus", "liste des", "quels sont" → intent=data_query
- Si "priorité", "stratégie", "comment", "recommandation", "que faire", "optimiser" → intent=strategic_advice
- Si référence implicite au contexte précédent sans nouvelle demande claire → intent=follow_up
- Le champ needsChart est true pour chart_create et chart_modify
- dataScope: "specific" pour un praticien ciblé, "filtered" pour un sous-ensemble, "aggregated" pour des stats, "full" pour des questions ouvertes
- responseGuidance: instruction brève pour orienter la réponse (en français)

## Format de Sortie (JSON STRICT)
{
  "intent": "...",
  "needsChart": boolean,
  "chartModification": null ou "description de la modification demandée",
  "dataScope": "specific" | "filtered" | "aggregated" | "full",
  "searchTerms": {
    "names": [],
    "cities": [],
    "specialties": [],
    "isKOL": null ou boolean
  },
  "chartParams": {
    "chartType": null ou "bar" | "pie" | "line" | "composed",
    "groupBy": null ou string,
    "metrics": [],
    "limit": null ou number,
    "sortOrder": null ou "asc" | "desc",
    "filters": []
  },
  "responseGuidance": "..."
}`;

const COACH_SYSTEM_PROMPT = `Tu es **ARIA Coach**, l'assistant stratégique expert pour les délégués pharmaceutiques d'Air Liquide Healthcare, spécialité oxygénothérapie à domicile.

## Ton Identité
Tu combines trois expertises rares :
1. **Expertise médicale** — Pneumologie, oxygénothérapie (O₂ liquide, concentrateurs, extracteurs), pathologies respiratoires chroniques (BPCO, insuffisance respiratoire, apnée du sommeil)
2. **Intelligence commerciale** — Gestion de portefeuille prescripteurs, planification territoriale, analyse concurrentielle, scoring de potentiel (vingtiles), fidélisation KOL
3. **Maîtrise analytique** — Interprétation de données CRM, détection de signaux faibles, modélisation de risque de churn, identification d'opportunités de croissance

## Principes Directeurs
- **Précision data-driven** : Chaque affirmation s'appuie sur des données réelles. Cite les chiffres exacts.
- **Pertinence stratégique** : Priorise par impact business → KOL > Volume élevé > Urgence (risque churn) > Fidélité en baisse
- **Proactivité** : N'attends pas qu'on te pose la bonne question. Si tu détectes un risque ou une opportunité dans les données, signale-le.
- **Concision actionable** : Réponds de façon concise mais complète. Termine par des recommandations concrètes quand c'est pertinent.

## Ce que tu CONNAIS (ton périmètre)
Tu as accès à une base de données CRM contenant :
- Les **praticiens** (médecins prescripteurs) : pneumologues et médecins généralistes
- Leurs **métriques** : volumes de prescription, fidélité, vingtile, statut KOL, risque de churn
- Leurs **coordonnées** : adresse, téléphone, email
- Leurs **publications** et actualités académiques
- L'**historique de visites** et notes de visite
- Les **statistiques du territoire** : objectifs, répartitions géographiques

## Ce que tu NE CONNAIS PAS (hors périmètre)
Tu n'as PAS accès à :
- Le **catalogue de produits** ou la gamme Air Liquide (dispositifs, tarifs, références)
- Les **données de facturation** ou commandes
- Les **données d'autres territoires** ou d'autres délégués
- Les **données en temps réel** (tes données sont un snapshot CRM)
- Les **protocoles médicaux** détaillés ou posologies

**RÈGLE CRITIQUE** : Si l'utilisateur pose une question hors de ton périmètre, dis-le CLAIREMENT et HONNÊTEMENT. Ne fabrique JAMAIS de données. Propose ce que tu peux faire à la place. Exemple : "Je n'ai pas accès au catalogue de produits, mais je peux vous montrer les volumes de prescription par praticien."

## Vocabulaire Métier
- **Vingtile** : Segmentation des prescripteurs de 1 (meilleur) à 20 (plus faible). V1-V5 = Top prescripteurs à prioriser.
- **KOL** (Key Opinion Leader) : Prescripteur influent, leader d'opinion. Impact disproportionné sur les pratiques locales.
- **Fidélité** : Score de 0 à 10 mesurant la régularité des prescriptions en faveur d'Air Liquide.
- **Volume** : Volume annuel de prescription d'oxygène en litres (K L/an).
- **Churn risk** : Risque de perte du prescripteur (low/medium/high).

## Format de Réponse
- Utilise le **Markdown** : **gras** pour les chiffres clés et noms, *italique* pour les nuances
- Structure avec des listes à puces pour la clarté
- Fournis TOUJOURS des chiffres précis quand ils sont disponibles dans le contexte
- Adapte la longueur : court pour les questions simples, détaillé pour les analyses
- Ne mentionne jamais le fonctionnement interne de ton système (routage, contexte, API)
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
  "chartType": "bar" | "pie" | "line" | "composed",
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
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here' || apiKey.length < 10) {
    return null;
  }
  return apiKey;
}

async function callLLM(
  messages: LLMMessage[],
  options: LLMCallOptions = {},
  retries = 1
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const {
    temperature = 0.3,
    maxTokens = 4096,
    jsonMode = false,
  } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const body: Record<string, unknown> = {
        model: MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      };

      if (jsonMode) {
        body.response_format = { type: 'json_object' };
      }

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = (errorData as { error?: { message?: string } }).error?.message ||
          `Groq API error: ${response.status}`;
        // Rate limit or server error — worth retrying
        if (response.status === 429 || response.status >= 500) {
          console.warn(`[AICoachEngine] LLM call attempt ${attempt + 1} failed (${response.status}), ${attempt < retries ? 'retrying...' : 'giving up'}`);
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) {
      if (attempt < retries) {
        console.warn(`[AICoachEngine] LLM call attempt ${attempt + 1} error, retrying...`, err);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      console.error('[AICoachEngine] LLM call failed after retries:', err);
      return null;
    }
  }
  return null;
}

export async function streamLLM(
  messages: LLMMessage[],
  onChunk: (chunk: string) => void,
  options: LLMCallOptions = {}
): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API key not configured');

  const { temperature = 0.3, maxTokens = 4096 } = options;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: { message?: string } }).error?.message ||
      `Groq API error: ${response.status}`
    );
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
    { temperature: 0.0, maxTokens: 800, jsonMode: true }
  );

  if (!result) return null;

  try {
    const parsed = JSON.parse(result);
    // Validate and normalize
    const validIntents = ['chart_create', 'chart_modify', 'data_query', 'practitioner_info', 'strategic_advice', 'follow_up', 'general'];
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
- ${stats.totalKOLs} KOLs | Volume total: ${(stats.totalVolume / 1000).toFixed(0)}K L/an | Fidélité moy: ${stats.averageLoyalty.toFixed(1)}/10
- Visites ${periodLabel}: ${periodMetrics.visitsCount}/${periodMetrics.visitsObjective} (${((periodMetrics.visitsCount / periodMetrics.visitsObjective) * 100).toFixed(0)}%)
- Croissance volume: +${periodMetrics.volumeGrowth.toFixed(1)}% | Nouveaux prescripteurs: ${periodMetrics.newPrescribers}\n`;

  const allPractitioners = DataService.getAllPractitioners();

  switch (routing.dataScope) {
    case 'specific': {
      // Fetch full profiles for specific practitioners
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
            context += DataService.getCompletePractitionerContext(p.id);
          }
        } else {
          // Fuzzy search fallback
          for (const name of routing.searchTerms.names) {
            const fuzzy = DataService.fuzzySearchPractitioner(name);
            if (fuzzy.length > 0) {
              context += `\n## Résultats pour "${name}" (${fuzzy.length})\n`;
              for (const p of fuzzy.slice(0, 5)) {
                context += DataService.getCompletePractitionerContext(p.id);
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
      // Full database context — used for open-ended or complex questions
      const searchResult = universalSearch(question);
      if (searchResult.results.length > 0) {
        context += searchResult.context;
      }

      // Include complete practitioner listing
      context += `\n## Base Complète (${allPractitioners.length} praticiens)\n`;
      allPractitioners.forEach(p => {
        const pubCount = p.news?.filter(n => n.type === 'publication').length || 0;
        context += `- ${p.title} ${p.firstName} ${p.lastName} | ${p.specialty} | ${p.address.city} | V:${(p.metrics.volumeL / 1000).toFixed(0)}K | F:${p.metrics.loyaltyScore}/10 | V${p.metrics.vingtile}${p.metrics.isKOL ? ' | KOL' : ''}${pubCount > 0 ? ` | ${pubCount} pub` : ''}\n`;
      });
      break;
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
    maxTokens: 1500,
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

  return callLLM(messages, { temperature, maxTokens: 4096 });
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
${searchContext}
## Base Complète (${allPractitioners.length} praticiens)
${allPractitioners.map(p => {
  const pubCount = p.news?.filter(n => n.type === 'publication').length || 0;
  return `- ${p.title} ${p.firstName} ${p.lastName} | ${p.specialty} | ${p.address.city} | V:${(p.metrics.volumeL / 1000).toFixed(0)}K | F:${p.metrics.loyaltyScore}/10 | V${p.metrics.vingtile}${p.metrics.isKOL ? ' | KOL' : ''}${pubCount > 0 ? ` | ${pubCount} pub` : ''}`;
}).join('\n')}`;

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

  return callLLM(messages, { temperature: 0.4, maxTokens: 4096 }, 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL FALLBACK
// ═══════════════════════════════════════════════════════════════════════════════

function generateLocalResponse(
  question: string,
  practitioners: Practitioner[],
  userObjectives: { visitsMonthly: number; visitsCompleted: number },
  wantsChart: boolean
): AICoachResult {
  if (wantsChart) {
    const chartResult = generateChartLocally(question);
    if (chartResult && chartResult.data.length > 0) {
      const firstMetric = chartResult.spec.query.metrics[0]?.name || 'value';
      const topItems = chartResult.data.slice(0, 3);

      addToChartHistory({
        question,
        spec: chartResult.spec,
        data: chartResult.data,
        insights: chartResult.insights,
        timestamp: new Date(),
      });

      return {
        textContent: `**${chartResult.spec.title}**\n\n${chartResult.spec.description}\n\n**Résumé :**\n${chartResult.insights.map(i => `• ${i}`).join('\n')}\n\n**Top ${Math.min(3, topItems.length)} :**\n${topItems.map((item, i) => `${i + 1}. **${item.name}** : ${item[firstMetric]}`).join('\n')}`,
        chart: {
          spec: chartResult.spec,
          data: chartResult.data,
          insights: chartResult.insights,
          suggestions: chartResult.suggestions,
          generatedByLLM: false,
        },
        suggestions: chartResult.suggestions,
        source: 'local',
      };
    }
  }

  // Text fallback
  const response = generateCoachResponse(question, practitioners, userObjectives);
  return {
    textContent: response.message,
    practitioners: response.practitioners,
    suggestions: response.insights?.slice(0, 3),
    source: 'local',
  };
}

// Simple local check for chart-like questions (used only for fallback routing)
function looksLikeChartRequest(question: string): boolean {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /graphique|graph|chart|diagramme|visualis|courbe|barres?|camembert|histogramme|montre[- ]?moi|affiche|repartition|distribution|top\s*\d+|classement|compare|par ville|par specialite|par segment|par vingtile|par risque/.test(q);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export async function processQuestion(
  question: string,
  conversationHistory: ConversationMessage[],
  periodLabel: string,
  practitioners: Practitioner[],
  upcomingVisits: UpcomingVisit[],
  userObjectives: { visitsMonthly: number; visitsCompleted: number }
): Promise<AICoachResult> {
  const chartHistory = getChartHistory();
  const lastAssistant = conversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content;

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE RÉSILIENT : Router → Targeted LLM → Direct LLM → Local
  //
  // Si Phase 1 (routeur) échoue → on essaie quand même le LLM direct
  // Si Phase 2 (réponse) échoue → on essaie le LLM direct sans routing
  // Si tout échoue → fallback local
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Phase 1: LLM Routing ────────────────────────────────────────────────
  const routing = await routeQuestion(question, chartHistory, lastAssistant);

  if (routing) {
    console.log('[AICoachEngine] Router:', routing.intent, routing.dataScope, routing.needsChart ? '📊' : '💬');

    // ─── Build Targeted Context ────────────────────────────────────────────
    const dataContext = buildTargetedContext(routing, question, periodLabel, practitioners, upcomingVisits);

    // ─── Phase 2A: Chart Generation (if needed) ────────────────────────────
    let chartResult: AICoachResult['chart'] | null = null;
    if (routing.needsChart) {
      chartResult = await generateChart(question, routing, chartHistory);
      if (!chartResult) {
        console.log('[AICoachEngine] Chart LLM failed, trying local chart');
        const localChart = generateChartLocally(question);
        if (localChart && localChart.data.length > 0) {
          addToChartHistory({
            question,
            spec: localChart.spec,
            data: localChart.data,
            insights: localChart.insights,
            timestamp: new Date(),
          });
          chartResult = {
            spec: localChart.spec,
            data: localChart.data,
            insights: localChart.insights,
            suggestions: localChart.suggestions,
            generatedByLLM: false,
          };
        }
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

  // ─── FALLBACK 1: Direct LLM (no routing) ────────────────────────────────
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
    return {
      textContent: directResponse,
      source: 'llm',
    };
  }

  // ─── FALLBACK 2: Local response ──────────────────────────────────────────
  console.log('[AICoachEngine] All LLM calls failed, using local fallback');
  return generateLocalResponse(
    question,
    practitioners,
    userObjectives,
    looksLikeChartRequest(question)
  );
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
  return getApiKey() !== null;
}
