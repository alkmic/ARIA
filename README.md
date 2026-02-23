# ARIA - Air Liquide Intelligent Assistant

## A propos

ARIA (Air Liquide Intelligent Assistant) est une application web intelligente concue pour Air Liquide Sante. Elle aide les delegues pharmaceutiques a optimiser leurs interactions avec les professionnels de sante specialises en oxygenotherapie et traitement des maladies respiratoires chroniques (BPCO).

L'application combine intelligence artificielle, analyse de donnees et interface utilisateur moderne pour fournir des recommandations personnalisees, generer des pitchs de vente sur mesure et offrir un coaching strategique en temps reel.

**ARIA est un veritable demonstrateur "Talk to My Data"** : toutes les recommandations sont generees dynamiquement a partir des donnees, avec des justifications IA detaillees et des interconnections profondes entre tous les modules.

## Fonctionnalites Principales

### Dashboard Intelligent
- **KPIs animes en temps reel** : Suivi des visites mensuelles, objectifs, nouveaux prescripteurs et fidelite moyenne
- **Recommandations ARIA** : Insights personnalises bases sur l'analyse des donnees terrain
- **Visites du jour** : Agenda intelligent avec praticiens prioritaires
- **Graphiques de performance** : Evolution des volumes d'oxygene sur 12 mois (Recharts)
- **Notifications contextuelles** : Alertes et rappels en drawer lateral

### Mes Actions - Next Best Actions IA
- **Top 12 actions prioritaires** : ARIA selectionne les actions les plus pertinentes
- **Scores IA expliques** avec tooltips :
  - **Urgence** : Delai depuis dernier contact, signaux de risque
  - **Impact potentiel** : Volume concerne, influence sur le territoire
  - **Facilite** : Relation existante, historique de succes
- **Justifications IA detaillees** pour chaque action :
  - Resume explicatif de la recommandation
  - Metriques supportant la decision
  - Risques si aucune action
  - Opportunites si action realisee
  - Approche suggeree par ARIA
- **Types d'actions** : Visite KOL, Risque churn, Alerte concurrence, Visite Top 15%, Opportunite croissance, Suivi
- **Gestion complete** : Completion avec notes, report (snooze), rejet

### Compte-Rendu de Visite Vocal
- **Double saisie** : Dictee vocale OU saisie texte au choix
- **Reconnaissance vocale** en temps reel (Web Speech API)
- **Extraction IA automatique** des informations cles :
  - Sujets abordes et sentiment (positif/neutre/negatif)
  - Prochaines actions a mener
  - Points cles a retenir
  - Produits discutes et concurrents mentionnes
  - Objections et opportunites detectees
- **Sauvegarde persistante** dans le profil praticien
- **Creation automatique de notes** strategiques

### Coach IA - Talk to My Data
- **Questions en langage naturel** sur vos donnees
- **Generation de graphiques a la demande** :
  - Graphiques en barres (volumes, comparaisons)
  - Camemberts (repartitions, distributions)
  - Courbes (evolutions, tendances)
- **Detection automatique** des demandes de visualisation
- **Analyses strategiques** avec impact quantifie
- **Suggestions contextuelles** avec exemples de graphiques
- **Praticiens cliquables** pour navigation directe
- **Dictee vocale** disponible

### Barre de Commandes Universelle
- **Recherche instantanee** sur toute l'application (praticiens, villes, actions)
- **Commandes rapides** : `/pitch`, `/tour`, `/report`, `/actions`
- **Activation** : `Cmd+K` (Mac) ou `Ctrl+K` (Windows)
- **Navigation vocale** integree

### Gestion Complete des Praticiens
- **Base de 126 praticiens** realistes (medecins generalistes + pneumologues)
- **Recherche instantanee** : Filtrage en temps reel par nom, ville, specialite
- **Filtres avances** :
  - Specialite (Pneumologue / Medecin generaliste)
  - Vingtile (Top 5%, Top 10%, etc.)
  - Niveau de risque (Faible, Moyen, Eleve)
  - Statut KOL (Key Opinion Leader)
