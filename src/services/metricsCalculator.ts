import type { TimePeriod } from '../contexts/TimePeriodContext';
import type { Practitioner, UpcomingVisit } from '../types';
import {
  VISIT_THRESHOLDS,
  LOYALTY_THRESHOLDS,
  VOLUME_THRESHOLDS,
  VISIT_OBJECTIVES,
  PERIOD_THRESHOLDS,
} from '../config/thresholds';

/**
 * Calcule les metriques pour une periode donnee de maniere coherente
 * GARANTIE : visites mensuelles <= visites trimestrielles <= visites annuelles
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
  volumeGrowth: number;
  visitGrowth: number;
}

export interface WeeklyMetrics {
  visitsCompleted: number;
  newPrescribers: number;
  kolReconquered: number;
  pendingResponses: number;
  followUpsNeeded: number;
}

/**
 * Calcule le debut et la fin de la periode selectionnee
 */
export function getPeriodDates(period: TimePeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);

  if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'quarter') {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), currentQuarter * 3, 1);
  } else {
    start = new Date(now.getFullYear(), 0, 1);
  }

  return { start, end };
}

/**
 * Filtre les visites par periode
 */
export function filterVisitsByPeriod(visits: UpcomingVisit[], period: TimePeriod): UpcomingVisit[] {
  const { start, end } = getPeriodDates(period);

  return visits.filter(visit => {
    const visitDate = new Date(visit.date);
    return visitDate >= start && visitDate <= end;
  });
}

/**
 * Compte les jours ouvres entre deux dates (exclut samedi/dimanche)
 */
