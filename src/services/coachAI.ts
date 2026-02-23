import type { Practitioner } from '../types';
import { DataService } from './dataService';
import { executeQuery, analyzeQuestion } from './dataQueryEngine';
import { adaptPractitionerProfile } from './dataAdapter';
import { getLanguage } from '../i18n/LanguageContext';

export interface CoachResponse {
  message: string;
  practitioners?: (Practitioner & { daysSinceVisit?: number; priorityScore?: number })[];
  insights?: string[];
  actions?: { label: string; onClick: () => void }[];
  isMarkdown?: boolean;
}

// Calcul des jours depuis une date
function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/** Helper: get the locale string for date formatting */
function getDateLocale(): string {
  return getLanguage() === 'en' ? 'en-US' : 'fr-FR';
}

/** Helper: volume unit */
function volUnit(): string {
  return getLanguage() === 'en' ? 'K L/yr' : 'K L/an';
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

function handlePractitionerSearch(queryResult: ReturnType<typeof executeQuery>, analysis: ReturnType<typeof analyzeQuestion>, question: string): CoachResponse {
  const lang = getLanguage();

  if (queryResult.practitioners.length === 0) {
    return {
      message: lang === 'en'
        ? `I found no practitioner matching your search "${question}". Check the spelling or try a different criterion.`
        : `Je n'ai trouvé aucun praticien correspondant à votre recherche "${question}". Vérifiez l'orthographe ou essayez avec un autre critère.`,
      insights: lang === 'en'
        ? [
            'Tip: Try with just the first name or last name',
            'You can also search by city or specialty'
          ]
        : [
            'Conseil : Essayez avec juste le prénom ou le nom de famille',
            'Vous pouvez aussi chercher par ville ou spécialité'
          ],
      isMarkdown: true
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
        message: lang === 'en'
          ? `Among the practitioners ${analysis.filters.firstName ? `named **${analysis.filters.firstName}**` : ''} found, **none have publications** referenced in our database.`
          : `Parmi les praticiens ${analysis.filters.firstName ? `prénommés **${analysis.filters.firstName}**` : ''} trouvés, **aucun n'a de publications** référencées dans notre base.`,
        practitioners: adaptedPractitioners,
        insights: lang === 'en'
          ? [
              `${queryResult.practitioners.length} practitioner(s) match your search`,
              'Publications are regularly updated from medical sources'
            ]
          : [
              `${queryResult.practitioners.length} praticien(s) correspondent à votre recherche`,
              'Les publications sont mises à jour régulièrement depuis les sources médicales'
            ],
        isMarkdown: true
      };
    }

    const publications = best.news?.filter(n => n.type === 'publication') || [];

    return {
      message: lang === 'en'
        ? `The practitioner ${analysis.filters.firstName ? `named **${analysis.filters.firstName}**` : ''} with the most publications is:\n\n**${best.title} ${best.firstName} ${best.lastName}**\n- ${best.specialty} in ${best.address.city}\n- **${pubCount} publication(s)** referenced\n- Volume: ${(best.metrics.volumeL / 1000).toFixed(0)}${volUnit()} | Loyalty: ${best.metrics.loyaltyScore}/10${best.metrics.isKOL ? '\n- **Key Opinion Leader**' : ''}\n\n**Publications:**\n${publications.map(pub => `- _${pub.title}_ (${new Date(pub.date).toLocaleDateString(getDateLocale())})`).join('\n')}`
        : `Le praticien ${analysis.filters.firstName ? `prénommé **${analysis.filters.firstName}**` : ''} avec le plus de publications est :\n\n**${best.title} ${best.firstName} ${best.lastName}**\n- ${best.specialty} à ${best.address.city}\n- **${pubCount} publication(s)** référencée(s)\n- Volume: ${(best.metrics.volumeL / 1000).toFixed(0)}${volUnit()} | Fidélité: ${best.metrics.loyaltyScore}/10${best.metrics.isKOL ? '\n- **Key Opinion Leader**' : ''}\n\n**Publications :**\n${publications.map(pub => `- _${pub.title}_ (${new Date(pub.date).toLocaleDateString(getDateLocale())})`).join('\n')}`,
      practitioners: [{ ...adaptPractitionerProfile(best), daysSinceVisit: daysSince(best.lastVisitDate || null) }],
      isMarkdown: true
    };
  }

  const firstResult = queryResult.practitioners[0];
  const pubCount = firstResult.news?.filter(n => n.type === 'publication').length || 0;

  return {
    message: queryResult.practitioners.length === 1
      ? (lang === 'en'
        ? `**${firstResult.title} ${firstResult.firstName} ${firstResult.lastName}**\n\n- ${firstResult.specialty} in ${firstResult.address.city}\n- Address: ${firstResult.address.street}, ${firstResult.address.postalCode}\n- Phone: ${firstResult.contact.phone}\n- Email: ${firstResult.contact.email}\n- Volume: **${(firstResult.metrics.volumeL / 1000).toFixed(0)}${volUnit()}** | Loyalty: **${firstResult.metrics.loyaltyScore}/10** | Vingtile: **${firstResult.metrics.vingtile}**${firstResult.metrics.isKOL ? '\n- **Key Opinion Leader**' : ''}${pubCount > 0 ? `\n- **${pubCount} publication(s)**` : ''}`
        : `**${firstResult.title} ${firstResult.firstName} ${firstResult.lastName}**\n\n- ${firstResult.specialty} à ${firstResult.address.city}\n- Adresse: ${firstResult.address.street}, ${firstResult.address.postalCode}\n- Tél: ${firstResult.contact.phone}\n- Email: ${firstResult.contact.email}\n- Volume: **${(firstResult.metrics.volumeL / 1000).toFixed(0)}${volUnit()}** | Fidélité: **${firstResult.metrics.loyaltyScore}/10** | Vingtile: **${firstResult.metrics.vingtile}**${firstResult.metrics.isKOL ? '\n- **Key Opinion Leader**' : ''}${pubCount > 0 ? `\n- **${pubCount} publication(s)**` : ''}`)
      : (lang === 'en'
        ? `I found **${queryResult.practitioners.length} practitioner(s)** matching your search:`
        : `J'ai trouvé **${queryResult.practitioners.length} praticien(s)** correspondant à votre recherche :`),
    practitioners: adaptedPractitioners,
    insights: queryResult.practitioners.length > 1 ? [
      `${lang === 'en' ? 'Total volume' : 'Volume total'}: ${(queryResult.aggregations!.totalVolume / 1000).toFixed(0)}${volUnit()}`,
      lang === 'en'
        ? `${queryResult.aggregations!.kolCount} KOL(s) among results`
        : `${queryResult.aggregations!.kolCount} KOL(s) parmi les résultats`
    ] : undefined,
    isMarkdown: true
  };
}

