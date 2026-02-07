import type { Practitioner } from '../types';
import { DataService } from './dataService';
import { executeQuery, analyzeQuestion } from './dataQueryEngine';
import { adaptPractitionerProfile } from './dataAdapter';

export interface CoachResponse {
  message: string;
  practitioners?: (Practitioner & { daysSinceVisit?: number; priorityScore?: number })[];
  insights?: string[];
  actions?: { label: string; onClick: () => void }[];
  isMarkdown?: boolean;
  isGenericHelp?: boolean;
  isNoMatch?: boolean;
}

// Calcul des jours depuis une date
function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================
// SEMANTIC SYNONYM NORMALIZATION
// ============================================
function normalizeQuestion(q: string): string {
  const synonyms: [RegExp, string][] = [
    // Risk synonyms
    [/\b(surveiller|attention|danger|précaires?|fragiles?|alertes?|déclin|en\s+danger)\b/gi, 'risque'],
    // Priority synonyms
    [/\b(urgent|focus|cruciale?|critiques?|important)\b/gi, 'priorité'],
    // Trend synonyms
    [/\b(progression|historique)\b/gi, 'tendance'],
    // Top synonyms
    [/\b(champions?|vedettes?|stars?)\b/gi, 'meilleur'],
    // Loyalty synonyms
    [/\b(engagements?|loyaux|loyal)\b/gi, 'fidélité'],
    // Opportunity synonyms
    [/\b(prospects?|prospection|conquête|acquisition)\b/gi, 'opportunité'],
  ];

  let normalized = q;
  for (const [pattern, replacement] of synonyms) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
}

/**
 * Système de réponse intelligent utilisant le moteur de requêtes
 * Fonctionne SANS le LLM en analysant la question et les données
 */
export function generateSmartResponse(
  question: string,
  practitioners: Practitioner[],
  userObjectives: { visitsMonthly: number; visitsCompleted: number }
): CoachResponse {
  // Apply semantic normalization before pattern matching
  const normalized = normalizeQuestion(question);
  const q = normalized.toLowerCase();
  const analysis = analyzeQuestion(normalized);
  const queryResult = executeQuery(normalized);

  // 1. Questions sur des praticiens spécifiques (nom, prénom)
  if (analysis.filters.firstName || analysis.filters.lastName) {
    if (q.includes('actualit') || q.includes('news') || q.includes('nouveaut') || q.includes('récent') || q.includes('recent') || q.includes('dernièr') || q.includes('dernier')) {
      return handlePractitionerNewsQuery(queryResult, analysis, question);
    }
    // Trend question about a specific practitioner
    if (q.includes('tendance') || q.includes('évolution') || q.includes('evolution') || q.includes('au cours du temps')) {
      return handlePractitionerTrendQuery(queryResult, analysis);
    }
    return handlePractitionerSearch(queryResult, analysis, question);
  }

  // 2. Questions sur les publications
  if (q.includes('publication') || q.includes('publié') || q.includes('article') || q.includes('a le plus de publication')) {
    return handlePublicationsQuery(queryResult, analysis, question);
  }

  // 3. "Depuis X jours" filtering — before other handlers
  const daysMatch = q.match(/(?:depuis|plus\s+de|pas\s+vu.*depuis)\s+(\d+)\s+jours?/);
  if (daysMatch) {
    return handleDaysSinceQuery(parseInt(daysMatch[1]), practitioners, q);
  }

  // 4. Comparison / versus queries
  if (q.includes('compar') || q.includes(' vs ') || q.includes('versus') || q.includes('contre') || q.includes('différence entre')) {
    return handleComparisonQuery(question, practitioners);
  }

  // 5. Trend / evolution queries (general, not specific practitioner)
  if (q.includes('tendance') || q.includes('évolution') || q.includes('evolution') || q.includes('au cours du temps') || q.includes('progression')) {
    return handleGeneralTrendQuery(practitioners);
  }

  // 6. Definition / explanation queries
  if (q.includes('qu\'est-ce') || q.includes('c\'est quoi') || q.includes('signifie') || q.includes('définition') || q.includes('definition') || q.includes('expliqu')) {
    return handleDefinitionQuery(q);
  }

  // 7. Questions statistiques (combien, moyenne, total)
  if (analysis.aggregationType === 'count' || q.includes('combien')) {
    return handleCountQuery(queryResult, analysis, question);
  }

  // 8. Questions géographiques (par ville)
  if (analysis.filters.city || q.includes('à lyon') || q.includes('à grenoble') || q.includes('par ville')) {
    return handleGeographicQuery(queryResult, analysis, question);
  }

  // 9. Questions sur les KOLs
  if (analysis.filters.isKOL || q.includes('kol') || q.includes('leader') || q.includes('opinion')) {
    return handleKOLQuery(practitioners, userObjectives);
  }

  // 10. Questions sur les priorités de visite
  if (q.includes('priorité') || q.includes('voir') || q.includes('semaine') || q.includes('aujourd')) {
    return handlePriorityQuery(practitioners, userObjectives);
  }

  // 11. Questions sur les objectifs
  if (q.includes('objectif') || q.includes('atteindre') || q.includes('sauver')) {
    return handleObjectiveQuery(practitioners, userObjectives);
  }

  // 12. Questions sur les risques
  if (q.includes('risque') || q.includes('perdre') || q.includes('churn') || q.includes('baisse')) {
    return handleRiskQuery(practitioners, userObjectives);
  }

  // 13. Questions sur les opportunités
  if (q.includes('nouveau') || q.includes('potentiel') || q.includes('opportunité')) {
    return handleOpportunitiesQuery(practitioners, userObjectives);
  }

  // 14. Questions sur le top/classement
  if (q.includes('top') || q.includes('meilleur') || q.includes('premier') || q.includes('plus gros') || q.includes('classement')) {
    return handleTopQuery(queryResult, analysis, question);
  }

  // 15. Questions sur les vingtiles
  if (q.includes('vingtile')) {
    return handleVingtileQuery(queryResult, analysis, question);
  }

  // 16. Questions sur la fidélité
  if (q.includes('fidélité') || q.includes('fidelite') || q.includes('fidèle')) {
    return handleLoyaltyQuery(practitioners);
  }

  // 17. Questions sur les spécialités
  if (q.includes('spécialité') || q.includes('specialite') || q.includes('pneumologue') || q.includes('généraliste')) {
    return handleSpecialtyQuery(q, practitioners);
  }

  // 18. Si des résultats ont été trouvés par le moteur de requêtes
  if (queryResult.practitioners.length > 0 && queryResult.practitioners.length < DataService.getAllPractitioners().length) {
    return handleGenericQueryResult(queryResult, question);
  }

  // 19. Smart fallback — try to answer with territory overview
  return getSmartFallback(q, practitioners, userObjectives);
}

