/**
 * Service de recherche universelle pour ARIA
 * Permet de rechercher dans TOUTES les données du site:
 * - Praticiens (nom, prénom, ville, spécialité)
 * - Publications, actualités, certifications, conférences
 * - Notes de visite
 * - Historique des visites et produits discutés
 * - Statistiques agrégées
 */

import { DataService } from './dataService';
import type { PractitionerProfile, PractitionerNote, PractitionerNews } from '../types/database';

// Types de résultats de recherche
export interface SearchResult {
  type: 'practitioner' | 'publication' | 'note' | 'visit' | 'event' | 'stat';
  relevance: number; // 0-100
  practitioner?: PractitionerProfile;
  data?: any;
  summary: string;
}

export interface UniversalSearchResult {
  query: string;
  results: SearchResult[];
  aggregations: {
    totalPractitioners: number;
    totalPublications: number;
    totalNotes: number;
    totalVisits: number;
    totalEvents: number;
    byType: Record<string, number>;
  };
  summary: string;
  context: string; // Formatted context for LLM
}

// Analyse sémantique de la question
export interface QueryAnalysis {
  intent: 'search' | 'count' | 'compare' | 'rank' | 'aggregate' | 'info';
  entities: {
    names: string[];
    cities: string[];
    specialties: string[];
    products: string[];
    dates: string[];
    numbers: number[];
  };
  filters: {
    isKOL?: boolean;
    hasPublications?: boolean;
    hasNotes?: boolean;
    minVolume?: number;
    maxVolume?: number;
    vingtileRange?: [number, number];
    riskLevel?: string[];
    dateRange?: { from?: string; to?: string };
  };
  sorting: {
    field?: string;
    order?: 'asc' | 'desc';
  };
  limit?: number;
  keywords: string[];
}

// Liste étendue des prénoms français
const FRENCH_FIRST_NAMES = [
  // Masculins
  'jean', 'pierre', 'louis', 'michel', 'paul', 'andré', 'françois', 'philippe',
  'antoine', 'marc', 'alain', 'jacques', 'henri', 'bernard', 'christophe', 'éric',
  'gérard', 'patrick', 'olivier', 'daniel', 'nicolas', 'yves', 'laurent', 'thierry',
  'stéphane', 'christian', 'bruno', 'claude', 'frédéric', 'serge', 'pascal', 'sylvain',
  'jean-pierre', 'jean-claude', 'jean-michel', 'jean-paul', 'jean-françois',
  'robert', 'georges', 'marcel', 'rené', 'maurice', 'jean-luc', 'dominique',
  'xavier', 'guillaume', 'romain', 'mathieu', 'julien', 'sébastien', 'jérôme',
  'damien', 'fabien', 'vincent', 'benoit', 'maxime', 'alexandre', 'david',
  // Féminins
  'marie', 'sophie', 'catherine', 'anne', 'isabelle', 'claire', 'nathalie', 'sylvie',
  'françoise', 'hélène', 'valérie', 'monique', 'brigitte', 'élise', 'charlotte',
  'christine', 'patricia', 'martine', 'véronique', 'sandrine', 'céline', 'caroline',
  'aurélie', 'émilie', 'julie', 'laure', 'pauline', 'camille', 'florence', 'béatrice',
  'laurence', 'marie-claire', 'marie-france', 'marie-christine', 'anne-marie',
  'delphine', 'virginie', 'stéphanie', 'corinne', 'pascale', 'alexandra', 'amélie'
];

