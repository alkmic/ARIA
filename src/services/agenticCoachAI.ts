/**
 * Coach IA Agentic - Approche avancée avec routing intelligent
 * Utilise les meilleures pratiques de prompt engineering et AI agents
 */

import type { Practitioner } from '../types';
import { DataService } from './dataService';

interface AgenticResponse {
  systemPrompt: string;
  userPrompt: string;
  contextData?: any;
}

/**
 * Détecte l'intent de la question utilisateur
 */
export function detectIntent(question: string): string {
  const q = question.toLowerCase();

  // Recherche de praticien spécifique
  if (q.includes('qui est') || q.includes('parle-moi de') || q.includes('dr ') || q.includes('docteur')) {
    return 'practitioner_info';
  }

  // KOLs
  if (q.includes('kol') || q.includes('leader') || q.includes('opinion')) {
    return 'kol_management';
  }

  // Priorités / Planning
  if (q.includes('priorité') || q.includes('voir en premier') || q.includes('visiter')) {
    return 'visit_priority';
  }

  // Objectifs
  if (q.includes('objectif') || q.includes('atteindre')) {
    return 'objective_strategy';
  }

  // Risques / Churn
  if (q.includes('risque') || q.includes('churn') || q.includes('perdre') || q.includes('danger')) {
    return 'risk_assessment';
  }

  // Opportunités
  if (q.includes('opportunité') || q.includes('potentiel') || q.includes('nouveau')) {
    return 'opportunity_detection';
  }

  // Top performers / Meilleurs
  if (q.includes('top') || q.includes('meilleur') || q.includes('gros prescripteur') || q.includes('plus')) {
    return 'top_performers';
  }

  // Analyse / Stats
  if (q.includes('analys') || q.includes('statistique') || q.includes('combien') || q.includes('quel')) {
    return 'analytics';
  }

  // Territoire
  if (q.includes('territoire') || q.includes('région') || q.includes('zone')) {
    return 'territory_analysis';
  }

  return 'general';
}

/**
 * Construit le contexte optimal selon l'intent
 */
