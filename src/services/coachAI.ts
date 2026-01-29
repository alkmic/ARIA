import type { Practitioner } from '../types';

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

// Détection d'intention par mots-clés
function detectIntent(question: string): string {
  const q = question.toLowerCase();

  if (q.includes('priorité') || q.includes('voir') || q.includes('semaine') || q.includes('aujourd')) {
    return 'priority';
  }
  if (q.includes('kol') || q.includes('leader') || q.includes('opinion')) {
    return 'kol';
  }
  if (q.includes('objectif') || q.includes('atteindre') || q.includes('mois') || q.includes('sauver')) {
    return 'objective';
  }
  if (q.includes('risque') || q.includes('perdre') || q.includes('churn') || q.includes('baisse')) {
    return 'risk';
  }
  if (q.includes('nouveau') || q.includes('potentiel') || q.includes('opportunité')) {
    return 'opportunities';
  }
  return 'general';
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

    default: {
      return {
        message: `Je peux vous aider avec plusieurs types de questions :`,
        insights: [
          `• "Qui dois-je voir en priorité cette semaine ?"`,
          `• "Quels KOLs n'ai-je pas vus récemment ?"`,
          `• "Comment atteindre mon objectif mensuel ?"`,
          `• "Quels praticiens sont à risque de churn ?"`,
          `• "Quelles sont mes opportunités de nouveaux prescripteurs ?"`
        ]
      };
    }
  }
}
