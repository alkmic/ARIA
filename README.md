# 🤖 ARIA - Air Liquide Intelligent Assistant

## 📋 Description

ARIA est un démonstrateur d'intelligence artificielle conçu pour Air Liquide Santé. L'application aide les délégués pharmaceutiques à optimiser leurs interactions avec les professionnels de santé spécialisés en oxygénothérapie BPCO.

**Partie 1/3 : FOUNDATION & DASHBOARD** ✅

## ✨ Fonctionnalités

### 🏠 Dashboard Principal
- **KPIs animés** : Visites, objectifs, nouveaux prescripteurs, fidélité moyenne
- **Recommandations IA** : Insights personnalisés en temps réel
- **Visites du jour** : Liste des rendez-vous programmés
- **Praticiens prioritaires** : Top 10 des médecins à contacter en urgence
- **Graphique de performance** : Évolution des volumes sur 12 mois

### 👥 Gestion des Praticiens
- **150 praticiens fictifs** de qualité (100 MG + 50 Pneumologues)
- Recherche en temps réel
- Filtrage avancé par spécialité, vingtile, département, risque
- Profils détaillés avec historique et IA

### ✨ Générateur de Pitch IA (Preview)
Interface pour générer des arguments de vente personnalisés

### 💬 Coach IA (Preview)
Assistant conversationnel pour conseils et formation

## 🎨 Design System

### Couleurs Air Liquide
- **Primary Blue**: `#0066B3`
- **Navy**: `#003366`
- **Teal**: `#00B5AD`
- **Sky**: `#00A3E0`

### Typographie
- **Font**: Plus Jakarta Sans
- **Mono**: JetBrains Mono

### Composants UI
- Glass cards avec backdrop blur
- Animations Framer Motion
- Tailwind CSS utilities
- Graphiques Recharts

## 🚀 Installation

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build pour production
npm run build

# Preview du build
npm run preview
```

L'application sera accessible sur **http://localhost:5173**

## 📂 Structure du Projet

```
src/
├── components/
│   ├── layout/          # Sidebar, Header, Layout
│   ├── dashboard/       # StatCard, AIInsights, PerformanceChart
│   ├── ui/              # Button, Card, Badge, Avatar, etc.
│   └── shared/          # AnimatedNumber
├── pages/
│   ├── Dashboard.tsx
│   ├── HCPProfile.tsx
│   ├── PitchGenerator.tsx
│   └── AICoach.tsx
├── data/
│   └── practitioners.json    # 150 praticiens
├── stores/
│   └── useAppStore.ts        # Zustand store
├── types/
│   └── index.ts
└── utils/
    ├── helpers.ts
    └── generatePractitioners.ts
```

## 🛠️ Stack Technique

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 3.4
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 📊 Données

### Praticiens (150)
- **100 Médecins Généralistes** : Vingtiles 1-10, volumes 1K-10K L/an
- **50 Pneumologues** : Vingtiles 1-5, volumes 200K-537K L/an
- **15 KOLs** (10% des praticiens)
- Répartition géographique : Ain (01), Rhône (69), Isère (38)

### Données mockées
- Historique des visites
- Conversations passées
- Insights IA
- Métriques de performance

## 🎯 Points Clés pour la Démo

### Performance
- Chargement < 2 secondes
- Animations à 60fps
- Recherche instantanée

### Visuellement Impressionnant
- Design moderne et professionnel
- Animations fluides (compteurs, transitions)
- Glass morphism et gradients
- Composants interactifs

### Données Réalistes
- Noms français variés
- Adresses cohérentes
- Volumes médicaux crédibles
- Historiques détaillés

## 🔜 Prochaines Parties

**Partie 2/3** : Intégration Groq API + Générateur de Pitch
**Partie 3/3** : Coach IA conversationnel + Finalisation

## 📝 Notes de Développement

### Modifications Techniques
- Migration Tailwind CSS v4 → v3.4 pour stabilité
- Correction des imports TypeScript (`import type`)
- Configuration PostCSS adaptée

### Points d'Attention
- Les données sont mockées (JSON statique)
- Les fonctionnalités IA (Pitch, Coach) sont des interfaces preview
- Optimisé pour iPad Pro 12.9" et desktop

## 📸 Captures d'Écran

Le dashboard affiche :
- 4 cartes KPI animées avec progression
- 4 insights IA en scroll horizontal
- Liste des visites du jour (3 visites)
- Top 3 praticiens prioritaires
- Graphique performance 12 mois

## 🤝 Contribution

Projet de démonstration pour Air Liquide Santé via Capgemini.

---

**Version**: 1.0.0 (Partie 1/3)
**Date**: Janvier 2026
**Auteur**: Claude (Anthropic)
