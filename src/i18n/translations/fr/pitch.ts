export const pitch = {
  title: 'Générateur de Pitch IA',
  subtitle: 'Sélectionnez un praticien pour générer un pitch personnalisé',
  searchPlaceholder: 'Rechercher par nom, ville...',
  allSpecialties: 'Toutes spécialités',
  pneumologists: 'Pneumologues',
  generalists: 'Généralistes',
  allTypes: 'Tous',
  kolsOnly: 'KOLs uniquement',
  nonKols: 'Non KOLs',

  // Steps
  steps: {
    practitioner: 'Praticien',
    preview: 'Aperçu',
    config: 'Config.',
    pitch: 'Pitch',
  },

  // Practitioner preview
  pitchFor: 'Pitch pour {{name}}',
  checkData: 'Vérifiez les données disponibles avant de configurer le pitch',
  annualVolume: 'Volume annuel',
  loyalty: 'Fidélité',
  vingtile: 'Vingtile',
  trend: 'Tendance',
  churnRisk: 'Risque de churn {{level}}',
  churnHigh: 'élevé',
  churnMedium: 'moyen',
  publications: 'Publications ({{count}})',
  noPublications: 'Aucune publication référencée',
  recentNotes: 'Notes récentes ({{count}})',
  noNotes: 'Aucune note de visite',
  visitHistory: 'Historique des visites ({{count}})',
  noVisits: 'Aucune visite enregistrée',
  chooseAnother: 'Choisir un autre praticien',
  configurePitch: 'Configurer le pitch',

  // Products
  products: {
    vitalaire: 'Concentrateur haut de gamme',
    freestyle: 'Portable 2,1kg, autonomie 8h',
    telesuivi: 'Suivi à distance connecté',
    station: 'Solution fixe performante',
    o2liquid: 'Mobilité maximale',
    dreamstation: 'VNI BPCO hypercapnique',
    resmed: 'PPC connectée dernière gén.',
    service247: 'Assistance permanente',
    training: 'Éducation thérapeutique',
  },

  // Competitors
  competitors: {
    vivisol: 'Vivisol',
    linde: 'Linde Healthcare',
    sos: 'SOS Oxygène',
    bastide: 'Bastide Médical',
    others: 'Autres',
  },

  // Focus options
  focus: {
    general: 'Général',
    generalDesc: 'Approche équilibrée couvrant tous les aspects',
    service: 'Service',
    serviceDesc: 'Accent sur la qualité de service et SAV',
    innovation: 'Innovation',
    innovationDesc: 'Nouveautés technologiques et R&D',
    price: 'Prix',
    priceDesc: 'Compétitivité tarifaire et rapport qualité/prix',
    loyalty: 'Fidélité',
    loyaltyDesc: 'Programme fidélité et relation long terme',
  },

  // Configuration
  config: {
    title: 'Configuration du pitch',
    forPractitioner: 'Pour {{name}}',
    pitchFocus: 'Focus du pitch',
    format: 'Format',
    length: 'Longueur',
    short: 'Court',
    medium: 'Moyen',
    long: 'Long',
    tone: 'Ton',
    formal: 'Formel',
    conversational: 'Conversationnel',
    technical: 'Technique',
    additionalSections: 'Sections supplémentaires',
    objectionHandling: 'Gestion des objections',
    objectionDesc: 'Anticipe les objections courantes avec des réponses préparées',
    discussionPoints: 'Points de discussion',
    discussionDesc: "Liste des sujets clés à aborder pendant l'entretien",
    productsToHighlight: 'Produits à mettre en avant',
    competitorsToAddress: 'Concurrents à adresser',
    specialInstructions: 'Instructions spéciales',
    specialInstructionsPlaceholder: 'Ex: Insister sur le service 24/7, mentionner la nouvelle étude clinique, éviter de parler du prix...',
  },

  // API status
  offlineMode: 'Mode hors-ligne',
  offlineModeDesc: "Le pitch sera généré à partir des données réelles du praticien (notes, publications, historique, métriques). Pour une génération IA avancée, ajoutez une clé API dans .env (VITE_LLM_API_KEY).",

  // Generate
  generateIA: 'Générer le pitch (IA)',
  generate: 'Générer le pitch',
  generating: 'Génération en cours...',
  pitchGenerated: 'Pitch généré',
  pause: 'Pause',
  resume: 'Reprendre',
  listen: 'Écouter',
  copyAll: 'Copier tout',
  regenerate: 'Régénérer',
  pitchReady: 'Pitch prêt à l\'emploi !',
  sectionsGenerated: '{{count}} sections générées pour {{name}}',
  newPitch: 'Nouveau pitch',
  nextSteps: 'Prochaines étapes',
  makeReport: 'Faire le compte-rendu après la visite',
  seeFullProfile: 'Voir le profil complet',
  seeOtherActions: 'Voir mes autres actions',

  // Section edit
  howToModify: 'Comment souhaitez-vous modifier cette section ?',
  modifyPlaceholder: 'Ex: Rendre plus percutant, ajouter des chiffres, raccourcir, être plus technique...',
  regenerating: 'Régénération...',
  applyChanges: 'Appliquer les modifications',

  // Pitch sections
  sections: {
    hook: 'Accroche',
    valueProposition: 'Proposition de valeur',
    differentiation: 'Différenciation',
    callToAction: 'Call to Action',
    objectionHandling: 'Gestion des objections',
    discussionPoints: 'Points de discussion',
    followUpPlan: 'Plan de suivi',
  },

  // Error messages
  generateError: 'Impossible de générer le pitch. Veuillez réessayer.',

  // Loading text
  loadingAI: "L'IA crée votre pitch ultra-personnalisé",
  loadingLocal: 'Génération du pitch à partir des données du praticien...',

  // Section tooltips
  copySectionTooltip: 'Copier cette section',
  editSectionTooltip: 'Modifier cette section',

  // Streaming
  generatingNextSections: 'Génération des sections suivantes...',

  // Demo mode
  demoModeTitle: 'Mode démonstration',
  demoModeDesc: 'Ce pitch a été généré localement à partir des données réelles du praticien. Pour des pitchs plus riches et adaptatifs, configurez une clé API dans le fichier .env (VITE_LLM_API_KEY).',

  // Error display
  generationErrorTitle: 'Erreur de génération',
};
