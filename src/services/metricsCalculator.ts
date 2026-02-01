import type { TimePeriod } from '../contexts/TimePeriodContext';
import type { Practitioner, UpcomingVisit } from '../types';

/**
 * Calcule les métriques pour une période donnée de manière cohérente
 * Les données mensuelles < trimestrielles < annuelles
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
 * avec des objectifs et progression réalistes et DÉTERMINISTES
 */
export function calculatePeriodMetrics(
  practitioners: Practitioner[],
  _visits: UpcomingVisit[],
  period: TimePeriod
): PeriodMetrics {
  const { start } = getPeriodDates(period);
  const now = new Date();

  // Calculer les objectifs basés sur la période
  // Objectif annuel: 720 visites (60/mois * 12)
  // Objectif trimestriel: 180 visites (60/mois * 3)
  // Objectif mensuel: 60 visites
  const baseMonthlyObjective = 60;
  const visitsObjective =
    period === 'year' ? baseMonthlyObjective * 12 :
    period === 'quarter' ? baseMonthlyObjective * 3 :
    baseMonthlyObjective;

  // Calculer les jours ouvrés écoulés dans la période (lun-ven)
  const getWorkingDays = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  // Calculer le nombre total de jours ouvrés dans la période
  const periodEnd = period === 'month'
    ? new Date(now.getFullYear(), now.getMonth() + 1, 0)
    : period === 'quarter'
    ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0)
    : new Date(now.getFullYear(), 11, 31);

  const totalWorkingDays = getWorkingDays(start, periodEnd);
  const elapsedWorkingDays = getWorkingDays(start, now);

  // Visites par jour ouvré (moyenne ~3 visites/jour)
  const visitsPerDay = visitsObjective / totalWorkingDays;

  // Visites réalisées = jours ouvrés écoulés × visites/jour × facteur de performance (85-95%)
  // Utiliser une seed déterministe basée sur l'année/mois pour éviter les changements aléatoires
  const seed = now.getFullYear() * 100 + now.getMonth();
  const performanceFactor = 0.85 + ((seed % 10) / 100); // Entre 85% et 95%, stable dans le mois

  const visitsCount = Math.min(
    Math.floor(elapsedWorkingDays * visitsPerDay * performanceFactor),
    visitsObjective // Ne jamais dépasser l'objectif
  );

  // Volume total des praticiens (annuel)
  const totalAnnualVolume = practitioners.reduce((sum, p) => sum + p.volumeL, 0);

  // Volume pour la période
  const totalVolume =
    period === 'year' ? totalAnnualVolume :
    period === 'quarter' ? totalAnnualVolume * 0.25 :
    totalAnnualVolume / 12;

  // Calculer les nouveaux prescripteurs (proportionnel à l'avancement dans la période)
  // Objectif: ~2-3 nouveaux prescripteurs par mois
  const periodProgress = elapsedWorkingDays / totalWorkingDays;
  const baseMonthlyNewPrescribers = 2; // Plus réaliste : 2-3 par mois
  const targetNewPrescribers =
    period === 'year' ? baseMonthlyNewPrescribers * 12 :
    period === 'quarter' ? baseMonthlyNewPrescribers * 3 :
    baseMonthlyNewPrescribers;

  // Nouveaux prescripteurs = objectif × avancement (déterministe)
  const newPrescribers = Math.floor(targetNewPrescribers * periodProgress * performanceFactor);

  // Loyauté moyenne
  const avgLoyalty = practitioners.reduce((sum, p) => sum + p.loyaltyScore, 0) / practitioners.length;

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
  // Seuils ajustés aux volumes réalistes
  const atRiskPractitioners = practitioners.filter(p =>
    (p.loyaltyScore < 6 && p.volumeL > 30000) || (p.isKOL && p.loyaltyScore < 7)
  ).length;

  // Croissance simulée (réaliste)
  // Volume: +12% à +20% annuel, proportionnel pour périodes courtes
  const baseVolumeGrowth = 15; // 15% annuel
  const volumeGrowth =
    period === 'year' ? baseVolumeGrowth :
    period === 'quarter' ? baseVolumeGrowth / 4 :
    baseVolumeGrowth / 12;

  // Croissance des visites: +8% à +15%
  const baseVisitGrowth = 12;
  const visitGrowth =
    period === 'year' ? baseVisitGrowth :
    period === 'quarter' ? baseVisitGrowth / 4 :
    baseVisitGrowth / 12;

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
  // Pour l'instant, retourne tous les praticiens
  // Mais on pourrait filtrer ceux qui ont été actifs dans la période
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
  // Pour une vraie implémentation, on filtrerait par volume de la période
  // Pour l'instant, on utilise le volume annuel
  return [...practitioners]
    .sort((a, b) => b.volumeL - a.volumeL)
    .slice(0, limit);
}

/**
 * Calcule les données de performance par mois pour les graphiques
 */
export function getPerformanceDataForPeriod(period: TimePeriod) {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const now = new Date();
  const currentMonth = now.getMonth();

  if (period === 'month') {
    // Pour le mois, afficher les 4 dernières semaines
    return Array.from({ length: 4 }, (_, i) => ({
      month: `S${i + 1}`,
      actual: 12 + Math.floor(Math.random() * 8),
      objective: 15,
      previousYear: 10 + Math.floor(Math.random() * 5),
      yourVolume: 150000 + Math.floor(Math.random() * 50000),
      teamAverage: 140000 + Math.floor(Math.random() * 40000),
    }));
  } else if (period === 'quarter') {
    // Pour le trimestre, afficher les 3 mois
    const quarterStart = Math.floor(currentMonth / 3) * 3;
    return Array.from({ length: 3 }, (_, i) => {
      const monthIndex = quarterStart + i;
      return {
        month: months[monthIndex],
        actual: 45 + Math.floor(Math.random() * 20),
        objective: 60,
        previousYear: 40 + Math.floor(Math.random() * 15),
        yourVolume: 450000 + Math.floor(Math.random() * 150000),
        teamAverage: 420000 + Math.floor(Math.random() * 120000),
      };
    });
  } else {
    // Pour l'année, afficher tous les mois jusqu'au mois actuel
    return Array.from({ length: currentMonth + 1 }, (_, i) => ({
      month: months[i],
      actual: 45 + Math.floor(Math.random() * 20),
      objective: 60,
      previousYear: 40 + Math.floor(Math.random() * 15),
      yourVolume: 450000 + Math.floor(Math.random() * 150000),
      teamAverage: 420000 + Math.floor(Math.random() * 120000),
    }));
  }
}