function handlePublicationsQuery(_queryResult: ReturnType<typeof executeQuery>, analysis: ReturnType<typeof analyzeQuestion>, _question: string): CoachResponse {
  const lang = getLanguage();
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
      message: lang === 'en'
        ? `No practitioner currently has publications referenced in our database.`
        : `Aucun praticien n'a de publications référencées dans notre base de données actuellement.`,
      insights: [lang === 'en'
        ? 'Publications are regularly updated from medical sources'
        : 'Les publications sont mises à jour régulièrement depuis les sources médicales'],
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
        message: lang === 'en'
          ? `No practitioner ${analysis.filters.firstName ? `named **${analysis.filters.firstName}**` : ''}${analysis.filters.lastName ? ` with last name **${analysis.filters.lastName}**` : ''} has publications in our database.`
          : `Aucun praticien ${analysis.filters.firstName ? `prénommé **${analysis.filters.firstName}**` : ''}${analysis.filters.lastName ? ` nommé **${analysis.filters.lastName}**` : ''} n'a de publications dans notre base.`,
        insights: [lang === 'en'
          ? 'Here are the practitioners with the most publications:'
          : 'Voici les praticiens avec le plus de publications :'],
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
      message: lang === 'en'
        ? `**${best.title} ${best.firstName} ${best.lastName}** has **${best.publicationCount} publication(s)**:\n\n${publications.map(pub => `- **${pub.title}**\n  _${pub.content}_\n  ${new Date(pub.date).toLocaleDateString(getDateLocale())}`).join('\n\n')}`
        : `**${best.title} ${best.firstName} ${best.lastName}** a **${best.publicationCount} publication(s)** :\n\n${publications.map(pub => `- **${pub.title}**\n  _${pub.content}_\n  ${new Date(pub.date).toLocaleDateString(getDateLocale())}`).join('\n\n')}`,
      practitioners: [{ ...adaptPractitionerProfile(best), daysSinceVisit: daysSince(best.lastVisitDate || null) }],
      isMarkdown: true
    };
  }

  const limit = analysis.limit || 5;
  const top = withPublications.slice(0, limit);

  return {
    message: lang === 'en'
      ? `**Top ${limit} practitioners by number of publications:**\n\n${top.map((p, i) => `${i + 1}. **${p.title} ${p.firstName} ${p.lastName}** - ${p.publicationCount} publication(s)\n   ${p.specialty} in ${p.address.city}${p.metrics.isKOL ? ' | KOL' : ''}`).join('\n\n')}`
      : `**Top ${limit} praticiens par nombre de publications :**\n\n${top.map((p, i) => `${i + 1}. **${p.title} ${p.firstName} ${p.lastName}** - ${p.publicationCount} publication(s)\n   ${p.specialty} à ${p.address.city}${p.metrics.isKOL ? ' | KOL' : ''}`).join('\n\n')}`,
    practitioners: top.map(p => ({
      ...adaptPractitionerProfile(p),
      daysSinceVisit: daysSince(p.lastVisitDate || null)
    })),
    insights: lang === 'en'
      ? [
          `${withPublications.length} practitioners have at least one publication`,
          `Total of ${withPublications.reduce((sum, p) => sum + p.publicationCount, 0)} referenced publications`
        ]
      : [
          `${withPublications.length} praticiens ont au moins une publication`,
          `Total de ${withPublications.reduce((sum, p) => sum + p.publicationCount, 0)} publications référencées`
        ],
    isMarkdown: true
  };
}

