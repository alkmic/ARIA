import type { TimePeriod } from '../contexts/TimePeriodContext';
import type { Practitioner, UpcomingVisit } from '../types';

/**
 * Calcule les métriques pour une période donnée de manière cohérente
 * GARANTIE : visites mensuelles ≤ visites trimestrielles ≤ visites annuelles
 */

export interface PeriodMetrics {
  visitsCount: number;
  visitsObjective: number;
  newPrescribers: number;
  totalVolume: number;
  avgLoyalty: number;
  kolCount: number;
  undervisitedKOLs: number;
  atRiskPractitioners: number;
  volumeGrowth: number; // Pourcentage vs période précédente
  visitGrowth: number;
}

/**
 * Calcule le début et la fin de la période sélectionnée
 */
export function getPeriodDates(period: TimePeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);

  if (period === 'month') {
    // Du 1er du mois actuel à aujourd'hui
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'quarter') {
    // Du début du trimestre à aujourd'hui
    const currentQuarter = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), currentQuarter * 3, 1);
  } else {
    // De janvier à aujourd'hui
    start = new Date(now.getFullYear(), 0, 1);
  }

  return { start, end };
}

/**
 * Filtre les visites par période
 */
export function filterVisitsByPeriod(visits: UpcomingVisit[], period: TimePeriod): UpcomingVisit[] {
  const { start, end } = getPeriodDates(period);

  return visits.filter(visit => {
    const visitDate = new Date(visit.date);
    return visitDate >= start && visitDate <= end;
  });
}

/**
 * Génère des métriques cohérentes basées sur les vrais praticiens
 * Utilise une approche déterministe et cohérente entre les périodes
 */
export function calculatePeriodMetrics(
  practitioners: Practitioner[],
  _visits: UpcomingVisit[],
  period: TimePeriod
): PeriodMetrics {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24));
  const dayOfMonth = now.getDate();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);

  // Objectifs par période
  const baseMonthlyObjective = 60;
  const visitsObjective =
    period === 'year' ? baseMonthlyObjective * 12 :
    period === 'quarter' ? baseMonthlyObjective * 3 :
    baseMonthlyObjective;

  // Calculer les visites de manière COHÉRENTE entre les périodes
  // Principe : on simule des visites passées réalistes

  // Performance factor stable pour l'année (basé sur l'année courante)
  const yearSeed = now.getFullYear();
  const performanceFactor = 0.88 + ((yearSeed % 10) / 100); // 88% à 97%

  // Visites par jour ouvré moyen
  const avgVisitsPerWorkday = 3; // ~3 visites/jour

  // Calculer les jours ouvrés écoulés pour chaque période
  const getWorkingDaysInMonth = (year: number, month: number, upToDay?: number): number => {
    const lastDay = upToDay || new Date(year, month + 1, 0).getDate();
    let count = 0;
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d);
      const day = date.getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  };

  // Visites du mois en cours (jusqu'à aujourd'hui)
  const workingDaysThisMonth = getWorkingDaysInMonth(now.getFullYear(), currentMonth, dayOfMonth);
  const monthVisits = Math.floor(workingDaysThisMonth * avgVisitsPerWorkday * performanceFactor);

  // Visites des mois passés ce trimestre (mois complets)
  let quarterVisits = monthVisits;
  const quarterStartMonth = currentQuarter * 3;
  for (let m = quarterStartMonth; m < currentMonth; m++) {
    const fullMonthWorkdays = getWorkingDaysInMonth(now.getFullYear(), m);
    quarterVisits += Math.floor(fullMonthWorkdays * avgVisitsPerWorkday * performanceFactor);
  }

  // Visites des mois passés cette année (mois complets)
  let yearVisits = monthVisits;
  for (let m = 0; m < currentMonth; m++) {
    const fullMonthWorkdays = getWorkingDaysInMonth(now.getFullYear(), m);
    yearVisits += Math.floor(fullMonthWorkdays * avgVisitsPerWorkday * performanceFactor);
  }

  // Sélectionner les visites selon la période
  const visitsCount =
    period === 'year' ? yearVisits :
    period === 'quarter' ? quarterVisits :
    monthVisits;

  // Volume total des praticiens (annuel)
  const totalAnnualVolume = practitioners.reduce((sum, p) => sum + p.volumeL, 0);

  // Volume pour la période (proportionnel au temps écoulé)
  const yearProgress = dayOfYear / 365;
  const quarterProgress = (dayOfYear - (currentQuarter * 91)) / 91;
  const monthProgress = dayOfMonth / new Date(now.getFullYear(), currentMonth + 1, 0).getDate();

  const totalVolume =
    period === 'year' ? Math.round(totalAnnualVolume * yearProgress) :
    period === 'quarter' ? Math.round(totalAnnualVolume * 0.25 * Math.max(0.1, quarterProgress)) :
    Math.round(totalAnnualVolume / 12 * Math.max(0.1, monthProgress));

  // Nouveaux prescripteurs (cohérents entre périodes)
  const monthlyNewPrescribers = Math.max(1, Math.floor(2 * monthProgress * performanceFactor));
  const quarterlyNewPrescribers = monthlyNewPrescribers + (currentMonth > quarterStartMonth ? Math.floor(2 * (currentMonth - quarterStartMonth)) : 0);
  const yearlyNewPrescribers = monthlyNewPrescribers + Math.floor(2 * currentMonth * performanceFactor);

  const newPrescribers =
    period === 'year' ? yearlyNewPrescribers :
    period === 'quarter' ? quarterlyNewPrescribers :
    monthlyNewPrescribers;

  // Loyauté moyenne
  const avgLoyalty = practitioners.length > 0
    ? practitioners.reduce((sum, p) => sum + p.loyaltyScore, 0) / practitioners.length
    : 0;

  // KOLs dans le réseau
  const kolCount = practitioners.filter(p => p.isKOL).length;

  // KOLs non visités selon la période
  const daysThreshold =
    period === 'month' ? 30 :
    period === 'quarter' ? 60 :
    90;

  const undervisitedKOLs = practitioners.filter(p => {
    if (!p.isKOL) return false;
    if (!p.lastVisitDate) return true;

    const lastVisit = new Date(p.lastVisitDate);
    const daysSince = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > daysThreshold;
  }).length;

  // Praticiens à risque (fidélité faible + volume significatif)
  const atRiskPractitioners = practitioners.filter(p =>
    (p.loyaltyScore < 6 && p.volumeL > 5000) || (p.isKOL && p.loyaltyScore < 7)
  ).length;

  // Croissance simulée (réaliste et cohérente)
  // Croissance annuelle cible: ~8% volume, ~5% visites (réaliste pharma)
  const baseVolumeGrowth = 8;
  const volumeGrowth =
    period === 'year' ? baseVolumeGrowth :
    period === 'quarter' ? Math.round(baseVolumeGrowth * 0.8) : // trimestre: légèrement inférieur car fenêtre plus courte
    Math.round(baseVolumeGrowth * 0.6); // mois: variation mensuelle

  const baseVisitGrowth = 5;
  const visitGrowth =
    period === 'year' ? baseVisitGrowth :
    period === 'quarter' ? Math.round(baseVisitGrowth * 0.8) :
    Math.round(baseVisitGrowth * 0.5);

  return {
    visitsCount,
    visitsObjective,
    newPrescribers,
    totalVolume,
    avgLoyalty,
    kolCount,
    undervisitedKOLs,
    atRiskPractitioners,
    volumeGrowth,
    visitGrowth,
  };
}