- **Fiches detaillees enrichies** avec 5 onglets :
  - **Synthese IA** : Points cles, battlecards concurrentielles, prochaine action
  - **Historique** : Timeline des visites avec sentiments et notes
  - **Metriques** : Graphiques d'evolution des volumes
  - **Actualites** : Publications et news du praticien
  - **Notes** : Notes utilisateur, comptes-rendus vocaux, actions IA

### Generateur de Pitch IA
- **Generation en streaming** : Affichage mot a mot en temps reel
- **Multi-provider** : Compatible Groq, OpenAI, Gemini, Anthropic, Ollama, WebLLM
- **Configuration personnalisable** :
  - Longueur (Court, Moyen, Long)
  - Ton (Formel, Conversationnel, Technique)
  - Produits a mettre en avant (5 produits Air Liquide)
  - Concurrents a adresser (Vivisol, Linde, SOS Oxygene, Bastide)
- **Edition section par section** : Regeneration ciblee avec instructions personnalisees
- **Lecture audio (TTS)** : Web Speech API
- **Export** : Copie dans le presse-papiers

### Carte du Territoire
- **Visualisation geographique** des praticiens sur carte interactive (Leaflet)
- **Filtrage par specialite, vingtile, risque**
- **Informations au survol** : Metriques cles du praticien

### Optimisation de Tournee
- **Assistant pas-a-pas** pour planifier vos tournees
- **Selection multi-criteres** des praticiens :
  - Zone geographique
  - Priorite (KOL, risque churn, opportunite)
  - Temps depuis derniere visite
- **Optimisation intelligente** du parcours
- **Benefices calcules** par critere selectionne

### Planification KOL
- **Vue dediee** aux Key Opinion Leaders
- **Suivi des visites KOL** avec objectifs et metriques

### Interface Bilingue (Francais / Anglais)
- **Switch de langue** dans les parametres
- **Traduction complete** de l'interface, des libelles et des dates
- **Prompts LLM adaptes** a la langue selectionnee
- **Reconnaissance vocale et TTS** dans la langue choisie

### Landing Page & Ecran d'Accueil
- **Design immersif** aux couleurs Air Liquide
- **Animations fluides** : Fond anime evoquant l'air et l'oxygene
- **Presentation des fonctionnalites** : Coach IA, Pitch Generator, Analytics

### Parametres & Notifications
- **Gestion de profil** : Informations utilisateur
- **Selection de la langue** : Francais ou Anglais
- **Preferences de notifications** : Alertes personnalisables
- **Drawer de notifications** : Acces rapide aux alertes prioritaires

## Architecture Data Flow

ARIA implemente une architecture de donnees interconnectee :

```
+-------------------+     +--------------------+     +-------------------+
|  Compte-Rendu     |---->|   Store Central    |---->|  Profil           |
|  Vocal            |     |  (useUserData)     |     |  Praticien        |
+-------------------+     +--------------------+     +-------------------+
                                 |
                                 v
                          +--------------------+
                          |  AI Intelligence   |
                          |  Service           |
                          +--------------------+
                                 |
                                 v
                          +--------------------+
                          |  Next Best         |
                          |  Actions           |
                          +--------------------+
```

- **Persistance localStorage** : Toutes les donnees utilisateur sont sauvegardees
- **Notes automatiques** : Les comptes-rendus creent des notes dans le profil praticien
- **Actions IA dynamiques** : Generees a partir de l'analyse en temps reel
- **Justifications contextuelles** : Chaque recommandation explique son raisonnement

## Design System

### Couleurs Air Liquide
```css
--air-liquide-primary: #0066B3    /* Bleu principal */
--air-liquide-navy: #003366        /* Bleu marine */
--air-liquide-teal: #00B5AD        /* Turquoise */
--air-liquide-sky: #00A3E0         /* Bleu ciel */
```

### Principes de Design
- **Glass morphism** : Cartes translucides avec backdrop blur
- **Micro-animations** : Transitions fluides avec Framer Motion
- **Typographie** : Plus Jakarta Sans (texte) + JetBrains Mono (code)
- **Responsive** : Optimise pour desktop et iPad Pro 12.9"
- **Accessibilite** : Contrastes conformes WCAG, feedback visuel sur tous les elements interactifs