// Noms de famille français courants
const FRENCH_LAST_NAMES = [
  'martin', 'bernard', 'dubois', 'thomas', 'robert', 'richard', 'petit', 'durand',
  'leroy', 'moreau', 'simon', 'laurent', 'lefebvre', 'michel', 'garcia', 'david',
  'bertrand', 'roux', 'vincent', 'fournier', 'morel', 'girard', 'andré', 'lefèvre',
  'mercier', 'dupont', 'lambert', 'bonnet', 'françois', 'martinez', 'legrand',
  'garnier', 'faure', 'rousseau', 'blanc', 'guerin', 'muller', 'henry', 'roussel',
  'nicolas', 'perrin', 'morin', 'mathieu', 'clement', 'gauthier', 'dumont', 'lopez',
  'fontaine', 'chevalier', 'robin', 'denis', 'barbier', 'meunier', 'brunet', 'dumas',
  'lefevre', 'marchand', 'noel', 'arnaud', 'blanchard', 'renaud', 'picard', 'masson',
  'brun', 'lemaire', 'roger', 'roy', 'gaillard', 'caron', 'adam', 'fabre', 'riviere'
];

// Villes du territoire
const TERRITORY_CITIES = [
  'lyon', 'grenoble', 'villeurbanne', 'bourg-en-bresse', 'saint-étienne', 'saint-etienne',
  'annecy', 'chambéry', 'chambery', 'valence', 'vienne', 'annemasse', 'vénissieux',
  'venissieux', 'voiron', 'bourgoin-jallieu', 'romans-sur-isère', 'montélimar'
];

// Produits Air Liquide
const PRODUCTS = [
  'vitalaire', 'confort', 'confort+', 'télésuivi', 'telesuivi', 'o2', 'oxygène',
  'extracteur', 'concentrateur', 'liquide', 'portable', 'service 24/7', 'service'
];

// Spécialités (used in analyzeQuery)
// const SPECIALTIES = ['pneumologue', 'pneumo', 'généraliste', 'generaliste', 'médecin'];

/**
 * Analyse sémantique de la question
 */
