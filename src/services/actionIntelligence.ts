/**
 * Service d'Intelligence pour les Actions IA
 * Génère des recommandations enrichies avec justifications basées sur les données
 */

import { DataService } from './dataService';
import type { PractitionerProfile } from '../types/database';
import type { AIAction } from '../stores/useUserDataStore';

// Types pour les scores et analyses
interface ActionScore {
  urgency: number;
  impact: number;
  probability: number;
  overall: number;
}

interface ActionContext {
  daysSinceVisit: number;
  volumePercentile: number;
  loyaltyTrend: 'improving' | 'stable' | 'declining';
  recentPublications: number;
  competitorMentions: string[];
  territoryContext: {
    cityRank: number;
    cityTotal: number;
    cityVolume: number;
  };
  historicalSuccess: number; // % de conversions passées pour ce type
}

// Analyse le contexte complet d'un praticien
function analyzePractitionerContext(p: PractitionerProfile): ActionContext {
  const today = new Date();
  const allPractitioners = DataService.getAllPractitioners();

  // Calcul jours depuis dernière visite
  const daysSinceVisit = p.lastVisitDate
    ? Math.floor((today.getTime() - new Date(p.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Calcul du percentile volume
  const volumes = allPractitioners.map(pr => pr.metrics.volumeL).sort((a, b) => b - a);
  const volumeRank = volumes.indexOf(p.metrics.volumeL) + 1;
  const volumePercentile = Math.round((1 - volumeRank / volumes.length) * 100);

  // Analyse tendance fidélité (simulée basée sur les notes récentes)
  const recentNotes = p.notes.filter(n => {
    const noteDate = new Date(n.date);
    return (today.getTime() - noteDate.getTime()) < 90 * 24 * 60 * 60 * 1000;
  });

  const positiveKeywords = ['satisfait', 'content', 'excellent', 'bon', 'intéressé', 'favorable'];
  const negativeKeywords = ['insatisfait', 'problème', 'concurrent', 'hésitant', 'réticent'];

  let positiveCount = 0;
  let negativeCount = 0;
  recentNotes.forEach(n => {
    const content = n.content.toLowerCase();
    positiveKeywords.forEach(kw => { if (content.includes(kw)) positiveCount++; });
    negativeKeywords.forEach(kw => { if (content.includes(kw)) negativeCount++; });
  });

  const loyaltyTrend: 'improving' | 'stable' | 'declining' =
    positiveCount > negativeCount + 1 ? 'improving' :
    negativeCount > positiveCount + 1 ? 'declining' : 'stable';

  // Publications récentes
  const recentPublications = p.news.filter(n => {
    const newsDate = new Date(n.date);
    return n.type === 'publication' && (today.getTime() - newsDate.getTime()) < 180 * 24 * 60 * 60 * 1000;
  }).length;

  // Mentions concurrents
  const competitorMentions: string[] = [];
  const competitors = ['Vivisol', 'Linde', 'SOS Oxygène', 'Bastide'];
  recentNotes.forEach(n => {
    competitors.forEach(c => {
      if (n.content.toLowerCase().includes(c.toLowerCase()) && !competitorMentions.includes(c)) {
        competitorMentions.push(c);
      }
    });
  });

  // Contexte territorial
  const cityPractitioners = allPractitioners.filter(pr => pr.address.city === p.address.city);
  const cityVolumes = cityPractitioners.map(pr => pr.metrics.volumeL).sort((a, b) => b - a);
  const cityRank = cityVolumes.indexOf(p.metrics.volumeL) + 1;
  const cityVolume = cityVolumes.reduce((a, b) => a + b, 0);

  return {
    daysSinceVisit,
    volumePercentile,
    loyaltyTrend,
    recentPublications,
    competitorMentions,
    territoryContext: {
      cityRank,
      cityTotal: cityPractitioners.length,
      cityVolume,
    },
    historicalSuccess: 65 + Math.random() * 25, // Simulé pour démo
  };
}

// Calcule les scores pour une action
function calculateScores(
  type: AIAction['type'],
  p: PractitionerProfile,
  context: ActionContext
): ActionScore {
  let urgency = 0;
  let impact = 0;
  let probability = 0;

  // Calcul basé sur le type d'action
  switch (type) {
    case 'visit_kol':
      urgency = Math.min(100, context.daysSinceVisit - 30);
      impact = 70 + (p.metrics.isKOL ? 20 : 0) + context.volumePercentile / 5;
      probability = p.metrics.loyaltyScore * 8 + (context.loyaltyTrend === 'improving' ? 10 : 0);
      break;

    case 'visit_urgent':
      urgency = Math.min(100, context.daysSinceVisit);
      impact = context.volumePercentile;
      probability = 50 + p.metrics.loyaltyScore * 4;
      break;

    case 'opportunity':
      urgency = context.loyaltyTrend === 'improving' ? 70 : 40;
      impact = p.metrics.potentialGrowth + context.volumePercentile / 2;
      probability = p.metrics.loyaltyScore * 10;
      break;

    case 'risk':
      urgency = 100 - p.metrics.loyaltyScore * 10;
      impact = context.volumePercentile;
      probability = 40 + (context.competitorMentions.length > 0 ? -20 : 0);
      break;

    case 'followup':
      urgency = 60;
      impact = 50;
      probability = 70;
      break;

    case 'upsell':
      urgency = 30;
      impact = 40 + p.metrics.potentialGrowth;
      probability = p.metrics.loyaltyScore * 9;
      break;

    case 'competitor':
      urgency = 80;
      impact = context.volumePercentile;
      probability = 50;
      break;

    case 'publication':
      urgency = 50;
      impact = 60;
      probability = 70;
      break;
  }

  // Normalisation
  urgency = Math.min(100, Math.max(0, urgency));
  impact = Math.min(100, Math.max(0, impact));
  probability = Math.min(100, Math.max(0, probability));

  // Score global pondéré
  const overall = Math.round(urgency * 0.35 + impact * 0.40 + probability * 0.25);

  return { urgency, impact, probability, overall };
}

// Génère la justification IA enrichie
function generateAIJustification(
  type: AIAction['type'],
  p: PractitionerProfile,
  context: ActionContext,
  scores: ActionScore
): AIAction['aiJustification'] {
  const stats = DataService.getGlobalStats();
  const volumeShare = ((p.metrics.volumeL / stats.totalVolume) * 100).toFixed(1);

  // Métriques justificatives
  const metrics: string[] = [];
  metrics.push(`${volumeShare}% du volume total du territoire`);
  metrics.push(`Vingtile ${p.metrics.vingtile}/20 (Top ${p.metrics.vingtile * 5}%)`);
  metrics.push(`Fidélité: ${p.metrics.loyaltyScore}/10`);

  if (context.daysSinceVisit < 999) {
    metrics.push(`Dernière visite: il y a ${context.daysSinceVisit} jours`);
  }

  if (context.recentPublications > 0) {
    metrics.push(`${context.recentPublications} publication(s) récente(s)`);
  }

  metrics.push(`#${context.territoryContext.cityRank} sur ${context.territoryContext.cityTotal} à ${p.address.city}`);

  // Risques si non action
  const risks: string[] = [];

  if (type === 'visit_kol' || type === 'visit_urgent') {
    if (context.daysSinceVisit > 60) {
      risks.push(`Risque de perte de relation après ${context.daysSinceVisit} jours sans contact`);
    }
    if (context.competitorMentions.length > 0) {
      risks.push(`Concurrents mentionnés récemment: ${context.competitorMentions.join(', ')}`);
    }
  }

  if (type === 'risk') {
    risks.push(`Volume à risque: ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an`);
    if (context.loyaltyTrend === 'declining') {
      risks.push('Tendance de fidélité en baisse sur les 90 derniers jours');
    }
  }

  if (risks.length === 0) {
    risks.push('Opportunité manquée si action retardée');
  }

  // Opportunités si action
  const opportunities: string[] = [];

  if (type === 'opportunity' || type === 'upsell') {
    opportunities.push(`Potentiel de croissance: +${p.metrics.potentialGrowth}%`);
    if (context.loyaltyTrend === 'improving') {
      opportunities.push('Relation en amélioration - moment idéal pour développer');
    }
  }

  if (p.metrics.isKOL) {
    opportunities.push('Impact réseau: influence sur autres prescripteurs de la zone');
  }

  if (context.recentPublications > 0) {
    opportunities.push('Point d\'accroche: discuter de ses publications récentes');
  }

  if (opportunities.length === 0) {
    opportunities.push('Renforcement de la relation et maintien du volume');
  }

  // Approche suggérée
  let suggestedApproach = '';

  switch (type) {
    case 'visit_kol':
      suggestedApproach = context.recentPublications > 0
        ? `Abordez ses récentes publications pour créer un échange de valeur. Préparez une présentation des innovations Air Liquide qui pourraient l'intéresser.`
        : `Planifiez une visite de qualité avec présentation des dernières innovations. Proposez une invitation à un événement médical.`;
      break;
    case 'visit_urgent':
      suggestedApproach = `Visite de routine avec focus sur la satisfaction. Identifiez les besoins non couverts et proposez des solutions adaptées.`;
      break;
    case 'opportunity':
      suggestedApproach = `Présentez les services premium et les nouvelles gammes. Le praticien est réceptif - proposez un élargissement de l'offre.`;
      break;
    case 'risk':
      suggestedApproach = context.competitorMentions.length > 0
        ? `Visite d'urgence pour comprendre les raisons de l'intérêt concurrent. Préparez une contre-argumentation et des avantages différenciants.`
        : `Contact rapide pour évaluer la satisfaction. Proposez un geste commercial ou un service additionnel si nécessaire.`;
      break;
    case 'followup':
      suggestedApproach = `Recontactez pour donner suite aux points évoqués lors de la dernière interaction. Montrez que vous êtes réactif.`;
      break;
    case 'upsell':
      suggestedApproach = `La relation est excellente. Proposez progressivement des services additionnels ou une montée en gamme.`;
      break;
    default:
      suggestedApproach = `Planifiez un contact personnalisé adapté au profil du praticien.`;
  }

  // Génération du résumé IA
  const summaryParts: string[] = [];

  if (p.metrics.isKOL) {
    summaryParts.push(`${p.title} ${p.lastName} est un KOL majeur de ${p.address.city}`);
  } else if (p.metrics.vingtile <= 5) {
    summaryParts.push(`${p.title} ${p.lastName} fait partie de vos Top 25% prescripteurs`);
  } else {
    summaryParts.push(`${p.title} ${p.lastName} (${p.specialty})`);
  }

  if (type === 'risk') {
    summaryParts.push(`présente des signaux d'alerte avec un score de fidélité de ${p.metrics.loyaltyScore}/10`);
  } else if (type === 'opportunity') {
    summaryParts.push(`présente un potentiel de développement de +${p.metrics.potentialGrowth}%`);
  } else if (context.daysSinceVisit > 45) {
    summaryParts.push(`n'a pas été visité depuis ${context.daysSinceVisit} jours`);
  }

  const summary = summaryParts.join(' ') + '. ' +
    `Score de priorité: ${scores.overall}/100 (Urgence: ${scores.urgency}, Impact: ${scores.impact}, Probabilité: ${scores.probability}).`;

  // Contexte concurrentiel
  const competitorAlert = context.competitorMentions.length > 0
    ? `⚠️ Alerte concurrence: ${context.competitorMentions.join(', ')} mentionné(s) dans les dernières interactions. Vigilance accrue requise.`
    : undefined;

  // Contexte actualité
  const contextualNews = context.recentPublications > 0
    ? `📰 ${context.recentPublications} publication(s) récente(s) - excellent point d'accroche pour la conversation.`
    : undefined;

  // Analyse de tendance
  const trendAnalysis = context.loyaltyTrend !== 'stable'
    ? `📈 Tendance: Fidélité ${context.loyaltyTrend === 'improving' ? 'en amélioration' : 'en déclin'} sur les 90 derniers jours.`
    : undefined;

  return {
    summary,
    metrics,
    risks,
    opportunities,
    suggestedApproach,
    competitorAlert,
    contextualNews,
    trendAnalysis,
  };
}

// Détermine la priorité basée sur le score
function determinePriority(scores: ActionScore, _type: AIAction['type']): AIAction['priority'] {
  if (scores.overall >= 80) return 'critical';
  if (scores.overall >= 60) return 'high';
  if (scores.overall >= 40) return 'medium';
  return 'low';
}

// Génère la date suggérée
function generateSuggestedDate(priority: AIAction['priority'], type: AIAction['type']): string {
  if (priority === 'critical') {
    return 'Cette semaine';
  }

  if (priority === 'high') {
    if (type === 'risk' || type === 'competitor') {
      return 'Sous 5 jours';
    }
    return 'Sous 2 semaines';
  }

  if (priority === 'medium') {
    return 'Ce mois';
  }

  return 'Prochaine opportunité';
}

// ==========================================
// FONCTION PRINCIPALE : Génération des actions
// ==========================================

export interface ActionGenerationConfig {
  kolVisitDays?: number;
  kolCriticalDays?: number;
  topPrescriberVisitDays?: number;
  churnLoyaltyThreshold?: number;
  churnVolumeThreshold?: number;
  opportunityLoyalty?: number;
  maxActions?: number; // Limite le nombre d'actions retournées
}

export function generateIntelligentActions(
  config: ActionGenerationConfig = {}
): Omit<AIAction, 'id' | 'createdAt' | 'status'>[] {
  const {
    kolVisitDays = 60,
    kolCriticalDays = 90,
    topPrescriberVisitDays = 45,
    churnLoyaltyThreshold = 5,
    churnVolumeThreshold = 50000,
    opportunityLoyalty = 7,
    maxActions = 15, // Par défaut, top 15 actions
  } = config;

  const practitioners = DataService.getAllPractitioners();
  const actions: Omit<AIAction, 'id' | 'createdAt' | 'status'>[] = [];
  const today = new Date();

  // Track processed practitioners to avoid duplicates
  const processedForType = new Map<string, Set<string>>();

  practitioners.forEach(p => {
    const context = analyzePractitionerContext(p);

    // 0. NOUVEAU PRATICIEN DÉTECTÉ — Jamais visité → visite de découverte urgente
    if (context.daysSinceVisit === 999) {
      const type: AIAction['type'] = 'visit_urgent';
      if (!processedForType.has('new_discovery')) processedForType.set('new_discovery', new Set());
      if (!processedForType.get('new_discovery')!.has(p.id)) {
        processedForType.get('new_discovery')!.add(p.id);

        const scores: ActionScore = {
          urgency: p.metrics.vingtile <= 5 ? 95 : p.metrics.vingtile <= 10 ? 80 : 65,
          impact: p.metrics.vingtile <= 5 ? 90 : p.metrics.vingtile <= 10 ? 70 : 50,
          probability: 60,
          overall: 0,
        };
        scores.overall = Math.round(scores.urgency * 0.35 + scores.impact * 0.40 + scores.probability * 0.25);
        const priority = p.metrics.vingtile <= 5 ? 'critical' as const : p.metrics.vingtile <= 10 ? 'high' as const : 'medium' as const;

        actions.push({
          type,
          priority,
          practitionerId: p.id,
          title: `🆕 Nouveau praticien — Visite de découverte`,
          reason: `${p.title} ${p.firstName} ${p.lastName} (${p.specialty}${p.metrics.isKOL ? ' - KOL' : ''}) n'a jamais été visité(e)`,
          aiJustification: {
            summary: `${p.title} ${p.firstName} ${p.lastName} est un nouveau praticien détecté sur le territoire de ${p.address.city} (Vingtile ${p.metrics.vingtile}, volume estimé ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an). Aucune visite enregistrée — une première prise de contact est essentielle pour établir la relation.`,
            metrics: [
              `Volume estimé: ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an`,
              `Vingtile ${p.metrics.vingtile}/20 (Top ${p.metrics.vingtile * 5}%)`,
              `${p.address.city} — ${p.metrics.isKOL ? 'Key Opinion Leader identifié' : p.specialty}`,
              `Potentiel de croissance: +${p.metrics.potentialGrowth}%`,
              `Aucune visite précédente enregistrée`,
            ],
            risks: [
              `Risque d'être capté en premier par un concurrent (Vivisol, Linde)`,
              `Pas de relation établie — aucun levier de fidélisation en place`,
              `Volume potentiel non capté: ${(p.metrics.volumeL / 1000).toFixed(0)}K L/an`,
            ],
            opportunities: [
              `Être le premier prestataire à prendre contact — avantage compétitif`,
              `Présenter la gamme complète Air Liquide Santé dès la première visite`,
              p.metrics.isKOL ? `KOL identifié — fort potentiel d'influence réseau` : `Développer un nouveau prescripteur sur le territoire`,
              `Proposer un kit de bienvenue avec documentation et démonstration produits`,
            ],
            suggestedApproach: `Préparez une visite de découverte complète : présentation Air Liquide Santé, gamme de produits adaptée à la spécialité (${p.specialty}), et proposition de mise en place d'un premier patient test. Apportez le kit de démonstration et la documentation LPPR. L'objectif est d'établir une relation de confiance et de positionner Air Liquide comme partenaire de référence.`,
            competitorAlert: `⚠️ Nouveau praticien non affilié — les concurrents pourraient aussi l'avoir identifié. Rapidité d'action recommandée.`,
          },
          scores,
          suggestedDate: priority === 'critical' ? 'Cette semaine' : 'Sous 2 semaines',
        });
      }
    }

    // 1. KOL à visiter (priorité maximale)
    if (p.metrics.isKOL && context.daysSinceVisit > kolVisitDays) {
      const type: AIAction['type'] = 'visit_kol';
      if (!processedForType.has(type)) processedForType.set(type, new Set());
      if (!processedForType.get(type)!.has(p.id)) {
        processedForType.get(type)!.add(p.id);

        const scores = calculateScores(type, p, context);
        const priority = context.daysSinceVisit > kolCriticalDays ? 'critical' : determinePriority(scores, type);

        actions.push({
          type,
          priority,
          practitionerId: p.id,
          title: `Visite KOL prioritaire`,
          reason: `${context.daysSinceVisit} jours depuis dernière visite`,
          aiJustification: generateAIJustification(type, p, context, scores),
          scores,
          suggestedDate: generateSuggestedDate(priority, type),
        });
      }
    }

    // 2. Risque de churn (haute priorité)
    if ((p.metrics.churnRisk === 'high' || p.metrics.loyaltyScore < churnLoyaltyThreshold) &&
        p.metrics.volumeL > churnVolumeThreshold) {
      const type: AIAction['type'] = 'risk';
      if (!processedForType.has(type)) processedForType.set(type, new Set());
      if (!processedForType.get(type)!.has(p.id)) {
        processedForType.get(type)!.add(p.id);

        const scores = calculateScores(type, p, context);
        const priority = p.metrics.volumeL > 100000 ? 'high' : determinePriority(scores, type);

        actions.push({
          type,
          priority,
          practitionerId: p.id,
          title: `Risque de perte détecté`,
          reason: `Fidélité ${p.metrics.loyaltyScore}/10 - Volume ${(p.metrics.volumeL / 1000).toFixed(0)}K L`,
          aiJustification: generateAIJustification(type, p, context, scores),
          scores,
          suggestedDate: generateSuggestedDate(priority, type),
        });
      }
    }

    // 3. Alerte concurrence (haute priorité)
    if (context.competitorMentions.length > 0) {
      const type: AIAction['type'] = 'competitor';
      if (!processedForType.has(type)) processedForType.set(type, new Set());
      if (!processedForType.get(type)!.has(p.id)) {
        processedForType.get(type)!.add(p.id);

        const scores = calculateScores(type, p, context);
        scores.urgency = 85;

        actions.push({
          type,
          priority: 'high',
          practitionerId: p.id,
          title: `Alerte concurrence`,
          reason: `${context.competitorMentions.join(', ')} mentionné(s)`,
          aiJustification: generateAIJustification(type, p, context, scores),
          scores,
          suggestedDate: 'Sous 5 jours',
        });
      }
    }

    // 4. Top prescripteurs non visités (seulement les plus importants)
    if (p.metrics.vingtile <= 3 && context.daysSinceVisit > topPrescriberVisitDays && !p.metrics.isKOL) {
      const type: AIAction['type'] = 'visit_urgent';
      if (!processedForType.has(type)) processedForType.set(type, new Set());
      if (!processedForType.get(type)!.has(p.id)) {
        processedForType.get(type)!.add(p.id);

        const scores = calculateScores(type, p, context);
        const priority = determinePriority(scores, type);

        actions.push({
          type,
          priority,
          practitionerId: p.id,
          title: `Visite Top 15% à planifier`,
          reason: `Vingtile ${p.metrics.vingtile} - ${context.daysSinceVisit}j sans visite`,
          aiJustification: generateAIJustification(type, p, context, scores),
          scores,
          suggestedDate: generateSuggestedDate(priority, type),
        });
      }
    }

    // 5. Opportunités de croissance (seulement les meilleures)
    if (p.metrics.potentialGrowth > 35 && p.metrics.loyaltyScore >= opportunityLoyalty) {
      const type: AIAction['type'] = 'opportunity';
      if (!processedForType.has(type)) processedForType.set(type, new Set());
      if (!processedForType.get(type)!.has(p.id)) {
        processedForType.get(type)!.add(p.id);

        const scores = calculateScores(type, p, context);
        const priority = determinePriority(scores, type);

        actions.push({
          type,
          priority,
          practitionerId: p.id,
          title: `Opportunité de croissance`,
          reason: `+${p.metrics.potentialGrowth}% potentiel identifié`,
          aiJustification: generateAIJustification(type, p, context, scores),
          scores,
          suggestedDate: generateSuggestedDate(priority, type),
        });
      }
    }

    // 6. Suivi requis (actions concrètes uniquement)
    const recentNotesWithAction = p.notes.filter(n => {
      const noteDate = new Date(n.date);
      return n.nextAction && (today.getTime() - noteDate.getTime()) < 14 * 24 * 60 * 60 * 1000;
    });

    if (recentNotesWithAction.length > 0) {
      const type: AIAction['type'] = 'followup';
      if (!processedForType.has(type)) processedForType.set(type, new Set());
      if (!processedForType.get(type)!.has(p.id)) {
        processedForType.get(type)!.add(p.id);

        const scores = calculateScores(type, p, context);
        const priority = determinePriority(scores, type);

        actions.push({
          type,
          priority,
          practitionerId: p.id,
          title: `Suivi à effectuer`,
          reason: recentNotesWithAction[0].nextAction || 'Action en attente',
          aiJustification: generateAIJustification(type, p, context, scores),
          scores,
          suggestedDate: 'Cette semaine',
        });
      }
    }
  });

  // Tri par score global décroissant et limitation au nombre max
  return actions
    .sort((a, b) => {
      // Priorité critique d'abord
      if (a.priority === 'critical' && b.priority !== 'critical') return -1;
      if (b.priority === 'critical' && a.priority !== 'critical') return 1;
      // Puis par score global
      return b.scores.overall - a.scores.overall;
    })
    .slice(0, maxActions);
}

// Export des fonctions utilitaires
export { analyzePractitionerContext, calculateScores };
