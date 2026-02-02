# 🤖 ARIA - Air Liquide Intelligent Assistant

## 📋 À propos

ARIA (Air Liquide Intelligent Assistant) est une application web intelligente conçue pour Air Liquide Santé. Elle aide les délégués pharmaceutiques à optimiser leurs interactions avec les professionnels de santé spécialisés en oxygénothérapie et traitement des maladies respiratoires chroniques (BPCO).

L'application combine intelligence artificielle, analyse de données et interface utilisateur moderne pour fournir des recommandations personnalisées, générer des pitchs de vente sur mesure et offrir un coaching stratégique en temps réel.

**ARIA est un véritable démonstrateur "Talk to My Data"** : toutes les recommandations sont générées dynamiquement à partir des données réelles, avec des justifications IA détaillées et des interconnections profondes entre tous les modules.

## ✨ Fonctionnalités Principales

### 🏠 Dashboard Intelligent
- **KPIs animés en temps réel** : Suivi des visites mensuelles, objectifs, nouveaux prescripteurs et fidélité moyenne
- **Recommandations ARIA** : Insights personnalisés basés sur l'analyse des données terrain
- **Visites du jour** : Agenda intelligent avec praticiens prioritaires
- **Graphiques de performance** : Évolution des volumes d'oxygène sur 12 mois (Recharts)
- **Notifications contextuelles** : Alertes et rappels en drawer latéral

### 🎯 Mes Actions - Next Best Actions IA
- **Top 12 actions prioritaires** : ARIA sélectionne les actions les plus pertinentes
- **Scores IA expliqués** avec tooltips :
  - **Urgence** : Délai depuis dernier contact, signaux de risque
  - **Impact potentiel** : Volume concerné, influence sur le territoire
  - **Facilité** : Relation existante, historique de succès
- **Justifications IA détaillées** pour chaque action :
  - Résumé explicatif de la recommandation
  - Métriques supportant la décision
  - Risques si aucune action
  - Opportunités si action réalisée
  - Approche suggérée par ARIA
- **Types d'actions** : Visite KOL, Risque churn, Alerte concurrence, Visite Top 15%, Opportunité croissance, Suivi
- **Gestion complète** : Complétion avec notes, report (snooze), rejet

### 📝 Compte-Rendu de Visite
- **Double saisie** : Dictée vocale OU saisie texte au choix
- **Reconnaissance vocale** en temps réel (Web Speech API)
- **Extraction IA automatique** des informations clés :
  - Sujets abordés et sentiment (positif/neutre/négatif)
  - Prochaines actions à mener
  - Points clés à retenir
  - Produits discutés et concurrents mentionnés
  - Objections et opportunités détectées
- **Sauvegarde persistante** dans le profil praticien
- **Création automatique de notes** stratégiques

### 💬 Coach IA - Talk to My Data
- **Questions en langage naturel** sur vos données
- **Génération de graphiques à la demande** :
  - 📊 Graphiques en barres (volumes, comparaisons)
  - 🥧 Camemberts (répartitions, distributions)
  - 📈 Courbes (évolutions, tendances)
- **Détection automatique** des demandes de visualisation
- **Analyses stratégiques** avec impact quantifié
- **Suggestions contextuelles** avec exemples de graphiques
- **Praticiens cliquables** pour navigation directe
- **Dictée vocale** disponible
- **Exemples de questions** :
  - "📊 Graphique des volumes par ville"
  - "🥧 Répartition des praticiens par vingtile"
  - "📈 Évolution de la fidélité par spécialité"
  - "Top 10 prescripteurs en barres"

### 🔍 Barre de Commandes Universelle (Nouveau)
- **Recherche instantanée** sur toute l'application (praticiens, villes, actions)
- **Commandes rapides** : `/pitch`, `/tour`, `/report`, `/actions`
- **Activation** : `Cmd+K` (Mac) ou `Ctrl+K` (Windows)
- **Navigation vocale** intégrée