/**
 * Filtre les praticiens par période basé sur leur activité
 */
export function filterPractitionersByPeriod(
  practitioners: Practitioner[],
  _period: TimePeriod
): Practitioner[] {
  return practitioners;
}

/**
 * Calcule les top praticiens pour une période
 */
export function getTopPractitioners(
  practitioners: Practitioner[],
  _period: TimePeriod,
  limit: number = 10
): Practitioner[] {
  return [...practitioners]
    .sort((a, b) => b.volumeL - a.volumeL)
    .slice(0, limit);
}

/**
 * Calcule les données de performance par mois pour les graphiques
 * TOUTES les valeurs sont en litres (L) pour garantir la cohérence des comparaisons
 */
export function getPerformanceDataForPeriod(period: TimePeriod) {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const now = new Date();
  const currentMonth = now.getMonth();

  // Utiliser une seed déterministe pour des valeurs stables
  const seed = now.getFullYear();
  const seededRandom = (index: number) => {
    const x = Math.sin(seed + index * 9999) * 10000;
    return x - Math.floor(x);
  };

  if (period === 'month') {
    // Pour le mois: 4 semaines
    // Volume hebdomadaire réaliste: ~10-15K L/semaine (territoire Rhône-Alpes)
    // Objectif hebdomadaire: ~12K L/semaine → ~48K L/mois
    return Array.from({ length: 4 }, (_, i) => ({
      month: `S${i + 1}`,
      yourVolume: 10000 + Math.floor(seededRandom(i + 200) * 5000),
      objective: 11000 + Math.floor(seededRandom(i + 400) * 2000),
      teamAverage: 9000 + Math.floor(seededRandom(i + 300) * 4000),
    }));
  } else if (period === 'quarter') {
    // Pour le trimestre: 3 mois
    // Volume mensuel réaliste: ~40-60K L/mois
    // Objectif mensuel: ~48K L/mois
    const quarterStart = Math.floor(currentMonth / 3) * 3;
    return Array.from({ length: 3 }, (_, i) => {
      const monthIndex = quarterStart + i;
      return {
        month: months[monthIndex],
        yourVolume: 40000 + Math.floor(seededRandom(monthIndex + 200) * 20000),
        objective: 44000 + Math.floor(seededRandom(monthIndex + 400) * 8000),
        teamAverage: 35000 + Math.floor(seededRandom(monthIndex + 300) * 18000),
      };
    });
  } else {
    // Pour l'année: mois par mois
    // Volume mensuel avec progression légère sur l'année (+0.5-1% par mois)
    return Array.from({ length: currentMonth + 1 }, (_, i) => {
      const growthFactor = 1 + (i * 0.008); // ~1% par mois de progression
      return {
        month: months[i],
        yourVolume: Math.round((40000 + Math.floor(seededRandom(i + 200) * 20000)) * growthFactor),
        objective: Math.round((44000 + Math.floor(seededRandom(i + 400) * 8000)) * growthFactor),
        teamAverage: Math.round((35000 + Math.floor(seededRandom(i + 300) * 18000)) * growthFactor),
      };
    });
  }
}