## Installation

### Prerequis
- Node.js 18+
- npm 9+

### Installation rapide
```bash
# Cloner le repository
git clone https://github.com/votre-org/ARIA.git
cd ARIA

# Installer les dependances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Editer .env pour configurer le provider LLM (voir CONFIGURATION_IA.md)

# Lancer le serveur de developpement
npm run dev
```

L'application sera accessible sur **http://localhost:5173**

### Scripts disponibles
```bash
npm run dev       # Serveur de developpement avec hot reload
npm run build     # Build de production
npm run preview   # Preview du build de production
npm run lint      # Linter ESLint
```

## Structure du Projet

```
ARIA/
├── src/
│   ├── components/
│   │   ├── layout/              # Sidebar, Header, Layout
│   │   ├── dashboard/           # StatCard, AIInsights, PerformanceChart, etc.
│   │   ├── practitioners/       # FilterPanel
│   │   ├── practitioner/        # NewsTab, NotesTab
│   │   ├── shared/              # AnimatedNumber, PeriodSelector
│   │   └── ui/                  # Button, Card, Badge, Avatar, Skeleton, etc.
│   ├── pages/
│   │   ├── Welcome.tsx              # Ecran d'accueil
│   │   ├── Landing.tsx              # Page d'atterrissage
│   │   ├── Dashboard.tsx            # Tableau de bord principal
│   │   ├── HCPProfile.tsx           # Liste des praticiens
│   │   ├── PractitionerProfile.tsx  # Fiche detaillee praticien
│   │   ├── PitchGenerator.tsx       # Generateur de pitch IA
│   │   ├── AICoach.tsx              # Coach conversationnel
│   │   ├── NextBestActions.tsx      # Actions IA prioritaires
│   │   ├── VoiceVisitReport.tsx     # Compte-rendu vocal
│   │   ├── TourOptimizationPage.tsx # Optimisation tournee
│   │   ├── KOLPlanningPage.tsx      # Planification KOL
│   │   ├── TerritoryMap.tsx         # Carte du territoire
│   │   ├── Visits.tsx               # Mes visites
│   │   ├── ManagerDashboard.tsx     # Dashboard manager
│   │   └── Settings.tsx             # Parametres utilisateur
│   ├── hooks/
│   │   ├── useGroq.ts           # Hook multi-provider LLM (Groq, Gemini, OpenAI, Anthropic, Ollama)
│   │   ├── useSpeech.ts         # Hook pour Text-to-Speech
│   │   └── useWebLLM.ts         # Hook pour WebLLM (LLM dans le navigateur)
│   ├── services/
│   │   ├── aiCoachEngine.ts         # Moteur du Coach IA
│   │   ├── pitchPromptsEnhanced.ts  # Prompts enrichis pour le pitch
│   │   ├── actionIntelligence.ts    # Generation actions IA
│   │   ├── universalSearch.ts       # Recherche universelle
│   │   ├── dataService.ts           # Service donnees praticiens
│   │   ├── dataAdapter.ts           # Adaptateur de donnees
│   │   ├── dataQueryEngine.ts       # Moteur de requetes donnees
│   │   ├── practitionerDataBridge.ts # Bridge donnees praticien
│   │   ├── ragService.ts            # Service RAG (Retrieval-Augmented Generation)
│   │   ├── apiKeyService.ts         # Gestion cles API multi-provider
│   │   ├── agenticChartEngine.ts    # Generation de graphiques IA
│   │   ├── metricsCalculator.ts     # Calcul de metriques
│   │   ├── routeOptimizer.ts        # Optimisation de parcours
│   │   └── coachAI.ts               # Logique Coach IA
│   ├── i18n/
│   │   ├── translations/        # Fichiers de traduction (fr/ + en/)
│   │   ├── prompts/             # Prompts LLM bilingues (fr/ + en/)
│   │   ├── LanguageContext.tsx   # Contexte de langue
│   │   └── useTranslation.ts    # Hook de traduction
│   ├── data/
│   │   ├── dataGenerator.ts         # Generateur de donnees praticiens
│   │   ├── practitionersDatabase.ts # Base de donnees praticiens
│   │   └── ragKnowledgeBase.ts      # Base de connaissances RAG
│   ├── stores/
│   │   ├── useAppStore.ts       # Zustand store principal
│   │   └── useUserDataStore.ts  # Store donnees utilisateur
│   ├── utils/
│   │   ├── helpers.ts           # Fonctions utilitaires (dates, formatage)
│   │   ├── localizeData.ts      # Localisation des donnees generees
│   │   └── generatePractitioners.ts # Generation des praticiens
│   ├── contexts/
│   │   └── TimePeriodContext.tsx # Contexte de periode temporelle
│   └── types/
│       ├── index.ts             # Types principaux
│       ├── database.ts          # Types base de donnees
│       └── pitch.ts             # Types pitch
├── public/                       # Assets statiques
├── CONFIGURATION_IA.md           # Guide de configuration LLM
├── DEPLOYMENT.md                 # Guide de deploiement
└── vercel.json                   # Configuration Vercel
```