### 👥 Gestion Complète des Praticiens
- **Base de 150 praticiens** réalistes (100 médecins généralistes + 50 pneumologues)
- **Recherche instantanée** : Filtrage en temps réel par nom, ville, spécialité
- **Filtres avancés** :
  - Spécialité (Pneumologue / Médecin généraliste)
  - Vingtile (Top 5%, Top 10%, etc.)
  - Niveau de risque (Faible, Moyen, Élevé)
  - Statut KOL (Key Opinion Leader)
- **Fiches détaillées enrichies** avec 5 onglets :
  - **Synthèse IA** : Points clés, battlecards concurrentielles, prochaine action
  - **Historique** : Timeline des visites avec sentiments et notes
  - **Métriques** : Graphiques d'évolution des volumes
  - **Actualités** : Publications et news du praticien
  - **Notes** : Notes utilisateur, comptes-rendus vocaux, actions IA (Nouveau)

### ✨ Générateur de Pitch IA (Groq Llama 3.3)
- **Génération en streaming ultra-rapide** : Affichage mot à mot en temps réel
- **Configuration personnalisable** :
  - Longueur (Court, Moyen, Long)
  - Ton (Formel, Conversationnel, Technique)
  - Produits à mettre en avant (5 produits Air Liquide)
  - Concurrents à adresser (Vivisol, Linde, SOS Oxygène, Bastide)
- **Édition section par section** : Régénération ciblée avec instructions personnalisées
- **Lecture audio (TTS)** : Web Speech API pour écouter le pitch en français
- **Export** : Copie dans le presse-papiers
- **Recherche de ville intelligente** avec suggestions

### 🗺️ Optimisation de Tournée (Nouveau)
- **Assistant pas-à-pas** pour planifier vos tournées
- **Sélection multi-critères** des praticiens :
  - Zone géographique
  - Priorité (KOL, risque churn, opportunité)
  - Temps depuis dernière visite
- **Optimisation intelligente** du parcours
- **Bénéfices calculés** par critère sélectionné
- **Sauvegarde des visites** dans le calendrier


### 🎨 Landing Page Professionnelle
- **Design immersif** aux couleurs Air Liquide
- **Animations fluides** : Fond animé évoquant l'air et l'oxygène
- **Présentation des fonctionnalités** : Coach IA, Pitch Generator, Analytics
- **Call-to-Action central** : "Lancer l'expérience"

### ⚙️ Paramètres & Notifications
- **Gestion de profil** : Informations utilisateur
- **Préférences de notifications** : Alertes personnalisables
- **Drawer de notifications** : Accès rapide aux alertes prioritaires

## 🔄 Architecture Data Flow

ARIA implémente une architecture de données interconnectée :

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Compte-Rendu   │────▶│   Store Central  │────▶│  Profil        │
│  Vocal          │     │  (useUserData)   │     │  Praticien     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  AI Intelligence │
                        │  Service         │
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Next Best       │
                        │  Actions         │
                        └──────────────────┘
```

- **Persistance localStorage** : Toutes les données utilisateur sont sauvegardées
- **Notes automatiques** : Les comptes-rendus créent des notes dans le profil praticien
- **Actions IA dynamiques** : Générées à partir de l'analyse en temps réel
- **Justifications contextuelles** : Chaque recommandation explique son raisonnement

## 🎨 Design System

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
- **Responsive** : Optimisé pour desktop et iPad Pro 12.9"
- **Accessibilité** : Contrastes conformes WCAG, feedback visuel sur tous les éléments interactifs

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm 9+

### Installation rapide
```bash
# Cloner le repository
git clone https://github.com/votre-org/ARIA.git
cd ARIA

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env et ajouter votre clé API Groq

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur **http://localhost:5173**

### Scripts disponibles
```bash
npm run dev       # Serveur de développement avec hot reload
npm run build     # Build de production
npm run preview   # Preview du build de production
npm run lint      # Linter ESLint
```

## 📂 Structure du Projet