function handleCountQuery(queryResult: ReturnType<typeof executeQuery>, analysis: ReturnType<typeof analyzeQuestion>, question: string): CoachResponse {
  const lang = getLanguage();
  const q = question.toLowerCase();

  if (analysis.filters.city) {
    const city = analysis.filters.city;
    const cityPractitioners = queryResult.practitioners;
    const cityLabel = city.charAt(0).toUpperCase() + city.slice(1);

    let message: string;

    if (analysis.filters.specialty) {
      message = lang === 'en'
        ? `**${cityPractitioners.length} ${analysis.filters.specialty.toLowerCase()}(s)** in **${cityLabel}**`
        : `**${cityPractitioners.length} ${analysis.filters.specialty.toLowerCase()}(s)** à **${cityLabel}**`;
    } else {
      message = lang === 'en'
        ? `**${cityPractitioners.length} practitioner(s)** in **${cityLabel}**`
        : `**${cityPractitioners.length} praticien(s)** à **${cityLabel}**`;
    }

    return {
      message,
      practitioners: cityPractitioners.slice(0, 5).map(p => ({
        ...adaptPractitionerProfile(p),
        daysSinceVisit: daysSince(p.lastVisitDate || null)
      })),
      insights: [
        `${lang === 'en' ? 'Total volume' : 'Volume total'}: ${(queryResult.aggregations!.totalVolume / 1000).toFixed(0)}${volUnit()}`,
        `${queryResult.aggregations!.kolCount} KOL(s)`,
        `${lang === 'en' ? 'Average loyalty' : 'Fidélité moyenne'}: ${queryResult.aggregations!.avgLoyalty.toFixed(1)}/10`
      ],
      isMarkdown: true
    };
  }

  if (analysis.filters.specialty) {
    const spec = analysis.filters.specialty;
    return {
      message: lang === 'en'
        ? `**${queryResult.practitioners.length} ${spec.toLowerCase()}(s)** in your territory`
        : `**${queryResult.practitioners.length} ${spec.toLowerCase()}(s)** dans votre territoire`,
      practitioners: queryResult.practitioners.slice(0, 5).map(p => ({
        ...adaptPractitionerProfile(p),
        daysSinceVisit: daysSince(p.lastVisitDate || null)
      })),
      insights: [
        `${lang === 'en' ? 'Total volume' : 'Volume total'}: ${(queryResult.aggregations!.totalVolume / 1000).toFixed(0)}${volUnit()}`,
        `${queryResult.aggregations!.kolCount} KOL(s)`
      ],
      isMarkdown: true
    };
  }

  if (q.includes('kol')) {
    const kols = DataService.getKOLs();
    return {
      message: lang === 'en'
        ? `**${kols.length} Key Opinion Leaders (KOLs)** in your territory`
        : `**${kols.length} Key Opinion Leaders (KOLs)** dans votre territoire`,
      practitioners: kols.slice(0, 5).map(p => ({
        ...adaptPractitionerProfile(p),
        daysSinceVisit: daysSince(p.lastVisitDate || null)
      })),
      insights: [
        `${lang === 'en' ? 'Total KOL volume' : 'Volume total KOLs'}: ${(kols.reduce((s, p) => s + p.metrics.volumeL, 0) / 1000).toFixed(0)}${volUnit()}`,
        lang === 'en'
          ? 'KOLs represent your most influential prescribers'
          : 'Les KOLs représentent vos prescripteurs les plus influents'
      ],
      isMarkdown: true
    };
  }

  const stats = DataService.getGlobalStats();
  return {
    message: lang === 'en'
      ? `**${stats.totalPractitioners} practitioners** in your territory:\n\n- **${stats.pneumologues}** pulmonologists\n- **${stats.generalistes}** general practitioners\n- **${stats.totalKOLs}** KOLs`
      : `**${stats.totalPractitioners} praticiens** dans votre territoire :\n\n- **${stats.pneumologues}** pneumologues\n- **${stats.generalistes}** médecins généralistes\n- **${stats.totalKOLs}** KOLs`,
    insights: [
      `${lang === 'en' ? 'Total volume' : 'Volume total'}: ${(stats.totalVolume / 1000).toFixed(0)}${volUnit()}`,
      `${lang === 'en' ? 'Average loyalty' : 'Fidélité moyenne'}: ${stats.averageLoyalty.toFixed(1)}/10`
    ],
    isMarkdown: true
  };
}

