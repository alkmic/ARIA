export const voiceReport = {
  title: 'Compte-Rendu de Visite',
  subtitle: 'Dictez ou tapez votre compte-rendu et ARIA extraira automatiquement les informations clés',

  // Steps
  steps: {
    select: 'Sélectionner',
    record: 'Enregistrer',
    verify: 'Vérifier',
    aiDeductions: 'Déductions IA',
    done: 'Terminé',
  },

  // Step 1
  todayVisits: "Visites d'aujourd'hui",
  searchPractitioner: 'Rechercher un praticien',
  searchPlaceholder: 'Nom du praticien ou ville...',

  // Step 2
  howToInput: 'Comment souhaitez-vous saisir votre compte-rendu ?',
  recording: 'Enregistrement...',
  dictate: 'Dicter',
  transcriptionInProgress: 'Transcription en cours...',
  yourReport: 'Votre compte-rendu',
  reportPlaceholder: 'Décrivez votre visite : sujets abordés, réactions du praticien, prochaines actions...',
  clearText: 'Effacer',
  analyzeWithAI: 'Analyser avec IA',
  tips: {
    title: 'Conseils pour un bon compte-rendu',
    products: 'Mentionnez les produits discutés',
    reactions: 'Décrivez les réactions du praticien',
    actions: 'Indiquez les prochaines actions',
    competitors: 'Notez les concurrents évoqués',
  },

  // Step 3
  aiAnalysis: 'Analyse IA — Validation requise',
  aiAnalysisDesc: 'ARIA a analysé votre compte-rendu et extrait les informations suivantes. Vérifiez et corrigez si nécessaire.',
  topicsDiscussed: 'Sujets abordés',
  productsDiscussed: 'Produits discutés',
  nextActions: 'Prochaines actions',
  opportunitiesDetected: 'Opportunités détectées',
  objectionsBarriers: 'Objections / Freins',
  keyPoints: 'Points clés',
  competitorsMentioned: 'Concurrents mentionnés',
  integrationPreview: 'Ce qui sera intégré à la fiche de {{name}}',
  integrationItems: {
    enrichedProfile: 'Profil praticien enrichi avec les nouvelles données',
    contactHistory: 'Historique de contact mis à jour',
    detectedActions: 'Actions détectées ajoutées au suivi',
    sentimentAnalysis: 'Analyse sentiment intégrée',
    competitorMap: 'Cartographie concurrentielle mise à jour',
  },

  // Step 4
  aiDeductionsTitle: 'Déductions IA — Enrichissement du profil',
  aiDeductionsDesc: "Basé sur l'analyse de votre compte-rendu, ARIA propose les enrichissements suivants pour le profil du praticien.",
  validatedEnrichments: 'Résumé des enrichissements validés',
  validatedEnrichmentsDesc: 'Les enrichissements acceptés seront intégrés au profil du praticien.',
  acceptAll: 'Tout accepter',
  validateAndSave: 'Valider et sauvegarder ({{count}})',

  // Step 5
  reportSaved: 'Compte-rendu enregistré !',
  profileEnriched: 'Le profil de {{name}} a été enrichi',
  seeProfile: 'Voir le profil',
  newReport: 'Nouveau compte-rendu',
  changePractitioner: 'Changer',
  textPlaceholder: "Ou tapez directement votre compte-rendu ici...\n\nEx: Visite très positive, le Dr a montré un vif intérêt pour la VNI. Il a mentionné avoir 3 patients candidats. Prochaine étape: envoyer la documentation technique.",
  analyzing: 'Analyse...',
  editableTranscript: 'Transcription (modifiable)',
  categoryLabels: {
    productInterest: 'Intérêt produit',
    competitor: 'Concurrence',
    objection: 'Objection',
    opportunity: 'Opportunité',
    relationship: 'Relation',
    preference: 'Préférence',
  },
  noDeductions: 'Aucune déduction IA disponible pour ce compte-rendu.',
  visitReportItem: 'Compte-rendu de visite avec transcription complète',
  keyPointsNote: "{{count}} point(s) clé(s) → Note d'observation",
  opportunitiesNote: '{{count}} opportunité(s) → Note stratégique',
  competitorIntel: 'Intelligence concurrentielle ({{names}}) → Note concurrence',
  actionsToFollow: '{{count}} action(s) à suivre',
  dataAccessible: 'Données accessibles par le Coach IA pour répondre à vos questions',

  // Speech recognition
  speechNotSupported: 'La reconnaissance vocale n\'est pas supportée. Utilisez Chrome ou Edge.',

  // Mock data fallback
  fallbackGeneralDiscussion: 'Discussion générale',
  fallbackFollowUp: 'Suivi à planifier',
  fallbackStandardVisit: 'Visite standard',

  // Placeholders
  placeholders: {
    addTopic: 'Ajouter un sujet...',
    addProduct: 'Ajouter un produit...',
    addAction: 'Ajouter une action...',
    addOpportunity: 'Ajouter une opportunité...',
    addObjection: 'Ajouter une objection...',
    addKeyPoint: 'Ajouter un point clé...',
    addCompetitor: 'Ajouter un concurrent...',
  },

  // Product suggestions (user-visible labels)
  productSuggestions: {
    vitalaire: 'VitalAire Confort+',
    telesuivi: 'Télésuivi O2',
    vni: 'VNI DreamStation',
    freestyle: 'FreeStyle Comfort',
    ppc: 'PPC ResMed',
    o2portable: 'O2 liquide portable',
    service247: 'Service 24/7',
    formation: 'Formation patient',
  },

  // Tooltip
  clickToEdit: 'Cliquer pour modifier',

  // AI deduction labels
  deductionLabels: {
    interestIn: 'Intérêt pour {{product}}',
    productDiscussed: 'Le praticien a discuté de {{product}} lors de cette visite. Ajouter à ses centres d\'intérêt produits.',
    competitorMentioned: '{{competitor}} mentionné',
    competitorDetail: 'Le praticien utilise ou a mentionné {{competitor}}. Veille concurrentielle activée.',
    barrierIdentified: 'Frein identifié',
    opportunityDetected: 'Opportunité détectée',
    positiveRelationship: 'Relation positive',
    positiveDetail: 'Le sentiment global est positif. Le praticien est réceptif — bon moment pour proposer des services additionnels ou une montée en gamme.',
    dissatisfactionAlert: 'Alerte insatisfaction',
    negativeDetail: 'Le sentiment global est négatif. Mettre en place un suivi renforcé et identifier les causes d\'insatisfaction. Risque de churn potentiel.',
    actionsToSchedule: '{{count}} action(s) à planifier',
    actionsIdentified: 'Actions identifiées : {{actions}}. Ces actions seront ajoutées au suivi du praticien.',
  },

  // Validated enrichments summary
  deductionsSummary: '{{accepted}} déduction(s) sur {{total}} seront intégrées à la fiche de {{name}}. Le compte-rendu complet et les notes IA seront également sauvegardés.',
};