```
ARIA/
├── src/
│   ├── components/
│   │   ├── layout/              # Sidebar, Header, Layout
│   │   ├── dashboard/           # StatCard, AIInsights, PerformanceChart
│   │   ├── practitioners/       # FilterPanel
│   │   ├── practitioner/        # NewsTab, NotesTab (enrichi)
│   │   └── ui/                  # Button, Card, Badge, Avatar, Skeleton, etc.
│   ├── pages/
│   │   ├── Landing.tsx          # Page d'accueil
│   │   ├── Dashboard.tsx        # Tableau de bord principal
│   │   ├── HCPProfile.tsx       # Liste des praticiens
│   │   ├── PractitionerProfile.tsx  # Fiche détaillée praticien
│   │   ├── PitchGenerator.tsx   # Générateur de pitch IA
│   │   ├── AICoach.tsx          # Coach conversationnel
│   │   ├── NextBestActions.tsx  # Actions IA prioritaires (nouveau)
│   │   ├── VoiceVisitReport.tsx # Compte-rendu vocal (nouveau)
│   │   ├── TourOptimization.tsx # Optimisation tournée (nouveau)
│   │   ├── DataExplorer.tsx     # Talk to My Data (nouveau)
│   │   └── Settings.tsx         # Paramètres utilisateur
│   ├── hooks/
│   │   ├── useGroq.ts           # Hook pour Groq API
│   │   └── useSpeech.ts         # Hook pour Text-to-Speech
│   ├── services/
│   │   ├── coachAI.ts           # Logique Coach IA
│   │   ├── pitchPrompts.ts      # Prompts Groq
│   │   ├── actionIntelligence.ts # Génération actions IA (nouveau)
│   │   ├── universalSearch.ts   # Recherche universelle (nouveau)
│   │   └── dataService.ts       # Service données praticiens
│   ├── data/
│   │   └── practitioners.json   # Base de 150 praticiens
│   ├── stores/
│   │   ├── useAppStore.ts       # Zustand store principal
│   │   └── useUserDataStore.ts  # Store données utilisateur (nouveau)
│   └── types/
│       ├── index.ts             # Types principaux
│       ├── database.ts          # Types base de données
│       └── pitch.ts             # Types pitch
├── public/                       # Assets statiques
├── DEPLOYMENT.md                 # Guide de déploiement
└── vercel.json                   # Configuration Vercel
```

## 🛠️ Stack Technique

### Frontend
- **React 19** avec TypeScript 5.6
- **Vite 7** : Build tool ultra-rapide
- **Tailwind CSS 3.4** : Styling utility-first
- **Framer Motion** : Animations fluides
- **React Router DOM** : Routing SPA

### State Management & Data
- **Zustand** : State management léger avec persistance
- **Recharts** : Graphiques interactifs
- **date-fns** : Manipulation de dates

### Intelligence Artificielle
- **Groq API** : Génération de texte avec Llama 3.3 70B Versatile
- **Web Speech API** : Speech-to-Text et Text-to-Speech natif du navigateur
- **Action Intelligence Service** : Analyse et scoring des actions recommandées

### Icônes & UI
- **Lucide React** : Bibliothèque d'icônes moderne

## 📊 Données

### Praticiens (150 profils réalistes)
- **100 Médecins Généralistes**
  - Vingtiles : 1-10 (segmentation par potentiel)
  - Volumes : 1,000 - 10,000 L O₂/an
  - Répartition : Ain (01), Rhône (69), Isère (38)

- **50 Pneumologues**
  - Vingtiles : 1-5 (plus haut potentiel)
  - Volumes : 200,000 - 537,000 L O₂/an
  - 15 KOLs (10% des praticiens)

### Données Persistantes (Nouveau)
- **Rapports de visite** : Comptes-rendus vocaux avec extraction IA
- **Notes utilisateur** : Observations, stratégies, intelligence concurrentielle
- **Actions IA** : Historique des actions complétées, reportées, rejetées
- **Seuils configurables** : Paramètres d'alerte personnalisables

### Données Mockées
- Historique des 200+ visites
- Conversations et sentiments
- Insights et recommandations IA
- Métriques de performance sur 12 mois

## 🔐 Variables d'Environnement

Créer un fichier `.env` à la racine :

```env
# Groq API Configuration
VITE_GROQ_API_KEY=votre_clé_groq_api_ici
```

