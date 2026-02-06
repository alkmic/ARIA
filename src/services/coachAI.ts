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

/**
 * Système de réponse intelligent utilisant le moteur de requêtes
 * Fonctionne SANS le LLM en analysant la question et les données
 */
export function generateSmartResponse(
  question: string,
  practitioners: Practitioner[],
  userObjectives: { visitsMonthly: number; visitsCompleted: number }
): CoachResponse {
  const q = question.toLowerCase();
  const analysis = analyzeQuestion(question);
  const queryResult = executeQuery(question);

  // 1. Questions sur des praticiens spécifiques (nom, prénom)
  if (analysis.filters.firstName || analysis.filters.lastName) {
    // Détecter si c'est une question sur les actualités/news d'un praticien
    if (q.includes('actualit') || q.includes('news') || q.includes('nouveaut') || q.includes('récent') || q.includes('recent') || q.includes('dernièr') || q.includes('dernier')) {
      return handlePractitionerNewsQuery(queryResult, analysis, question);
    }
    return handlePractitionerSearch(queryResult, analysis, question);
  }

  // 2. Questions sur les publications
  if (q.includes('publication') || q.includes('publié') || q.includes('article') || q.includes('a le plus de publication')) {
    return handlePublicationsQuery(queryResult, analysis, question);
  }

  // 3. Questions statistiques (combien, moyenne, total)
  if (analysis.aggregationType === 'count' || q.includes('combien')) {
    return handleCountQuery(queryResult, analysis, question);
  }

  // 4. Questions géographiques (par ville)
  if (analysis.filters.city || q.includes('à lyon') || q.includes('à grenoble') || q.includes('par ville')) {
    return handleGeographicQuery(queryResult, analysis, question);
  }

  // 5. Questions sur les KOLs
  if (analysis.filters.isKOL || q.includes('kol') || q.includes('leader') || q.includes('opinion')) {
    return handleKOLQuery(practitioners, userObjectives);
  }

  // 6. Questions sur les priorités de visite
  if (q.includes('priorité') || q.includes('voir') || q.includes('semaine') || q.includes('aujourd')) {
    return handlePriorityQuery(practitioners, userObjectives);
  }

  // 7. Questions sur les objectifs
  if (q.includes('objectif') || q.includes('atteindre') || q.includes('mois') || q.includes('sauver')) {
    return handleObjectiveQuery(practitioners, userObjectives);
  }

  // 8. Questions sur les risques
  if (q.includes('risque') || q.includes('perdre') || q.includes('churn') || q.includes('baisse')) {
    return handleRiskQuery(practitioners, userObjectives);
  }

  // 9. Questions sur les opportunités
  if (q.includes('nouveau') || q.includes('potentiel') || q.includes('opportunité')) {
    return handleOpportunitiesQuery(practitioners, userObjectives);
  }

  // 10. Questions sur le top/classement
  if (q.includes('top') || q.includes('meilleur') || q.includes('premier') || q.includes('plus gros')) {
    return handleTopQuery(queryResult, analysis, question);
  }

  // 11. Questions sur les vingtiles
  if (q.includes('vingtile')) {
    return handleVingtileQuery(queryResult, analysis, question);
  }

  // 12. Si des résultats ont été trouvés par le moteur de requêtes
  if (queryResult.practitioners.length > 0 && queryResult.practitioners.length < DataService.getAllPractitioners().length) {
    return handleGenericQueryResult(queryResult, question);
  }

  return getHelpResponse();
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

function getHelpResponse(): CoachResponse {
  return {
    message: `Je suis votre **assistant stratégique ARIA**. Je peux répondre à de nombreuses questions sur vos praticiens. Voici quelques exemples :`,
    insights: [
      `**Recherche de praticiens :**\n- "Quel médecin prénommé Bernard a le plus de publications ?"\n- "Donne-moi les coordonnées du Dr Martin"`,
      `**Statistiques :**\n- "Combien de pneumologues à Lyon ?"\n- "Quel est le vingtile moyen par ville ?"`,
      `**Stratégie commerciale :**\n- "Qui dois-je voir en priorité cette semaine ?"\n- "Quels KOLs n'ai-je pas vus depuis 60 jours ?"`,
      `**Classements :**\n- "Top 5 prescripteurs par volume"\n- "Praticiens à risque de churn"`,
      `**Opportunités :**\n- "Quelles sont mes opportunités de nouveaux prescripteurs ?"\n- "Comment atteindre mon objectif mensuel ?"`
    ],
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
