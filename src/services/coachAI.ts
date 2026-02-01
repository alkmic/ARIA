import type { Practitioner } from '../types';
import { detectIntent as detectAgenticIntent } from './agenticCoachAI';

export interface CoachResponse {
  message: string;
  practitioners?: (Practitioner & { daysSinceVisit?: number; priorityScore?: number })[];
  insights?: string[];
  actions?: { label: string; onClick: () => void }[];
}

// Calcul des jours depuis une date
function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// Détection d'intention améliorée en utilisant le système agentic
function detectIntent(question: string): string {
  const agenticIntent = detectAgenticIntent(question);

  // Mapper les intents agentic vers les intents du fallback
  const intentMap: Record<string, string> = {
    'kol_management': 'kol',
    'visit_priority': 'priority',
    'objective_strategy': 'objective',
    'risk_assessment': 'risk',
    'opportunity_detection': 'opportunities',
    'practitioner_info': 'practitioner',
    'top_performers': 'top',
    'territory_analysis': 'territory',
    'analytics': 'analytics'
  };

  return intentMap[agenticIntent] || agenticIntent;
}

// Génération de réponse
export function generateCoachResponse(
  question: string,
  practitioners: Practitioner[],
  userObjectives: { visitsMonthly: number; visitsCompleted: number }
): CoachResponse {
  const intent = detectIntent(question);

  switch (intent) {
    case 'priority': {
      // Trier par score de priorité (vingtile bas + jours depuis visite élevés)
      const sorted = [...practitioners]
        .map(p => ({
          ...p,
          priorityScore: p.vingtile + daysSince(p.lastVisitDate) / 30,
          daysSinceVisit: daysSince(p.lastVisitDate)
        }))
        .sort((a, b) => a.priorityScore - b.priorityScore)
        .slice(0, 5);

      return {
        message: `Je vois que vous êtes à ${userObjectives.visitsCompleted}/${userObjectives.visitsMonthly} visites ce mois (${Math.round(userObjectives.visitsCompleted / userObjectives.visitsMonthly * 100)}%). Voici mes 5 recommandations prioritaires :`,
        practitioners: sorted,
        insights: [
          `En visitant ces 5 praticiens, vous atteindrez ${Math.min(userObjectives.visitsCompleted + 5, userObjectives.visitsMonthly)}/${userObjectives.visitsMonthly} visites.`,
          sorted.some(p => p.vingtile <= 2) ? `⚠️ ${sorted.filter(p => p.vingtile <= 2).length} praticien(s) du Top 10% à voir en urgence.` : null
        ].filter(Boolean) as string[]
      };
    }

    case 'kol': {
      const kols = practitioners
        .filter(p => p.isKOL)
        .map(p => ({ ...p, daysSinceVisit: daysSince(p.lastVisitDate) }))
        .sort((a, b) => b.daysSinceVisit - a.daysSinceVisit);

      const notSeenRecently = kols.filter(k => k.daysSinceVisit > 60);
      const visitsRemaining = userObjectives.visitsMonthly - userObjectives.visitsCompleted;

      return {
        message: `Vous avez ${kols.length} KOLs sur votre territoire. ${notSeenRecently.length} n'ont pas été vus depuis plus de 60 jours :`,
        practitioners: notSeenRecently.slice(0, 5),
        insights: [
          notSeenRecently.length > 0
            ? `🔴 ${notSeenRecently.length} KOL(s) nécessitent une visite urgente.`
            : `✅ Tous vos KOLs ont été vus récemment. Excellent travail !`,
          `📊 Impact objectif : ${Math.min(notSeenRecently.length, visitsRemaining)} visite(s) KOL comptabilisée(s) sur vos ${visitsRemaining} visites restantes ce mois.`
        ]
      };
    }

    case 'objective': {
      const gap = userObjectives.visitsMonthly - userObjectives.visitsCompleted;
      const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
      const visitsPerDay = Math.ceil(gap / Math.max(daysLeft, 1));

      const quickWins = practitioners
        .filter(p => p.preferredChannel === 'Téléphone' || daysSince(p.lastVisitDate) > 30)
        .sort((a, b) => a.vingtile - b.vingtile)
        .slice(0, gap);

      return {
        message: `Pour atteindre votre objectif de ${userObjectives.visitsMonthly} visites, il vous reste ${gap} visites à réaliser en ${daysLeft} jours (~${visitsPerDay} visites/jour).`,
        practitioners: quickWins.slice(0, 5),
        insights: [
          `💡 Stratégie recommandée : privilégiez les praticiens joignables par téléphone pour des visites rapides.`,
          `📊 ${quickWins.filter(p => p.preferredChannel === 'Téléphone').length} praticiens préfèrent le contact téléphonique.`
        ]
      };
    }

    case 'risk': {
      const atRisk = practitioners
        .filter(p => p.trend === 'down' || p.loyaltyScore < 5)
        .sort((a, b) => a.loyaltyScore - b.loyaltyScore)
        .slice(0, 5);

      const totalVolumeAtRisk = atRisk.reduce((sum, p) => sum + p.volumeL, 0);
      const visitsRemaining = userObjectives.visitsMonthly - userObjectives.visitsCompleted;

      return {
        message: `J'ai identifié ${atRisk.length} praticiens à risque de churn :`,
        practitioners: atRisk,
        insights: [
          `⚠️ Ces praticiens montrent des signes de désengagement (baisse prescriptions ou fidélité faible).`,
          `💰 Volume à risque : ${(totalVolumeAtRisk / 1000).toFixed(0)}K L/an - impact direct sur vos résultats trimestriels.`,
          `📊 Prioriser ${Math.min(atRisk.length, visitsRemaining)} visite(s) de réactivation ce mois peut stabiliser ce volume.`
        ]
      };
    }

    case 'opportunities': {
      const opportunities = practitioners
        .filter(p => p.visitCount === 0 || !p.lastVisitDate)
        .filter(p => p.vingtile <= 5)
        .sort((a, b) => a.vingtile - b.vingtile)
        .slice(0, 5);

      const potentialVolume = opportunities.reduce((sum, p) => sum + p.volumeL, 0);
      const visitsRemaining = userObjectives.visitsMonthly - userObjectives.visitsCompleted;

      return {
        message: `Voici ${opportunities.length} opportunités de nouveaux prescripteurs à fort potentiel :`,
        practitioners: opportunities,
        insights: [
          `🎯 Ces praticiens sont dans le Top 25% mais n'ont jamais été contactés.`,
          `💰 Potentiel cumulé : ${(potentialVolume / 1000).toFixed(0)}K L/an - impact significatif sur vos objectifs annuels.`,
          `📊 ${Math.min(opportunities.length, visitsRemaining)} visite(s) d'approche ce mois = ${Math.min(opportunities.length, visitsRemaining)}/${userObjectives.visitsMonthly} visites comptabilisées vers votre objectif.`
        ]
      };
    }

    case 'practitioner': {
      // Recherche du praticien mentionné dans la question
      const searchTerms = question.toLowerCase().split(' ').filter(w => w.length > 3);
      const mentioned = practitioners.find(p =>
        searchTerms.some(term =>
          p.lastName.toLowerCase().includes(term) ||
          p.firstName.toLowerCase().includes(term)
        )
      );

      if (mentioned) {
        return {
          message: `Voici les informations sur ${mentioned.title} ${mentioned.firstName} ${mentioned.lastName} :`,
          practitioners: [{ ...mentioned, daysSinceVisit: daysSince(mentioned.lastVisitDate) }],
          insights: [
            `📍 ${mentioned.specialty} à ${mentioned.city}`,
            `📊 Volume annuel : ${(mentioned.volumeL / 1000).toFixed(0)}K L/an (Vingtile ${mentioned.vingtile})`,
            `❤️ Fidélité : ${mentioned.loyaltyScore}/10${mentioned.isKOL ? ' • Statut KOL ⭐' : ''}`,
            mentioned.lastVisitDate
              ? `🗓️ Dernière visite : ${new Date(mentioned.lastVisitDate).toLocaleDateString('fr-FR')} (il y a ${daysSince(mentioned.lastVisitDate)} jours)`
              : `⚠️ Jamais visité - opportunité à saisir !`
          ]
        };
      }

      return {
        message: `Je n'ai pas trouvé le praticien mentionné dans ma base de données. Essayez avec le nom de famille complet.`,
        insights: [`💡 Utilisez la recherche pour trouver un praticien spécifique.`]
      };
    }

    case 'top': {
      const topPerformers = [...practitioners]
        .sort((a, b) => b.volumeL - a.volumeL)
        .slice(0, 10)
        .map(p => ({ ...p, daysSinceVisit: daysSince(p.lastVisitDate) }));

      const totalVolume = practitioners.reduce((sum, p) => sum + p.volumeL, 0);
      const topVolume = topPerformers.reduce((sum, p) => sum + p.volumeL, 0);
      const concentration = (topVolume / totalVolume) * 100;

      return {
        message: `Voici vos 10 meilleurs prescripteurs (par volume annuel) :`,
        practitioners: topPerformers,
        insights: [
          `📊 Ces praticiens représentent ${concentration.toFixed(0)}% de votre volume total`,
          `⭐ ${topPerformers.filter(p => p.isKOL).length} KOLs dans le Top 10`,
          `🎯 Fidélité moyenne : ${(topPerformers.reduce((s, p) => s + p.loyaltyScore, 0) / topPerformers.length).toFixed(1)}/10`,
          topPerformers.some(p => p.daysSinceVisit > 60)
            ? `⚠️ ${topPerformers.filter(p => p.daysSinceVisit > 60).length} top performer(s) non vu(s) depuis 60+ jours !`
            : `✅ Tous vos top performers sont régulièrement visités`
        ]
      };
    }

    case 'territory':
    case 'analytics': {
      const stats = {
        total: practitioners.length,
        kols: practitioners.filter(p => p.isKOL).length,
        pneumologues: practitioners.filter(p => p.specialty === 'Pneumologue').length,
        generalistes: practitioners.filter(p => p.specialty === 'Médecin généraliste').length,
        highRisk: practitioners.filter(p => p.trend === 'down' || p.loyaltyScore < 5).length,
        totalVolume: practitioners.reduce((sum, p) => sum + p.volumeL, 0),
        avgLoyalty: practitioners.reduce((sum, p) => sum + p.loyaltyScore, 0) / practitioners.length
      };

      const cityDistribution = practitioners.reduce((acc, p) => {
        acc[p.city] = (acc[p.city] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topCities = Object.entries(cityDistribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([city, count]) => `${city} (${count} praticiens)`);

      return {
        message: `Analyse de votre territoire Rhône-Alpes :`,
        insights: [
          `👥 ${stats.total} praticiens (${stats.pneumologues} pneumologues, ${stats.generalistes} généralistes)`,
          `⭐ ${stats.kols} KOLs identifiés (${((stats.kols / stats.total) * 100).toFixed(0)}% de votre portefeuille)`,
          `💰 Volume total : ${(stats.totalVolume / 1000000).toFixed(1)}M L/an`,
          `❤️ Fidélité moyenne : ${stats.avgLoyalty.toFixed(1)}/10`,
          `⚠️ ${stats.highRisk} praticiens à risque nécessitent une attention`,
          `📍 Villes principales : ${topCities.join(', ')}`
        ]
      };
    }

    default: {
      // Mode dégradé : afficher le contexte pertinent même sans intent spécifique
      const urgentPractitioners = [...practitioners]
        .map(p => ({
          ...p,
          priorityScore: p.vingtile + daysSince(p.lastVisitDate) / 30,
          daysSinceVisit: daysSince(p.lastVisitDate)
        }))
        .sort((a, b) => a.priorityScore - b.priorityScore)
        .slice(0, 3);

      return {
        message: `⚠️ API IA non configurée - Mode réponse structurée activé.\n\nJe détecte que vous avez ${practitioners.length} praticiens dans votre base. Voici vos 3 priorités immédiates :`,
        practitioners: urgentPractitioners,
        insights: [
          `💡 Pour des réponses plus détaillées, configurez votre clé API Groq (voir CONFIGURATION_IA.md)`,
          `📝 Exemples de questions :`,
          `  • "Qui dois-je voir en priorité cette semaine ?"`,
          `  • "Quels KOLs n'ai-je pas vus récemment ?"`,
          `  • "Quels sont mes top prescripteurs ?"`,
          `  • "Analyse de mon territoire"`
        ]
      };
    }
  }
}
