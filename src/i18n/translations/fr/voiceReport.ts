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
};
