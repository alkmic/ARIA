# Configuration des Fonctions IA

## ⚠️ Problème Identifié

Les fonctions IA (Pitch Generator, Coach IA) ne fonctionnent pas car **la clé API Groq n'est pas configurée**.

## 🔧 Solution - Configuration de la clé API Groq

### 1. Obtenir une clé API Groq

1. Allez sur [https://console.groq.com](https://console.groq.com)
2. Créez un compte (gratuit)
3. Générez une clé API

### 2. Créer le fichier .env

Dans le répertoire racine du projet (`/home/user/ARIA`), créez un fichier `.env` :

```bash
# Copier le fichier example
cp .env.example .env

# Ou créer directement
echo "VITE_GROQ_API_KEY=votre_cle_api_ici" > .env
```

### 3. Ajouter votre clé

Ouvrez le fichier `.env` et remplacez `your_groq_api_key_here` par votre vraie clé API :

```env
# Groq API Configuration
VITE_GROQ_API_KEY=gsk_votre_vraie_cle_ici
```

### 4. Redémarrer le serveur

```bash
# Arrêter le serveur (Ctrl+C)
# Relancer
npm run dev
```

## ✅ Vérification

Une fois configuré, les fonctionnalités suivantes fonctionneront:

- **Pitch Generator** (`/pitch`) : Génération de pitches personnalisés avec streaming
- **Coach IA** (`/coach`) : Recommandations intelligentes
- **Régénération de sections** : Affinage des pitches

## 📊 Dashboards Créés

Tous les dashboards demandés sont bien présents et fonctionnels:

### Dashboard Principal (`/dashboard`)
1. ✅ **NationalStats** - Statistiques France vs Territoire
2. ✅ **SpecialtyBreakdown** - Répartition Pneumologues/Généralistes
3. ✅ **VingtileDistribution** - Distribution par vingtile avec filtres

### Nouvelles Pages
4. ✅ **TerritoryMap** (`/map`) - Carte interactive Leaflet
5. ✅ **ManagerDashboard** (`/manager`) - Vue équipe
6. ✅ **Fiche Praticien** - 5 onglets (Synthèse, Historique, Métriques, Actualités, Notes)

## 🚀 Fonctionnalités Testées

### Sans clé API (fonctionnel)
- ✅ Dashboard avec statistiques
- ✅ Carte du territoire
- ✅ Dashboard Manager
- ✅ Fiches praticiens
- ✅ Navigation

### Avec clé API (nécessite configuration)
- ⚠️ Pitch Generator (attend clé Groq)
- ⚠️ Coach IA (attend clé Groq)

## 💡 Note Importante

Le fichier `.env` est dans `.gitignore` et ne sera **jamais committé** pour des raisons de sécurité. C'est normal et souhaité.

## 🔍 Dépannage

Si les fonctions IA ne fonctionnent toujours pas après configuration:

1. Vérifiez que le fichier `.env` est à la racine du projet
2. Vérifiez que la variable commence bien par `VITE_` (requis pour Vite)
3. Redémarrez complètement le serveur de dev
4. Ouvrez la console du navigateur pour voir les erreurs éventuelles
5. Vérifiez que votre clé API est valide sur console.groq.com

## ✨ Tout le Reste Fonctionne

Toutes les améliorations UI/UX sont fonctionnelles sans clé API:
- SplashScreen avec animations
- Cartes avec glassmorphism amélioré
- Micro-interactions
- Carte interactive
- Nouveaux dashboards
- Onglets étendus sur les fiches
