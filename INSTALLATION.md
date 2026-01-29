# 🚀 Guide de Démarrage ARIA

## ✅ Ce qui a été créé

### 📂 Structure Complète
```
ARIA/
├── src/
│   ├── components/
│   │   ├── layout/          # Navigation (Sidebar, Header, Layout)
│   │   ├── dashboard/       # Composants Dashboard
│   │   ├── ui/              # Composants UI réutilisables
│   │   └── shared/          # AnimatedNumber
│   ├── pages/               # 4 pages (Dashboard, Praticiens, Pitch, Coach)
│   ├── data/                # 150 praticiens (268KB JSON)
│   ├── stores/              # Zustand store
│   ├── types/               # Définitions TypeScript
│   └── utils/               # Helpers et générateurs
├── public/
├── tailwind.config.js       # Config Design System Air Liquide
├── postcss.config.js
└── package.json
```

### 📊 Fichiers Créés (41 fichiers)

**Configuration (7):**
- package.json + package-lock.json
- tsconfig.json + tsconfig.app.json + tsconfig.node.json
- tailwind.config.js + postcss.config.js
- vite.config.ts + eslint.config.js

**Composants (15):**
- Layout: Sidebar, Header, Layout
- Dashboard: StatCard, AIInsights, UpcomingVisits, PerformanceChart
- UI: Button, Card, Badge, Avatar, SearchBar, LoadingSpinner
- Shared: AnimatedNumber

**Pages (4):**
- Dashboard.tsx (page principale)
- HCPProfile.tsx (liste praticiens)
- PitchGenerator.tsx (preview)
- AICoach.tsx (preview)

**Data & Logic (5):**
- practitioners.json (150 praticiens)
- useAppStore.ts (Zustand)
- types/index.ts
- utils/helpers.ts
- utils/generatePractitioners.ts

## 🏃 Comment Lancer

### 1. Installation (déjà fait)
```bash
npm install
```

### 2. Lancer le serveur
```bash
npm run dev
```

L'application sera accessible sur: **http://localhost:5173**

### 3. Build pour production
```bash
npm run build
npm run preview
```

## 🎮 Navigation

1. **Dashboard** 🏠 - Page principale avec KPIs et graphiques
2. **Praticiens** 👥 - Liste des 150 praticiens
3. **Pitch IA** ✨ - Générateur de pitchs (preview)
4. **Coach IA** 💬 - Assistant conversationnel (preview)

## 🎨 Design System

### Couleurs Air Liquide
- Blue Primary: #0066B3
- Navy: #003366
- Teal: #00B5AD
- Sky: #00A3E0

### Animations
- Compteurs animés (0 → valeur finale)
- Transitions fluides entre pages
- Hover effects sur les cartes
- Scroll horizontal pour insights

## 📊 Données Disponibles

### 150 Praticiens
- 100 Médecins Généralistes (1K-10K L/an)
- 50 Pneumologues (200K-537K L/an)
- 15 KOLs (leaders d'opinion)
- Départements: 01, 69, 38

### Chaque praticien contient:
- Informations de contact
- Métriques (volume, vingtile, patients)
- Historique des visites
- Conversations passées
- Score de fidélité
- Recommandations IA

## ✅ Checklist de Validation

- [x] Application compile sans erreur
- [x] Serveur dev se lance correctement
- [x] Build production fonctionne
- [x] 150 praticiens chargés
- [x] Navigation fonctionnelle
- [x] Recherche en temps réel
- [x] Animations fluides
- [x] Design Air Liquide appliqué
- [x] Responsive (desktop/tablet)
- [x] Git commit + push effectués

## 🐛 Troubleshooting

### Port 5173 déjà utilisé
```bash
# Changer le port dans vite.config.ts
export default defineConfig({
  server: { port: 3000 }
})
```

### Erreurs de compilation
```bash
# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
```

### Problèmes d'affichage
- Vider le cache du navigateur (Cmd+Shift+R / Ctrl+Shift+R)
- Vérifier que Tailwind CSS compile correctement

## 📝 Prochaines Étapes

**Partie 2/3** : Intégration Groq API
- Connexion à l'API Groq
- Générateur de pitch fonctionnel
- Analyse de profils en temps réel

**Partie 3/3** : Coach IA + Finalisation
- Chat conversationnel
- Conseils personnalisés
- Polissage final

---

**Questions ?** Consultez le README.md principal
**Version :** 1.0.0 (Partie 1/3)
