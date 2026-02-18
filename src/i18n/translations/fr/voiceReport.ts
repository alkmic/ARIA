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
};