function getWorkingDaysInMonth(year: number, month: number, upToDay?: number): number {
  const lastDay = upToDay || new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month, d);
    const day = date.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/**
 * Genere des metriques coherentes basees sur les vrais praticiens
 * Utilise une approche deterministe et coherente entre les periodes
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

  // Objectifs par periode (coherents : mois * 3 = trimestre, mois * 12 = annee)
  const baseMonthlyObjective = VISIT_OBJECTIVES.monthlyTarget;
  const visitsObjective =
    period === 'year' ? baseMonthlyObjective * 12 :
    period === 'quarter' ? baseMonthlyObjective * 3 :
    baseMonthlyObjective;

  // Performance factor stable pour l'annee
  const yearSeed = now.getFullYear();
  const performanceFactor = 0.88 + ((yearSeed % 10) / 100); // 88% a 97%

  // Visites par jour ouvre moyen
  const avgVisitsPerWorkday = VISIT_OBJECTIVES.avgPerWorkday;

  // Visites du mois en cours (jusqu'a aujourd'hui)
  const workingDaysThisMonth = getWorkingDaysInMonth(now.getFullYear(), currentMonth, dayOfMonth);
  const monthVisits = Math.floor(workingDaysThisMonth * avgVisitsPerWorkday * performanceFactor);

  // Visites des mois passes ce trimestre (mois complets)
  let quarterVisits = monthVisits;
  const quarterStartMonth = currentQuarter * 3;
  for (let m = quarterStartMonth; m < currentMonth; m++) {
    const fullMonthWorkdays = getWorkingDaysInMonth(now.getFullYear(), m);
    quarterVisits += Math.floor(fullMonthWorkdays * avgVisitsPerWorkday * performanceFactor);
  }

  // Visites des mois passes cette annee (mois complets)
  let yearVisits = monthVisits;
  for (let m = 0; m < currentMonth; m++) {
    const fullMonthWorkdays = getWorkingDaysInMonth(now.getFullYear(), m);
    yearVisits += Math.floor(fullMonthWorkdays * avgVisitsPerWorkday * performanceFactor);
  }

  // Selectionner les visites selon la periode - GARANTI coherent
  const visitsCount =
    period === 'year' ? yearVisits :
    period === 'quarter' ? quarterVisits :
    monthVisits;

  // Volume total des praticiens (annuel)
  const totalAnnualVolume = practitioners.reduce((sum, p) => sum + p.volumeL, 0);

  // Volume pour la periode (proportionnel au temps ecoule)
  const daysInMonth = new Date(now.getFullYear(), currentMonth + 1, 0).getDate();
  const monthProgress = dayOfMonth / daysInMonth;
  const quarterDays = currentQuarter === 0 ? 90 : currentQuarter === 1 ? 91 : currentQuarter === 2 ? 92 : 92;
  const dayInQuarter = dayOfYear - (currentQuarter === 0 ? 0 : currentQuarter === 1 ? 90 : currentQuarter === 2 ? 181 : 273);
  const quarterProgress = Math.max(0.05, dayInQuarter / quarterDays);
  const yearProgress = Math.max(0.01, dayOfYear / 365);

  const totalVolume =
    period === 'year' ? Math.round(totalAnnualVolume * yearProgress) :
    period === 'quarter' ? Math.round(totalAnnualVolume * 0.25 * quarterProgress) :
    Math.round(totalAnnualVolume / 12 * monthProgress);

  // Nouveaux prescripteurs (coherents : mois <= trimestre <= annee)
  const monthlyNewPrescribers = Math.max(1, Math.floor(2 * monthProgress * performanceFactor));
  const pastMonthsInQuarter = currentMonth - quarterStartMonth;
  const quarterlyNewPrescribers = monthlyNewPrescribers + (pastMonthsInQuarter > 0 ? pastMonthsInQuarter * 2 : 0);
  const yearlyNewPrescribers = monthlyNewPrescribers + currentMonth * 2;

  const newPrescribers =
    period === 'year' ? yearlyNewPrescribers :
    period === 'quarter' ? Math.min(quarterlyNewPrescribers, yearlyNewPrescribers) :
    Math.min(monthlyNewPrescribers, quarterlyNewPrescribers);

  // Loyaute moyenne
  const avgLoyalty = practitioners.length > 0
    ? practitioners.reduce((sum, p) => sum + p.loyaltyScore, 0) / practitioners.length
    : 0;

  // KOLs dans le reseau
  const kolCount = practitioners.filter(p => p.isKOL).length;

  // KOLs non visites selon la periode (utilise les seuils centralises)
  const daysThreshold = PERIOD_THRESHOLDS[period].kolVisitDays;

  const undervisitedKOLs = practitioners.filter(p => {
    if (!p.isKOL) return false;
    if (!p.lastVisitDate) return true;

    const lastVisit = new Date(p.lastVisitDate);
    const daysSince = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > daysThreshold;
  }).length;

  // Praticiens a risque (utilise les seuils centralises)
  const atRiskPractitioners = practitioners.filter(p =>
    (p.loyaltyScore < LOYALTY_THRESHOLDS.atRiskGeneral && p.volumeL > VOLUME_THRESHOLDS.significant)
    || (p.isKOL && p.loyaltyScore < LOYALTY_THRESHOLDS.kolChurnRisk)
  ).length;

  // Croissance simulee (coherente par periode)
  const baseVolumeGrowth = VISIT_OBJECTIVES.annualVolumeGrowth;
  const volumeGrowth =
    period === 'year' ? baseVolumeGrowth :
    period === 'quarter' ? +(baseVolumeGrowth / 4).toFixed(1) :
    +(baseVolumeGrowth / 12).toFixed(1);

  const baseVisitGrowth = VISIT_OBJECTIVES.annualVisitGrowth;
  const visitGrowth =
    period === 'year' ? baseVisitGrowth :
    period === 'quarter' ? +(baseVisitGrowth / 4).toFixed(1) :
    +(baseVisitGrowth / 12).toFixed(1);

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
 * Calcule les metriques hebdomadaires dynamiques (pour WeeklyWins)
 */