## Stack Technique

### Frontend
- **React 19.2** avec TypeScript 5.9
- **Vite 7.2** : Build tool ultra-rapide
- **Tailwind CSS 3.4** : Styling utility-first
- **Framer Motion** : Animations fluides
- **React Router DOM 7** : Routing SPA

### State Management & Data
- **Zustand** : State management leger avec persistance
- **Recharts** : Graphiques interactifs
- **date-fns** : Manipulation de dates
- **React Leaflet** : Cartes interactives

### Intelligence Artificielle (Multi-Provider)
- **Groq** : Llama 3.3 70B Versatile (recommande, gratuit)
- **Google Gemini** : Gemini 2.0 Flash
- **OpenAI** : GPT-4o, GPT-4o-mini
- **Anthropic** : Claude Sonnet, Claude Haiku
- **OpenRouter** : Acces multi-modeles
- **Ollama** : LLM local (Qwen3 8B par defaut)
- **WebLLM** : LLM dans le navigateur (zero installation)
- **Web Speech API** : Speech-to-Text et Text-to-Speech natif
- **Action Intelligence Service** : Analyse et scoring des actions recommandees

### Icones & UI
- **Lucide React** : Bibliotheque d'icones moderne

## Donnees

### Praticiens (126 profils realistes)
- **Medecins Generalistes**
  - Vingtiles : 1-10 (segmentation par potentiel)
  - Volumes : 1 000 - 10 000 L O2/an
  - Repartition : Ain (01), Rhone (69), Isere (38)

- **Pneumologues**
  - Vingtiles : 1-5 (plus haut potentiel)
  - Volumes : 200 000 - 537 000 L O2/an
  - KOLs identifies (~10% des praticiens)

- **6 nouveaux praticiens** detectes automatiquement par le systeme

### Donnees Persistantes
- **Rapports de visite** : Comptes-rendus vocaux avec extraction IA
- **Notes utilisateur** : Observations, strategies, intelligence concurrentielle
- **Actions IA** : Historique des actions completees, reportees, rejetees
- **Seuils configurables** : Parametres d'alerte personnalisables

### Donnees Generees
- Historique de visites
- Conversations et sentiments
- Insights et recommandations IA
- Metriques de performance sur 12 mois
- Actualites et publications des praticiens
- Battlecards concurrentielles

## Variables d'Environnement

Copier `.env.example` vers `.env` a la racine. Le provider LLM est auto-detecte depuis le format de la cle :

```env
# Provider auto-detecte depuis le format de la cle :
#   gsk_...    -> Groq        (https://console.groq.com)
#   AIzaSy...  -> Gemini      (https://aistudio.google.com)
#   sk-...     -> OpenAI      (https://platform.openai.com)
#   sk-ant-... -> Anthropic   (https://console.anthropic.com)
#   sk-or-...  -> OpenRouter  (https://openrouter.ai)
VITE_LLM_API_KEY=votre_cle_api_ici

# Ou utiliser Ollama en local (defaut si aucune cle)
# VITE_OLLAMA_BASE_URL=http://localhost:11434
# VITE_OLLAMA_MODEL=qwen3:8b
```