function handleGeographicQuery(queryResult: ReturnType<typeof executeQuery>, analysis: ReturnType<typeof analyzeQuestion>, _question: string): CoachResponse {
  const lang = getLanguage();
  const city = analysis.filters.city;

  if (city) {
    const cityName = city.charAt(0).toUpperCase() + city.slice(1);

    if (queryResult.practitioners.length === 0) {
      return {
        message: lang === 'en'
          ? `No practitioner found in **${cityName}**.`
          : `Aucun praticien trouvé à **${cityName}**.`,
        insights: [lang === 'en'
          ? 'Check the city spelling'
          : 'Vérifiez l\'orthographe de la ville'],
        isMarkdown: true
      };
    }

    const inAt = lang === 'en' ? 'in' : 'à';

    return {
      message: lang === 'en'
        ? `**${queryResult.practitioners.length} practitioner(s) in ${cityName}**:\n\n${queryResult.practitioners.slice(0, 8).map((p, i) => `${i + 1}. **${p.title} ${p.firstName} ${p.lastName}** - ${p.specialty}\n   ${p.address.street}\n   ${(p.metrics.volumeL / 1000).toFixed(0)}${volUnit()}${p.metrics.isKOL ? ' | KOL' : ''}`).join('\n\n')}`
        : `**${queryResult.practitioners.length} praticien(s) ${inAt} ${cityName}** :\n\n${queryResult.practitioners.slice(0, 8).map((p, i) => `${i + 1}. **${p.title} ${p.firstName} ${p.lastName}** - ${p.specialty}\n   ${p.address.street}\n   ${(p.metrics.volumeL / 1000).toFixed(0)}${volUnit()}${p.metrics.isKOL ? ' | KOL' : ''}`).join('\n\n')}`,
      practitioners: queryResult.practitioners.slice(0, 5).map(p => ({
        ...adaptPractitionerProfile(p),
        daysSinceVisit: daysSince(p.lastVisitDate || null)
      })),
      insights: [
        `${lang === 'en' ? 'Total volume' : 'Volume total'} ${cityName}: ${(queryResult.aggregations!.totalVolume / 1000).toFixed(0)}${volUnit()}`,
        lang === 'en'
          ? `${queryResult.aggregations!.kolCount} KOL(s) in this city`
          : `${queryResult.aggregations!.kolCount} KOL(s) dans cette ville`
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
  const practitionerLabel = lang === 'en' ? 'practitioner(s)' : 'praticien(s)';
  const practitionersLabel = lang === 'en' ? 'practitioners' : 'praticiens';

  return {
    message: lang === 'en'
      ? `**Geographic distribution** of your ${allPractitioners.length} practitioners:\n\n${sortedCities.map(([c, count]) => `- **${c}**: ${count} ${practitionerLabel}`).join('\n')}`
      : `**Répartition géographique** de vos ${allPractitioners.length} praticiens :\n\n${sortedCities.map(([c, count]) => `- **${c}**: ${count} ${practitionerLabel}`).join('\n')}`,
    insights: lang === 'en'
      ? [
          `${sortedCities.length} cities covered`,
          `Main city: **${sortedCities[0][0]}** (${sortedCities[0][1]} ${practitionersLabel})`
        ]
      : [
          `${sortedCities.length} villes couvertes`,
          `Ville principale: **${sortedCities[0][0]}** (${sortedCities[0][1]} ${practitionersLabel})`
        ],
    isMarkdown: true
  };
}

function handleKOLQuery(practitioners: Practitioner[], userObjectives: { visitsMonthly: number; visitsCompleted: number }): CoachResponse {
  const lang = getLanguage();
  const kols = practitioners
    .filter(p => p.isKOL)
    .map(p => ({ ...p, daysSinceVisit: daysSince(p.lastVisitDate) }))
    .sort((a, b) => b.daysSinceVisit - a.daysSinceVisit);

  const notSeenRecently = kols.filter(k => k.daysSinceVisit > 60);
  const visitsRemaining = userObjectives.visitsMonthly - userObjectives.visitsCompleted;

  return {
    message: lang === 'en'
      ? `You have **${kols.length} KOLs** in your territory.${notSeenRecently.length > 0 ? ` **${notSeenRecently.length}** have not been seen in over 60 days:` : ''}`
      : `Vous avez **${kols.length} KOLs** sur votre territoire.${notSeenRecently.length > 0 ? ` **${notSeenRecently.length}** n'ont pas été vus depuis plus de 60 jours :` : ''}`,
    practitioners: notSeenRecently.length > 0 ? notSeenRecently.slice(0, 5) : kols.slice(0, 5),
    insights: [
      notSeenRecently.length > 0
        ? (lang === 'en'
          ? `URGENT: **${notSeenRecently.length} KOL(s)** require an urgent visit`
          : `URGENT: **${notSeenRecently.length} KOL(s)** nécessitent une visite urgente`)
        : (lang === 'en'
          ? `All your KOLs have been seen recently. Excellent work.`
          : `Tous vos KOLs ont été vus récemment. Excellent travail.`),
      lang === 'en'
        ? `Objective impact: ${Math.min(notSeenRecently.length, visitsRemaining)} KOL visit(s) counted towards your ${visitsRemaining} remaining visits this month`
        : `Impact objectif : ${Math.min(notSeenRecently.length, visitsRemaining)} visite(s) KOL comptabilisée(s) sur vos ${visitsRemaining} visites restantes ce mois`
    ],
    isMarkdown: true
  };
}

function handlePriorityQuery(practitioners: Practitioner[], userObjectives: { visitsMonthly: number; visitsCompleted: number }): CoachResponse {
  const lang = getLanguage();
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
    message: lang === 'en'
      ? `You are at **${userObjectives.visitsCompleted}/${userObjectives.visitsMonthly}** visits this month (**${progress}%**). Here are my **5 priority recommendations**:`
      : `Vous êtes à **${userObjectives.visitsCompleted}/${userObjectives.visitsMonthly}** visites ce mois (**${progress}%**). Voici mes **5 recommandations prioritaires** :`,
    practitioners: sorted,
    insights: [
      lang === 'en'
        ? `By visiting these 5 practitioners, you will reach **${Math.min(userObjectives.visitsCompleted + 5, userObjectives.visitsMonthly)}/${userObjectives.visitsMonthly}** visits`
        : `En visitant ces 5 praticiens, vous atteindrez **${Math.min(userObjectives.visitsCompleted + 5, userObjectives.visitsMonthly)}/${userObjectives.visitsMonthly}** visites`,
      sorted.some(p => p.vingtile <= 2)
        ? (lang === 'en'
          ? `IMPORTANT: **${sorted.filter(p => p.vingtile <= 2).length} practitioner(s)** in the Top 10% to see urgently`
          : `IMPORTANT: **${sorted.filter(p => p.vingtile <= 2).length} praticien(s)** du Top 10% à voir en urgence`)
        : null
    ].filter(Boolean) as string[],
    isMarkdown: true
  };
}

function handleObjectiveQuery(practitioners: Practitioner[], userObjectives: { visitsMonthly: number; visitsCompleted: number }): CoachResponse {
  const lang = getLanguage();
  const gap = userObjectives.visitsMonthly - userObjectives.visitsCompleted;
  const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
  const visitsPerDay = Math.ceil(gap / Math.max(daysLeft, 1));

  const quickWins = practitioners
    .filter(p => p.preferredChannel === 'Téléphone' || daysSince(p.lastVisitDate) > 30)
    .sort((a, b) => a.vingtile - b.vingtile)
    .slice(0, gap);

  return {
    message: lang === 'en'
      ? `To reach your goal of **${userObjectives.visitsMonthly} visits**, you have **${gap} visits** left to complete in **${daysLeft} days** (~${visitsPerDay} visits/day).`
      : `Pour atteindre votre objectif de **${userObjectives.visitsMonthly} visites**, il vous reste **${gap} visites** à réaliser en **${daysLeft} jours** (~${visitsPerDay} visites/jour).`,
    practitioners: quickWins.slice(0, 5).map(p => ({ ...p, daysSinceVisit: daysSince(p.lastVisitDate) })),
    insights: lang === 'en'
      ? [
          `**Recommended strategy**: prioritize practitioners reachable by phone for quick visits`,
          `**${quickWins.filter(p => p.preferredChannel === 'Téléphone').length}** practitioners prefer phone contact`
        ]
      : [
          `**Stratégie recommandée** : privilégiez les praticiens joignables par téléphone pour des visites rapides`,
          `**${quickWins.filter(p => p.preferredChannel === 'Téléphone').length}** praticiens préfèrent le contact téléphonique`
        ],
    isMarkdown: true
  };
}

function handleRiskQuery(practitioners: Practitioner[], userObjectives: { visitsMonthly: number; visitsCompleted: number }): CoachResponse {
  const lang = getLanguage();
  const atRisk = practitioners
    .filter(p => p.trend === 'down' || p.loyaltyScore < 5)
    .sort((a, b) => a.loyaltyScore - b.loyaltyScore)
    .slice(0, 5)
    .map(p => ({ ...p, daysSinceVisit: daysSince(p.lastVisitDate) }));

  const totalVolumeAtRisk = atRisk.reduce((sum, p) => sum + p.volumeL, 0);
  const visitsRemaining = userObjectives.visitsMonthly - userObjectives.visitsCompleted;

  return {
    message: lang === 'en'
      ? `I identified **${atRisk.length} at-risk practitioners** for churn:`
      : `J'ai identifié **${atRisk.length} praticiens à risque** de churn :`,
    practitioners: atRisk,
    insights: lang === 'en'
      ? [
          `WARNING: These practitioners show signs of **disengagement** (declining prescriptions or low loyalty)`,
          `**Volume at risk**: ${(totalVolumeAtRisk / 1000).toFixed(0)}${volUnit()} - direct impact on your quarterly results`,
          `Prioritizing **${Math.min(atRisk.length, visitsRemaining)} reactivation visit(s)** this month can stabilize this volume`
        ]
      : [
          `ATTENTION: Ces praticiens montrent des signes de **désengagement** (baisse prescriptions ou fidélité faible)`,
          `**Volume à risque** : ${(totalVolumeAtRisk / 1000).toFixed(0)}${volUnit()} - impact direct sur vos résultats trimestriels`,
          `Prioriser **${Math.min(atRisk.length, visitsRemaining)} visite(s)** de réactivation ce mois peut stabiliser ce volume`
        ],
    isMarkdown: true
  };
}

function handleOpportunitiesQuery(practitioners: Practitioner[], userObjectives: { visitsMonthly: number; visitsCompleted: number }): CoachResponse {
  const lang = getLanguage();
  const opportunities = practitioners
    .filter(p => p.visitCount === 0 || !p.lastVisitDate)
    .filter(p => p.vingtile <= 5)
    .sort((a, b) => a.vingtile - b.vingtile)
    .slice(0, 5)
    .map(p => ({ ...p, daysSinceVisit: daysSince(p.lastVisitDate) }));

  const potentialVolume = opportunities.reduce((sum, p) => sum + p.volumeL, 0);
  const visitsRemaining = userObjectives.visitsMonthly - userObjectives.visitsCompleted;

  return {
    message: lang === 'en'
      ? `Here are **${opportunities.length} opportunities** for high-potential new prescribers:`
      : `Voici **${opportunities.length} opportunités** de nouveaux prescripteurs à fort potentiel :`,
    practitioners: opportunities,
    insights: lang === 'en'
      ? [
          `These practitioners are in the **Top 25%** but have never been contacted`,
          `**Cumulative potential**: ${(potentialVolume / 1000).toFixed(0)}${volUnit()} - significant impact on your annual objectives`,
          `**${Math.min(opportunities.length, visitsRemaining)} outreach visit(s)** this month = ${Math.min(opportunities.length, visitsRemaining)}/${userObjectives.visitsMonthly} visits counted towards your goal`
        ]
      : [
          `Ces praticiens sont dans le **Top 25%** mais n'ont jamais été contactés`,
          `**Potentiel cumulé** : ${(potentialVolume / 1000).toFixed(0)}${volUnit()} - impact significatif sur vos objectifs annuels`,
          `**${Math.min(opportunities.length, visitsRemaining)} visite(s)** d'approche ce mois = ${Math.min(opportunities.length, visitsRemaining)}/${userObjectives.visitsMonthly} visites comptabilisées vers votre objectif`
        ],
    isMarkdown: true
  };
}

function handleTopQuery(queryResult: ReturnType<typeof executeQuery>, analysis: ReturnType<typeof analyzeQuestion>, question: string): CoachResponse {
  const lang = getLanguage();
  const limit = analysis.limit || 5;
  const q = question.toLowerCase();

  let sortedPractitioners = queryResult.practitioners;
  let sortLabel = 'volume';
  let sortLabelEn = 'volume';

  if (q.includes('fidélité') || q.includes('fidelite') || q.includes('fidèle')) {
    sortedPractitioners = [...queryResult.practitioners].sort((a, b) => b.metrics.loyaltyScore - a.metrics.loyaltyScore);
    sortLabel = 'fidélité';
    sortLabelEn = 'loyalty';
  } else if (q.includes('vingtile')) {
    sortedPractitioners = [...queryResult.practitioners].sort((a, b) => a.metrics.vingtile - b.metrics.vingtile);
    sortLabel = 'vingtile';
    sortLabelEn = 'vingtile';
  } else if (q.includes('publication')) {
    sortedPractitioners = [...queryResult.practitioners].sort((a, b) => {
      const pubA = a.news?.filter(n => n.type === 'publication').length || 0;
      const pubB = b.news?.filter(n => n.type === 'publication').length || 0;
      return pubB - pubA;
    });
    sortLabel = 'publications';
    sortLabelEn = 'publications';
  } else {
    sortedPractitioners = [...queryResult.practitioners].sort((a, b) => b.metrics.volumeL - a.metrics.volumeL);
  }

  const displayLabel = lang === 'en' ? sortLabelEn : sortLabel;
  const top = sortedPractitioners.slice(0, limit);
  const inAt = lang === 'en' ? 'in' : 'à';
  const loyaltyLabel = lang === 'en' ? 'Loyalty' : 'Fidélité';
  const practitionersWord = lang === 'en' ? 'practitioners' : 'praticiens';

  return {
    message: `**Top ${limit} ${practitionersWord} ${lang === 'en' ? 'by' : 'par'} ${displayLabel}** :\n\n${top.map((p, i) => {
      const metric = sortLabel === 'fidélité' ? `${loyaltyLabel}: ${p.metrics.loyaltyScore}/10` :
                     sortLabel === 'vingtile' ? `Vingtile: ${p.metrics.vingtile}` :
                     sortLabel === 'publications' ? `${p.news?.filter(n => n.type === 'publication').length || 0} publication(s)` :
                     `${(p.metrics.volumeL / 1000).toFixed(0)}${volUnit()}`;
      return `${i + 1}. **${p.title} ${p.firstName} ${p.lastName}**\n   ${p.specialty} ${inAt} ${p.address.city} | ${metric}${p.metrics.isKOL ? ' | KOL' : ''}`;
    }).join('\n\n')}`,
    practitioners: top.map(p => ({
      ...adaptPractitionerProfile(p),
      daysSinceVisit: daysSince(p.lastVisitDate || null)
    })),
    isMarkdown: true
  };
}

function handleVingtileQuery(_queryResult: ReturnType<typeof executeQuery>, _analysis: ReturnType<typeof analyzeQuestion>, question: string): CoachResponse {
  const lang = getLanguage();
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
      message: lang === 'en'
        ? `**Average vingtile by city**:\n\n${cityAverages.map(({ city, avg }) => `- **${city}**: ${avg.toFixed(1)}`).join('\n')}`
        : `**Vingtile moyen par ville** :\n\n${cityAverages.map(({ city, avg }) => `- **${city}**: ${avg.toFixed(1)}`).join('\n')}`,
      insights: lang === 'en'
        ? [
            `The lower the vingtile, the better the prescriber`,
            `Best city: **${cityAverages[0].city}** (average vingtile: ${cityAverages[0].avg.toFixed(1)})`
          ]
        : [
            `Plus le vingtile est bas, meilleur est le prescripteur`,
            `Meilleure ville: **${cityAverages[0].city}** (vingtile moyen: ${cityAverages[0].avg.toFixed(1)})`
          ],
      isMarkdown: true
    };
  }

  const allPractitioners = DataService.getAllPractitioners();

  const topLabel = lang === 'en' ? '1-5 (Top 25%)' : '1-5 (Top 25%)';
  const highLabel = lang === 'en' ? '6-10 (High)' : '6-10 (Haut)';
  const midLabel = lang === 'en' ? '11-15 (Medium)' : '11-15 (Moyen)';
  const lowLabel = lang === 'en' ? '16-20 (Low)' : '16-20 (Bas)';

  const distribution: Record<string, number> = {};

  allPractitioners.forEach(p => {
    const bucket = p.metrics.vingtile <= 5 ? topLabel :
                   p.metrics.vingtile <= 10 ? highLabel :
                   p.metrics.vingtile <= 15 ? midLabel :
                   lowLabel;
    distribution[bucket] = (distribution[bucket] || 0) + 1;
  });

  const practitionersWord = lang === 'en' ? 'practitioners' : 'praticiens';

  return {
    message: lang === 'en'
      ? `**Vingtile distribution**:\n\n- **Vingtile 1-5** (Top 25%): ${distribution[topLabel] || 0} ${practitionersWord}\n- **Vingtile 6-10** (High): ${distribution[highLabel] || 0} ${practitionersWord}\n- **Vingtile 11-15** (Medium): ${distribution[midLabel] || 0} ${practitionersWord}\n- **Vingtile 16-20** (Low): ${distribution[lowLabel] || 0} ${practitionersWord}`
      : `**Distribution des vingtiles** :\n\n- **Vingtile 1-5** (Top 25%): ${distribution[topLabel] || 0} ${practitionersWord}\n- **Vingtile 6-10** (Haut): ${distribution[highLabel] || 0} ${practitionersWord}\n- **Vingtile 11-15** (Moyen): ${distribution[midLabel] || 0} ${practitionersWord}\n- **Vingtile 16-20** (Bas): ${distribution[lowLabel] || 0} ${practitionersWord}`,
    insights: lang === 'en'
      ? [
          `The vingtile ranks prescribers from 1 (best) to 20`,
          `Average vingtile: ${(allPractitioners.reduce((s, p) => s + p.metrics.vingtile, 0) / allPractitioners.length).toFixed(1)}`
        ]
      : [
          `Le vingtile classe les prescripteurs de 1 (meilleur) à 20`,
          `Vingtile moyen: ${(allPractitioners.reduce((s, p) => s + p.metrics.vingtile, 0) / allPractitioners.length).toFixed(1)}`
        ],
    isMarkdown: true
  };
}