export function calculateWeeklyMetrics(
  practitioners: Practitioner[],
  _visits: UpcomingVisit[]
): WeeklyMetrics {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Lundi
  weekStart.setHours(0, 0, 0, 0);

  // Visites completees cette semaine (basees sur les jours ouvres ecoules)
  const dayOfWeek = now.getDay() === 0 ? 5 : Math.min(now.getDay(), 5); // max 5 jours ouvres
  const yearSeed = now.getFullYear();
  const weekSeed = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
  const seededRandom = (idx: number) => {
    const x = Math.sin(yearSeed + weekSeed + idx * 9999) * 10000;
    return x - Math.floor(x);
  };
  const performanceFactor = 0.85 + seededRandom(0) * 0.15;
  const visitsCompleted = Math.floor(dayOfWeek * VISIT_OBJECTIVES.avgPerWorkday * performanceFactor);

  // Nouveaux prescripteurs cette semaine (0-2 realiste)
  const newPrescribers = dayOfWeek >= 3 ? Math.floor(seededRandom(1) * 2) + (seededRandom(2) > 0.6 ? 1 : 0) : 0;

  // KOLs reconquis (0-1 par semaine)
  const kolsNotSeen = practitioners.filter(p => {
    if (!p.isKOL) return false;
    if (!p.lastVisitDate) return false;
    const lastVisit = new Date(p.lastVisitDate);
    const daysSince = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > VISIT_THRESHOLDS.kolUrgent && daysSince <= VISIT_THRESHOLDS.kolCritical + 14;
  }).length;
  const kolReconquered = kolsNotSeen > 0 && seededRandom(3) > 0.5 ? 1 : 0;

  // Propositions en attente (2-5 realiste)
  const pendingResponses = 2 + Math.floor(seededRandom(4) * 3);

  // Relances a effectuer (basees sur les praticiens a risque)
  const atRiskCount = practitioners.filter(p =>
    p.loyaltyScore < LOYALTY_THRESHOLDS.atRiskGeneral && p.volumeL > VOLUME_THRESHOLDS.significant
  ).length;
  const followUpsNeeded = Math.min(atRiskCount, 3 + Math.floor(seededRandom(5) * 4));

  return {
    visitsCompleted,
    newPrescribers,
    kolReconquered,
    pendingResponses,
    followUpsNeeded,
  };
}

/**
 * Filtre les praticiens par periode basee sur leur activite
 */
export function filterPractitionersByPeriod(
  practitioners: Practitioner[],
  _period: TimePeriod
): Practitioner[] {
  return practitioners;
}

/**
 * Calcule les top praticiens pour une periode
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
 * Calcule les donnees de performance par mois pour les graphiques
 */
export function getPerformanceDataForPeriod(period: TimePeriod) {
  const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const currentMonth = now.getMonth();

  const seed = now.getFullYear();
  const seededRandom = (index: number) => {
    const x = Math.sin(seed + index * 9999) * 10000;
    return x - Math.floor(x);
  };

  if (period === 'month') {
    return Array.from({ length: 4 }, (_, i) => ({
      month: `S${i + 1}`,
      actual: 12 + Math.floor(seededRandom(i) * 8),
      objective: 15,
      previousYear: 10 + Math.floor(seededRandom(i + 100) * 5),
      yourVolume: 40000 + Math.floor(seededRandom(i + 200) * 20000),
      teamAverage: 35000 + Math.floor(seededRandom(i + 300) * 15000),
    }));
  } else if (period === 'quarter') {
    const quarterStart = Math.floor(currentMonth / 3) * 3;
    return Array.from({ length: 3 }, (_, i) => {
      const monthIndex = quarterStart + i;
      return {
        month: months[monthIndex],
        actual: 45 + Math.floor(seededRandom(monthIndex) * 20),
        objective: 60,
        previousYear: 40 + Math.floor(seededRandom(monthIndex + 100) * 15),
        yourVolume: 120000 + Math.floor(seededRandom(monthIndex + 200) * 50000),
        teamAverage: 110000 + Math.floor(seededRandom(monthIndex + 300) * 40000),
      };
    });
  } else {
    return Array.from({ length: currentMonth + 1 }, (_, i) => ({
      month: months[i],
      actual: 45 + Math.floor(seededRandom(i) * 20),
      objective: 60,
      previousYear: 40 + Math.floor(seededRandom(i + 100) * 15),
      yourVolume: 120000 + Math.floor(seededRandom(i + 200) * 50000),
      teamAverage: 110000 + Math.floor(seededRandom(i + 300) * 40000),
    }));
  }
}
