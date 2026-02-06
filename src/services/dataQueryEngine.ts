/**
 * Moteur de requêtes intelligent pour le Coach IA
 * Permet de filtrer, trier et agréger les données des praticiens
 * pour répondre à des questions complexes
 */

import { DataService } from './dataService';
import type { PractitionerProfile } from '../types/database';

export interface QueryResult {
  practitioners: PractitionerProfile[];
  aggregations?: {
    totalCount: number;
    totalVolume: number;
    avgLoyalty: number;
    kolCount: number;
    byCity?: Record<string, number>;
    bySpecialty?: Record<string, number>;
  };
  summary: string;
}

/**
 * Analyse la question de l'utilisateur pour extraire les critères de recherche
 */
export function analyzeQuestion(question: string): {
  filters: {
    firstName?: string;
    lastName?: string;
    specialty?: string;
    city?: string;
    isKOL?: boolean;
    minVolume?: number;
    maxVolume?: number;
    minLoyalty?: number;
    maxLoyalty?: number;
    vingtileMax?: number;
    vingtileMin?: number;
    hasNews?: boolean;
    hasPublications?: boolean;
  };
  sortBy?: 'volume' | 'loyalty' | 'vingtile' | 'newsCount' | 'publicationCount' | 'lastVisit';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  aggregationType?: 'count' | 'sum' | 'avg' | 'max' | 'min';
  groupBy?: 'city' | 'specialty' | 'vingtile';
} {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filters: any = {};

  // Detecter les prenoms dynamiquement depuis la base de donnees reelle
  const allPractitioners = DataService.getAllPractitioners();
  const dbFirstNames = [...new Set(allPractitioners.map(p => p.firstName))];
  const dbLastNames = [...new Set(allPractitioners.map(p => p.lastName))];

  // Prenoms supplementaires courants (au cas ou la question mentionne un prenom absent de la DB)
  const extraPrenoms = ['jean', 'pierre', 'louis', 'michel', 'paul', 'andre', 'francois', 'philippe', 'antoine', 'marc', 'alain', 'jacques', 'henri', 'bernard', 'christophe', 'eric', 'gerard', 'marie', 'sophie', 'catherine', 'anne', 'isabelle', 'claire', 'nathalie', 'sylvie', 'francoise', 'helene', 'valerie', 'monique', 'brigitte', 'elise', 'charlotte'];
  const allPrenoms = [...new Set([...dbFirstNames.map(n => n.toLowerCase()), ...extraPrenoms])];

  // Chercher un prenom mentionne (normalise pour accents)
  for (const prenom of allPrenoms) {
    const prenomNorm = prenom.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (q.includes(prenomNorm) || q.includes(`prenom ${prenomNorm}`) || q.includes(`prenom est ${prenomNorm}`)) {
      // Retrouver le prenom original avec accents depuis la DB
      const original = dbFirstNames.find(n => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === prenomNorm);
      filters.firstName = original || prenom;
      break;
    }
  }

  // Detecter les noms de famille dynamiquement depuis la DB
  const allNoms = [...new Set(dbLastNames.map(n => n.toLowerCase()))];

  for (const nom of allNoms) {
    const nomNorm = nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Verifier que ce n'est pas un prenom deja detecte
    if (filters.firstName?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === nomNorm) continue;
    // Chercher le nom dans des contextes typiques (Dr X, nom X) OU comme mot isolé dans la question
    const wordBoundaryRegex = new RegExp(`(?:^|\\s|')${nomNorm}(?:\\s|$|[?.!,;])`, 'i');
    if (q.includes(`nom ${nomNorm}`) || q.includes(`dr ${nomNorm}`) || q.includes(`docteur ${nomNorm}`) || q.includes(`dr. ${nomNorm}`) || wordBoundaryRegex.test(q)) {
      const original = dbLastNames.find(n => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === nomNorm);
      filters.lastName = original || nom;
      break;
    }
  }

  // Détection spécialité
  if (q.includes('pneumologue') || q.includes('pneumo')) {
    filters.specialty = 'Pneumologue';
  } else if (q.includes('généraliste') || q.includes('generaliste') || q.includes('médecin généraliste')) {
    filters.specialty = 'Médecin généraliste';
  }

  // Détection ville
  const villes = ['lyon', 'grenoble', 'villeurbanne', 'bourg-en-bresse', 'saint-étienne', 'annecy', 'chambéry', 'valence', 'vienne', 'annemasse'];
  for (const ville of villes) {
    if (q.includes(ville)) {
      filters.city = ville;
      break;
    }
  }

  // Détection KOL
  if (q.includes('kol') || q.includes('leader') || q.includes('opinion')) {
    filters.isKOL = true;
  }

  // Détection publications/news
  if (q.includes('publication') || q.includes('publié') || q.includes('article')) {
    filters.hasPublications = true;
  }
  if (q.includes('actualité') || q.includes('news') || q.includes('événement')) {
    filters.hasNews = true;
  }

  // Détection tri
  let sortBy: 'volume' | 'loyalty' | 'vingtile' | 'newsCount' | 'publicationCount' | 'lastVisit' | undefined;
  let sortOrder: 'asc' | 'desc' = 'desc';

  if (q.includes('plus de publication') || q.includes('plus de publications') || q.includes('le plus de publication')) {
    sortBy = 'publicationCount';
    sortOrder = 'desc';
  } else if (q.includes('plus de volume') || q.includes('plus gros prescripteur') || q.includes('plus gros volume')) {
    sortBy = 'volume';
    sortOrder = 'desc';
  } else if (q.includes('plus fidèle') || q.includes('meilleur score') || q.includes('meilleure fidélité')) {
    sortBy = 'loyalty';
    sortOrder = 'desc';
  } else if (q.includes('meilleur vingtile') || q.includes('top vingtile') || q.includes('vingtile le plus bas')) {
    sortBy = 'vingtile';
    sortOrder = 'asc'; // Vingtile 1 = meilleur
  } else if (q.includes('pas vu') || q.includes('non visité') || q.includes("n'ai pas visité")) {
    sortBy = 'lastVisit';
    sortOrder = 'asc'; // Les plus anciens d'abord
  }

  // Détection limite
  let limit: number | undefined;
  const matchTop = q.match(/top\s*(\d+)/);
  const matchPremiers = q.match(/(\d+)\s*premier/);
  const matchMeilleur = q.match(/(\d+)\s*meilleur/);

  if (matchTop) limit = parseInt(matchTop[1]);
  else if (matchPremiers) limit = parseInt(matchPremiers[1]);
  else if (matchMeilleur) limit = parseInt(matchMeilleur[1]);
  else if (q.includes('le plus') || q.includes('la plus') || q.includes('quel médecin') || q.includes('quel praticien')) limit = 1;

  // Détection agrégation
  let aggregationType: 'count' | 'sum' | 'avg' | 'max' | 'min' | undefined;
  if (q.includes('combien')) aggregationType = 'count';
  else if (q.includes('total') || q.includes('somme')) aggregationType = 'sum';
  else if (q.includes('moyenne') || q.includes('moyen')) aggregationType = 'avg';

  // Détection groupBy
  let groupBy: 'city' | 'specialty' | 'vingtile' | undefined;
  if (q.includes('par ville') || q.includes('par city')) groupBy = 'city';
  else if (q.includes('par spécialité') || q.includes('par specialite')) groupBy = 'specialty';
  else if (q.includes('par vingtile')) groupBy = 'vingtile';

  return { filters, sortBy, sortOrder, limit, aggregationType, groupBy };
}