function handleGenericQueryResult(queryResult: ReturnType<typeof executeQuery>, _question: string): CoachResponse {
  const lang = getLanguage();
  return {
    message: queryResult.summary,
    practitioners: queryResult.practitioners.slice(0, 5).map(p => ({
      ...adaptPractitionerProfile(p),
      daysSinceVisit: daysSince(p.lastVisitDate || null)
    })),
    insights: [
      `${lang === 'en' ? 'Total volume' : 'Volume total'}: ${(queryResult.aggregations!.totalVolume / 1000).toFixed(0)}${volUnit()}`,
      `${queryResult.aggregations!.kolCount} KOL(s)`,
      `${lang === 'en' ? 'Average loyalty' : 'Fidélité moyenne'}: ${queryResult.aggregations!.avgLoyalty.toFixed(1)}/10`
    ],
    isMarkdown: true
  };
}

function getHelpResponse(): CoachResponse {
  const lang = getLanguage();

  if (lang === 'en') {
    return {
      message: `I am your **ARIA strategic assistant**. I can answer many questions about your practitioners. Here are some examples:`,
      insights: [
        `**Practitioner search:**\n- "Which doctor named Bernard has the most publications?"\n- "Give me the contact details of Dr Martin"`,
        `**Statistics:**\n- "How many pulmonologists in Lyon?"\n- "What is the average vingtile by city?"`,
        `**Sales strategy:**\n- "Who should I visit as a priority this week?"\n- "Which KOLs haven't I seen in 60 days?"`,
        `**Rankings:**\n- "Top 5 prescribers by volume"\n- "Practitioners at risk of churn"`,
        `**Opportunities:**\n- "What are my new prescriber opportunities?"\n- "How can I reach my monthly goal?"`
      ],
      isMarkdown: true
    };
  }

  return {
    message: `Je suis votre **assistant stratégique ARIA**. Je peux répondre à de nombreuses questions sur vos praticiens. Voici quelques exemples :`,
    insights: [
      `**Recherche de praticiens :**\n- "Quel médecin prénommé Bernard a le plus de publications ?"\n- "Donne-moi les coordonnées du Dr Martin"`,
      `**Statistiques :**\n- "Combien de pneumologues à Lyon ?"\n- "Quel est le vingtile moyen par ville ?"`,
      `**Stratégie commerciale :**\n- "Qui dois-je voir en priorité cette semaine ?"\n- "Quels KOLs n'ai-je pas vus depuis 60 jours ?"`,
      `**Classements :**\n- "Top 5 prescripteurs par volume"\n- "Praticiens à risque de churn"`,
      `**Opportunités :**\n- "Quelles sont mes opportunités de nouveaux prescripteurs ?"\n- "Comment atteindre mon objectif mensuel ?"`
    ],
    isMarkdown: true
  };
}

export function generateCoachResponse(
  question: string,
  practitioners: Practitioner[],
  userObjectives: { visitsMonthly: number; visitsCompleted: number }
): CoachResponse {
  return generateSmartResponse(question, practitioners, userObjectives);
}