Voir `CONFIGURATION_IA.md` pour le guide complet de configuration multi-provider.

## Deploiement

### Vercel (Recommande)

Le moyen le plus simple de deployer ARIA est d'utiliser Vercel :

1. Creer un compte sur [vercel.com](https://vercel.com)
2. Importer le repository GitHub
3. Configurer la variable d'environnement `VITE_LLM_API_KEY`
4. Deployer

Voir `DEPLOYMENT.md` pour les instructions detaillees.

### Autres Options
- **Netlify** : Guide dans `DEPLOYMENT.md`
- **Local** : `npm run build && npm run preview`

## Points Forts

### Performance
- Chargement initial < 2 secondes
- Animations a 60 FPS
- Recherche instantanee (< 100ms)
- Code splitting automatique

### Experience Utilisateur
- Design moderne et professionnel
- Animations fluides et naturelles
- Feedback visuel sur tous les elements interactifs
- Interface responsive et accessible
- Interactions vocales (dictee et lecture)
- Interface bilingue francais/anglais

### Intelligence Artificielle
- Generation de pitch en streaming avec choix du provider
- Recommandations basees sur l'analyse de donnees en temps reel
- Coach IA avec impact business quantifie
- Lecture vocale dans la langue selectionnee
- Justifications IA detaillees pour chaque action
- Scoring multi-criteres (urgence, impact, probabilite)
- Fonctionnement possible sans API externe (Ollama local ou WebLLM)

### "Talk to My Data"
- Toutes les recommandations sont dynamiques
- Aucune valeur en dur - tout est calcule
- **Graphiques generes a la demande** dans le Coach IA
- Interconnexions profondes entre tous les modules
- Persistance des donnees utilisateur

## Contribution

Projet developpe pour **Air Liquide Sante** en collaboration avec **Capgemini**.

### Guidelines
- Code TypeScript strict
- Commits conventionnels (feat, fix, docs, etc.)
- Tests avant merge sur main
- Documentation a jour

## Changelog

### Version 1.2.0 (Fevrier 2026)
- **Interface bilingue** : Switch francais/anglais complet (UI, dates, prompts LLM, reconnaissance vocale)
- **Localisation des donnees** : News, battlecards, actions, specialites — tout s'adapte a la langue
- **Planification KOL** : Nouvelle page dediee au suivi des Key Opinion Leaders

### Version 1.1.0 (Fevrier 2026)
- **Coach IA "Talk to My Data"** : Generation de graphiques a la demande (barres, camemberts, courbes)
- **Mes Actions simplifiees** : Top 12 actions prioritaires avec scores expliques
- **Compte-Rendu de Visite** : Dictee vocale OU saisie texte au choix
- **Coach IA enrichi** : Integre desormais Data Explorer pour les analyses
- **Store persistant** : Sauvegarde des rapports, notes et actions
- **NotesTab enrichi** : 3 sections (Notes, Comptes-rendus, Actions IA)
- **Barre de commandes** : Recherche universelle avec Cmd+K
- **Optimisation Tournee** : Assistant pas-a-pas avec calcul de benefices
- **Multi-provider LLM** : Support Groq, Gemini, OpenAI, Anthropic, Ollama, WebLLM

### Version 1.0.0 (Janvier 2026)
- Landing page professionnelle Air Liquide
- Dashboard avec KPIs et recommandations IA
- Gestion complete des praticiens
- Recherche et filtres avances
- Generateur de pitch IA avec streaming + TTS
- Coach IA conversationnel avec impact business
- Systeme de notifications
- Page de parametres
- Deploiement Vercel ready

## Licence

Tous droits reserves.

## Support

Pour toute question ou probleme technique :
- Documentation : Voir `CONFIGURATION_IA.md` et `DEPLOYMENT.md`
- Issues : GitHub Issues

---

**ARIA v1.2.0** - Air Liquide Intelligent Assistant
Developpe pour Air Liquide Sante