/**
 * Exécute une requête sur les données des praticiens
 */
export function executeQuery(question: string): QueryResult {
  const allPractitioners = DataService.getAllPractitioners();
  const analysis = analyzeQuestion(question);
  const { filters, sortBy, sortOrder = 'desc', limit, groupBy } = analysis;

  // Filtrage
  let results = allPractitioners.filter(p => {
    if (filters.firstName && !p.firstName.toLowerCase().includes(filters.firstName.toLowerCase())) return false;
    if (filters.lastName && !p.lastName.toLowerCase().includes(filters.lastName.toLowerCase())) return false;
    if (filters.specialty && p.specialty !== filters.specialty) return false;
    if (filters.city && !p.address.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.isKOL !== undefined && p.metrics.isKOL !== filters.isKOL) return false;
    if (filters.minVolume && p.metrics.volumeL < filters.minVolume) return false;
    if (filters.maxVolume && p.metrics.volumeL > filters.maxVolume) return false;
    if (filters.minLoyalty && p.metrics.loyaltyScore < filters.minLoyalty) return false;
    if (filters.maxLoyalty && p.metrics.loyaltyScore > filters.maxLoyalty) return false;
    if (filters.vingtileMin && p.metrics.vingtile < filters.vingtileMin) return false;
    if (filters.vingtileMax && p.metrics.vingtile > filters.vingtileMax) return false;
    if (filters.hasPublications && (!p.news || p.news.filter(n => n.type === 'publication').length === 0)) return false;
    if (filters.hasNews && (!p.news || p.news.length === 0)) return false;
    return true;
  });

  // Tri
  if (sortBy) {
    results = results.sort((a, b) => {
      let valA: number, valB: number;

      switch (sortBy) {
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
        case 'newsCount':
          valA = a.news?.length || 0;
          valB = b.news?.length || 0;
          break;
        case 'publicationCount':
          valA = a.news?.filter(n => n.type === 'publication').length || 0;
          valB = b.news?.filter(n => n.type === 'publication').length || 0;
          break;
        case 'lastVisit':
          valA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
          valB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
          break;
        default:
          return 0;
      }

      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }

  // Limite
  if (limit && limit > 0) {
    results = results.slice(0, limit);
  }

  // Agrégations
  const aggregations: QueryResult['aggregations'] = {
    totalCount: results.length,
    totalVolume: results.reduce((sum, p) => sum + p.metrics.volumeL, 0),
    avgLoyalty: results.length > 0 ? results.reduce((sum, p) => sum + p.metrics.loyaltyScore, 0) / results.length : 0,
    kolCount: results.filter(p => p.metrics.isKOL).length,
  };

  // Groupage
  if (groupBy) {
    if (groupBy === 'city') {
      aggregations.byCity = {};
      results.forEach(p => {
        const city = p.address.city;
        aggregations.byCity![city] = (aggregations.byCity![city] || 0) + 1;
      });
    } else if (groupBy === 'specialty') {
      aggregations.bySpecialty = {};
      results.forEach(p => {
        aggregations.bySpecialty![p.specialty] = (aggregations.bySpecialty![p.specialty] || 0) + 1;
      });
    }
  }

  // Générer un résumé
  let summary = '';
  if (results.length === 0) {
    summary = 'Aucun praticien ne correspond aux critères de recherche.';
  } else if (results.length === 1) {
    const p = results[0];
    const publicationCount = p.news?.filter(n => n.type === 'publication').length || 0;
    summary = `Résultat : ${p.title} ${p.firstName} ${p.lastName}, ${p.specialty} à ${p.address.city}. ` +
      `Volume : ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an, Fidélité : ${p.metrics.loyaltyScore}/10, Vingtile : ${p.metrics.vingtile}` +
      (p.metrics.isKOL ? ', KOL' : '') +
      (publicationCount > 0 ? `. ${publicationCount} publication(s) référencée(s).` : '');
  } else {
    summary = `${results.length} praticiens trouvés. ` +
      `Volume total : ${(aggregations.totalVolume / 1000).toFixed(0)}K L/an, ` +
      `Fidélité moyenne : ${aggregations.avgLoyalty.toFixed(1)}/10, ` +
      `KOLs : ${aggregations.kolCount}`;
  }

  return { practitioners: results, aggregations, summary };
}

/**
 * Génère un contexte formaté pour le LLM basé sur les résultats de la requête
 */
export function generateQueryContext(question: string): string {
  const result = executeQuery(question);

  let context = `
═══════════════════════════════════════════════════════════════════════════
RÉSULTATS DE RECHERCHE POUR : "${question}"
═══════════════════════════════════════════════════════════════════════════

RÉSUMÉ : ${result.summary}

`;

  if (result.practitioners.length > 0) {
    context += `PRATICIENS CORRESPONDANTS (${result.practitioners.length}) :\n\n`;

    result.practitioners.slice(0, 15).forEach((p, idx) => {
      const publicationCount = p.news?.filter(n => n.type === 'publication').length || 0;
      const conferenceCount = p.news?.filter(n => n.type === 'conference').length || 0;
      const certificationCount = p.news?.filter(n => n.type === 'certification').length || 0;

      context += `${idx + 1}. ${p.title} ${p.firstName} ${p.lastName}\n`;
      context += `   • Spécialité : ${p.specialty}${p.subSpecialty ? ` (${p.subSpecialty})` : ''}\n`;
      context += `   • Adresse complète : ${p.address.street}, ${p.address.postalCode} ${p.address.city}\n`;
      context += `   • Volume annuel : ${(p.metrics.volumeL / 1000).toFixed(1)}K L/an\n`;
      context += `   • Fidélité : ${p.metrics.loyaltyScore}/10 | Vingtile : ${p.metrics.vingtile}\n`;
      context += `   • Statut : ${p.metrics.isKOL ? 'KOL' : 'Praticien standard'}\n`;
      context += `   • Contact : ${p.contact.email} | ${p.contact.phone}\n`;

      if (publicationCount > 0 || conferenceCount > 0 || certificationCount > 0) {
        context += `   • Actualités : ${publicationCount} publication(s), ${conferenceCount} conférence(s), ${certificationCount} certification(s)\n`;
      }

      // Détails des publications si pertinent
      if (publicationCount > 0) {
        const publications = p.news?.filter(n => n.type === 'publication') || [];
        publications.forEach(pub => {
          context += `     → [${new Date(pub.date).toLocaleDateString('fr-FR')}] ${pub.title}: ${pub.content}\n`;
        });
      }

      context += `   • Dernière visite : ${p.lastVisitDate ? new Date(p.lastVisitDate).toLocaleDateString('fr-FR') : 'Jamais'}\n`;
      context += '\n';
    });

    if (result.practitioners.length > 15) {
      context += `... et ${result.practitioners.length - 15} autres praticiens.\n\n`;
    }
  }

  if (result.aggregations) {
    context += `STATISTIQUES AGRÉGÉES :\n`;
    context += `   • Total praticiens : ${result.aggregations.totalCount}\n`;
    context += `   • Volume total : ${(result.aggregations.totalVolume / 1000).toFixed(0)}K L/an\n`;
    context += `   • Fidélité moyenne : ${result.aggregations.avgLoyalty.toFixed(1)}/10\n`;
    context += `   • KOLs : ${result.aggregations.kolCount}\n`;

    if (result.aggregations.byCity) {
      context += `   • Par ville : ${Object.entries(result.aggregations.byCity).map(([city, count]) => `${city}: ${count}`).join(', ')}\n`;
    }
    if (result.aggregations.bySpecialty) {
      context += `   • Par spécialité : ${Object.entries(result.aggregations.bySpecialty).map(([spec, count]) => `${spec}: ${count}`).join(', ')}\n`;
    }
  }

  context += '\n═══════════════════════════════════════════════════════════════════════════\n';

  return context;
}

/**
 * Génère un contexte complet incluant toutes les données disponibles
 * pour les questions générales sur le site
 */
export function generateFullSiteContext(): string {
  const allPractitioners = DataService.getAllPractitioners();
  const stats = DataService.getGlobalStats();
  const kols = DataService.getKOLs();

  // Praticiens avec le plus de publications
  const topPublishers = [...allPractitioners]
    .filter(p => p.news && p.news.filter(n => n.type === 'publication').length > 0)
    .sort((a, b) => {
      const pubA = a.news?.filter(n => n.type === 'publication').length || 0;
      const pubB = b.news?.filter(n => n.type === 'publication').length || 0;
      return pubB - pubA;
    })
    .slice(0, 10);

  // Top prescripteurs par volume
  const topPrescribers = [...allPractitioners]
    .sort((a, b) => b.metrics.volumeL - a.metrics.volumeL)
    .slice(0, 10);

  // Praticiens par ville
  const byCity: Record<string, number> = {};
  allPractitioners.forEach(p => {
    byCity[p.address.city] = (byCity[p.address.city] || 0) + 1;
  });

  // Praticiens par prénom
  const byFirstName: Record<string, number> = {};
  allPractitioners.forEach(p => {
    byFirstName[p.firstName] = (byFirstName[p.firstName] || 0) + 1;
  });

  const context = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    CONTEXTE COMPLET DE LA BASE DE DONNÉES                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

STATISTIQUES GLOBALES :
   • Total praticiens : ${stats.totalPractitioners}
   • Pneumologues : ${stats.pneumologues}
   • Médecins généralistes : ${stats.generalistes}
   • KOLs identifiés : ${stats.totalKOLs}
   • Volume total annuel : ${(stats.totalVolume / 1000).toFixed(0)}K L/an
   • Fidélité moyenne : ${stats.averageLoyalty.toFixed(1)}/10

RÉPARTITION PAR VILLE :
${Object.entries(byCity).sort((a, b) => b[1] - a[1]).map(([city, count]) => `   • ${city}: ${count} praticiens`).join('\n')}

RÉPARTITION PAR PRÉNOM :
${Object.entries(byFirstName).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, count]) => `   • ${name}: ${count} praticiens`).join('\n')}

