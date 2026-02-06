/**
 * Service RAG (Retrieval-Augmented Generation) pour le Coach IA
 * Gère le stockage, le chunking et la recherche dans les documents d'entreprise.
 */

import { BUILTIN_KNOWLEDGE, type KnowledgeChunk } from '../data/builtinKnowledge';

// ===== TYPES =====

export interface RAGDocument {
  id: string;
  name: string;
  type: 'pdf' | 'text' | 'url' | 'builtin';
  category: 'produit' | 'clinique' | 'reglementaire' | 'concurrence' | 'interne';
  addedAt: string;
  size: number;
  chunkCount: number;
  summary?: string;
}

export interface RAGChunk {
  id: string;
  documentId: string;
  content: string;
  metadata: {
    page?: number;
    section?: string;
    tags: string[];
    category: string;
    source: string;
  };
}

export interface SearchResult {
  chunk: RAGChunk;
  score: number;
  documentName: string;
}

// ===== CHUNKING =====

const CHUNK_SIZE = 800;       // ~200 mots par chunk
const CHUNK_OVERLAP = 100;    // chevauchement entre chunks

/**
 * Découpe un texte en chunks avec chevauchement
 */
export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Garder le chevauchement : dernière partie du chunk précédent
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.ceil(overlap / 5));
      currentChunk = overlapWords.join(' ') + ' ' + sentence;
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Extrait le texte d'un fichier uploadé
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'txt':
    case 'md':
    case 'csv':
      return file.text();

    case 'pdf':
      return extractTextFromPDF(file);

    case 'json':
      return file.text();

    default:
      // Essayer de lire comme texte
      return file.text();
  }
}

/**
 * Extraction de texte depuis un PDF en utilisant pdf.js via CDN
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Charger dynamiquement pdf.js depuis CDN
    const pdfjsLib = await loadPDFJS();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: { str?: string }) => item.str || '')
        .join(' ');
      textParts.push(`[Page ${i}] ${pageText}`);
    }

    return textParts.join('\n\n');
  } catch (error) {
    console.warn('PDF.js non disponible, extraction basique:', error);
    // Fallback : lecture basique du contenu textuel
    return extractTextFromPDFBasic(file);
  }
}

// Cache pour pdf.js
let _pdfjsLib: any = null;

async function loadPDFJS(): Promise<any> {
  if (_pdfjsLib) return _pdfjsLib;

  return new Promise((resolve, reject) => {
    // Vérifier si déjà chargé globalement
    if ((window as any).pdfjsLib) {
      _pdfjsLib = (window as any).pdfjsLib;
      resolve(_pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
    script.type = 'module';

    // Utiliser une approche différente : charger via import() dynamique
    import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs')
      .then((module) => {
        _pdfjsLib = module;
        _pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
        resolve(_pdfjsLib);
      })
      .catch(() => {
        // Si l'import dynamique échoue, essayer avec un script tag classique
        const fallbackScript = document.createElement('script');
        fallbackScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.js';
        fallbackScript.onload = () => {
          _pdfjsLib = (window as any).pdfjsLib;
          if (_pdfjsLib) {
            _pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js';
            resolve(_pdfjsLib);
          } else {
            reject(new Error('pdf.js non chargé'));
          }
        };
        fallbackScript.onerror = () => reject(new Error('Impossible de charger pdf.js'));
        document.head.appendChild(fallbackScript);
      });
  });
}

/**
 * Extraction basique de texte PDF (fallback sans pdf.js)
 */
async function extractTextFromPDFBasic(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

  // Extraire les chaînes entre parenthèses (format PDF basique)
  const matches = text.match(/\(([^)]+)\)/g);
  if (matches && matches.length > 10) {
    return matches
      .map(m => m.slice(1, -1))
      .filter(s => s.length > 2 && !/^[\\\/\d]+$/.test(s))
      .join(' ');
  }

  // Dernière chance : extraire tout ce qui ressemble à du texte lisible
  return text.replace(/[^\x20-\x7E\u00C0-\u024F\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50000); // Limiter
}

// ===== RECHERCHE BM25 =====

/**
 * Tokenize et normalise un texte pour la recherche
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9àâäéèêëïîôùûüÿçœæ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

// Stop words français
const STOP_WORDS = new Set([
  'les', 'des', 'une', 'pour', 'dans', 'avec', 'sur', 'par', 'pas', 'est',
  'sont', 'ont', 'qui', 'que', 'aux', 'ces', 'ses', 'mes', 'tes', 'nos',
  'vos', 'leur', 'plus', 'mais', 'comme', 'tout', 'tous', 'elle', 'lui',
  'nous', 'vous', 'ils', 'elles', 'ete', 'etre', 'avoir', 'fait', 'faire',
  'dit', 'dire', 'peut', 'entre', 'sans', 'sous', 'chez', 'vers', 'aussi',
  'bien', 'tres', 'meme', 'encore', 'cette', 'alors', 'donc', 'mais',
]);

/**
 * Recherche BM25 dans les chunks
 */