function handlePractitionerNewsQuery(queryResult: ReturnType<typeof executeQuery>, analysis: ReturnType<typeof analyzeQuestion>, _question: string): CoachResponse {
  if (queryResult.practitioners.length === 0) {
    const nameHint = [analysis.filters.firstName, analysis.filters.lastName].filter(Boolean).join(' ');
    return {
      message: `Je n'ai trouvé aucun praticien correspondant à **${nameHint}**. Vérifiez l'orthographe ou essayez avec un autre critère.`,
      insights: ['Conseil : Essayez avec juste le prénom ou le nom de famille'],
      isMarkdown: true,
      isNoMatch: true
    };
  }

  // Focus sur les actualités des praticiens trouvés
  const results = queryResult.practitioners.slice(0, 3);
  const parts: string[] = [];

  for (const p of results) {
    const news = p.news || [];
    const notes = p.notes || [];

    parts.push(`## ${p.title} ${p.firstName} ${p.lastName}`);
    parts.push(`*${p.specialty} à ${p.address.city}*\n`);

    if (news.length > 0) {
      parts.push(`**Actualités récentes (${news.length}) :**\n`);
      news.slice(0, 5).forEach((n, i) => {
        const typeLabel = n.type === 'publication' ? 'Publication' :
                          n.type === 'conference' ? 'Conférence' :
                          n.type === 'certification' ? 'Certification' :
                          n.type === 'award' ? 'Distinction' : 'Événement';
        parts.push(`${i + 1}. **[${typeLabel}]** ${n.title}`);
        parts.push(`   _${new Date(n.date).toLocaleDateString('fr-FR')}_ — ${n.content}`);
        if (n.relevance) parts.push(`   → ${n.relevance}`);
      });
    } else {
      parts.push('Aucune actualité récente enregistrée pour ce praticien.');
    }

    if (notes.length > 0) {
      parts.push(`\n**Dernières notes de visite :**\n`);
      notes.slice(0, 3).forEach(note => {
        parts.push(`- _${new Date(note.date).toLocaleDateString('fr-FR')}_ : ${note.content.substring(0, 150)}`);
        if (note.nextAction) parts.push(`  → Action : ${note.nextAction}`);
      });
    }
  }

  return {
    message: parts.join('\n'),
    practitioners: results.slice(0, 5).map(p => ({
      ...adaptPractitionerProfile(p),
      daysSinceVisit: daysSince(p.lastVisitDate || null)
    })),
    insights: results.length === 1 ? [
      `Volume: ${(results[0].metrics.volumeL / 1000).toFixed(0)}K L/an | Fidélité: ${results[0].metrics.loyaltyScore}/10`,
      results[0].metrics.isKOL ? 'Key Opinion Leader' : `Vingtile: ${results[0].metrics.vingtile}`
    ] : undefined,
    isMarkdown: true
  };
}

function handlePractitionerSearch(queryResult: ReturnType<typeof executeQuery>, analysis: ReturnType<typeof analyzeQuestion>, question: string): CoachResponse {
  if (queryResult.practitioners.length === 0) {
    return {
      message: `Je n'ai trouvé aucun praticien correspondant à votre recherche "${question}". Vérifiez l'orthographe ou essayez avec un autre critère.`,
      insights: [
        'Conseil : Essayez avec juste le prénom ou le nom de famille',
        'Vous pouvez aussi chercher par ville ou spécialité'
      ],
      isMarkdown: true,
      isNoMatch: true
    };
  }

  const adaptedPractitioners = queryResult.practitioners
    .slice(0, 5)
    .map(p => ({
      ...adaptPractitionerProfile(p),
      daysSinceVisit: daysSince(p.lastVisitDate || null)
    }));

  if (question.toLowerCase().includes('plus de publication')) {
    const sorted = [...queryResult.practitioners].sort((a, b) => {
      const pubA = a.news?.filter(n => n.type === 'publication').length || 0;
      const pubB = b.news?.filter(n => n.type === 'publication').length || 0;
      return pubB - pubA;
    });

    const best = sorted[0];
    const pubCount = best.news?.filter(n => n.type === 'publication').length || 0;

    if (pubCount === 0) {
      return {
        message: `Parmi les praticiens ${analysis.filters.firstName ? `prénommés **${analysis.filters.firstName}**` : ''} trouvés, **aucun n'a de publications** référencées dans notre base.`,
        practitioners: adaptedPractitioners,
        insights: [
          `${queryResult.practitioners.length} praticien(s) correspondent à votre recherche`,
          'Les publications sont mises à jour régulièrement depuis les sources médicales'
        ],
        isMarkdown: true
      };
    }

    const publications = best.news?.filter(n => n.type === 'publication') || [];

    return {
      message: `Le praticien ${analysis.filters.firstName ? `prénommé **${analysis.filters.firstName}**` : ''} avec le plus de publications est :\n\n**${best.title} ${best.firstName} ${best.lastName}**\n- ${best.specialty} à ${best.address.city}\n- **${pubCount} publication(s)** référencée(s)\n- Volume: ${(best.metrics.volumeL / 1000).toFixed(0)}K L/an | Fidélité: ${best.metrics.loyaltyScore}/10${best.metrics.isKOL ? '\n- **Key Opinion Leader**' : ''}\n\n**Publications :**\n${publications.map(pub => `- _${pub.title}_ (${new Date(pub.date).toLocaleDateString('fr-FR')})`).join('\n')}`,
      practitioners: [{ ...adaptPractitionerProfile(best), daysSinceVisit: daysSince(best.lastVisitDate || null) }],
      isMarkdown: true
    };
  }

  const firstResult = queryResult.practitioners[0];
  const pubCount = firstResult.news?.filter(n => n.type === 'publication').length || 0;

  return {
    message: queryResult.practitioners.length === 1
      ? `**${firstResult.title} ${firstResult.firstName} ${firstResult.lastName}**\n\n- ${firstResult.specialty} à ${firstResult.address.city}\n- Adresse: ${firstResult.address.street}, ${firstResult.address.postalCode}\n- Tél: ${firstResult.contact.phone}\n- Email: ${firstResult.contact.email}\n- Volume: **${(firstResult.metrics.volumeL / 1000).toFixed(0)}K L/an** | Fidélité: **${firstResult.metrics.loyaltyScore}/10** | Vingtile: **${firstResult.metrics.vingtile}**${firstResult.metrics.isKOL ? '\n- **Key Opinion Leader**' : ''}${pubCount > 0 ? `\n- **${pubCount} publication(s)**` : ''}`
      : `J'ai trouvé **${queryResult.practitioners.length} praticien(s)** correspondant à votre recherche :`,
    practitioners: adaptedPractitioners,
    insights: queryResult.practitioners.length > 1 ? [
      `Volume total: ${(queryResult.aggregations!.totalVolume / 1000).toFixed(0)}K L/an`,
      `${queryResult.aggregations!.kolCount} KOL(s) parmi les résultats`
    ] : undefined,
    isMarkdown: true
  };
}

