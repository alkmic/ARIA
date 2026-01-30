# 🤖 ARIA - Air Liquide Intelligent Assistant

## 📋 À propos

ARIA (Air Liquide Intelligent Assistant) est une application web intelligente conçue pour Air Liquide Santé. Elle aide les délégués pharmaceutiques à optimiser leurs interactions avec les professionnels de santé spécialisés en oxygénothérapie et traitement des maladies respiratoires chroniques (BPCO).

L'application combine intelligence artificielle, analyse de données et interface utilisateur moderne pour fournir des recommandations personnalisées, générer des pitchs de vente sur mesure et offrir un coaching stratégique en temps réel.

## ✨ Fonctionnalités Principales

### 🏠 Dashboard Intelligent
- **KPIs animés en temps réel** : Suivi des visites mensuelles, objectifs, nouveaux prescripteurs et fidélité moyenne
- **Recommandations IA** : Insights personnalisés basés sur l'analyse des données terrain
- **Visites du jour** : Agenda intelligent avec praticiens prioritaires
- **Graphiques de performance** : Évolution des volumes d'oxygène sur 12 mois (Recharts)
- **Notifications contextuelles** : Alertes et rappels en drawer latéral

### 👥 Gestion Complète des Praticiens
- **Base de 150 praticiens** réalistes (100 médecins généralistes + 50 pneumologues)
- **Recherche instantanée** : Filtrage en temps réel par nom, ville, spécialité
- **Filtres avancés** :
  - Spécialité (Pneumologue / Médecin généraliste)
  - Vingtile (Top 5%, Top 10%, etc.)
  - Niveau de risque (Faible, Moyen, Élevé)
  - Statut KOL (Key Opinion Leader)
- **Fiches détaillées** avec 3 onglets :
  - Synthèse IA : Points clés, battlecards concurrentielles, prochaine action
  - Historique : Timeline des visites avec sentiments et notes
  - Métriques : Graphiques d'évolution des volumes

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

### 💬 Coach IA Conversationnel
- **Questions suggérées** pour démarrage rapide
- **Analyse stratégique** avec impact sur les objectifs de vente :
  - Praticiens à voir en priorité
  - KOLs non visités depuis 60+ jours
  - Stratégies pour atteindre les objectifs mensuels
  - Praticiens à risque de churn
  - Opportunités nouveaux prescripteurs
- **Recommandations cliquables** : Navigation directe vers les fiches praticiens
- **Envoi par touche Entrée** pour une expérience conversationnelle fluide

### 🎨 Landing Page Professionnelle
- **Design immersif** aux couleurs Air Liquide
- **Animations fluides** : Fond animé évoquant l'air et l'oxygène
- **Présentation des fonctionnalités** : Coach IA, Pitch Generator, Analytics
- **Call-to-Action central** : "Lancer l'expérience"

### ⚙️ Paramètres & Notifications
- **Gestion de profil** : Informations utilisateur
- **Préférences de notifications** : Alertes personnalisables
- **Drawer de notifications** : Accès rapide aux alertes prioritaires

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
│   │   └── ui/                  # Button, Card, Badge, Avatar, Skeleton, etc.
│   ├── pages/
│   │   ├── Landing.tsx          # Page d'accueil
│   │   ├── Dashboard.tsx        # Tableau de bord principal
│   │   ├── HCPProfile.tsx       # Liste des praticiens
│   │   ├── PractitionerProfile.tsx  # Fiche détaillée praticien
│   │   ├── PitchGenerator.tsx   # Générateur de pitch IA
│   │   ├── AICoach.tsx          # Coach conversationnel
│   │   └── Settings.tsx         # Paramètres utilisateur
│   ├── hooks/
│   │   ├── useGroq.ts           # Hook pour Groq API
│   │   └── useSpeech.ts         # Hook pour Text-to-Speech
│   ├── services/
│   │   ├── coachAI.ts           # Logique Coach IA
│   │   └── pitchPrompts.ts      # Prompts Groq
│   ├── data/
│   │   └── practitioners.json   # Base de 150 praticiens
│   ├── stores/
│   │   └── useAppStore.ts       # Zustand store
│   └── types/
│       ├── index.ts             # Types principaux
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
- **Zustand** : State management léger
- **Recharts** : Graphiques interactifs
- **date-fns** : Manipulation de dates

### Intelligence Artificielle
- **Groq API** : Génération de texte avec Llama 3.3 70B Versatile
- **Web Speech API** : Text-to-Speech natif du navigateur

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

### Intelligence Artificielle
- 🚀 Génération de pitch en streaming ultra-rapide (Groq)
- 🎯 Recommandations basées sur l'analyse de données
- 💬 Coach IA avec impact business quantifié
- 🔊 Lecture vocale en français naturel

## 📸 Captures d'Écran

### Dashboard
![Dashboard avec KPIs, recommandations IA et graphiques de performance]

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

**ARIA v1.0.0** - Air Liquide Intelligent Assistant
Développé avec ❤️ pour Air Liquide Santé
