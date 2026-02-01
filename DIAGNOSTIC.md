# 🔍 Diagnostic Problème API Groq

## Symptômes
- Coach IA ne répond pas
- Pitch Generator ne fonctionne pas
- Clé API confirmée valide : `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`

## Hypothèses testées

### ❌ Hypothèse 1: Prompts trop longs
- **Test**: Simplifié de 5000 → 200 tokens (commit 1a51fcf)
- **Résultat**: Problème persiste
- **Conclusion**: Pas la cause racine

### ❓ Hypothèse 2: Variable d'environnement non chargée
- **Cause possible**: Vercel ne build pas avec VITE_GROQ_API_KEY
- **Impact**: `import.meta.env.VITE_GROQ_API_KEY` = `undefined`
- **Validation**: Line 29 useGroq.ts vérifie `isApiKeyValid`

### ❓ Hypothèse 3: Problème CORS/réseau
- **Symptôme**: Fetch échoue silencieusement
- **Validation**: Logs console montreraient "Groq API Error: ..."

### ❓ Hypothèse 4: Format de message incorrect
- **AICoach.tsx**: Envoie `[{ role: 'user', content: simplePrompt }]`
- **PitchGenerator.tsx**: Envoie `[{ role: 'system', ...}, { role: 'user', ... }]`
- **API Groq**: Accepte les deux formats

## Code actuel

### useGroq.ts (line 26-29)
```typescript
const apiKey = import.meta.env.VITE_GROQ_API_KEY;

// Vérifier si la clé API est configurée
const isApiKeyValid = apiKey && apiKey !== 'your_groq_api_key_here' && apiKey.length > 10;
```

**Problème potentiel**: Si `apiKey === undefined`, alors `isApiKeyValid = false`

### AICoach.tsx (line 167-182)
```typescript
const kolsCount = practitioners.filter(p => p.isKOL).length;
const totalVolume = practitioners.reduce((sum, p) => sum + p.volumeL, 0);

const simplePrompt = `Tu es ARIA, coach IA pour délégué pharmaceutique Air Liquide.

CONTEXTE TERRITOIRE :
- ${practitioners.length} praticiens (${kolsCount} KOLs)
- Volume total: ${(totalVolume / 1000000).toFixed(1)}M L/an

QUESTION : ${question}

Réponds de manière concise et professionnelle avec des recommandations concrètes.`;

aiResponse = await complete([
  { role: 'user', content: simplePrompt }
]);
```

**Problème potentiel**: `complete()` retourne `null` sans log d'erreur

## Actions de diagnostic recommandées

1. **Vérifier console navigateur** sur Vercel:
   - Ouvrir F12
   - Tester Coach IA
   - Chercher "Groq API Error:" dans console

2. **Vérifier build Vercel**:
   - Settings → Environment Variables
   - Confirmer `VITE_GROQ_API_KEY` présente pour Production
   - Redéployer après confirmation

3. **Tester avec logging exhaustif**:
   - Ajouter `console.log()` à chaque étape
   - Identifier exactement où ça échoue

4. **Test local**:
   - Créer `.env.local` avec la clé
   - `npm run build && npm run dev`
   - Tester si ça fonctionne localement

## Solution probable

Le problème est probablement que **la variable VITE_GROQ_API_KEY n'est pas injectée dans le build Vercel**.

Vite injecte les variables `VITE_*` AU MOMENT DU BUILD, pas au runtime.

Si la variable n'était pas définie PENDANT `npm run build`, elle sera `undefined` dans le code buildé.

### Fix:
1. Vercel → Settings → Environment Variables
2. Ajouter `VITE_GROQ_API_KEY` pour Production/Preview/Development
3. Deployments → ... → Redeploy (rebuild avec la variable)
