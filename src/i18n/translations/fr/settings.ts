export const settings = {
  title: 'Paramètres',
  subtitle: "Configurez l'intelligence artificielle et vos préférences",

  // Language section
  language: {
    title: 'Langue / Language',
    subtitle: "Choisissez la langue de l'interface",
    french: 'Français',
    english: 'English',
  },

  // LLM Config
  llm: {
    title: 'Configuration LLM',
    subtitle: 'Connectez n\'importe quel LLM externe — choisissez votre service, modèle et clé API',
    active: 'Active',
    currentProvider: 'Provider LLM actuel',
    fallbackChain: 'Chaîne de fallback : API externe → WebLLM navigateur',
    providerLabel: 'Service / Provider',
    getApiKey: 'Obtenir une clé API sur {{provider}}',
    apiKey: 'Clé API',
    apiKeyPlaceholder: 'Collez votre clé API',
    model: 'Modèle',
    otherModel: 'Autre modèle (saisie libre)...',
    modelPlaceholder: 'Nom du modèle (ex: gpt-4o-mini, llama-3.3-70b-versatile)',
    backToSuggested: 'Revenir à la liste des modèles suggérés',
    apiUrl: "URL de l'API",
    azureEndpoint: 'Endpoint Azure',
    optional: '(optionnel)',
    azureEndpointHelp: "Obligatoire — l'endpoint de votre ressource Azure AI Foundry (ex: https://xxx.cognitiveservices.azure.com).",
    requiredUrl: "Obligatoire — renseignez l'URL complète de votre endpoint.",
    defaultUrl: 'Par défaut : {{url}}',
    advancedOptions: 'Options avancées (URL personnalisée)...',
    azureConfig: 'Configuration Azure OpenAI',
    deploymentName: 'Nom du déploiement (deployment)',
    deploymentHelp: 'Le nom de votre déploiement dans Azure AI Foundry (peut différer du nom du modèle).',
    apiVersion: "Version d'API",
    apiVersionHelp: "Version de l'API Azure OpenAI (ex: 2024-12-01-preview).",
    saveAndTest: 'Sauvegarder & Tester',
    testing: 'Test en cours...',
    testConnection: 'Tester la connexion',
    delete: 'Supprimer',
    connectionSuccess: 'Connexion réussie !',
    providerInfo: 'Provider : {{provider}} — Modèle : {{model}} — Latence : {{latency}}ms',
    allServicesWillUse: "Tous les services IA d'ARIA utiliseront cette configuration automatiquement.",
    connectionFailed: 'Échec de connexion',
    checkConfig: "Vérifiez la clé, le modèle, et (si applicable) l'URL de l'API.",
    storedLocally: 'La configuration est stockée uniquement dans votre navigateur (localStorage).',
    supportedServices: '{{count}} services supportés : {{list}} + endpoint personnalisé.',
    unknownProvider: 'Inconnu',
    unexpectedError: 'Erreur inattendue lors du test',
  },

  // WebLLM
  webllm: {
    title: 'IA locale dans le navigateur',
    subtitle: 'Exécutez un LLM dans votre navigateur via WebGPU — zéro installation, zéro serveur',
    ready: 'Prêt',
    externalKeyNote: 'Une clé API externe est configurée. WebLLM sert de solution de secours si l\'API est indisponible.',
    webgpuNotAvailable: 'WebGPU non disponible',
    webgpuNotAvailableDesc: 'Votre navigateur ne supporte pas WebGPU. Utilisez Chrome 113+, Edge 113+ ou un navigateur compatible. Configurez plutôt une clé API ci-dessus.',
    chooseModel: 'Choisir un modèle ({{count}} modèles de {{orgs}} éditeurs) :',
    powerfulGpu: 'GPU puissant',
    loadedActive: 'Chargé et actif',
    loadingModel: 'Chargement du modèle...',
    firstLoad: 'Premier chargement : les poids sont téléchargés et mis en cache. Les prochains chargements seront quasi-instantanés.',
    loadError: 'Erreur de chargement',
    loadModelBtn: 'Charger {{name}}',
    unloadModel: 'Décharger le modèle',
    mlcInfo: 'Les modèles sont compilés au format MLC et distribués via le CDN HuggingFace. Le runtime WASM est hébergé sur GitHub (mlc-ai).',
    cacheInfo: 'Les poids sont téléchargés une seule fois puis mis en cache dans IndexedDB — les chargements suivants sont instantanés.',
    privacyInfo: "Pendant l'inférence, tout s'exécute localement sur votre GPU — aucune donnée n'est envoyée à l'extérieur.",
  },

  // Profile
  profile: {
    title: 'Profil',
    subtitle: 'Informations personnelles',
    fullName: 'Nom complet',
    email: 'Email',
    role: 'Rôle',
  },

  // Notifications
  notifications: {
    title: 'Notifications',
    subtitle: "Préférences d'alertes",
    visitsToSchedule: 'Visites à planifier',
    unvisitedKols: 'KOLs non visités',
    goalsReached: 'Objectifs atteints',
    dailyReminders: 'Rappels quotidiens',
  },

  // Security
  security: {
    title: 'Sécurité',
    subtitle: 'Paramètres de sécurité',
    changePassword: 'Changer le mot de passe',
    enable2fa: 'Activer 2FA',
  },

  // Data
  data: {
    title: 'Données',
    subtitle: 'Gestion des données',
    exportData: 'Exporter mes données',
    privacyPolicy: 'Politique de confidentialité',
    terms: "Conditions d'utilisation",
  },

  // Help
  help: {
    title: 'Aide & Support',
    subtitle: "Besoin d'assistance ?",
    documentation: 'Documentation',
    videoTutorials: 'Tutoriels vidéo',
    contactSupport: 'Contacter le support',
  },

  // Footer
  version: 'ARIA v1.0.0 · Démonstrateur Air Liquide Santé',
};
