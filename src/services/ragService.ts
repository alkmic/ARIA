/**
 * ARIA RAG Service — Retrieval-Augmented Generation
 *
 * Service de recherche sémantique dans la base de connaissances métier.
 * Utilise un scoring TF-IDF-like avec boost par tags/catégorie/priorité
 * pour retrouver les chunks les plus pertinents selon la question posée.
 *
 * Architecture :
 * 1. Analyse de la question (extraction de mots-clés, détection de thème)
 * 2. Scoring de chaque chunk (pertinence lexicale + boost sémantique)
 * 3. Sélection des top-K chunks les plus pertinents
 * 4. Formatage du contexte pour injection dans le prompt LLM
 */

import {
  KNOWLEDGE_CHUNKS,
  KNOWLEDGE_SOURCES,
  getKnowledgeBaseStats,
  type KnowledgeChunk,
  type KnowledgeTag,
  type KnowledgeCategory,
  type KnowledgeSource,
} from '../data/ragKnowledgeBase';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RAGResult {
  chunks: ScoredChunk[];
  context: string;
  totalChunksSearched: number;
  queryAnalysis: QueryAnalysis;
}

interface ScoredChunk {
  chunk: KnowledgeChunk;
  score: number;
  matchedTerms: string[];
}

interface QueryAnalysis {
  normalizedQuery: string;
  keywords: string[];
  detectedTags: KnowledgeTag[];
  detectedCategories: KnowledgeCategory[];
  isMetierQuestion: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRENCH STOP WORDS
// ═══════════════════════════════════════════════════════════════════════════════

const STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
  'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car', 'que', 'qui', 'dont',
  'où', 'quoi', 'comment', 'pourquoi', 'quand', 'quel', 'quelle', 'quels', 'quelles',
  'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'me', 'te', 'se', 'lui', 'en', 'y',
  'est', 'sont', 'a', 'ont', 'fait', 'faire', 'être', 'avoir',
  'ne', 'pas', 'plus', 'moins', 'très', 'bien', 'mal',
  'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par', 'entre', 'vers', 'chez',
  'tout', 'tous', 'toute', 'toutes', 'autre', 'autres', 'même', 'mêmes',
  'si', 'aussi', 'comme', 'après', 'avant', 'encore', 'déjà', 'jamais', 'toujours',
  'peut', 'peux', 'doit', 'dois', 'faut',
  'moi', 'toi', 'soi', 'eux',
  'cela', 'ceci', 'ça',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD → TAG MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const KEYWORD_TAG_MAP: Record<string, KnowledgeTag[]> = {
  // Air Liquide
  'air liquide': ['air_liquide'],
  'airliquide': ['air_liquide'],
  'al': ['air_liquide'],
  'groupe': ['air_liquide'],
  'healthcare': ['air_liquide'],
  'produit': ['air_liquide', 'dispositif_medical'],
  'produits': ['air_liquide', 'dispositif_medical'],
  'catalogue': ['air_liquide', 'dispositif_medical'],
  'gamme': ['air_liquide', 'dispositif_medical'],
  'offre': ['air_liquide', 'orkyn'],
  'service': ['air_liquide', 'orkyn'],
  'services': ['air_liquide', 'orkyn'],
  'solution': ['air_liquide', 'orkyn'],
  'solutions': ['air_liquide', 'orkyn'],
  'propose': ['air_liquide'],
  'vend': ['air_liquide'],
  'vendu': ['air_liquide'],
  'matériel': ['dispositif_medical', 'oxygenotherapie'],
  'materiel': ['dispositif_medical', 'oxygenotherapie'],
  'équipement': ['dispositif_medical'],
  'equipement': ['dispositif_medical'],

  // Orkyn
  'orkyn': ['orkyn', 'air_liquide'],
  'psad': ['orkyn'],
  'prestataire': ['orkyn'],
  'domicile': ['orkyn', 'oxygenotherapie'],

  // BPCO
  'bpco': ['bpco'],
  'bronchopneumopathie': ['bpco'],
  'bronchite': ['bpco'],
  'emphysème': ['bpco'],
  'emphyseme': ['bpco'],
  'insuffisance respiratoire': ['bpco', 'oxygenotherapie'],

  // Oxygénothérapie
  'oxygène': ['oxygenotherapie'],
  'oxygene': ['oxygenotherapie'],
  'o2': ['oxygenotherapie'],
  'oxygenotherapie': ['oxygenotherapie'],
  'oxygénothérapie': ['oxygenotherapie'],
  'old': ['oxygenotherapie', 'bpco'],
  'oct': ['oxygenotherapie'],
  'concentrateur': ['oxygenotherapie'],
  'extracteur': ['oxygenotherapie'],
  'bouteille': ['oxygenotherapie'],
  'cuve': ['oxygenotherapie'],
  'déambulation': ['oxygenotherapie'],

  // GOLD
  'gold': ['gold', 'bpco'],
  'spirométrie': ['gold', 'spirometrie', 'bpco'],
  'spirometrie': ['gold', 'spirometrie', 'bpco'],
  'vems': ['gold', 'spirometrie', 'bpco'],
  'classification': ['gold', 'bpco'],

  // HAS
  'has': ['has', 'bpco'],
  'haute autorité': ['has'],
  'recommandation': ['has', 'gold'],
  'parcours': ['has', 'parcours_soins'],
  'parcours de soins': ['has', 'parcours_soins'],
  'indicateur': ['has', 'ameli'],

  // Concurrence
  'concurrent': ['concurrent'],
  'concurrence': ['concurrent'],
  'vivisol': ['concurrent', 'vivisol'],
  'sol group': ['concurrent', 'vivisol'],
  'france oxygène': ['concurrent', 'vivisol'],
  'france oxygene': ['concurrent', 'vivisol'],
  'bastide': ['concurrent'],
  'sos oxygène': ['concurrent'],
  'linde': ['concurrent'],

  // Réglementation
  'lppr': ['lppr', 'reglementation'],
  'lpp': ['lppr', 'reglementation'],
  'remboursement': ['lppr', 'reglementation'],
  'tarif': ['lppr', 'reglementation'],
  'forfait': ['lppr', 'reglementation', 'oxygenotherapie'],
  'nomenclature': ['lppr', 'reglementation'],
  'arrêté': ['reglementation'],
  'legifrance': ['reglementation'],
  'réglementation': ['reglementation'],
  'reglementation': ['reglementation'],

  // Épidémiologie
  'épidémiologie': ['epidemiologie', 'bpco'],
  'epidemiologie': ['epidemiologie', 'bpco'],
  'prévalence': ['epidemiologie', 'bpco'],
  'mortalité': ['epidemiologie', 'bpco'],
  'incidence': ['epidemiologie', 'bpco'],
  'chiffres': ['epidemiologie'],
  'statistiques': ['epidemiologie'],

  // Télésuivi
  'télésuivi': ['telesuivi'],
  'telesuivi': ['telesuivi'],
  'télésurveillance': ['telesuivi'],
  'telesurveillance': ['telesuivi'],
  'connecté': ['telesuivi'],
  'monitoring': ['telesuivi'],

  // Dispositifs
  'ventilation': ['ventilation', 'dispositif_medical'],
  'vni': ['ventilation', 'dispositif_medical'],
  'ventilateur': ['ventilation', 'dispositif_medical'],
  'masque': ['ventilation', 'dispositif_medical'],
  'ppc': ['sommeil', 'dispositif_medical'],
  'cpap': ['sommeil', 'dispositif_medical'],
  'apnée': ['sommeil'],
  'sommeil': ['sommeil'],

  // Ameli / CNAM
  'ameli': ['ameli', 'has'],
  'assurance maladie': ['ameli', 'lppr'],
  'cnam': ['ameli', 'lppr'],
  'sécurité sociale': ['ameli', 'lppr'],

  // VIDAL
  'vidal': ['vidal', 'oxygenotherapie'],
  'médicament': ['vidal'],

  // Exacerbation
  'exacerbation': ['exacerbation', 'bpco'],
  'eabpco': ['exacerbation', 'bpco'],
  'décompensation': ['exacerbation', 'bpco'],
  'hospitalisation': ['exacerbation', 'bpco'],

  // Tabac
  'tabac': ['bpco', 'epidemiologie'],
  'tabagisme': ['bpco', 'epidemiologie'],
  'sevrage': ['bpco', 'has'],
  'fumeur': ['bpco', 'epidemiologie'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD → CATEGORY MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const KEYWORD_CATEGORY_MAP: Record<string, KnowledgeCategory[]> = {
  'air liquide': ['air_liquide_corporate', 'air_liquide_france'],
  'orkyn': ['orkyn'],
  'alms': ['alms_devices'],
  'dispositif': ['alms_devices'],
  'produit': ['air_liquide_corporate', 'orkyn', 'alms_devices'],
  'produits': ['air_liquide_corporate', 'orkyn', 'alms_devices'],
  'catalogue': ['air_liquide_corporate', 'orkyn', 'alms_devices'],
  'gamme': ['air_liquide_corporate', 'orkyn', 'alms_devices'],
  'service': ['orkyn', 'air_liquide_corporate'],
  'services': ['orkyn', 'air_liquide_corporate'],
  'offre': ['orkyn', 'air_liquide_corporate'],
  'solution': ['orkyn', 'air_liquide_corporate', 'telesuivi'],
  'matériel': ['alms_devices', 'oxygenotherapie'],
  'bpco': ['bpco_gold', 'bpco_has', 'bpco_clinique'],
  'gold': ['bpco_gold'],
  'has': ['bpco_has'],
  'concurrent': ['concurrent'],
  'vivisol': ['concurrent'],
  'oxygène': ['oxygenotherapie'],
  'lppr': ['lppr_remboursement'],
  'remboursement': ['lppr_remboursement'],
  'tarif': ['lppr_remboursement'],
  'réglementation': ['reglementation'],
  'arrêté': ['reglementation'],
  'télésuivi': ['telesuivi'],
  'épidémiologie': ['epidemiologie'],
  'chiffres': ['epidemiologie'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics for matching
    .replace(/['']/g, "'")
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywords(query: string): string[] {
  const normalized = normalizeText(query);
  const words = normalized.split(/\s+/);
  return words.filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function analyzeQuery(question: string): QueryAnalysis {
  const normalized = question.toLowerCase().trim();
  const keywords = extractKeywords(question);

  // Detect tags from the question
  const detectedTags = new Set<KnowledgeTag>();
  const detectedCategories = new Set<KnowledgeCategory>();

  for (const [keyword, tags] of Object.entries(KEYWORD_TAG_MAP)) {
    if (normalized.includes(keyword)) {
      tags.forEach(t => detectedTags.add(t));
    }
  }

  for (const [keyword, categories] of Object.entries(KEYWORD_CATEGORY_MAP)) {
    if (normalized.includes(keyword)) {
      categories.forEach(c => detectedCategories.add(c));
    }
  }

  // Detect if this is a "métier" question (about industry knowledge, not CRM data)
  const metierIndicators = [
    // Produits / Services / Catalogue
    'produit', 'produits', 'catalogue', 'gamme', 'offre', 'offres',
    'service', 'services', 'solution', 'solutions', 'dispositif',
    'matériel', 'materiel', 'équipement', 'equipement',
    'que vend', 'que propose', 'quoi vend', 'quoi propose',
    'vendu', 'vendus', 'commercialise', 'distribue',
    // Pathologies & Clinique
    'bpco', 'oxygène', 'oxygene', 'o2', 'gold', 'has', 'lppr', 'lpp',
    'réglementation', 'reglementation',
    'remboursement', 'tarif', 'forfait', 'épidémiologie', 'prévalence',
    'mortalité', 'classification', 'spirométrie', 'spirometrie', 'vems', 'exacerbation',
    'traitement', 'recommandation', 'indication', 'old', 'oct',
    'concentrateur', 'extracteur', 'ventilation', 'ventilateur', 'vni', 'ppc', 'cpap',
    'apnée', 'apnee', 'sommeil', 'masque',
    'télésuivi', 'telesuivi', 'télésurveillance', 'telesurveillance', 'parcours de soins',
    // Questions ouvertes
    'qu\'est-ce que', 'c\'est quoi', 'explique', 'définition', 'definition',
    'comment fonctionne', 'quel est le', 'quels sont les', 'quelles sont',
    'parle-moi de', 'donne-moi des infos', 'informations sur', 'dis-moi',
    // Concurrence & Marché
    'concurrent', 'concurrence', 'vivisol', 'france oxygène', 'france oxygene',
    'bastide', 'sos oxygène', 'linde', 'marché', 'marche', 'psad',
    // Organisations
    'orkyn', 'air liquide', 'alms', 'alsf',
    'chronic care', 'event', 'melchior',
    // Médical
    'dispositif médical', 'médicament', 'medicament',
    'patient', 'prescription', 'médecin', 'pneumologue',
    'tabac', 'tabagisme', 'sevrage', 'vaccination',
    'ameli', 'sécurité sociale', 'assurance maladie',
    // Gaz médicaux
    'gaz médic', 'gaz medic', 'oxygène médic', 'oxygene medic',
    'cuve', 'bouteille', 'déambulation', 'deambulation',
    'perfusion', 'nutrition', 'diabète', 'diabete', 'parkinson', 'neurologie',
  ];

  const isMetierQuestion = metierIndicators.some(ind => normalized.includes(ind));

  return {
    normalizedQuery: normalized,
    keywords,
    detectedTags: [...detectedTags],
    detectedCategories: [...detectedCategories],
    isMetierQuestion,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHUNK SCORING
// ═══════════════════════════════════════════════════════════════════════════════

function scoreChunk(chunk: KnowledgeChunk, analysis: QueryAnalysis): ScoredChunk {
  let score = 0;
  const matchedTerms: string[] = [];
  const chunkText = normalizeText(`${chunk.title} ${chunk.content}`);
  const chunkTitleNorm = normalizeText(chunk.title);

  // 1. Keyword matching (TF-IDF-like)
  for (const keyword of analysis.keywords) {
    const keywordNorm = normalizeText(keyword);
    // Count occurrences in content
    const regex = new RegExp(keywordNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const contentMatches = (chunkText.match(regex) || []).length;
    const titleMatches = (chunkTitleNorm.match(regex) || []).length;

    if (contentMatches > 0 || titleMatches > 0) {
      matchedTerms.push(keyword);
      // Title matches are worth more
      score += titleMatches * 15;
      // Content matches with diminishing returns
      score += Math.min(contentMatches, 5) * 3;
    }
  }

  // 2. Tag matching (semantic boost)
  for (const tag of analysis.detectedTags) {
    if (chunk.tags.includes(tag)) {
      score += 20;
    }
  }

  // 3. Category matching
  for (const cat of analysis.detectedCategories) {
    if (chunk.category === cat) {
      score += 15;
    }
  }

  // 4. Priority boost (priority 1 chunks get more weight)
  if (chunk.priority === 1) {
    score *= 1.3;
  } else if (chunk.priority === 3) {
    score *= 0.8;
  }

  // 5. Exact phrase matching (bigrams from query)
  const queryWords = analysis.normalizedQuery.split(/\s+/);
  for (let i = 0; i < queryWords.length - 1; i++) {
    const bigram = `${queryWords[i]} ${queryWords[i + 1]}`;
    if (bigram.length > 5 && chunkText.includes(bigram)) {
      score += 10;
    }
  }

  return { chunk, score, matchedTerms };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RETRIEVAL FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Retrieve the most relevant knowledge chunks for a given question.
 * @param question - The user's question
 * @param topK - Maximum number of chunks to return (default: 5)
 * @param minScore - Minimum relevance score to include a chunk (default: 10)
 * @returns RAGResult with scored chunks and formatted context
 */
export function retrieveKnowledge(
  question: string,
  topK: number = 5,
  minScore: number = 10
): RAGResult {
  const analysis = analyzeQuery(question);

  // If not a métier question, return empty (don't pollute CRM queries with knowledge base)
  if (!analysis.isMetierQuestion && analysis.detectedTags.length === 0) {
    return {
      chunks: [],
      context: '',
      totalChunksSearched: KNOWLEDGE_CHUNKS.length,
      queryAnalysis: analysis,
    };
  }

  // Score all chunks
  const scored = KNOWLEDGE_CHUNKS
    .map(chunk => scoreChunk(chunk, analysis))
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // Format context for LLM injection
  const context = formatRAGContext(scored);

  return {
    chunks: scored,
    context,
    totalChunksSearched: KNOWLEDGE_CHUNKS.length,
    queryAnalysis: analysis,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

function formatRAGContext(chunks: ScoredChunk[]): string {
  if (chunks.length === 0) return '';

  let context = `\n## Base de Connaissances Métier (${chunks.length} sources pertinentes)\n`;
  context += `_Les informations ci-dessous proviennent de sources vérifiées (HAS, GOLD, Air Liquide, Orkyn', VIDAL, Légifrance, Ameli). Cite ces données avec confiance et mentionne la source quand c'est pertinent._\n\n`;

  for (const { chunk } of chunks) {
    context += `### ${chunk.title}\n`;
    context += `_Source: ${chunk.source}_\n`;
    context += `${chunk.content}\n\n`;
  }

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a question should trigger RAG knowledge retrieval
 */
export function shouldUseRAG(question: string): boolean {
  const analysis = analyzeQuery(question);
  return analysis.isMetierQuestion || analysis.detectedTags.length > 0;
}

/**
 * Get all available knowledge sources for UI display
 */
export function getKnowledgeSources(): KnowledgeSource[] {
  return KNOWLEDGE_SOURCES;
}

/**
 * Get downloadable sources only
 */
export function getDownloadableSources(): KnowledgeSource[] {
  return KNOWLEDGE_SOURCES.filter(s => s.downloadable);
}

/**
 * Get knowledge base statistics
 */
export function getRAGStats() {
  return getKnowledgeBaseStats();
}

/**
 * Search knowledge base by specific tag
 */
export function searchByTag(tag: KnowledgeTag): KnowledgeChunk[] {
  return KNOWLEDGE_CHUNKS.filter(c => c.tags.includes(tag));
}

/**
 * Search knowledge base by category
 */
export function searchByCategory(category: KnowledgeCategory): KnowledgeChunk[] {
  return KNOWLEDGE_CHUNKS.filter(c => c.category === category);
}
