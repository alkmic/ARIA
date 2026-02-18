export const dashboard = {
  // Greeting
  greeting: 'Bonjour {{name}}',
  sync: 'Sync',
  justNow: "à l'instant",
  minutesAgo: 'il y a {{minutes}} min',

  // KPI labels
  visitsLabel: 'Visites {{period}}',
  newPrescribers: 'Nouveaux prescripteurs',
  prescribedVolume: 'Volume prescrit',
  avgLoyalty: 'Fidélité moyenne',
  urgentKols: 'KOLs à voir urgent',
  notSeenDays: 'Non vus >{{days}}j',

  // Objective progress
  objective: 'Objectif {{period}}',
  daysRemaining: 'j restants',
  visitsRemaining: 'restantes',
  perDayRequired: '/jour requis',

  // Day timeline
  myDay: 'Ma journée',
  completed: 'terminées',
  completedSingle: 'Terminée',
  toPrepare: 'À préparer',
  next: 'PROCHAINE',
  pitchReady: 'Pitch prêt ✓',
  allVisits: 'Toutes les visites',
  optimizeTour: 'Optimiser tournée',
  noVisitsToday: 'Aucune visite prévue aujourd\'hui',

  // Territory mini map
  myTerritory: 'Mon territoire',
  urgent90: 'Urgents (>90j)',
  period30_90: '30-90j',
  upToDate: 'À jour (<30j)',
  fullMap: 'Carte complète',

  // Top actions widget
  myNextActions: 'Mes Prochaines Actions',
  pitch: 'Pitch',
  crv: 'CRV',

  // Quick actions
  quickAccess: 'Accès rapide',
  quickActions: {
    myActions: 'Mes Actions',
    pitchIA: 'Pitch IA',
    visitReport: 'Compte-rendu',
    coachIA: 'Coach IA',
    optimizeTour: 'Optimiser Tournée',
    territory: 'Territoire',
  },

  // AI Insights
  ariaRecommends: 'ARIA recommande aujourd\'hui',
  insightTypes: {
    opportunity: 'Opportunité',
    alert: 'Alerte',
    reminder: 'Rappel',
    success: 'Succès',
  },
  insightStatus: {
    urgent: 'Urgent',
    important: 'Important',
    info: 'Info',
  },
  insightActions: {
    prepareVisit: 'Préparer visite',
    planVisits: 'Planifier visites',
    planTour: 'Planifier tournée',
    seeDetails: 'Voir les détails',
  },

  // National stats
  nationalStats: 'Statistiques Nationales et Territoire',
  nationalFrance: 'France Entière',
  yourTerritory: 'Votre Territoire',
  ratioSpecialties: 'Ratio Pneumologues/Généralistes',
  national: 'National',
  territoryLabel: 'Territoire',
  generalPractitioners: 'Médecins généralistes',
  pneumologists: 'Pneumologues',
  totalGeneral: 'Total général',
  patientsO2: 'Patients sous O₂',
  avgVolumePatient: 'Volume moy./patient/an',
  pctKol: '% KOL',
  totalTerritory: 'Total territoire',
  kolIdentified: 'KOL identifiés',
  totalVolumeTerritory: 'Volume total territoire',
  avgVolumePractitioner: 'Volume moy./praticien',

  // Specialty breakdown
  specialtyBreakdown: 'Répartition par Spécialité',
  practitionerCount: 'Nombre de Praticiens',
  totalVolumeLiters: 'Volume Total (Litres)',
  specialtyCol: 'Spécialité',
  practCol: 'Prat.',
  kolCol: 'KOL',
  totalVolumeCol: 'Volume Total',
  avgCol: 'Moy.',
  keyInsight: 'Insight clé',
  pneumoShort: 'Pneumo',

  // Performance chart
  performanceTitle: 'Performance {{period}}',
  yourVolumes: 'Vos volumes',
  objectiveLabel: 'Objectif',
  teamAverage: 'Moyenne équipe',
  totalVolume: 'Volume total',
  vsObjective: 'Vs Objectif',
  vsTeam: 'Vs Équipe',

  // Weekly wins
  thisWeek: 'Cette semaine',
  weeklyWins: {
    visitsCompleted: 'Visites réalisées',
    newPrescribers: 'Nouveaux prescripteurs',
    kolRecovered: 'KOL reconquis',
  },
  weeklyPending: {
    pendingProposals: 'Propositions en attente de réponse',
    followUps: 'Relances à effectuer',
  },
  seeFullHistory: 'Voir l\'historique complet',

  // Vingtile distribution
  vingtileDistribution: 'Distribution par Vingtile',
  vingtileLabel: 'Vingtile',
  practitionersCount: 'Praticiens:',
  totalVolumeLabel: 'Volume total:',
  avgVolumeLabel: 'Volume moyen:',
  top5Vingtiles: 'Top 5 Vingtiles',
  ofTotalVolume: 'du volume total',
  practitionersTop3: 'Praticiens Top 3',
  ofTerritory: 'du territoire',
  avgVolumeShort: 'Volume moyen',
  perPractitioner: 'par praticien',
  vingtileRanges: {
    top: 'V1-3 (Top)',
    mid1: 'V4-7',
    mid2: 'V8-12',
    low1: 'V13-17',
    low2: 'V18-20',
  },
  practitionerCountLabel: 'Nombre de praticiens',

  // Upcoming visits
  visitsToday: "Visites aujourd'hui",
  seeAllVisits: 'Voir toutes les visites',
  priorityPractitioners: 'Praticiens prioritaires',
  notSeenSince: 'Non vu depuis {{days}} jours',
  seeAllPriority: 'Voir tous les prioritaires',

  // AI Insights - dynamic
  allActions: 'Toutes les actions',
  kolsUrgent: '{{count}} KOL{{plural}} à voir en urgence',
  kolNotVisited: "n'a pas été visité depuis {{days}} jours. Volume: {{volume}}K L/an.",
  growthOpportunity: 'Opportunité de croissance détectée',
  growthMessage: 'présente un potentiel de +{{growth}}%. Fidélité élevée ({{loyalty}}/10) - excellent moment pour développer.',
  churnRiskTitle: 'Risque de perte identifié',
  churnMessage: "montre des signes d'attrition. Fidélité: {{loyalty}}/10. Action recommandée.",
  visitsTodayCount: "{{count}} visite{{plural}} aujourd'hui",
  nextVisitMessage: 'Prochaine visite: {{name}} à {{time}}. Préparez votre pitch et vos arguments.',
  excellentPerformance: 'Excellente performance',
  performanceMessage: '{{count}} praticiens Top 25% avec fidélité élevée (≥8/10). Votre relation client est excellente. Continuez ainsi !',
  objectiveGapTitle: 'Objectif mensuel en retard',
  objectiveGapMessage: 'Vous êtes en retard de {{gap}} visite{{plural}} sur votre objectif mensuel. Planifiez des visites supplémentaires cette semaine.',
  seeProfile: 'Voir le profil',

  // Quick actions descriptions
  quickActionDescriptions: {
    actions: 'Actions IA prioritaires',
    pitch: 'Générer un pitch personnalisé',
    visitReport: 'Dicter un CRV vocal',
    coach: 'Dialogue avec ARIA',
    optimizeTour: 'Planifier les visites du jour',
    territory: 'Visualiser votre secteur',
  },

  // Specialty breakdown extra
  totalRow: 'Total',
  specialtyInsightText: 'Les pneumologues représentent {{practPercent}}% des praticiens mais génèrent {{volumePercent}}% du volume total - un ratio de {{ratio}}x supérieur aux généralistes.',

  // Vingtile distribution extra
  allFilter: 'Tous',
};
