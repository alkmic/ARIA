/**
 * Configuration centralisee des seuils metier ARIA
 * Utilise par tous les services pour garantir la coherence des donnees
 */

// --- Seuils de visite (en jours) ---
export const VISIT_THRESHOLDS = {
  /** KOL : alerte si non visite depuis ce nombre de jours */
  kolUrgent: 60,
  /** KOL : critique si non visite depuis ce nombre de jours */
  kolCritical: 90,
  /** Top prescripteur (V1-3) : alerte apres ce delai */
  topPrescriberUrgent: 45,
  /** Praticien standard : a planifier apres ce delai */
  standardSchedule: 30,
  /** Praticien standard : urgent apres ce delai */
  standardUrgent: 90,
} as const;

// --- Seuils de fidelite (echelle /10) ---
export const LOYALTY_THRESHOLDS = {
  /** En dessous = risque de churn (praticiens standards) */
  churnRisk: 5,
  /** En dessous = risque de churn (KOLs) */
  kolChurnRisk: 7,
  /** Au-dessus = candidat pour upsell/opportunite */
  opportunityMin: 7,
  /** En dessous = a risque (avec volume significatif) */
  atRiskGeneral: 6,
} as const;

// --- Seuils de volume ---
export const VOLUME_THRESHOLDS = {
  /** Volume minimum pour etre considere comme significatif (L/an) */
  significant: 30000,
  /** Volume minimum pour etre considere comme churn a risque (L/an) */
  churnVolumeMin: 50000,
  /** Volume tres eleve (L/an) */
  highVolume: 100000,
} as const;

// --- Objectifs de visites ---
export const VISIT_OBJECTIVES = {
  /** Nombre de visites/mois cible */
  monthlyTarget: 60,
  /** Nombre moyen de visites par jour ouvre */
  avgPerWorkday: 3,
  /** Performance annuelle de croissance visee (%) */
  annualVisitGrowth: 12,
  /** Croissance volume annuelle visee (%) */
  annualVolumeGrowth: 15,
} as const;

// --- Seuils de vingtile ---
export const VINGTILE_THRESHOLDS = {
  /** Top prescripteurs (vingtile 1 a ce seuil inclus) */
  topTier: 3,
  /** Haut prescripteurs (vingtile jusqu'a) */
  highTier: 5,
  /** Moyen */
  midTier: 10,
  /** Prescripteurs en haut quartile */
  topQuartile: 5,
} as const;

// --- Seuils d'action intelligence ---
export const ACTION_THRESHOLDS = {
  /** Score global minimum pour action critique */
  criticalScore: 80,
  /** Score global minimum pour action haute priorite */
  highScore: 60,
  /** Score global minimum pour action moyenne priorite */
  mediumScore: 40,
  /** Potentiel de croissance minimum pour opportunite (%) */
  opportunityGrowth: 35,
  /** Nombre max d'actions recommandees */
  maxActions: 12,
  /** Delai de snooze (jours) */
  snoozeDays: 3,
} as const;

// --- Periodes de reference par contexte ---
export const PERIOD_THRESHOLDS = {
  month: {
    kolVisitDays: VISIT_THRESHOLDS.standardSchedule,
    label: 'du mois',
  },
  quarter: {
    kolVisitDays: VISIT_THRESHOLDS.kolUrgent,
    label: 'du trimestre',
  },
  year: {
    kolVisitDays: VISIT_THRESHOLDS.kolCritical,
    label: 'de l\'annee',
  },
} as const;