function handlePublicationsQuery(_queryResult: ReturnType<typeof executeQuery>, analysis: ReturnType<typeof analyzeQuestion>, _question: string): CoachResponse {
  const allPractitioners = DataService.getAllPractitioners();

  const withPublications = allPractitioners
    .map(p => ({
      ...p,
      publicationCount: p.news?.filter(n => n.type === 'publication').length || 0
    }))
    .filter(p => p.publicationCount > 0)
    .sort((a, b) => b.publicationCount - a.publicationCount);

  if (withPublications.length === 0) {
    return {
      message: `Aucun praticien n'a de publications référencées dans notre base de données actuellement.`,
      insights: ['Les publications sont mises à jour régulièrement depuis les sources médicales'],
      isMarkdown: true
    };
  }

  if (analysis.filters.firstName || analysis.filters.lastName) {
    const filtered = withPublications.filter(p => {
      if (analysis.filters.firstName && !p.firstName.toLowerCase().includes(analysis.filters.firstName.toLowerCase())) return false;
      if (analysis.filters.lastName && !p.lastName.toLowerCase().includes(analysis.filters.lastName.toLowerCase())) return false;
      return true;
    });

    if (filtered.length === 0) {
      return {
        message: `Aucun praticien ${analysis.filters.firstName ? `prénommé **${analysis.filters.firstName}**` : ''}${analysis.filters.lastName ? ` nommé **${analysis.filters.lastName}**` : ''} n'a de publications dans notre base.`,
        insights: ['Voici les praticiens avec le plus de publications :'],
        practitioners: withPublications.slice(0, 5).map(p => ({
          ...adaptPractitionerProfile(p),
          daysSinceVisit: daysSince(p.lastVisitDate || null)
        })),
        isMarkdown: true
      };
    }

    const best = filtered[0];
    const publications = best.news?.filter(n => n.type === 'publication') || [];

    return {
      message: `**${best.title} ${best.firstName} ${best.lastName}** a **${best.publicationCount} publication(s)** :\n\n${publications.map(pub => `- **${pub.title}**\n  _${pub.content}_\n  ${new Date(pub.date).toLocaleDateString('fr-FR')}`).join('\n\n')}`,
      practitioners: [{ ...adaptPractitionerProfile(best), daysSinceVisit: daysSince(best.lastVisitDate || null) }],
      isMarkdown: true
    };
  }

  const limit = analysis.limit || 5;
  const top = withPublications.slice(0, limit);

  return {
    message: `**Top ${limit} praticiens par nombre de publications :**\n\n${top.map((p, i) => `${i + 1}. **${p.title} ${p.firstName} ${p.lastName}** - ${p.publicationCount} publication(s)\n   ${p.specialty} à ${p.address.city}${p.metrics.isKOL ? ' | KOL' : ''}`).join('\n\n')}`,
    practitioners: top.map(p => ({
      ...adaptPractitionerProfile(p),
      daysSinceVisit: daysSince(p.lastVisitDate || null)
    })),
    insights: [
      `${withPublications.length} praticiens ont au moins une publication`,
      `Total de ${withPublications.reduce((sum, p) => sum + p.publicationCount, 0)} publications référencées`
    ],
    isMarkdown: true
  };
}

function handleCountQuery(queryResult: ReturnType<typeof executeQuery>, analysis: ReturnType<typeof analyzeQuestion>, question: string): CoachResponse {
  const q = question.toLowerCase();

  if (analysis.filters.city) {
    const city = analysis.filters.city;
    const cityPractitioners = queryResult.practitioners;

    let message = `**${cityPractitioners.length} praticien(s)** à **${city.charAt(0).toUpperCase() + city.slice(1)}**`;

    if (analysis.filters.specialty) {
      message = `**${cityPractitioners.length} ${analysis.filters.specialty.toLowerCase()}(s)** à **${city.charAt(0).toUpperCase() + city.slice(1)}**`;
    }

    return {
      message,
      practitioners: cityPractitioners.slice(0, 5).map(p => ({
        ...adaptPractitionerProfile(p),
        daysSinceVisit: daysSince(p.lastVisitDate || null)
      })),
      insights: [
        `Volume total: ${(queryResult.aggregations!.totalVolume / 1000).toFixed(0)}K L/an`,
        `${queryResult.aggregations!.kolCount} KOL(s)`,
        `Fidélité moyenne: ${queryResult.aggregations!.avgLoyalty.toFixed(1)}/10`
      ],
      isMarkdown: true
    };
  }

  if (analysis.filters.specialty) {
    const spec = analysis.filters.specialty;
    return {
      message: `**${queryResult.practitioners.length} ${spec.toLowerCase()}(s)** dans votre territoire`,
      practitioners: queryResult.practitioners.slice(0, 5).map(p => ({
        ...adaptPractitionerProfile(p),
        daysSinceVisit: daysSince(p.lastVisitDate || null)
      })),
      insights: [
        `Volume total: ${(queryResult.aggregations!.totalVolume / 1000).toFixed(0)}K L/an`,
        `${queryResult.aggregations!.kolCount} KOL(s)`
      ],
      isMarkdown: true
    };
  }

  if (q.includes('kol')) {
    const kols = DataService.getKOLs();
    return {
      message: `**${kols.length} Key Opinion Leaders (KOLs)** dans votre territoire`,
      practitioners: kols.slice(0, 5).map(p => ({
        ...adaptPractitionerProfile(p),
        daysSinceVisit: daysSince(p.lastVisitDate || null)
      })),
      insights: [
        `Volume total KOLs: ${(kols.reduce((s, p) => s + p.metrics.volumeL, 0) / 1000).toFixed(0)}K L/an`,
        'Les KOLs représentent vos prescripteurs les plus influents'
      ],
      isMarkdown: true
    };
  }

  const stats = DataService.getGlobalStats();
  return {
    message: `**${stats.totalPractitioners} praticiens** dans votre territoire :\n\n- **${stats.pneumologues}** pneumologues\n- **${stats.generalistes}** médecins généralistes\n- **${stats.totalKOLs}** KOLs`,
    insights: [
      `Volume total: ${(stats.totalVolume / 1000).toFixed(0)}K L/an`,
      `Fidélité moyenne: ${stats.averageLoyalty.toFixed(1)}/10`
    ],
    isMarkdown: true
  };
}

function handleGeographicQuery(queryResult: ReturnType<typeof executeQuery>, analysis: ReturnType<typeof analyzeQuestion>, _question: string): CoachResponse {
  const city = analysis.filters.city;

  if (city) {
    const cityName = city.charAt(0).toUpperCase() + city.slice(1);

    if (queryResult.practitioners.length === 0) {
      return {
        message: `Aucun praticien trouvé à **${cityName}**.`,
        insights: ['Vérifiez l\'orthographe de la ville'],
        isMarkdown: true
      };
    }

    return {
      message: `**${queryResult.practitioners.length} praticien(s) à ${cityName}** :\n\n${queryResult.practitioners.slice(0, 8).map((p, i) => `${i + 1}. **${p.title} ${p.firstName} ${p.lastName}** - ${p.specialty}\n   ${p.address.street}\n   ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an${p.metrics.isKOL ? ' | KOL' : ''}`).join('\n\n')}`,
      practitioners: queryResult.practitioners.slice(0, 5).map(p => ({
        ...adaptPractitionerProfile(p),
        daysSinceVisit: daysSince(p.lastVisitDate || null)
      })),
      insights: [
        `Volume total ${cityName}: ${(queryResult.aggregations!.totalVolume / 1000).toFixed(0)}K L/an`,
        `${queryResult.aggregations!.kolCount} KOL(s) dans cette ville`
      ],
      isMarkdown: true
    };
  }

  const allPractitioners = DataService.getAllPractitioners();
  const byCity: Record<string, number> = {};
  allPractitioners.forEach(p => {
    byCity[p.address.city] = (byCity[p.address.city] || 0) + 1;
  });

  const sortedCities = Object.entries(byCity).sort((a, b) => b[1] - a[1]);

  return {
    message: `**Répartition géographique** de vos ${allPractitioners.length} praticiens :\n\n${sortedCities.map(([city, count]) => `- **${city}**: ${count} praticien(s)`).join('\n')}`,
    insights: [
      `${sortedCities.length} villes couvertes`,
      `Ville principale: **${sortedCities[0][0]}** (${sortedCities[0][1]} praticiens)`
    ],
    isMarkdown: true
  };
}