Pour obtenir une clé API Groq :
1. Créer un compte sur [console.groq.com](https://console.groq.com)
2. Générer une clé API dans la section API Keys
3. Copier la clé dans le fichier `.env`

## 🚀 Déploiement

### Vercel (Recommandé)

Le moyen le plus simple de déployer ARIA est d'utiliser Vercel :

1. Créer un compte sur [vercel.com](https://vercel.com)
2. Importer le repository GitHub
3. Configurer la variable d'environnement `VITE_GROQ_API_KEY`
4. Déployer

Voir `DEPLOYMENT.md` pour les instructions détaillées.

### Autres Options
- **Netlify** : Guide dans `DEPLOYMENT.md`
- **Local** : `npm run build && npm run preview`

## 🎯 Points Forts

### Performance
- ⚡ Chargement initial < 2 secondes
- 🎬 Animations à 60 FPS
- 🔍 Recherche instantanée (< 100ms)
- 📦 Code splitting automatique

### Expérience Utilisateur
- 🎨 Design moderne et professionnel
- ✨ Animations fluides et naturelles
- 🖱️ Feedback visuel sur tous les éléments interactifs
- 📱 Interface responsive et accessible
- 🎙️ Interactions vocales (dictée et lecture)

### Intelligence Artificielle
- 🚀 Génération de pitch en streaming ultra-rapide (Groq)
- 🎯 Recommandations basées sur l'analyse de données en temps réel
- 💬 Coach IA avec impact business quantifié
- 🔊 Lecture vocale en français naturel
- 🧠 Justifications IA détaillées pour chaque action
- 📊 Scoring multi-critères (urgence, impact, probabilité)

### "Talk to My Data"
- 🔄 Toutes les recommandations sont dynamiques
- 📈 Aucune valeur en dur - tout est calculé
- 📊 **Graphiques générés à la demande** dans le Coach IA
- 🔗 Interconnexions profondes entre tous les modules
- 💾 Persistance des données utilisateur

## 📸 Captures d'Écran

### Dashboard
![Dashboard avec KPIs, recommandations IA et graphiques de performance]

### Next Best Actions
![Interface des actions prioritaires avec justifications IA détaillées]

### Compte-Rendu Vocal
![Dictée vocale avec extraction automatique des informations]

### Générateur de Pitch
![Interface de génération avec streaming en temps réel]

### Coach IA
![Conversation avec recommandations personnalisées]

## 🤝 Contribution

Projet développé pour **Air Liquide Santé** en collaboration avec **Capgemini**.

### Guidelines
- Code TypeScript strict
- Commits conventionnels (feat, fix, docs, etc.)
- Tests avant merge sur main
- Documentation à jour

## 📝 Changelog

### Version 1.1.0 (Février 2026)
- ✅ **Coach IA "Talk to My Data"** : Génération de graphiques à la demande (barres, camemberts, courbes)
- ✅ **Mes Actions simplifiées** : Top 12 actions prioritaires avec scores expliqués
- ✅ **Compte-Rendu de Visite** : Dictée vocale OU saisie texte au choix
- ✅ **Coach IA enrichi** : Intègre désormais Data Explorer pour les analyses
- ✅ **Store persistant** : Sauvegarde des rapports, notes et actions
- ✅ **NotesTab enrichi** : 3 sections (Notes, Comptes-rendus, Actions IA)
- ✅ **Barre de commandes** : Recherche universelle avec Cmd+K
- ✅ **Optimisation Tournée** : Assistant pas-à-pas avec calcul de bénéfices
- ✅ **Navigation simplifiée** : Moins d'outils, plus de clarté

### Version 1.0.0 (Janvier 2026)
- ✅ Landing page professionnelle Air Liquide
- ✅ Dashboard avec KPIs et recommandations IA
- ✅ Gestion complète des praticiens (150 profils)
- ✅ Recherche et filtres avancés
- ✅ Générateur de pitch IA avec Groq (streaming + TTS)
- ✅ Coach IA conversationnel avec impact business
- ✅ Système de notifications
- ✅ Page de paramètres
- ✅ Déploiement Vercel ready

## 📄 Licence

Tous droits réservés.

## 🆘 Support

Pour toute question ou problème technique :
- 📚 Documentation complète : Voir `/docs` (à venir)
- 🐛 Issues : GitHub Issues

---

**ARIA v1.1.0** - Air Liquide Intelligent Assistant
Développé avec ❤️ pour Air Liquide Santé
