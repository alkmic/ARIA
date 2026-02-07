/**
 * Service de contexte de donnees pour le LLM
 * Genere un dump structuree de TOUTES les donnees du site
 * pour que le LLM puisse repondre a n'importe quelle question
 */

import { DataService } from './dataService';
import type { PractitionerProfile } from '../types/database';

/**
 * Genere le contexte complet de la base de donnees praticiens
 * Format compact mais exhaustif pour le LLM
 */
export function generateFullDataContext(): string {
  const allPractitioners = DataService.getAllPractitioners();
  const stats = DataService.getGlobalStats();

  const lines: string[] = [];

  // En-tete
  lines.push('=== BASE DE DONNEES ARIA - TERRITOIRE RHONE-ALPES ===');
  lines.push('');

  // Statistiques globales
  lines.push(`STATISTIQUES GLOBALES:`);
  lines.push(`- Total praticiens: ${stats.totalPractitioners}`);
  lines.push(`- Pneumologues: ${stats.pneumologues}`);
  lines.push(`- Médecins généralistes: ${stats.generalistes}`);
  lines.push(`- KOLs (Key Opinion Leaders): ${stats.totalKOLs}`);
  lines.push(`- Volume total annuel: ${(stats.totalVolume / 1000).toFixed(0)}K litres O2`);
  lines.push(`- Fidélité moyenne: ${stats.averageLoyalty.toFixed(1)}/10`);
  lines.push('');

  // Repartition par ville
  const byCity: Record<string, { count: number; pneumo: number; gp: number; kols: number; totalVolume: number }> = {};
  allPractitioners.forEach(p => {
    const city = p.address.city;
    if (!byCity[city]) byCity[city] = { count: 0, pneumo: 0, gp: 0, kols: 0, totalVolume: 0 };
    byCity[city].count++;
    if (p.specialty === 'Pneumologue') byCity[city].pneumo++;
    else byCity[city].gp++;
    if (p.metrics.isKOL) byCity[city].kols++;
    byCity[city].totalVolume += p.metrics.volumeL;
  });

  lines.push('REPARTITION PAR VILLE:');
  Object.entries(byCity)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([city, data]) => {
      lines.push(`- ${city}: ${data.count} praticiens (${data.pneumo} pneumo, ${data.gp} GP, ${data.kols} KOLs) - ${(data.totalVolume / 1000).toFixed(0)}K L/an`);
    });
  lines.push('');

  // Liste complete des praticiens
  lines.push('LISTE COMPLETE DES PRATICIENS:');
  lines.push('(Format: ID | Titre Prénom Nom | Spécialité | Ville | Volume L/an | Fidélité/10 | Vingtile | KOL | Risque | Dernière visite | Publications)');
  lines.push('');

  allPractitioners
    .sort((a, b) => b.metrics.volumeL - a.metrics.volumeL)
    .forEach(p => {
      const pubCount = p.news?.filter(n => n.type === 'publication').length || 0;
      const lastVisit = p.lastVisitDate
        ? new Date(p.lastVisitDate).toLocaleDateString('fr-FR')
        : 'Jamais';
      const daysSince = p.lastVisitDate
        ? Math.floor((Date.now() - new Date(p.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      lines.push(
        `${p.id} | ${p.title} ${p.firstName} ${p.lastName} | ${p.specialty} | ${p.address.city} | ` +
        `${p.metrics.volumeL} L/an | Fidélité:${p.metrics.loyaltyScore}/10 | V${p.metrics.vingtile} | ` +
        `${p.metrics.isKOL ? 'KOL' : '-'} | Risque:${p.metrics.churnRisk} | ` +
        `Visite:${lastVisit} (${daysSince}j) | ${pubCount} pub`
      );
    });

  lines.push('');

  // Publications detaillees
  const practitionersWithPubs = allPractitioners
    .filter(p => p.news?.some(n => n.type === 'publication'))
    .sort((a, b) => {
      const pubA = a.news?.filter(n => n.type === 'publication').length || 0;
      const pubB = b.news?.filter(n => n.type === 'publication').length || 0;
      return pubB - pubA;
    });

  if (practitionersWithPubs.length > 0) {
    lines.push('PUBLICATIONS PAR PRATICIEN:');
    practitionersWithPubs.forEach(p => {
      const pubs = p.news?.filter(n => n.type === 'publication') || [];
      lines.push(`- ${p.title} ${p.firstName} ${p.lastName} (${pubs.length} publications):`);
      pubs.forEach(pub => {
        lines.push(`  * "${pub.title}" (${new Date(pub.date).toLocaleDateString('fr-FR')})`);
      });
    });
    lines.push('');
  }

  // KOLs detailles
  const kols = allPractitioners.filter(p => p.metrics.isKOL);
  if (kols.length > 0) {
    lines.push('DETAILS KOLs:');
    kols.sort((a, b) => b.metrics.volumeL - a.metrics.volumeL).forEach(p => {
      const daysSince = p.lastVisitDate
        ? Math.floor((Date.now() - new Date(p.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      const pubCount = p.news?.filter(n => n.type === 'publication').length || 0;
      lines.push(
        `- ${p.title} ${p.firstName} ${p.lastName} | ${p.specialty} | ${p.address.city} | ` +
        `${(p.metrics.volumeL / 1000).toFixed(0)}K L/an | Fidélité:${p.metrics.loyaltyScore}/10 | V${p.metrics.vingtile} | ` +
        `Derniere visite: ${daysSince}j | ${pubCount} pub | Croissance:+${p.metrics.potentialGrowth}%`
      );
    });
    lines.push('');
  }

  // Notes de visite recentes
  lines.push('HISTORIQUE VISITES RECENT (dernieres notes):');
  const recentNotes: { practitioner: PractitionerProfile; note: PractitionerProfile['notes'][0] }[] = [];
  allPractitioners.forEach(p => {
    p.notes?.slice(0, 2).forEach(note => {
      recentNotes.push({ practitioner: p, note });
    });
  });
  recentNotes
    .sort((a, b) => new Date(b.note.date).getTime() - new Date(a.note.date).getTime())
    .slice(0, 30)
    .forEach(({ practitioner: p, note }) => {
      lines.push(`- ${p.title} ${p.firstName} ${p.lastName} (${new Date(note.date).toLocaleDateString('fr-FR')}): ${note.content.substring(0, 120)}`);
    });

  // Données utilisateur (comptes-rendus de visite et notes créés par l'utilisateur)
  // Ce bloc sera enrichi dynamiquement via injectUserData()
  lines.push('');
  lines.push('NOTES ET COMPTES-RENDUS UTILISATEUR:');
  lines.push('(Ces données sont ajoutées dynamiquement via la fonction injectUserData)');

  return lines.join('\n');
}

/**
 * Injecte les données utilisateur (notes et comptes-rendus) dans un contexte existant
 * Appelé depuis le composant qui a accès au store Zustand
 */
export function injectUserData(
  baseContext: string,
  userNotes: Array<{ practitionerId: string; content: string; type: string; createdAt: string }>,
  visitReports: Array<{ practitionerId: string; practitionerName: string; date: string; transcript: string; extractedInfo: { topics: string[]; sentiment: string; nextActions: string[]; keyPoints: string[] } }>
): string {
  const lines: string[] = [baseContext];

  // Replace the placeholder section
  const placeholderIdx = baseContext.indexOf('NOTES ET COMPTES-RENDUS UTILISATEUR:');
  if (placeholderIdx >= 0) {
    const before = baseContext.substring(0, placeholderIdx);
    lines.length = 0;
    lines.push(before);
  }

  if (userNotes.length > 0 || visitReports.length > 0) {
    lines.push('NOTES ET COMPTES-RENDUS UTILISATEUR (données récentes):');

    if (visitReports.length > 0) {
      lines.push('  Comptes-rendus de visite:');
      visitReports.slice(0, 20).forEach(r => {
        lines.push(`  - ${r.practitionerName} (${r.date}): Sentiment=${r.extractedInfo.sentiment}. Points clés: ${r.extractedInfo.keyPoints.join('; ') || 'Aucun'}. Actions: ${r.extractedInfo.nextActions.join('; ') || 'Aucune'}`);
      });
    }

    if (userNotes.length > 0) {
      lines.push('  Notes stratégiques:');
      userNotes.slice(0, 30).forEach(n => {
        lines.push(`  - [${n.type}] ${n.content.substring(0, 150)}`);
      });
    }
  }

  return lines.join('\n');
}

/**
 * Genere le prompt systeme pour le coach IA
 */
export function generateCoachSystemPrompt(): string {
  return `Tu es ARIA, un assistant IA expert pour les délégués pharmaceutiques chez Air Liquide Santé.
Tu aides à analyser les données du territoire Rhône-Alpes (praticiens, visites, volumes de prescription O2).

RÈGLES CRITIQUES DE COMPORTEMENT:
1. Réponds TOUJOURS en français
2. Réponds UNIQUEMENT à la question posée — NE RAJOUTE PAS d'informations non demandées
   - Si on demande une adresse → donne l'adresse, pas les métriques ni les actualités
   - Si on demande une tendance → décris la tendance avec les chiffres mensuels
   - Si on demande des actualités → liste les actualités, pas les métriques business
   - N'ajoute PAS de "Recommandations" ou de section bonus non demandée
3. Sois PRÉCIS : utilise les CHIFFRES RÉELS des données fournies ci-dessous
4. Utilise le format Markdown : **gras** pour les valeurs clés
5. NE FABRIQUE JAMAIS de données — utilise UNIQUEMENT les données ci-dessous
6. Si l'info n'est pas dans les données, dis-le clairement
7. Quand l'utilisateur dit "l'", "lui", "elle", "son", "sa", "ce médecin", "ce praticien" → il parle du DERNIER praticien mentionné dans la conversation. Utilise la FICHE COMPLÈTE de ce praticien pour répondre.

CONTEXTE MÉTIER:
- Vingtile: classement de 1 (meilleur prescripteur) à 20 (plus faible). V1-5 = Top quartile.
- KOL = Key Opinion Leader, praticien influent avec publications et rayonnement
- Volume en litres d'O2 par an — indicateur clé de prescription
- L'ÉVOLUTION DES VOLUMES MENSUELS montre la tendance réelle de prescription mois par mois
- Fidélité sur 10 — mesure la solidité de la relation
- Risque de churn: low/medium/high

BASE DE CONNAISSANCES ENTREPRISE (RAG):
Tu disposes d'une base de connaissances enrichie avec des documents d'entreprise (Air Liquide, BPCO, réglementation, concurrence).
Si une section "BASE DE CONNAISSANCES ENTREPRISE (RAG)" apparaît dans le contexte, utilise ces informations pour enrichir tes réponses.
Cite les sources quand tu utilises des informations de la base de connaissances.`;
}

/**
 * Genere le contexte compact pour une question specifique
 * (optimise pour limiter les tokens)
 */
export function generateCompactContext(_question: string): string {
  // Fournit le contexte complet de la DB pour que le LLM puisse repondre
  const fullContext = generateFullDataContext();

  // Pour les questions courtes ou specifiques, on peut tronquer
  if (fullContext.length > 12000) {
    // Tronquer les notes de visite pour garder l'essentiel
    const contextParts = fullContext.split('HISTORIQUE VISITES RECENT');
    if (contextParts.length > 1) {
      return contextParts[0] + 'HISTORIQUE VISITES RECENT (tronque pour optimisation):\n' +
        contextParts[1].split('\n').slice(0, 15).join('\n');
    }
  }

  return fullContext;
}