function handleKOLQuery(practitioners: Practitioner[], userObjectives: { visitsMonthly: number; visitsCompleted: number }): CoachResponse {
  const kols = practitioners
    .filter(p => p.isKOL)
    .map(p => ({ ...p, daysSinceVisit: daysSince(p.lastVisitDate) }))
    .sort((a, b) => b.daysSinceVisit - a.daysSinceVisit);

  const notSeenRecently = kols.filter(k => k.daysSinceVisit > 60);
  const visitsRemaining = userObjectives.visitsMonthly - userObjectives.visitsCompleted;

  return {
    message: `Vous avez **${kols.length} KOLs** sur votre territoire.${notSeenRecently.length > 0 ? ` **${notSeenRecently.length}** n'ont pas été vus depuis plus de 60 jours :` : ''}`,
    practitioners: notSeenRecently.length > 0 ? notSeenRecently.slice(0, 5) : kols.slice(0, 5),
    insights: [
      notSeenRecently.length > 0
        ? `URGENT: **${notSeenRecently.length} KOL(s)** nécessitent une visite urgente`
        : `Tous vos KOLs ont été vus récemment. Excellent travail.`,
      `Impact objectif : ${Math.min(notSeenRecently.length, visitsRemaining)} visite(s) KOL comptabilisée(s) sur vos ${visitsRemaining} visites restantes ce mois`
    ],
    isMarkdown: true
  };
}

function handlePriorityQuery(practitioners: Practitioner[], userObjectives: { visitsMonthly: number; visitsCompleted: number }): CoachResponse {
  const sorted = [...practitioners]
    .map(p => ({
      ...p,
      priorityScore: p.vingtile + daysSince(p.lastVisitDate) / 30,
      daysSinceVisit: daysSince(p.lastVisitDate)
    }))
    .sort((a, b) => a.priorityScore - b.priorityScore)
    .slice(0, 5);

  const progress = Math.round(userObjectives.visitsCompleted / userObjectives.visitsMonthly * 100);

  return {
    message: `Vous êtes à **${userObjectives.visitsCompleted}/${userObjectives.visitsMonthly}** visites ce mois (**${progress}%**). Voici mes **5 recommandations prioritaires** :`,
    practitioners: sorted,
    insights: [
      `En visitant ces 5 praticiens, vous atteindrez **${Math.min(userObjectives.visitsCompleted + 5, userObjectives.visitsMonthly)}/${userObjectives.visitsMonthly}** visites`,
      sorted.some(p => p.vingtile <= 2) ? `IMPORTANT: **${sorted.filter(p => p.vingtile <= 2).length} praticien(s)** du Top 10% à voir en urgence` : null
    ].filter(Boolean) as string[],
    isMarkdown: true
  };
}

function handleObjectiveQuery(practitioners: Practitioner[], userObjectives: { visitsMonthly: number; visitsCompleted: number }): CoachResponse {
  const gap = userObjectives.visitsMonthly - userObjectives.visitsCompleted;
  const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
  const visitsPerDay = Math.ceil(gap / Math.max(daysLeft, 1));

  const quickWins = practitioners
    .filter(p => p.preferredChannel === 'Téléphone' || daysSince(p.lastVisitDate) > 30)
    .sort((a, b) => a.vingtile - b.vingtile)
    .slice(0, gap);

  return {
    message: `Pour atteindre votre objectif de **${userObjectives.visitsMonthly} visites**, il vous reste **${gap} visites** à réaliser en **${daysLeft} jours** (~${visitsPerDay} visites/jour).`,
    practitioners: quickWins.slice(0, 5).map(p => ({ ...p, daysSinceVisit: daysSince(p.lastVisitDate) })),
    insights: [
      `**Stratégie recommandée** : privilégiez les praticiens joignables par téléphone pour des visites rapides`,
      `**${quickWins.filter(p => p.preferredChannel === 'Téléphone').length}** praticiens préfèrent le contact téléphonique`
    ],
    isMarkdown: true
  };
}

function handleRiskQuery(practitioners: Practitioner[], userObjectives: { visitsMonthly: number; visitsCompleted: number }): CoachResponse {
  const atRisk = practitioners
    .filter(p => p.trend === 'down' || p.loyaltyScore < 5)
    .sort((a, b) => a.loyaltyScore - b.loyaltyScore)
    .slice(0, 5)
    .map(p => ({ ...p, daysSinceVisit: daysSince(p.lastVisitDate) }));

  const totalVolumeAtRisk = atRisk.reduce((sum, p) => sum + p.volumeL, 0);
  const visitsRemaining = userObjectives.visitsMonthly - userObjectives.visitsCompleted;

  return {
    message: `J'ai identifié **${atRisk.length} praticiens à risque** de churn :`,
    practitioners: atRisk,
    insights: [
      `ATTENTION: Ces praticiens montrent des signes de **désengagement** (baisse prescriptions ou fidélité faible)`,
      `**Volume à risque** : ${(totalVolumeAtRisk / 1000).toFixed(0)}K L/an - impact direct sur vos résultats trimestriels`,
      `Prioriser **${Math.min(atRisk.length, visitsRemaining)} visite(s)** de réactivation ce mois peut stabiliser ce volume`
    ],
    isMarkdown: true
  };
}

function handleOpportunitiesQuery(practitioners: Practitioner[], userObjectives: { visitsMonthly: number; visitsCompleted: number }): CoachResponse {
  const opportunities = practitioners
    .filter(p => p.visitCount === 0 || !p.lastVisitDate)
    .filter(p => p.vingtile <= 5)
    .sort((a, b) => a.vingtile - b.vingtile)
    .slice(0, 5)
    .map(p => ({ ...p, daysSinceVisit: daysSince(p.lastVisitDate) }));

  const potentialVolume = opportunities.reduce((sum, p) => sum + p.volumeL, 0);
  const visitsRemaining = userObjectives.visitsMonthly - userObjectives.visitsCompleted;

  return {
    message: `Voici **${opportunities.length} opportunités** de nouveaux prescripteurs à fort potentiel :`,
    practitioners: opportunities,
    insights: [
      `Ces praticiens sont dans le **Top 25%** mais n'ont jamais été contactés`,
      `**Potentiel cumulé** : ${(potentialVolume / 1000).toFixed(0)}K L/an - impact significatif sur vos objectifs annuels`,
      `**${Math.min(opportunities.length, visitsRemaining)} visite(s)** d'approche ce mois = ${Math.min(opportunities.length, visitsRemaining)}/${userObjectives.visitsMonthly} visites comptabilisées vers votre objectif`
    ],
    isMarkdown: true
  };
}

function handleTopQuery(queryResult: ReturnType<typeof executeQuery>, analysis: ReturnType<typeof analyzeQuestion>, question: string): CoachResponse {
  const limit = analysis.limit || 5;
  const q = question.toLowerCase();

  let sortedPractitioners = queryResult.practitioners;
  let sortLabel = 'volume';

  if (q.includes('fidélité') || q.includes('fidelite') || q.includes('fidèle')) {
    sortedPractitioners = [...queryResult.practitioners].sort((a, b) => b.metrics.loyaltyScore - a.metrics.loyaltyScore);
    sortLabel = 'fidélité';
  } else if (q.includes('vingtile')) {
    sortedPractitioners = [...queryResult.practitioners].sort((a, b) => a.metrics.vingtile - b.metrics.vingtile);
    sortLabel = 'vingtile';
  } else if (q.includes('publication')) {
    sortedPractitioners = [...queryResult.practitioners].sort((a, b) => {
      const pubA = a.news?.filter(n => n.type === 'publication').length || 0;
      const pubB = b.news?.filter(n => n.type === 'publication').length || 0;
      return pubB - pubA;
    });
    sortLabel = 'publications';
  } else {
    sortedPractitioners = [...queryResult.practitioners].sort((a, b) => b.metrics.volumeL - a.metrics.volumeL);
  }

  const top = sortedPractitioners.slice(0, limit);

  return {
    message: `**Top ${limit} praticiens par ${sortLabel}** :\n\n${top.map((p, i) => {
      const metric = sortLabel === 'fidélité' ? `Fidélité: ${p.metrics.loyaltyScore}/10` :
                     sortLabel === 'vingtile' ? `Vingtile: ${p.metrics.vingtile}` :
                     sortLabel === 'publications' ? `${p.news?.filter(n => n.type === 'publication').length || 0} publication(s)` :
                     `${(p.metrics.volumeL / 1000).toFixed(0)}K L/an`;
      return `${i + 1}. **${p.title} ${p.firstName} ${p.lastName}**\n   ${p.specialty} à ${p.address.city} | ${metric}${p.metrics.isKOL ? ' | KOL' : ''}`;
    }).join('\n\n')}`,
    practitioners: top.map(p => ({
      ...adaptPractitionerProfile(p),
      daysSinceVisit: daysSince(p.lastVisitDate || null)
    })),
    isMarkdown: true
  };
}