export function analyzeQuery(question: string): QueryAnalysis {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const qOriginal = question.toLowerCase();

  const analysis: QueryAnalysis = {
    intent: 'search',
    entities: {
      names: [],
      cities: [],
      specialties: [],
      products: [],
      dates: [],
      numbers: []
    },
    filters: {},
    sorting: {},
    keywords: []
  };

  // Détecter l'intention
  if (/combien|nombre|total|compte/i.test(q)) {
    analysis.intent = 'count';
  } else if (/compare|versus|vs|différence|difference/i.test(q)) {
    analysis.intent = 'compare';
  } else if (/top|meilleur|premier|classement|plus (de|gros|grand)|maximum|le plus/i.test(q)) {
    analysis.intent = 'rank';
  } else if (/moyenne|total|somme|agreg|par (ville|spécialité|specialite|vingtile)/i.test(q)) {
    analysis.intent = 'aggregate';
  } else if (/qui est|c'est qui|information|profil|détail|detail/i.test(q)) {
    analysis.intent = 'info';
  }

  // Extraire les prénoms
  for (const firstName of FRENCH_FIRST_NAMES) {
    const normalizedName = firstName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (q.includes(normalizedName) || q.includes(`prenom ${normalizedName}`) ||
        q.includes(`prénom ${normalizedName}`) || qOriginal.includes(firstName)) {
      analysis.entities.names.push(firstName);
    }
  }

  // Extraire les noms de famille
  for (const lastName of FRENCH_LAST_NAMES) {
    if (q.includes(lastName) || q.includes(`nom ${lastName}`) ||
        q.includes(`dr ${lastName}`) || q.includes(`docteur ${lastName}`)) {
      // Éviter les doublons si c'est aussi un prénom
      if (!analysis.entities.names.includes(lastName)) {
        analysis.entities.names.push(lastName);
      }
    }
  }

  // Extraire les villes
  for (const city of TERRITORY_CITIES) {
    const normalizedCity = city.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (q.includes(normalizedCity) || q.includes(`à ${normalizedCity}`) || q.includes(`a ${normalizedCity}`)) {
      analysis.entities.cities.push(city);
    }
  }

  // Extraire les spécialités
  if (/pneumologue|pneumo/i.test(q)) {
    analysis.entities.specialties.push('Pneumologue');
  }
  if (/généraliste|generaliste|médecin généraliste/i.test(q)) {
    analysis.entities.specialties.push('Médecin généraliste');
  }

  // Extraire les produits
  for (const product of PRODUCTS) {
    if (q.includes(product)) {
      analysis.entities.products.push(product);
    }
  }

  // Extraire les nombres
  const numberMatches = q.match(/\d+/g);
  if (numberMatches) {
    analysis.entities.numbers = numberMatches.map(n => parseInt(n));
  }

  // Filtres spéciaux
  if (/kol|leader|opinion/i.test(q)) {
    analysis.filters.isKOL = true;
  }
  if (/publication|publié|article|écrit/i.test(q)) {
    analysis.filters.hasPublications = true;
  }
  if (/note|commentaire|observation/i.test(q)) {
    analysis.filters.hasNotes = true;
  }
  if (/risque|churn|perdre/i.test(q)) {
    analysis.filters.riskLevel = q.includes('haut') || q.includes('élevé') ? ['high'] : ['high', 'medium'];
  }

  // Tri
  if (/plus de publication|plus de publications/i.test(q)) {
    analysis.sorting = { field: 'publicationCount', order: 'desc' };
  } else if (/plus de volume|plus gros volume|plus gros prescripteur/i.test(q)) {
    analysis.sorting = { field: 'volume', order: 'desc' };
  } else if (/meilleur|fidél/i.test(q)) {
    analysis.sorting = { field: 'loyalty', order: 'desc' };
  } else if (/vingtile/i.test(q) && /meilleur|top|bas/i.test(q)) {
    analysis.sorting = { field: 'vingtile', order: 'asc' };
  } else if (/récent|dernier|pas vu/i.test(q)) {
    analysis.sorting = { field: 'lastVisit', order: 'asc' };
  }

  // Limite
  const topMatch = q.match(/top\s*(\d+)/);
  const premierMatch = q.match(/(\d+)\s*premier/);
  if (topMatch) analysis.limit = parseInt(topMatch[1]);
  else if (premierMatch) analysis.limit = parseInt(premierMatch[1]);
  else if (/le plus|la plus|quel (médecin|praticien|docteur)/i.test(q)) analysis.limit = 1;

  // Mots-clés pour recherche textuelle
  const stopWords = ['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'à', 'a', 'et', 'ou', 'qui', 'que', 'quoi', 'dont', 'est', 'sont', 'dans', 'pour', 'avec', 'sur', 'par', 'plus', 'moins', 'quel', 'quelle', 'quels', 'quelles'];
  analysis.keywords = q.split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, 10);

  return analysis;
}

/**
 * Recherche dans les notes de visite
 */
