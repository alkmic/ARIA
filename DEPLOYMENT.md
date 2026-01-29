# 🚀 Guide de Déploiement ARIA

## Résumé des Tests ✅

Tous les tests ont été effectués avec succès :

- ✅ **Structure des fichiers** : Tous les fichiers critiques présents
- ✅ **TypeScript** : Compilation sans erreurs (`tsc --noEmit`)
- ✅ **Données** : 150 praticiens (100 médecins généralistes, 50 pneumologues)
- ✅ **Routes** : 5 routes React Router configurées
- ✅ **Configuration** : .env avec clé Groq API configurée
- ✅ **Hooks** : useGroq et useSpeech fonctionnels
- ✅ **Build** : Production build réussi (13.64s)
- ✅ **Dev Server** : Démarre correctement

---

## Option 1 : Déploiement sur Vercel (RECOMMANDÉ) 🌐

### Avantages
- ✅ **Gratuit** pour les projets personnels
- ✅ **Automatique** : Deploy à chaque push sur GitHub
- ✅ **HTTPS** inclus avec certificat SSL
- ✅ **CDN global** pour performances optimales
- ✅ **Variables d'environnement** sécurisées

### Étapes de déploiement

#### 1️⃣ Créer un compte Vercel
```bash
# Aller sur https://vercel.com
# S'inscrire avec votre compte GitHub
```

#### 2️⃣ Installer Vercel CLI (optionnel)
```bash
npm install -g vercel
```

#### 3️⃣ Méthode A : Via l'interface Vercel (PLUS SIMPLE)

1. Aller sur https://vercel.com/new
2. Importer votre repository GitHub `alkmic/ARIA`
3. Configurer les variables d'environnement :
   - Cliquer sur "Environment Variables"
   - Ajouter : `VITE_GROQ_API_KEY` = `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`
4. Cliquer sur "Deploy"
5. ✅ Votre site sera disponible à `https://aria-[random].vercel.app`

#### 3️⃣ Méthode B : Via CLI

```bash
# Depuis le dossier ARIA
vercel

# Suivre les instructions :
# ? Set up and deploy "~/ARIA"? [Y/n] y
# ? Which scope? Votre username
# ? Link to existing project? [y/N] n
# ? What's your project's name? aria
# ? In which directory is your code located? ./

# Configurer la variable d'environnement
vercel env add VITE_GROQ_API_KEY

# Déployer en production
vercel --prod
```

#### 4️⃣ Variables d'environnement sur Vercel

**IMPORTANT** : N'oubliez pas d'ajouter la clé Groq API dans Vercel !

- Via l'interface : Settings → Environment Variables
- Nom : `VITE_GROQ_API_KEY`
- Valeur : `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`
- Environnement : Production, Preview, Development (cocher les 3)

---

## Option 2 : Déploiement en Local 💻

### Pour tester localement

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer le serveur de développement
npm run dev

# 3. Ouvrir dans le navigateur
# http://localhost:5173
```

### Pour build et preview

```bash
# Build pour production
npm run build

# Preview du build
npm run preview

# Ouvrir dans le navigateur
# http://localhost:4173
```

---

## Option 3 : Autres plateformes gratuites

### Netlify
```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Déployer
netlify deploy --prod

# Configurer les variables d'environnement
netlify env:set VITE_GROQ_API_KEY "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"
```

### GitHub Pages (limité - pas de variables d'env côté serveur)
⚠️ **Non recommandé** car les variables d'environnement seront exposées dans le build

---

## Configuration des Routes (SPA)

Le fichier `vercel.json` est déjà configuré pour gérer le routing React Router :

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Cela permet d'accéder directement aux routes :
- `/` → Dashboard
- `/practitioners` → Liste des praticiens
- `/practitioner/:id` → Fiche praticien
- `/pitch` → Générateur de pitch
- `/coach` → Coach IA

---

## Vérifications Post-Déploiement ✅

Une fois déployé, vérifiez que :

1. ✅ Le dashboard s'affiche correctement
2. ✅ Les 150 praticiens sont visibles dans `/practitioners`
3. ✅ Cliquer sur un praticien ouvre sa fiche détaillée
4. ✅ Le générateur de pitch génère du contenu (test de Groq API)
5. ✅ La lecture vocale fonctionne (TTS)
6. ✅ Le coach IA répond aux questions
7. ✅ Les graphiques Recharts s'affichent
8. ✅ Les animations Framer Motion sont fluides

---

## Troubleshooting 🔧

### Erreur : "Groq API key not found"
→ Vérifiez que `VITE_GROQ_API_KEY` est bien configurée dans Vercel

### Erreur : "404 on page refresh"
→ Vérifiez que `vercel.json` est bien présent avec la configuration des rewrites

### Build échoue
→ Vérifiez que toutes les dépendances sont dans `package.json`
→ Lancez `npm install` puis `npm run build` en local

### Pitch Generator ne génère rien
→ Vérifiez la clé API Groq dans les variables d'environnement
→ Ouvrez la console du navigateur pour voir les erreurs

---

## Recommandation Finale 🎯

**Pour montrer ARIA comme un site web professionnel :**

👉 **Utilisez Vercel** (Option 1, Méthode A)

**Temps estimé : 5 minutes**

1. Créer compte sur vercel.com (1 min)
2. Importer le repo GitHub (1 min)
3. Ajouter la variable d'env VITE_GROQ_API_KEY (1 min)
4. Deploy automatique (2 min)

✅ Vous obtiendrez un URL public HTTPS que vous pourrez partager immédiatement !

Exemple : `https://aria-air-liquide.vercel.app`