function handleVingtileQuery(_queryResult: ReturnType<typeof executeQuery>, _analysis: ReturnType<typeof analyzeQuestion>, question: string): CoachResponse {
  const q = question.toLowerCase();

  if (q.includes('moyen') && q.includes('ville')) {
    const allPractitioners = DataService.getAllPractitioners();
    const byCity: Record<string, { total: number; count: number }> = {};

    allPractitioners.forEach(p => {
      const city = p.address.city;
      if (!byCity[city]) byCity[city] = { total: 0, count: 0 };
      byCity[city].total += p.metrics.vingtile;
      byCity[city].count += 1;
    });

    const cityAverages = Object.entries(byCity)
      .map(([city, data]) => ({ city, avg: data.total / data.count }))
      .sort((a, b) => a.avg - b.avg);

    return {
      message: `**Vingtile moyen par ville** :\n\n${cityAverages.map(({ city, avg }) => `- **${city}**: ${avg.toFixed(1)}`).join('\n')}`,
      insights: [
        `Plus le vingtile est bas, meilleur est le prescripteur`,
        `Meilleure ville: **${cityAverages[0].city}** (vingtile moyen: ${cityAverages[0].avg.toFixed(1)})`
      ],
      isMarkdown: true
    };
  }

  const allPractitioners = DataService.getAllPractitioners();
  const distribution: Record<string, number> = {};

  allPractitioners.forEach(p => {
    const bucket = p.metrics.vingtile <= 5 ? '1-5 (Top 25%)' :
                   p.metrics.vingtile <= 10 ? '6-10 (Haut)' :
                   p.metrics.vingtile <= 15 ? '11-15 (Moyen)' :
                   '16-20 (Bas)';
    distribution[bucket] = (distribution[bucket] || 0) + 1;
  });

  return {
    message: `**Distribution des vingtiles** :\n\n- **Vingtile 1-5** (Top 25%): ${distribution['1-5 (Top 25%)'] || 0} praticiens\n- **Vingtile 6-10** (Haut): ${distribution['6-10 (Haut)'] || 0} praticiens\n- **Vingtile 11-15** (Moyen): ${distribution['11-15 (Moyen)'] || 0} praticiens\n- **Vingtile 16-20** (Bas): ${distribution['16-20 (Bas)'] || 0} praticiens`,
    insights: [
      `Le vingtile classe les prescripteurs de 1 (meilleur) à 20`,
      `Vingtile moyen: ${(allPractitioners.reduce((s, p) => s + p.metrics.vingtile, 0) / allPractitioners.length).toFixed(1)}`
    ],
    isMarkdown: true
  };
}

function handleGenericQueryResult(queryResult: ReturnType<typeof executeQuery>, _question: string): CoachResponse {
  return {
    message: queryResult.summary,
    practitioners: queryResult.practitioners.slice(0, 5).map(p => ({
      ...adaptPractitionerProfile(p),
      daysSinceVisit: daysSince(p.lastVisitDate || null)
    })),
    insights: [
      `Volume total: ${(queryResult.aggregations!.totalVolume / 1000).toFixed(0)}K L/an`,
      `${queryResult.aggregations!.kolCount} KOL(s)`,
      `Fidélité moyenne: ${queryResult.aggregations!.avgLoyalty.toFixed(1)}/10`
    ],
    isMarkdown: true
  };
}

// ============================================
// NEW HANDLERS
// ============================================

function handlePractitionerTrendQuery(queryResult: ReturnType<typeof executeQuery>, analysis: ReturnType<typeof analyzeQuestion>): CoachResponse {
  if (queryResult.practitioners.length === 0) {
    const nameHint = [analysis.filters.firstName, analysis.filters.lastName].filter(Boolean).join(' ');
    return { message: `Je n'ai trouvé aucun praticien correspondant à **${nameHint}**.`, isMarkdown: true, isNoMatch: true };
  }

  const p = queryResult.practitioners[0];
  const volumeHistory = DataService.generateVolumeHistory(p.metrics.volumeL, p.id);
  const avgVol = Math.round(volumeHistory.reduce((s, v) => s + v.volume, 0) / volumeHistory.length);
  const maxMonth = volumeHistory.reduce((max, v) => v.volume > max.volume ? v : max, volumeHistory[0]);
  const minMonth = volumeHistory.reduce((min, v) => v.volume < min.volume ? v : min, volumeHistory[0]);
  // Compute trend from volume history (last 3 months vs first 3 months)
  const lastThree = volumeHistory.slice(-3).reduce((s, v) => s + v.volume, 0) / 3;
  const firstThree = volumeHistory.slice(0, 3).reduce((s, v) => s + v.volume, 0) / 3;
  const trendDirection = lastThree > firstThree * 1.05 ? 'up' : lastThree < firstThree * 0.95 ? 'down' : 'stable';
  const trend = trendDirection === 'up' ? '📈 en hausse' : trendDirection === 'down' ? '📉 en baisse' : '➡️ stable';

  return {
    message: `## Tendance — ${p.title} ${p.firstName} ${p.lastName}\n\n` +
      `**${p.specialty}** à ${p.address.city} | Vingtile ${p.metrics.vingtile}${p.metrics.isKOL ? ' | KOL' : ''}\n\n` +
      `**Tendance globale : ${trend}**\n\n` +
      `| Indicateur | Valeur |\n|---|---|\n` +
      `| Volume annuel | **${Math.round(p.metrics.volumeL / 1000)}K L/an** |\n` +
      `| Volume mensuel moyen | ${avgVol} L/mois |\n` +
      `| Mois le plus fort | ${maxMonth.month} (${maxMonth.volume} L) |\n` +
      `| Mois le plus faible | ${minMonth.month} (${minMonth.volume} L) |\n` +
      `| Fidélité | ${p.metrics.loyaltyScore}/10 |\n` +
      `| Dernière visite | ${p.lastVisitDate ? `il y a ${daysSince(p.lastVisitDate)} jours` : 'Jamais visité'} |`,
    practitioners: [{
      ...adaptPractitionerProfile(p),
      daysSinceVisit: daysSince(p.lastVisitDate || null)
    }],
    insights: [
      `Amplitude saisonnière : ${maxMonth.volume - minMonth.volume} L entre le pic (${maxMonth.month}) et le creux (${minMonth.month})`,
      trendDirection === 'down' ? `⚠️ Tendance baissière — une visite de relance est recommandée` :
      trendDirection === 'up' ? `Tendance positive — maintenir le rythme de visites` :
      `Volume stable — continuer le suivi régulier`
    ],
    isMarkdown: true
  };
}