function searchInNotes(practitioners: PractitionerProfile[], keywords: string[]): SearchResult[] {
  const results: SearchResult[] = [];

  for (const p of practitioners) {
    for (const note of p.notes || []) {
      const content = `${note.content} ${note.nextAction || ''}`.toLowerCase();
      const matchCount = keywords.filter(kw => content.includes(kw)).length;

      if (matchCount > 0) {
        results.push({
          type: 'note',
          relevance: Math.min(100, matchCount * 30),
          practitioner: p,
          data: note,
          summary: `Note de ${p.title} ${p.lastName} (${new Date(note.date).toLocaleDateString('fr-FR')}): ${note.content.substring(0, 100)}...`
        });
      }
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 20);
}

/**
 * Recherche dans les publications et actualités
 */
function searchInNews(practitioners: PractitionerProfile[], keywords: string[], analysis: QueryAnalysis): SearchResult[] {
  const results: SearchResult[] = [];

  for (const p of practitioners) {
    for (const news of p.news || []) {
      const content = `${news.title} ${news.content}`.toLowerCase();
      const matchCount = keywords.filter(kw => content.includes(kw)).length;

      // Filtrer par type si spécifié
      if (analysis.filters.hasPublications && news.type !== 'publication') continue;

      if (matchCount > 0 || (analysis.filters.hasPublications && news.type === 'publication')) {
        results.push({
          type: news.type === 'publication' ? 'publication' : 'event',
          relevance: Math.min(100, (matchCount + 1) * 25),
          practitioner: p,
          data: news,
          summary: `${news.type === 'publication' ? 'Publication' : news.type} de ${p.title} ${p.lastName}: ${news.title}`
        });
      }
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Recherche dans l'historique des visites
 */
function searchInVisits(practitioners: PractitionerProfile[], keywords: string[], products: string[]): SearchResult[] {
  const results: SearchResult[] = [];

  for (const p of practitioners) {
    for (const visit of p.visitHistory || []) {
      const notes = (visit.notes || '').toLowerCase();
      const visitProducts = visit.productsDiscussed || [];

      // Chercher dans les notes de visite
      const noteMatchCount = keywords.filter(kw => notes.includes(kw)).length;

      // Chercher les produits mentionnés
      const productMatch = products.some(prod =>
        visitProducts.some(vp => vp.toLowerCase().includes(prod))
      );

      if (noteMatchCount > 0 || productMatch) {
        results.push({
          type: 'visit',
          relevance: Math.min(100, noteMatchCount * 30 + (productMatch ? 40 : 0)),
          practitioner: p,
          data: visit,
          summary: `Visite ${p.title} ${p.lastName} (${new Date(visit.date).toLocaleDateString('fr-FR')}): ${visitProducts.join(', ')}`
        });
      }
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 20);
}

/**
 * Recherche principale de praticiens
 */
function searchPractitioners(analysis: QueryAnalysis): PractitionerProfile[] {
  let practitioners = DataService.getAllPractitioners();

  // Filtrer par nom/prénom
  if (analysis.entities.names.length > 0) {
    practitioners = practitioners.filter(p => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      return analysis.entities.names.some(name =>
        fullName.includes(name.toLowerCase()) ||
        p.firstName.toLowerCase() === name.toLowerCase() ||
        p.lastName.toLowerCase() === name.toLowerCase()
      );
    });
  }

  // Filtrer par ville
  if (analysis.entities.cities.length > 0) {
    practitioners = practitioners.filter(p =>
      analysis.entities.cities.some(city =>
        p.address.city.toLowerCase().includes(city.toLowerCase())
      )
    );
  }

  // Filtrer par spécialité
  if (analysis.entities.specialties.length > 0) {
    practitioners = practitioners.filter(p =>
      analysis.entities.specialties.some(spec =>
        p.specialty.toLowerCase().includes(spec.toLowerCase())
      )
    );
  }

  // Filtrer par KOL
  if (analysis.filters.isKOL !== undefined) {
    practitioners = practitioners.filter(p => p.metrics.isKOL === analysis.filters.isKOL);
  }

  // Filtrer par publications
  if (analysis.filters.hasPublications) {
    practitioners = practitioners.filter(p =>
      p.news && p.news.some(n => n.type === 'publication')
    );
  }

  // Filtrer par notes
  if (analysis.filters.hasNotes) {
    practitioners = practitioners.filter(p => p.notes && p.notes.length > 0);
  }

  // Filtrer par risque
  if (analysis.filters.riskLevel && analysis.filters.riskLevel.length > 0) {
    practitioners = practitioners.filter(p =>
      analysis.filters.riskLevel!.includes(p.metrics.churnRisk)
    );
  }

  // Trier
  if (analysis.sorting.field) {
    practitioners = [...practitioners].sort((a, b) => {
      let valA: number, valB: number;

      switch (analysis.sorting.field) {
        case 'publicationCount':
          valA = a.news?.filter(n => n.type === 'publication').length || 0;
          valB = b.news?.filter(n => n.type === 'publication').length || 0;
          break;
        case 'volume':
          valA = a.metrics.volumeL;
          valB = b.metrics.volumeL;
          break;
        case 'loyalty':
          valA = a.metrics.loyaltyScore;
          valB = b.metrics.loyaltyScore;
          break;
        case 'vingtile':
          valA = a.metrics.vingtile;
          valB = b.metrics.vingtile;
          break;
        case 'lastVisit':
          valA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
          valB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
          break;
        default:
          return 0;
      }

      return analysis.sorting.order === 'asc' ? valA - valB : valB - valA;
    });
  }

  // Limiter
  if (analysis.limit && analysis.limit > 0) {
    practitioners = practitioners.slice(0, analysis.limit);
  }

  return practitioners;
}

/**
 * Recherche universelle
 */
export function universalSearch(question: string): UniversalSearchResult {
  const analysis = analyzeQuery(question);
  const allPractitioners = DataService.getAllPractitioners();

  // Rechercher les praticiens correspondants
  const matchedPractitioners = searchPractitioners(analysis);

  // Rechercher dans les notes, publications et visites
  const noteResults = searchInNotes(allPractitioners, analysis.keywords);
  const newsResults = searchInNews(allPractitioners, analysis.keywords, analysis);
  const visitResults = searchInVisits(allPractitioners, analysis.keywords, analysis.entities.products);

  // Construire les résultats des praticiens
  const practitionerResults: SearchResult[] = matchedPractitioners.map(p => ({
    type: 'practitioner' as const,
    relevance: 80,
    practitioner: p,
    summary: `${p.title} ${p.firstName} ${p.lastName} - ${p.specialty} à ${p.address.city}`
  }));

  // Combiner et trier tous les résultats
  const allResults = [...practitionerResults, ...noteResults, ...newsResults, ...visitResults]
    .sort((a, b) => b.relevance - a.relevance);

  // Calculer les agrégations
  const aggregations = {
    totalPractitioners: matchedPractitioners.length,
    totalPublications: newsResults.filter(r => r.type === 'publication').length,
    totalNotes: noteResults.length,
    totalVisits: visitResults.length,
    totalEvents: newsResults.filter(r => r.type === 'event').length,
    byType: {} as Record<string, number>
  };

  allResults.forEach(r => {
    aggregations.byType[r.type] = (aggregations.byType[r.type] || 0) + 1;
  });

  // Générer le résumé
  const summary = generateSummary(question, analysis, matchedPractitioners, allResults);

  // Générer le contexte formaté pour le LLM
  const context = generateLLMContext(question, analysis, matchedPractitioners, noteResults, newsResults);

  return {
    query: question,
    results: allResults.slice(0, 50),
    aggregations,
    summary,
    context
  };
}

/**
 * Génère un résumé textuel des résultats
 */
function generateSummary(
  question: string,
  _analysis: QueryAnalysis,
  practitioners: PractitionerProfile[],
  results: SearchResult[]
): string {
  if (practitioners.length === 0 && results.length === 0) {
    return `Aucun résultat trouvé pour "${question}". Essayez avec d'autres termes de recherche.`;
  }

  const parts: string[] = [];

  if (practitioners.length === 1) {
    const p = practitioners[0];
    const pubCount = p.news?.filter(n => n.type === 'publication').length || 0;
    parts.push(`**${p.title} ${p.firstName} ${p.lastName}**`);
    parts.push(`${p.specialty} à ${p.address.city}`);
    parts.push(`Volume: ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an | Fidélité: ${p.metrics.loyaltyScore}/10 | Vingtile: ${p.metrics.vingtile}`);
    if (p.metrics.isKOL) parts.push('**Key Opinion Leader**');
    if (pubCount > 0) parts.push(`${pubCount} publication(s)`);
  } else if (practitioners.length > 1) {
    parts.push(`**${practitioners.length} praticien(s)** trouvé(s)`);

    const totalVolume = practitioners.reduce((sum, p) => sum + p.metrics.volumeL, 0);
    const kolCount = practitioners.filter(p => p.metrics.isKOL).length;
    const avgLoyalty = practitioners.reduce((sum, p) => sum + p.metrics.loyaltyScore, 0) / practitioners.length;

    parts.push(`Volume total: ${(totalVolume / 1000).toFixed(0)}K L/an`);
    parts.push(`${kolCount} KOL(s) | Fidélité moyenne: ${avgLoyalty.toFixed(1)}/10`);
  }

  return parts.join('\n');
}

/**
 * Génère le contexte formaté pour le LLM
 */
function generateLLMContext(
  question: string,
  _analysis: QueryAnalysis,
  practitioners: PractitionerProfile[],
  noteResults: SearchResult[],
  newsResults: SearchResult[]
): string {
  let context = `
═══════════════════════════════════════════════════════════════════
RÉSULTATS DE RECHERCHE UNIVERSELLE
Question: "${question}"
═══════════════════════════════════════════════════════════════════

`;

  if (practitioners.length > 0) {
    context += `PRATICIENS CORRESPONDANTS (${practitioners.length}):\n\n`;

    practitioners.slice(0, 15).forEach((p, idx) => {
      const pubCount = p.news?.filter(n => n.type === 'publication').length || 0;
      const noteCount = p.notes?.length || 0;
      const visitCount = p.visitHistory?.length || 0;

      context += `${idx + 1}. **${p.title} ${p.firstName} ${p.lastName}**\n`;
      context += `   Spécialité: ${p.specialty}${p.subSpecialty ? ` (${p.subSpecialty})` : ''}\n`;
      context += `   Adresse: ${p.address.street}, ${p.address.postalCode} ${p.address.city}\n`;
      context += `   Contact: ${p.contact.phone} | ${p.contact.email}\n`;
      context += `   Métriques: Volume ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an | Fidélité ${p.metrics.loyaltyScore}/10 | V${p.metrics.vingtile}`;
      if (p.metrics.isKOL) context += ' | KOL';
      context += '\n';
      context += `   Données: ${pubCount} pub | ${noteCount} notes | ${visitCount} visites\n`;

      // Ajouter les publications si présentes
      if (pubCount > 0) {
        context += `   Publications:\n`;
        p.news?.filter(n => n.type === 'publication').slice(0, 3).forEach(pub => {
          context += `     - ${pub.title} (${new Date(pub.date).toLocaleDateString('fr-FR')})\n`;
        });
      }

      // Ajouter la dernière note si présente
      if (p.notes && p.notes.length > 0) {
        const lastNote = p.notes[0];
        context += `   Dernière note: ${lastNote.content.substring(0, 80)}...\n`;
      }

      context += '\n';
    });
  }

  if (newsResults.length > 0) {
    context += `\nPUBLICATIONS ET ACTUALITÉS TROUVÉES (${newsResults.length}):\n\n`;
    newsResults.slice(0, 10).forEach((r, idx) => {
      const news = r.data as PractitionerNews;
      context += `${idx + 1}. [${news.type.toUpperCase()}] ${news.title}\n`;
      context += `   Par: ${r.practitioner?.title} ${r.practitioner?.lastName} | ${new Date(news.date).toLocaleDateString('fr-FR')}\n`;
      context += `   ${news.content.substring(0, 100)}...\n\n`;
    });
  }

  if (noteResults.length > 0) {
    context += `\nNOTES DE VISITE PERTINENTES (${noteResults.length}):\n\n`;
    noteResults.slice(0, 10).forEach((r, idx) => {
      const note = r.data as PractitionerNote;
      context += `${idx + 1}. ${r.practitioner?.title} ${r.practitioner?.lastName} (${new Date(note.date).toLocaleDateString('fr-FR')})\n`;
      context += `   ${note.content.substring(0, 150)}...\n`;
      if (note.nextAction) context += `   Action suivante: ${note.nextAction}\n`;
      context += '\n';
    });
  }

  context += '═══════════════════════════════════════════════════════════════════\n';

  return context;
}

/**
 * Recherche rapide par texte (pour l'autocomplétion)
 */
export function quickSearch(query: string, limit: number = 10): PractitionerProfile[] {
  if (!query || query.length < 2) return [];

  const q = query.toLowerCase();
  const practitioners = DataService.getAllPractitioners();

  const scored = practitioners.map(p => {
    let score = 0;
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const city = p.address.city.toLowerCase();

    // Correspondance exacte au début
    if (fullName.startsWith(q)) score += 100;
    else if (p.lastName.toLowerCase().startsWith(q)) score += 80;
    else if (p.firstName.toLowerCase().startsWith(q)) score += 70;
    else if (fullName.includes(q)) score += 50;
    else if (city.includes(q)) score += 30;
    else if (p.specialty.toLowerCase().includes(q)) score += 20;

    // Bonus KOL
    if (p.metrics.isKOL) score += 10;

    return { practitioner: p, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.practitioner);
}

/**
 * Export pour utilisation dans le contexte LLM
 */
export function getFullDatabaseContext(): string {
  const allPractitioners = DataService.getAllPractitioners();
  const stats = DataService.getGlobalStats();

  // Praticiens avec le plus de publications
  const topPublishers = [...allPractitioners]
    .map(p => ({ ...p, pubCount: p.news?.filter(n => n.type === 'publication').length || 0 }))
    .filter(p => p.pubCount > 0)
    .sort((a, b) => b.pubCount - a.pubCount)
    .slice(0, 10);

  // Répartition par prénom
  const byFirstName: Record<string, number> = {};
  allPractitioners.forEach(p => {
    byFirstName[p.firstName] = (byFirstName[p.firstName] || 0) + 1;
  });

  // Répartition par ville
  const byCity: Record<string, number> = {};
  allPractitioners.forEach(p => {
    byCity[p.address.city] = (byCity[p.address.city] || 0) + 1;
  });

  let context = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    BASE DE DONNÉES ARIA - CONTEXTE COMPLET                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

STATISTIQUES GLOBALES:
• Total praticiens: ${stats.totalPractitioners}
• Pneumologues: ${stats.pneumologues}
• Médecins généralistes: ${stats.generalistes}
• KOLs: ${stats.totalKOLs}
• Volume total: ${(stats.totalVolume / 1000).toFixed(0)}K L/an
• Fidélité moyenne: ${stats.averageLoyalty.toFixed(1)}/10

RÉPARTITION PAR VILLE:
${Object.entries(byCity).sort((a, b) => b[1] - a[1]).map(([city, count]) => `• ${city}: ${count}`).join('\n')}

RÉPARTITION PAR PRÉNOM (Top 15):
${Object.entries(byFirstName).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, count]) => `• ${name}: ${count}`).join('\n')}

TOP 10 PRATICIENS AVEC PUBLICATIONS:
${topPublishers.map((p, i) => `${i + 1}. ${p.title} ${p.firstName} ${p.lastName} (${p.specialty}, ${p.address.city}) - ${p.pubCount} publication(s)`).join('\n')}

BASE COMPLÈTE (${allPractitioners.length} praticiens):
${allPractitioners.map(p => {
  const pubCount = p.news?.filter(n => n.type === 'publication').length || 0;
  return `• ${p.title} ${p.firstName} ${p.lastName} | ${p.specialty} | ${p.address.city} | V:${(p.metrics.volumeL / 1000).toFixed(0)}K | F:${p.metrics.loyaltyScore}/10 | V${p.metrics.vingtile}${p.metrics.isKOL ? ' | KOL' : ''}${pubCount > 0 ? ` | ${pubCount} pub` : ''}`;
}).join('\n')}

`;

  return context;
}