TOP 10 PRATICIENS PAR VOLUME :
${topPrescribers.map((p, i) => `   ${i + 1}. ${p.title} ${p.firstName} ${p.lastName} (${p.specialty}, ${p.address.city}) - ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an${p.metrics.isKOL ? ' [KOL]' : ''}`).join('\n')}

KEY OPINION LEADERS (${kols.length}) :
${kols.slice(0, 10).map((p, i) => `   ${i + 1}. ${p.title} ${p.firstName} ${p.lastName} (${p.specialty}, ${p.address.city}) - ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an, Fidélité: ${p.metrics.loyaltyScore}/10`).join('\n')}

TOP 10 PRATICIENS AVEC LE PLUS DE PUBLICATIONS :
${topPublishers.length > 0 ? topPublishers.map((p, i) => {
  const pubCount = p.news?.filter(n => n.type === 'publication').length || 0;
  return `   ${i + 1}. ${p.title} ${p.firstName} ${p.lastName} (${p.specialty}, ${p.address.city}) - ${pubCount} publication(s)`;
}).join('\n') : '   Aucun praticien avec des publications référencées.'}

═══════════════════════════════════════════════════════════════════════════════
BASE DE DONNÉES COMPLÈTE (${allPractitioners.length} praticiens) :
═══════════════════════════════════════════════════════════════════════════════
${allPractitioners.map(p => {
  const pubCount = p.news?.filter(n => n.type === 'publication').length || 0;
  return `• ${p.title} ${p.firstName} ${p.lastName} | ${p.specialty} | ${p.address.street}, ${p.address.postalCode} ${p.address.city} | Tel: ${p.contact.phone} | Email: ${p.contact.email} | V:${(p.metrics.volumeL / 1000).toFixed(0)}K | F:${p.metrics.loyaltyScore}/10 | V${p.metrics.vingtile}${p.metrics.isKOL ? ' | KOL' : ''}${pubCount > 0 ? ` | ${pubCount} pub` : ''}`;
}).join('\n')}

`;

  return context;
}