function handleDaysSinceQuery(days: number, practitioners: Practitioner[], q: string): CoachResponse {
  const isKOLOnly = q.includes('kol');
  const filtered = practitioners
    .filter(p => daysSince(p.lastVisitDate) > days)
    .filter(p => !isKOLOnly || p.isKOL)
    .sort((a, b) => daysSince(b.lastVisitDate) - daysSince(a.lastVisitDate))
    .map(p => ({ ...p, daysSinceVisit: daysSince(p.lastVisitDate) }));

  const label = isKOLOnly ? 'KOLs' : 'praticiens';
  const totalVolume = filtered.reduce((s, p) => s + p.volumeL, 0);

  return {
    message: `**${filtered.length} ${label}** n'ont pas été vus depuis plus de **${days} jours** :`,
    practitioners: filtered.slice(0, 8),
    insights: [
      `Volume total concerné : **${Math.round(totalVolume / 1000)}K L/an**`,
      filtered.length > 0 ? `Le plus ancien : **${filtered[0].title} ${filtered[0].firstName} ${filtered[0].lastName}** (${filtered[0].daysSinceVisit} jours)` : '',
      `${filtered.filter(p => p.isKOL).length} KOL(s) dans cette liste`
    ].filter(Boolean),
    isMarkdown: true
  };
}

function handleComparisonQuery(question: string, practitioners: Practitioner[]): CoachResponse {
  const q = question.toLowerCase();

  // KOLs vs Autres
  if (q.includes('kol') && (q.includes('autre') || q.includes('non-kol') || q.includes('non kol') || q.includes('vs'))) {
    const kols = practitioners.filter(p => p.isKOL);
    const others = practitioners.filter(p => !p.isKOL);
    const kolVol = kols.reduce((s, p) => s + p.volumeL, 0);
    const othersVol = others.reduce((s, p) => s + p.volumeL, 0);
    const kolLoyalty = kols.length > 0 ? kols.reduce((s, p) => s + p.loyaltyScore, 0) / kols.length : 0;
    const othersLoyalty = others.length > 0 ? others.reduce((s, p) => s + p.loyaltyScore, 0) / others.length : 0;

    return {
      message: `## Comparaison KOLs vs Autres praticiens\n\n` +
        `| Indicateur | KOLs (${kols.length}) | Autres (${others.length}) |\n|---|---|---|\n` +
        `| Volume total | **${Math.round(kolVol / 1000)}K L/an** | ${Math.round(othersVol / 1000)}K L/an |\n` +
        `| Volume moyen | ${kols.length > 0 ? Math.round(kolVol / kols.length / 1000) : 0}K L/an | ${others.length > 0 ? Math.round(othersVol / others.length / 1000) : 0}K L/an |\n` +
        `| Fidélité moyenne | **${kolLoyalty.toFixed(1)}/10** | ${othersLoyalty.toFixed(1)}/10 |\n` +
        `| Part du volume total | **${Math.round(kolVol / (kolVol + othersVol) * 100)}%** | ${Math.round(othersVol / (kolVol + othersVol) * 100)}% |`,
      insights: [
        `Les KOLs (${Math.round(kols.length / practitioners.length * 100)}% des praticiens) génèrent **${Math.round(kolVol / (kolVol + othersVol) * 100)}%** du volume total`,
        kolLoyalty > othersLoyalty ? `Les KOLs sont en moyenne plus fidèles (+${(kolLoyalty - othersLoyalty).toFixed(1)} pts)` : `Les non-KOLs sont plus fidèles en moyenne`,
      ],
      isMarkdown: true
    };
  }

  // Comparison between cities
  const cityMatch = q.match(/(?:compar|entre|vs|versus)\s+.*?([A-ZÀ-Ý][a-zà-ÿ]+(?:-[A-ZÀ-Ý]?[a-zà-ÿ]+)?)\s+(?:et|vs|versus|contre)\s+([A-ZÀ-Ý][a-zà-ÿ]+(?:-[A-ZÀ-Ý]?[a-zà-ÿ]+)?)/i);
  if (cityMatch) {
    const city1 = cityMatch[1].toUpperCase();
    const city2 = cityMatch[2].toUpperCase();
    const p1 = practitioners.filter(p => p.city?.toUpperCase().includes(city1));
    const p2 = practitioners.filter(p => p.city?.toUpperCase().includes(city2));

    if (p1.length > 0 || p2.length > 0) {
      const vol1 = p1.reduce((s, p) => s + p.volumeL, 0);
      const vol2 = p2.reduce((s, p) => s + p.volumeL, 0);
      const loy1 = p1.length > 0 ? p1.reduce((s, p) => s + p.loyaltyScore, 0) / p1.length : 0;
      const loy2 = p2.length > 0 ? p2.reduce((s, p) => s + p.loyaltyScore, 0) / p2.length : 0;

      return {
        message: `## Comparaison ${cityMatch[1]} vs ${cityMatch[2]}\n\n` +
          `| Indicateur | ${cityMatch[1]} | ${cityMatch[2]} |\n|---|---|---|\n` +
          `| Praticiens | ${p1.length} | ${p2.length} |\n` +
          `| Volume total | ${Math.round(vol1 / 1000)}K L/an | ${Math.round(vol2 / 1000)}K L/an |\n` +
          `| Fidélité moyenne | ${loy1.toFixed(1)}/10 | ${loy2.toFixed(1)}/10 |\n` +
          `| KOLs | ${p1.filter(p => p.isKOL).length} | ${p2.filter(p => p.isKOL).length} |`,
        insights: [
          vol1 > vol2 ? `**${cityMatch[1]}** génère ${Math.round((vol1 - vol2) / 1000)}K L/an de plus` :
          `**${cityMatch[2]}** génère ${Math.round((vol2 - vol1) / 1000)}K L/an de plus`,
        ],
        isMarkdown: true
      };
    }
  }

  // Comparison between specialties
  const specMatch = q.match(/(?:compar|entre|vs|versus)\s+.*?(pneumo\w*|généraliste\w*|MG)\s+(?:et|vs|versus|contre)\s+(pneumo\w*|généraliste\w*|MG)/i);
  if (specMatch) {
    const allP = DataService.getAllPractitioners();
    const spec1Name = specMatch[1].toLowerCase().startsWith('pneumo') ? 'Pneumologue' : 'Médecin généraliste';
    const spec2Name = specMatch[2].toLowerCase().startsWith('pneumo') ? 'Pneumologue' : 'Médecin généraliste';
    const s1 = allP.filter(p => p.specialty === spec1Name);
    const s2 = allP.filter(p => p.specialty === spec2Name);
    const vol1 = s1.reduce((s, p) => s + p.metrics.volumeL, 0);
    const vol2 = s2.reduce((s, p) => s + p.metrics.volumeL, 0);

    return {
      message: `## Comparaison ${spec1Name}s vs ${spec2Name}s\n\n` +
        `| Indicateur | ${spec1Name}s | ${spec2Name}s |\n|---|---|---|\n` +
        `| Nombre | ${s1.length} | ${s2.length} |\n` +
        `| Volume total | ${Math.round(vol1 / 1000)}K L/an | ${Math.round(vol2 / 1000)}K L/an |\n` +
        `| Volume moyen | ${s1.length > 0 ? Math.round(vol1 / s1.length / 1000) : 0}K L/an | ${s2.length > 0 ? Math.round(vol2 / s2.length / 1000) : 0}K L/an |\n` +
        `| KOLs | ${s1.filter(p => p.metrics.isKOL).length} | ${s2.filter(p => p.metrics.isKOL).length} |`,
      insights: [
        `Les ${spec1Name}s représentent ${Math.round(vol1 / (vol1 + vol2) * 100)}% du volume total`,
      ],
      isMarkdown: true
    };
  }

  // Generic comparison — compare top vs bottom
  const topHalf = [...practitioners].sort((a, b) => b.volumeL - a.volumeL);
  const top50 = topHalf.slice(0, Math.ceil(topHalf.length / 2));
  const bottom50 = topHalf.slice(Math.ceil(topHalf.length / 2));
  const topVol = top50.reduce((s, p) => s + p.volumeL, 0);
  const bottomVol = bottom50.reduce((s, p) => s + p.volumeL, 0);

  return {
    message: `## Analyse comparative du territoire\n\n` +
      `| Indicateur | Top 50% (${top50.length}) | Bottom 50% (${bottom50.length}) |\n|---|---|---|\n` +
      `| Volume total | **${Math.round(topVol / 1000)}K L/an** | ${Math.round(bottomVol / 1000)}K L/an |\n` +
      `| Fidélité moyenne | ${(top50.reduce((s, p) => s + p.loyaltyScore, 0) / top50.length).toFixed(1)}/10 | ${(bottom50.reduce((s, p) => s + p.loyaltyScore, 0) / bottom50.length).toFixed(1)}/10 |\n` +
      `| KOLs | ${top50.filter(p => p.isKOL).length} | ${bottom50.filter(p => p.isKOL).length} |`,
    insights: [
      `Les top 50% prescripteurs génèrent **${Math.round(topVol / (topVol + bottomVol) * 100)}%** du volume`,
      `Ratio de concentration : x${(topVol / Math.max(bottomVol, 1)).toFixed(1)}`
    ],
    isMarkdown: true
  };
}