export function buildAgenticContext(question: string, practitioners: Practitioner[]): AgenticResponse {
  const intent = detectIntent(question);
  const today = new Date().toISOString().split('T')[0];

  // Stats globales
  const totalPractitioners = practitioners.length;
  const kolsCount = practitioners.filter(p => p.isKOL).length;
  const totalVolume = practitioners.reduce((sum, p) => sum + p.volumeL, 0);
  const avgLoyalty = practitioners.reduce((sum, p) => sum + p.loyaltyScore, 0) / totalPractitioners;

  switch (intent) {
    case 'practitioner_info': {
      // Recherche floue du praticien mentionné
      const searchResults = DataService.fuzzySearchPractitioner(question);
      const mentionedPractitioner = searchResults?.[0]; // Premier résultat

      if (mentionedPractitioner && 'id' in mentionedPractitioner) {
        const fullContext = DataService.getCompletePractitionerContext((mentionedPractitioner as any).id);

        return {
          systemPrompt: `Tu es ARIA (Air Liquide Intelligent Assistant), un coach IA expert pour délégués pharmaceutiques.

**RÔLE** : Tu fournis des informations détaillées et actionnables sur les praticiens.

**STYLE** :
- Structuré avec des sections claires
- Données factuelles et précises
- Recommandations stratégiques concrètes
- Format Markdown (## titres, **gras**, listes)

**CONTEXTE PRATICIEN** :
${fullContext}

**INSTRUCTIONS** :
1. Résume les points clés du praticien (spécialité, volume, fidélité, KOL)
2. Analyse son historique de visites et notes
3. Identifie ses actualités/publications pertinentes
4. Propose une stratégie d'engagement personnalisée
5. Suggère des angles de discussion (produits, besoins)

Réponds de manière professionnelle et structurée en Markdown.`,
          userPrompt: question,
          contextData: mentionedPractitioner,
        };
      }

      return {
        systemPrompt: baseSystemPrompt(),
        userPrompt: `${question}\n\nCONTEXTE : ${totalPractitioners} praticiens (${kolsCount} KOLs)`,
      };
    }

    case 'kol_management': {
      const kols = practitioners.filter(p => p.isKOL);
      const undervisitedKOLs = kols.filter(p => {
        if (!p.lastVisitDate) return true;
        const daysSince = Math.floor((new Date().getTime() - new Date(p.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince > 90;
      });

      const kolsData = undervisitedKOLs.slice(0, 10).map(p => ({
        nom: `${p.title} ${p.firstName} ${p.lastName}`,
        spécialité: p.specialty,
        ville: p.city,
        volume: `${Math.round(p.volumeL / 1000)}K L/an`,
        vingtile: p.vingtile,
        dernièreVisite: p.lastVisitDate || 'Jamais',
        joursSansVisite: p.lastVisitDate
          ? Math.floor((new Date().getTime() - new Date(p.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
          : 999,
      }));

      return {
        systemPrompt: `Tu es ARIA, coach IA spécialisé dans la gestion des KOLs (Key Opinion Leaders).

**DONNÉES KOLS** :
- Total KOLs: ${kolsCount}
- KOLs sous-visités (>90j): ${undervisitedKOLs.length}
- Volume total KOLs: ${Math.round(kols.reduce((sum, p) => sum + p.volumeL, 0) / 1000)}K L/an

**TOP 10 KOLs SOUS-VISITÉS** :
${JSON.stringify(kolsData, null, 2)}

**INSTRUCTIONS** :
1. Liste les KOLs prioritaires avec leurs délais
2. Explique l'impact business de les revoir
3. Propose un ordre de visite optimal
4. Suggère des angles d'approche personnalisés

Format Markdown structuré.`,
        userPrompt: question,
        contextData: { kols: undervisitedKOLs },
      };
    }

    case 'visit_priority': {
      const priorityPractitioners = practitioners
        .map(p => {
          const daysSinceVisit = p.lastVisitDate
            ? Math.floor((new Date().getTime() - new Date(p.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          const priorityScore =
            p.vingtile * -1 + // Plus le vingtile est bas, plus c'est prioritaire
            (p.isKOL ? 50 : 0) + // Bonus KOL
            (p.riskLevel === 'high' ? 30 : p.riskLevel === 'medium' ? 15 : 0) + // Risque churn
            daysSinceVisit / 3; // Temps depuis dernière visite

          return { ...p, priorityScore, daysSinceVisit };
        })
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 15);

      const priorityData = priorityPractitioners.map(p => ({
        nom: `${p.title} ${p.firstName} ${p.lastName}`,
        ville: p.city,
        spécialité: p.specialty,
        volume: `${Math.round(p.volumeL / 1000)}K L/an`,
        vingtile: p.vingtile,
        KOL: p.isKOL ? 'Oui' : 'Non',
        risque: p.riskLevel,
        dernièreVisite: `${p.daysSinceVisit}j`,
        scorePriorité: Math.round(p.priorityScore),
      }));

      return {
        systemPrompt: `Tu es ARIA, expert en optimisation de tournées et priorisation.

**TOP 15 PRATICIENS PRIORITAIRES** (par score) :
${JSON.stringify(priorityData, null, 2)}

**CRITÈRES DE PRIORISATION** :
- Vingtile (1-5 = top prescripteurs)
- Statut KOL
- Risque de churn
- Délai depuis dernière visite

**INSTRUCTIONS** :
1. Présente le top 5 avec justification
2. Groupe par zone géographique si possible
3. Propose un ordre de visite optimal (journée type)
4. Identifie les quick wins

Format Markdown avec tableaux si pertinent.`,
        userPrompt: question,
        contextData: { priority: priorityPractitioners },
      };
    }

    case 'objective_strategy': {
      const currentVisits = 2; // Début février
      const monthlyObjective = 60;
      const remaining = monthlyObjective - currentVisits;
      const daysLeft = 28; // Février

      return {
        systemPrompt: `Tu es ARIA, coach stratégique en atteinte d'objectifs.

**SITUATION ACTUELLE** (${today}) :
- Visites réalisées: ${currentVisits}/${monthlyObjective}
- Visites restantes: ${remaining}
- Jours restants: ${daysLeft}
- Moyenne requise: ${(remaining / daysLeft).toFixed(1)} visites/jour
- Praticiens disponibles: ${totalPractitioners}
- KOLs à couvrir: ${kolsCount}

**INSTRUCTIONS** :
1. Analyse la faisabilité de l'objectif
2. Propose une stratégie jour par jour
3. Identifie les leviers d'optimisation
4. Suggère des groupements géographiques
5. Recommande un mix KOL/non-KOL optimal

Réponds de manière motivante et pragmatique en Markdown.`,
        userPrompt: question,
      };
    }

    case 'risk_assessment': {
      const atRisk = practitioners.filter(p => p.riskLevel === 'high');
      const riskData = atRisk.slice(0, 10).map(p => ({
        nom: `${p.title} ${p.firstName} ${p.lastName}`,
        volume: `${Math.round(p.volumeL / 1000)}K L/an`,
        fidélité: `${p.loyaltyScore}/10`,
        dernièreVisite: p.lastVisitDate || 'Inconnue',
        trend: p.trend,
      }));

      return {
        systemPrompt: `Tu es ARIA, analyste en rétention et gestion des risques.

**PRATICIENS À RISQUE ÉLEVÉ** : ${atRisk.length}
${JSON.stringify(riskData, null, 2)}

**FACTEURS DE RISQUE** :
- Fidélité < 6/10
- Trend négatif
- Délai depuis visite
- Volume en baisse

**INSTRUCTIONS** :
1. Présente les praticiens les plus critiques
2. Explique les signaux d'alerte pour chacun
3. Propose un plan de réactivation personnalisé
4. Suggère des actions immédiates

Format Markdown structuré.`,
        userPrompt: question,
        contextData: { atRisk },
      };
    }

    case 'opportunity_detection': {
      const opportunities = practitioners.filter(p =>
        p.riskLevel === 'low' &&
        p.loyaltyScore >= 7 &&
        p.trend !== 'down' &&
        p.vingtile <= 10
      );

      const oppData = opportunities.slice(0, 10).map(p => ({
        nom: `${p.title} ${p.firstName} ${p.lastName}`,
        volume: `${Math.round(p.volumeL / 1000)}K L/an`,
        potentiel: `+15%`, // Potentiel estimé
        fidélité: `${p.loyaltyScore}/10`,
        trend: p.trend,
      }));

      return {
        systemPrompt: `Tu es ARIA, expert en détection d'opportunités commerciales.

**OPPORTUNITÉS IDENTIFIÉES** : ${opportunities.length}
${JSON.stringify(oppData, null, 2)}

**CRITÈRES D'OPPORTUNITÉ** :
- Fidélité élevée (≥7/10)
- Trend positif ou stable
- Vingtile ≤10 (bon potentiel)
- Risque faible

**INSTRUCTIONS** :
1. Classe les opportunités par potentiel
2. Identifie les axes de développement (cross-sell, up-sell)
3. Propose des approches commerciales adaptées
4. Estime le ROI par praticien

Format Markdown avec recommandations actionnables.`,
        userPrompt: question,
        contextData: { opportunities },
      };
    }

    case 'top_performers': {
      const top = practitioners.slice(0, 15);
      const topData = top.map(p => ({
        nom: `${p.title} ${p.firstName} ${p.lastName}`,
        ville: p.city,
        volume: `${Math.round(p.volumeL / 1000)}K L/an`,
        vingtile: p.vingtile,
        KOL: p.isKOL,
        fidélité: `${p.loyaltyScore}/10`,
      }));

      return {
        systemPrompt: `Tu es ARIA, analyste performance commerciale.

**TOP 15 PRESCRIPTEURS** (par volume) :
${JSON.stringify(topData, null, 2)}

**STATS GLOBALES** :
- Volume total territoire: ${Math.round(totalVolume / 1000000)}M L/an
- Top 15 représentent: ${Math.round((top.reduce((s, p) => s + p.volumeL, 0) / totalVolume) * 100)}%
- Fidélité moyenne top: ${(top.reduce((s, p) => s + p.loyaltyScore, 0) / top.length).toFixed(1)}/10

**INSTRUCTIONS** :
1. Analyse la concentration du portefeuille
2. Identifie les patterns des top performers
3. Propose des stratégies de fidélisation
4. Suggère des références croisées

Format Markdown avec insights stratégiques.`,
        userPrompt: question,
        contextData: { topPerformers: top },
      };
    }

    case 'territory_analysis': {
      const byCity = practitioners.reduce((acc, p) => {
        acc[p.city] = (acc[p.city] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const bySpecialty = {
        pneumologues: practitioners.filter(p => p.specialty === 'Pneumologue').length,
        généralistes: practitioners.filter(p => p.specialty === 'Médecin généraliste').length,
      };

      return {
        systemPrompt: `Tu es ARIA, analyste territorial.

**TERRITOIRE RHÔNE-ALPES** :
- Praticiens totaux: ${totalPractitioners}
- KOLs: ${kolsCount}
- Volume total: ${Math.round(totalVolume / 1000000)}M L/an
- Fidélité moyenne: ${avgLoyalty.toFixed(1)}/10

**RÉPARTITION PAR VILLE** :
${JSON.stringify(byCity, null, 2)}

**RÉPARTITION PAR SPÉCIALITÉ** :
${JSON.stringify(bySpecialty, null, 2)}

**INSTRUCTIONS** :
1. Analyse la couverture géographique
2. Identifie les zones à fort potentiel
3. Détecte les zones sous-exploitées
4. Propose une stratégie territoriale optimale

Format Markdown avec cartes mentales.`,
        userPrompt: question,
      };
    }

    case 'analytics':
    default: {
      return {
        systemPrompt: baseSystemPrompt(),
        userPrompt: `${question}\n\n**CONTEXTE GÉNÉRAL** :\n- ${totalPractitioners} praticiens\n- ${kolsCount} KOLs\n- Volume total: ${Math.round(totalVolume / 1000000)}M L/an\n- Fidélité moyenne: ${avgLoyalty.toFixed(1)}/10`,
      };
    }
  }
}

function baseSystemPrompt(): string {
  return `Tu es ARIA (Air Liquide Intelligent Assistant), un coach IA expert pour délégués pharmaceutiques spécialisés en oxygénothérapie.

**RÔLE** :
- Conseiller stratégique sur les relations praticiens
- Analyste de données et détecteur d'opportunités
- Coach en optimisation de tournées et atteinte d'objectifs

**STYLE DE COMMUNICATION** :
- Professionnel mais accessible
- Structuré avec Markdown (## titres, **gras**, - listes, tableaux)
- Données chiffrées précises
- Recommandations actionnables et concrètes
- Ton encourageant et motivant

**CONTEXTE AIR LIQUIDE** :
- Secteur: Oxygénothérapie à domicile
- Produits: Concentrateurs, OLD, télésuivi, services 24/7
- Concurrents: Vivisol, Linde Healthcare, SOS Oxygène, Bastide

**INSTRUCTIONS** :
1. Réponds toujours en Markdown structuré
2. Fournis des chiffres précis issus du contexte
3. Propose des actions concrètes
4. Personnalise selon le praticien/situation
5. Sois concis mais complet (max 300 mots)

Réponds maintenant à la question de l'utilisateur avec ces guidelines.`;
}