export function searchChunks(
  query: string,
  chunks: RAGChunk[],
  builtinChunks: RAGChunk[],
  topK = 5
): SearchResult[] {
  const allChunks = [...chunks, ...builtinChunks];
  if (allChunks.length === 0) return [];

  const queryTokens = tokenize(query).filter(t => !STOP_WORDS.has(t));
  if (queryTokens.length === 0) return [];

  // Paramètres BM25
  const k1 = 1.5;
  const b = 0.75;

  // Calculer la longueur moyenne des documents
  const avgDl = allChunks.reduce((s, c) => s + tokenize(c.content).length, 0) / allChunks.length;

  // Calculer l'IDF pour chaque terme de la requête
  const idf: Record<string, number> = {};
  for (const token of queryTokens) {
    const df = allChunks.filter(c =>
      tokenize(c.content).includes(token) ||
      c.metadata.tags.some(t => tokenize(t).includes(token))
    ).length;
    idf[token] = Math.log((allChunks.length - df + 0.5) / (df + 0.5) + 1);
  }

  // Scorer chaque chunk
  const scored = allChunks.map(chunk => {
    const docTokens = tokenize(chunk.content);
    const dl = docTokens.length;
    let score = 0;

    for (const token of queryTokens) {
      const tf = docTokens.filter(t => t === token).length;
      // Bonus pour les tags
      const tagBonus = chunk.metadata.tags.some(t =>
        tokenize(t).includes(token)
      ) ? 1.5 : 0;

      const numerator = (tf + tagBonus) * (k1 + 1);
      const denominator = (tf + tagBonus) + k1 * (1 - b + b * dl / avgDl);
      score += (idf[token] || 0) * (numerator / denominator);
    }

    return { chunk, score, documentName: chunk.metadata.source || chunk.documentId };
  });

  // Trier par score décroissant et retourner top-K
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ===== CONVERSION BUILTIN → CHUNKS =====

/**
 * Convertit la base de connaissances intégrée en chunks RAG
 */
export function getBuiltinChunks(): RAGChunk[] {
  return BUILTIN_KNOWLEDGE.map((k: KnowledgeChunk) => ({
    id: `builtin-${k.id}`,
    documentId: 'builtin',
    content: `${k.title}\n${k.content}`,
    metadata: {
      tags: k.tags,
      category: k.category,
      source: k.source,
      section: k.title,
    },
  }));
}

// ===== CONTEXTE RAG POUR LLM =====

/**
 * Construit le contexte RAG à injecter dans le prompt du Coach IA
 */
export function buildRAGContext(
  query: string,
  userChunks: RAGChunk[],
  topK = 5
): string {
  const builtinChunks = getBuiltinChunks();
  const results = searchChunks(query, userChunks, builtinChunks, topK);

  if (results.length === 0) return '';

  const sections = results.map((r, i) => {
    const source = r.chunk.metadata.source || 'Document interne';
    const category = r.chunk.metadata.category || '';
    return `[Source ${i + 1} — ${source} (${category})]
${r.chunk.content.substring(0, 600)}${r.chunk.content.length > 600 ? '...' : ''}`;
  });

  return `
=== BASE DE CONNAISSANCES ENTREPRISE (RAG) ===
Les informations ci-dessous proviennent de documents d'entreprise et de sources médicales fiables.
Utilise-les pour enrichir ta réponse quand c'est pertinent. Cite les sources quand tu les utilises.

${sections.join('\n\n')}
=== FIN BASE DE CONNAISSANCES ===`;
}

/**
 * Génère un résumé automatique d'un document (première phrase de chaque chunk)
 */
export function generateDocumentSummary(text: string): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  return sentences.slice(0, 3).map(s => s.trim()).join('. ') + '.';
}

/**
 * Processus complet : file → document + chunks
 */
export async function processDocument(
  file: File,
  category: RAGDocument['category']
): Promise<{ document: RAGDocument; chunks: RAGChunk[] }> {
  const text = await extractTextFromFile(file);
  const textChunks = chunkText(text);
  const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const document: RAGDocument = {
    id: docId,
    name: file.name,
    type: file.name.endsWith('.pdf') ? 'pdf' : 'text',
    category,
    addedAt: new Date().toISOString(),
    size: file.size,
    chunkCount: textChunks.length,
    summary: generateDocumentSummary(text),
  };

  const chunks: RAGChunk[] = textChunks.map((content, i) => ({
    id: `${docId}-chunk-${i}`,
    documentId: docId,
    content,
    metadata: {
      page: undefined,
      section: `Chunk ${i + 1}/${textChunks.length}`,
      tags: extractTags(content),
      category,
      source: file.name,
    },
  }));

  return { document, chunks };
}

/**
 * Extraction automatique de tags depuis le contenu
 */
function extractTags(content: string): string[] {
  const keyTerms = [
    'bpco', 'oxygénothérapie', 'old', 'ventilation', 'vni', 'ppc',
    'air liquide', 'orkyn', 'vivisol', 'concentrateur', 'télésuivi',
    'lppr', 'has', 'gold', 'prescription', 'exacerbation',
    'domicile', 'hôpital', 'patient', 'pneumologue', 'généraliste',
    'remboursement', 'tarif', 'concurrence', 'innovation',
  ];

  const lower = content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return keyTerms.filter(term => {
    const normalized = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return lower.includes(normalized);
  });
}