function handleGeneralTrendQuery(practitioners: Practitioner[]): CoachResponse {
  const up = practitioners.filter(p => p.trend === 'up');
  const down = practitioners.filter(p => p.trend === 'down');
  const stable = practitioners.filter(p => p.trend === 'stable');

  const downVolume = down.reduce((s, p) => s + p.volumeL, 0);
  const upVolume = up.reduce((s, p) => s + p.volumeL, 0);

  return {
    message: `## Tendances du territoire\n\n` +
      `| Tendance | Praticiens | Volume | Part |\n|---|---|---|---|\n` +
      `| 📈 En hausse | **${up.length}** | ${Math.round(upVolume / 1000)}K L/an | ${Math.round(upVolume / practitioners.reduce((s, p) => s + p.volumeL, 0) * 100)}% |\n` +
      `| ➡️ Stables | **${stable.length}** | ${Math.round(stable.reduce((s, p) => s + p.volumeL, 0) / 1000)}K L/an | ${Math.round(stable.reduce((s, p) => s + p.volumeL, 0) / practitioners.reduce((s, p) => s + p.volumeL, 0) * 100)}% |\n` +
      `| 📉 En baisse | **${down.length}** | ${Math.round(downVolume / 1000)}K L/an | ${Math.round(downVolume / practitioners.reduce((s, p) => s + p.volumeL, 0) * 100)}% |`,
    practitioners: down.length > 0
      ? down.sort((a, b) => b.volumeL - a.volumeL).slice(0, 5).map(p => ({
          ...p, daysSinceVisit: daysSince(p.lastVisitDate)
        }))
      : undefined,
    insights: [
      down.length > 0 ? `⚠️ **${down.length} praticien(s) en baisse** représentant ${Math.round(downVolume / 1000)}K L/an — action recommandée` : `Aucun praticien en baisse — excellent !`,
      `${up.length} praticien(s) en hausse (+${Math.round(upVolume / 1000)}K L/an) — maintenir le suivi`,
      down.filter(p => p.isKOL).length > 0 ? `🚨 **${down.filter(p => p.isKOL).length} KOL(s) en baisse** — priorité absolue` : ''
    ].filter(Boolean),
    isMarkdown: true
  };
}

function handleDefinitionQuery(q: string): CoachResponse {
  if (q.includes('vingtile')) {
    return {
      message: `## Qu'est-ce que le vingtile ?\n\n` +
        `Le **vingtile** est un système de classement des prescripteurs, de **1** (meilleur) à **20** (plus faible).\n\n` +
        `| Vingtile | Signification | Action |\n|---|---|---|\n` +
        `| **1-5** | Top 25% — prescripteurs majeurs | Visites fréquentes, relation premium |\n` +
        `| **6-10** | Haut potentiel | Développement, upsell |\n` +
        `| **11-15** | Prescripteur moyen | Maintien, suivi standard |\n` +
        `| **16-20** | Prescripteur faible | Visite ponctuelle, canal indirect |\n\n` +
        `Plus le vingtile est **bas**, plus le praticien est un **gros prescripteur**.`,
      insights: [
        'Critères : basé sur le volume de prescriptions d\'oxygène et gaz médicaux',
        'Mis à jour trimestriellement par la direction commerciale'
      ],
      isMarkdown: true
    };
  }

  if (q.includes('kol') || q.includes('key opinion leader')) {
    return {
      message: `## Qu'est-ce qu'un KOL ?\n\n` +
        `Un **KOL** (Key Opinion Leader) est un praticien **influent** dans son domaine qui :\n\n` +
        `- A une **expertise reconnue** (publications, conférences)\n` +
        `- **Influence** les pratiques de prescription de ses confrères\n` +
        `- Est souvent **chercheur** ou **chef de service**\n` +
        `- Représente un **volume de prescriptions important**\n\n` +
        `Les KOLs nécessitent un suivi **premium** avec des visites plus fréquentes et un contenu scientifique adapté.`,
      insights: [
        `Vous avez **${DataService.getKOLs().length} KOLs** sur votre territoire`,
        'Ils représentent vos contacts stratégiques les plus importants'
      ],
      isMarkdown: true
    };
  }

  if (q.includes('fidélité') || q.includes('fidelite') || q.includes('loyalty')) {
    return {
      message: `## Score de fidélité\n\n` +
        `Le score de **fidélité** (de 1 à 10) mesure l'engagement d'un praticien envers Air Liquide Santé :\n\n` +
        `| Score | Niveau | Risque |\n|---|---|---|\n` +
        `| **8-10** | Très fidèle | Faible |\n` +
        `| **5-7** | Fidélité moyenne | Modéré |\n` +
        `| **1-4** | Fidélité faible | **Élevé** — risque de churn |\n\n` +
        `Un score bas + tendance en baisse = **signal d'alerte** nécessitant une visite de réactivation.`,
      isMarkdown: true
    };
  }

  // Generic definition response
  return {
    message: `Je n'ai pas de définition spécifique pour ce terme dans ma base. Voici les concepts que je peux expliquer :\n\n` +
      `- **Vingtile** : système de classement 1-20 des prescripteurs\n` +
      `- **KOL** : Key Opinion Leader, praticien influent\n` +
      `- **Fidélité** : score d'engagement 1-10\n` +
      `- **Trend** : tendance d'évolution (hausse/baisse/stable)`,
    isMarkdown: true
  };
}

function handleLoyaltyQuery(practitioners: Practitioner[]): CoachResponse {
  const sorted = [...practitioners].sort((a, b) => a.loyaltyScore - b.loyaltyScore);
  const lowLoyalty = sorted.filter(p => p.loyaltyScore < 5);
  const highLoyalty = sorted.filter(p => p.loyaltyScore >= 8);
  const avg = practitioners.reduce((s, p) => s + p.loyaltyScore, 0) / practitioners.length;

  return {
    message: `## Analyse de la fidélité\n\n` +
      `**Fidélité moyenne du territoire : ${avg.toFixed(1)}/10**\n\n` +
      `| Segment | Nombre | Volume | Action |\n|---|---|---|---|\n` +
      `| 🟢 Fidèles (8+) | ${highLoyalty.length} | ${Math.round(highLoyalty.reduce((s, p) => s + p.volumeL, 0) / 1000)}K L/an | Maintenir |\n` +
      `| 🟡 Moyens (5-7) | ${sorted.filter(p => p.loyaltyScore >= 5 && p.loyaltyScore < 8).length} | ${Math.round(sorted.filter(p => p.loyaltyScore >= 5 && p.loyaltyScore < 8).reduce((s, p) => s + p.volumeL, 0) / 1000)}K L/an | Développer |\n` +
      `| 🔴 À risque (<5) | ${lowLoyalty.length} | ${Math.round(lowLoyalty.reduce((s, p) => s + p.volumeL, 0) / 1000)}K L/an | **Réactiver** |`,
    practitioners: lowLoyalty.slice(0, 5).map(p => ({
      ...p, daysSinceVisit: daysSince(p.lastVisitDate)
    })),
    insights: [
      lowLoyalty.length > 0 ? `⚠️ **${lowLoyalty.length} praticien(s) à fidélité faible** — ${Math.round(lowLoyalty.reduce((s, p) => s + p.volumeL, 0) / 1000)}K L/an à risque` : 'Tous les praticiens ont une bonne fidélité',
      `${lowLoyalty.filter(p => p.isKOL).length} KOL(s) à fidélité faible`
    ],
    isMarkdown: true
  };
}

function handleSpecialtyQuery(q: string, _practitioners: Practitioner[]): CoachResponse {
  const allP = DataService.getAllPractitioners();
  const bySpec: Record<string, { count: number; volume: number; kols: number; avgLoyalty: number }> = {};

  allP.forEach(p => {
    const spec = p.specialty;
    if (!bySpec[spec]) bySpec[spec] = { count: 0, volume: 0, kols: 0, avgLoyalty: 0 };
    bySpec[spec].count++;
    bySpec[spec].volume += p.metrics.volumeL;
    bySpec[spec].kols += p.metrics.isKOL ? 1 : 0;
    bySpec[spec].avgLoyalty += p.metrics.loyaltyScore;
  });

  Object.keys(bySpec).forEach(k => {
    bySpec[k].avgLoyalty = bySpec[k].avgLoyalty / bySpec[k].count;
  });

  const sorted = Object.entries(bySpec).sort((a, b) => b[1].volume - a[1].volume);

  // If asking about a specific specialty
  const targetSpec = q.includes('pneumologue') ? 'Pneumologue' : q.includes('généraliste') ? 'Médecin généraliste' : null;
  if (targetSpec && bySpec[targetSpec]) {
    const data = bySpec[targetSpec];
    const specPractitioners = allP.filter(p => p.specialty === targetSpec)
      .sort((a, b) => b.metrics.volumeL - a.metrics.volumeL);

    return {
      message: `## ${targetSpec}s sur votre territoire\n\n` +
        `- **${data.count}** praticiens\n` +
        `- Volume total : **${Math.round(data.volume / 1000)}K L/an**\n` +
        `- Volume moyen : ${Math.round(data.volume / data.count / 1000)}K L/an\n` +
        `- Fidélité moyenne : ${data.avgLoyalty.toFixed(1)}/10\n` +
        `- **${data.kols} KOL(s)**`,
      practitioners: specPractitioners.slice(0, 5).map(p => ({
        ...adaptPractitionerProfile(p),
        daysSinceVisit: daysSince(p.lastVisitDate || null)
      })),
      isMarkdown: true
    };
  }

  return {
    message: `## Répartition par spécialité\n\n` +
      `| Spécialité | Praticiens | Volume | KOLs | Fidélité |\n|---|---|---|---|---|\n` +
      sorted.map(([spec, d]) =>
        `| **${spec}** | ${d.count} | ${Math.round(d.volume / 1000)}K L/an | ${d.kols} | ${d.avgLoyalty.toFixed(1)}/10 |`
      ).join('\n'),
    insights: [
      `${sorted.length} spécialités couvertes sur votre territoire`,
      `Spécialité principale : **${sorted[0][0]}** (${Math.round(sorted[0][1].volume / (allP.reduce((s, p) => s + p.metrics.volumeL, 0)) * 100)}% du volume)`
    ],
    isMarkdown: true
  };
}

function getSmartFallback(q: string, practitioners: Practitioner[], userObjectives: { visitsMonthly: number; visitsCompleted: number }): CoachResponse {
  // Try to provide a useful territory overview instead of generic help
  const stats = DataService.getGlobalStats();
  const atRisk = practitioners.filter(p => p.trend === 'down' || p.loyaltyScore < 5);
  const notVisited60 = practitioners.filter(p => daysSince(p.lastVisitDate) > 60);
  const progress = Math.round(userObjectives.visitsCompleted / userObjectives.visitsMonthly * 100);

  // If question seems to be a greeting or general inquiry, give a dashboard summary
  if (q.length < 30 || /\b(bonjour|salut|hello|aide|help|résumé|resume|synthèse|bilan|situation|tableau)\b/.test(q)) {
    return {
      message: `## Synthèse de votre territoire\n\n` +
        `**${stats.totalPractitioners} praticiens** | ${stats.totalKOLs} KOLs | ${stats.pneumologues} pneumo + ${stats.generalistes} MG\n\n` +
        `| Indicateur | Valeur |\n|---|---|\n` +
        `| Objectif visites | **${userObjectives.visitsCompleted}/${userObjectives.visitsMonthly}** (${progress}%) |\n` +
        `| Volume total | ${Math.round(stats.totalVolume / 1000)}K L/an |\n` +
        `| Fidélité moyenne | ${stats.averageLoyalty.toFixed(1)}/10 |\n` +
        `| Praticiens à risque | ${atRisk.length} |\n` +
        `| Non vus depuis 60j+ | ${notVisited60.length} |`,
      insights: [
        atRisk.length > 0 ? `⚠️ **${atRisk.length} praticien(s) à risque** nécessitent votre attention` : '✅ Aucun praticien en situation critique',
        notVisited60.length > 0 ? `${notVisited60.length} praticien(s) non vus depuis 60+ jours` : '',
        `Progression mensuelle : ${progress}%`
      ].filter(Boolean),
      isMarkdown: true
    };
  }

  return getHelpResponse();
}

function getHelpResponse(): CoachResponse {
  return {
    message: `Je suis votre **assistant stratégique ARIA**. Voici ce que je peux faire :\n\n` +
      `**📊 Graphiques & Données**\n` +
      `- "Montre-moi les volumes par ville"\n` +
      `- "Top 10 prescripteurs"\n` +
      `- "Comparaison KOLs vs autres"\n\n` +
      `**🔍 Recherche & Analyse**\n` +
      `- "Qui est Dr Martin ?"\n` +
      `- "Combien de pneumologues à Lyon ?"\n` +
      `- "Tendances du territoire"\n\n` +
      `**⚡ Stratégie**\n` +
      `- "Qui dois-je voir en priorité ?"\n` +
      `- "Praticiens à risque"\n` +
      `- "Praticiens non vus depuis 90 jours"`,
    isMarkdown: true,
    isGenericHelp: true
  };
}

export function generateCoachResponse(
  question: string,
  practitioners: Practitioner[],
  userObjectives: { visitsMonthly: number; visitsCompleted: number }
): CoachResponse {
  return generateSmartResponse(question, practitioners, userObjectives);
}
