/**
 * Service de génération de prompts enrichis pour le Pitch Generator
 * Utilise toutes les données disponibles: profil, notes, actualités, historique de visites,
 * ET la base de connaissances RAG (68 chunks) pour des pitchs ultra-spécifiques.
 */

import type { Practitioner } from '../types';
import type { PitchConfig } from '../types/pitch';
import { DataService } from './dataService';
import { searchByCategory, searchByTag } from './ragService';
import { getEnrichedPractitionerContext } from './practitionerDataBridge';
import type { PractitionerProfile } from '../types/database';
import type { KnowledgeCategory } from '../data/ragKnowledgeBase';

const LENGTH_WORDS = {
  short: 200,
  medium: 400,
  long: 700,
};

const TONE_DESCRIPTIONS = {
  formal: 'professionnel et institutionnel, vouvoiement strict, langage soigné',
  conversational: 'chaleureux et naturel, tout en restant professionnel, permet de créer un lien',
  technical: 'précis et technique, avec des données cliniques et scientifiques',
};

const FOCUS_DESCRIPTIONS = {
  general: 'équilibre entre tous les aspects',
  service: 'qualité du service client, disponibilité 24/7, accompagnement',
  innovation: 'innovations technologiques, télésuivi, solutions connectées',
  price: 'rapport qualité-prix, optimisation des coûts pour le patient',
  loyalty: 'fidélisation, partenariat long terme, programme de suivi',
};

/** Mapping section IDs → tag names used in generated pitch text */
export const SECTION_ID_TO_TAG: Record<string, string> = {
  hook: 'ACCROCHE',
  proposition: 'PROPOSITION',
  competition: 'CONCURRENCE',
  cta: 'CALL_TO_ACTION',
  objections: 'OBJECTIONS',
  talking_points: 'TALKING_POINTS',
  follow_up: 'FOLLOW_UP',
};

const VISIT_TYPE_FR: Record<string, string> = {
  completed: 'Réalisée',
  scheduled: 'Planifiée',
  cancelled: 'Annulée',
};

/** Shared helper: compute product frequency from visit history */
function getProductFrequency(profile: PractitionerProfile): [string, number][] {
  const freq: Record<string, number> = {};
  profile.visitHistory?.forEach(visit => {
    visit.productsDiscussed?.forEach(p => {
      freq[p] = (freq[p] || 0) + 1;
    });
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RAG KNOWLEDGE RETRIEVAL — Sélection intelligente par contexte
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Récupère les connaissances RAG les plus pertinentes pour le pitch
 * basé sur la spécialité du praticien, le focus, les produits et concurrents sélectionnés
 */
function getRelevantRAGKnowledge(
  practitioner: Practitioner,
  config: PitchConfig
): string {
  const chunks: { title: string; content: string; source: string }[] = [];
  const addedTitles = new Set<string>();
  const MAX_CHUNK_CHARS = 400;

  const addChunks = (items: { title: string; content: string; source: string }[], max: number) => {
    for (const item of items) {
      if (chunks.length >= 12) return;
      if (addedTitles.has(item.title)) continue;
      if (max <= 0) return;
      chunks.push({
        title: item.title,
        content: item.content.length > MAX_CHUNK_CHARS
          ? item.content.substring(0, MAX_CHUNK_CHARS) + '…'
          : item.content,
        source: item.source,
      });
      addedTitles.add(item.title);
      max--;
    }
  };

  // 1. Connaissances cliniques selon la spécialité
  if (practitioner.specialty === 'Pneumologue' || config.tone === 'technical') {
    addChunks(searchByCategory('bpco_gold'), 2);
    addChunks(searchByCategory('bpco_has'), 2);
    addChunks(searchByCategory('bpco_clinique'), 1);
    addChunks(searchByTag('spirometrie'), 1);
    addChunks(searchByTag('exacerbation'), 1);
  } else {
    addChunks(searchByCategory('epidemiologie'), 2);
    addChunks(searchByTag('parcours_soins'), 1);
    addChunks(searchByTag('ameli'), 1);
  }

  // 2. Connaissances produits selon la sélection
  const productKeywords = config.products.join(' ').toLowerCase();
  if (productKeywords.includes('telesuivi') || productKeywords.includes('connect')) {
    addChunks(searchByCategory('telesuivi'), 2);
  }
  if (productKeywords.includes('vitalaire') || productKeywords.includes('extracteur') ||
      productKeywords.includes('portable') || productKeywords.includes('o2') ||
      productKeywords.includes('freestyle')) {
    addChunks(searchByCategory('oxygenotherapie'), 2);
  }
  if (productKeywords.includes('vni') || productKeywords.includes('ppc') ||
      productKeywords.includes('ventil') || productKeywords.includes('bilevel') ||
      productKeywords.includes('airsense')) {
    addChunks(searchByTag('ventilation'), 1);
    addChunks(searchByTag('sommeil'), 1);
  }
  if (productKeywords.includes('dispositif') || productKeywords.includes('alms')) {
    addChunks(searchByTag('dispositif_medical'), 1);
  }

  // 3. Intelligence concurrentielle selon les concurrents sélectionnés
  if (config.competitors.length > 0) {
    addChunks(searchByCategory('concurrent'), 2);
    if (config.competitors.some(c => c.toLowerCase().includes('vivisol'))) {
      addChunks(searchByTag('vivisol'), 1);
    }
  }

  // 4. Connaissances selon le focus
  const focusCategories: Record<string, KnowledgeCategory[]> = {
    service: ['orkyn'],
    innovation: ['telesuivi', 'alms_devices'],
    price: ['lppr_remboursement'],
    loyalty: ['air_liquide_corporate'],
    general: ['orkyn', 'air_liquide_corporate'],
  };
  const focusCats = focusCategories[config.focusArea] || focusCategories.general;
  for (const cat of focusCats) {
    addChunks(searchByCategory(cat), 1);
  }

  // 5. Réglementation/remboursement (toujours utile, dedup handled by addedTitles)
  if (config.focusArea !== 'price') {
    addChunks(searchByCategory('lppr_remboursement'), 1);
  }

  if (chunks.length === 0) return '';

  let context = `\n═══════════════════════════════════════════════════════════════
CONNAISSANCES MÉTIER DÉTAILLÉES (sources vérifiées : HAS, GOLD, Air Liquide, Orkyn', Légifrance)
═══════════════════════════════════════════════════════════════\n`;

  for (const chunk of chunks) {
    context += `\n### ${chunk.title}\n_Source: ${chunk.source}_\n${chunk.content}\n`;
  }

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS HELPERS — Extraction d'insights des données praticien
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Récupère le profil complet du praticien
 */
function getEnrichedPractitionerData(practitionerId: string): PractitionerProfile | null {
  return DataService.getPractitionerById(practitionerId) || null;
}

/**
 * Analyse les patterns de visites pour identifier ce qui fonctionne
 */
function analyzeVisitPatterns(profile: PractitionerProfile): string {
  if (!profile.visitHistory || profile.visitHistory.length === 0) {
    return 'Premier contact — aucune visite enregistrée. Approche de découverte recommandée.';
  }

  const visits = profile.visitHistory;
  const topProducts = getProductFrequency(profile).slice(0, 3);
  let completedCount = 0;
  visits.forEach(visit => { if (visit.type === 'completed') completedCount++; });

  const daysSinceLastVisit = profile.lastVisitDate
    ? Math.floor((Date.now() - new Date(profile.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let analysis = '';

  if (daysSinceLastVisit !== null) {
    if (daysSinceLastVisit > 90) {
      analysis += `⚠ ATTENTION: Dernière visite il y a ${daysSinceLastVisit} jours — contact "froid", il faut recréer le lien.\n`;
    } else if (daysSinceLastVisit > 45) {
      analysis += `Dernière visite il y a ${daysSinceLastVisit} jours — opportunité de relance.\n`;
    } else {
      analysis += `Contact récent (${daysSinceLastVisit}j) — continuité et suivi.\n`;
    }
  }

  if (topProducts.length > 0) {
    analysis += `Produits les plus discutés: ${topProducts.map(([p, n]) => `${p} (${n}×)`).join(', ')}.\n`;
    analysis += `→ CAPITALISER sur ces produits connus, proposer montée en gamme ou complémentarité.\n`;
  }

  if (visits.length >= 3) {
    const successRate = Math.round((completedCount / visits.length) * 100);
    if (successRate < 50) {
      analysis += `Taux de visites réalisées: ${successRate}% — identifier les freins.\n`;
    }
  }

  return analysis;
}

/**
 * Extrait les thèmes clés et insights des notes de visite
 */
function extractNoteInsights(profile: PractitionerProfile): string {
  if (!profile.notes || profile.notes.length === 0) {
    return 'Aucune note disponible — poser des questions ouvertes pour découvrir le praticien.';
  }

  const notes = profile.notes.slice(0, 5);
  const themes: string[] = [];
  const nextActions: string[] = [];
  const allContent = notes.map(n => n.content).join(' ').toLowerCase();

  const matchWord = (pattern: string) => new RegExp(`\\b${pattern}\\b`, 'i').test(allContent);

  if (matchWord('prix') || matchWord('coût') || matchWord('coûteu') || matchWord('tarif') || matchWord('cher|chère') || matchWord('économi')) {
    themes.push('Sensibilité prix/coûts');
  }
  if (matchWord('concurrent') || matchWord('vivisol') || matchWord('linde') || matchWord('sos oxygène') || matchWord('bastide')) {
    themes.push('Veille concurrentielle active');
  }
  if (matchWord('télésuivi') || matchWord('connecté') || matchWord('digital') || matchWord('appli') || matchWord('plateforme')) {
    themes.push('Intérêt pour le digital/télésuivi');
  }
  if (matchWord('observance') || matchWord('compliance') || matchWord('adhésion') || matchWord('fidél.*traitement')) {
    themes.push('Focus sur l\'observance patient');
  }
  if (matchWord('satisfait') || matchWord('très bien') || matchWord('excellent') || matchWord('ravi') || matchWord('apprécié')) {
    themes.push('Globalement satisfait du service');
  }
  if (matchWord('problème') || matchWord('plainte') || matchWord('retard') || matchWord('insatisf') || matchWord('déçu') || matchWord('mécontent')) {
    themes.push('Points d\'insatisfaction signalés');
  }
  if (matchWord('formation') || matchWord('éducation thérapeutique') || matchWord('dpc') || matchWord('congrès')) {
    themes.push('Intérêt pour la formation/DPC');
  }

  notes.forEach(note => {
    if (note.nextAction) nextActions.push(note.nextAction);
  });

  let insights = '';

  if (themes.length > 0) {
    insights += `Thèmes identifiés: ${themes.join(', ')}.\n`;
  }
  if (nextActions.length > 0) {
    insights += `Actions en attente: ${nextActions.slice(0, 3).join(' | ')}.\n`;
    insights += `→ MENTIONNER ces actions pour montrer le suivi et la fiabilité.\n`;
  }

  insights += `\nDernières notes (contexte conversationnel):\n`;
  notes.slice(0, 3).forEach(note => {
    const date = new Date(note.date).toLocaleDateString('fr-FR');
    insights += `- [${date}] ${note.content.substring(0, 150)}${note.content.length > 150 ? '...' : ''}\n`;
  });

  return insights;
}

/**
 * Formate les publications avec analyse thématique
 */
function formatPublicationsForPitch(profile: PractitionerProfile): string {
  const publications = profile.news?.filter(n => n.type === 'publication') || [];
  const conferences = profile.news?.filter(n => n.type === 'conference') || [];
  const awards = profile.news?.filter(n => n.type === 'award') || [];
  const certifications = profile.news?.filter(n => n.type === 'certification') || [];

  if (publications.length === 0 && conferences.length === 0 && awards.length === 0) {
    return 'Aucune publication/actualité référencée. Utiliser la spécialité et la localisation pour personnaliser l\'accroche.';
  }

  let result = '';

  if (publications.length > 0) {
    result += `PUBLICATIONS (${publications.length}) — A CITER DANS L'ACCROCHE:\n`;
    publications.slice(0, 3).forEach(pub => {
      result += `- "${pub.title}" (${new Date(pub.date).toLocaleDateString('fr-FR')})\n`;
      if (pub.content) result += `  Résumé: ${pub.content}\n`;
    });
    result += `→ OBLIGATOIRE: Mentionner la publication la plus récente dans l'accroche pour montrer que vous suivez son travail.\n\n`;
  }

  if (conferences.length > 0) {
    result += `CONFERENCES (${conferences.length}):\n`;
    conferences.slice(0, 2).forEach(conf => {
      result += `- "${conf.title}" (${new Date(conf.date).toLocaleDateString('fr-FR')})\n`;
    });
    result += '\n';
  }

  if (awards.length > 0) {
    result += `DISTINCTIONS:\n`;
    awards.forEach(award => {
      result += `- ${award.title} (${new Date(award.date).toLocaleDateString('fr-FR')})\n`;
    });
    result += `→ Féliciter pour cette reconnaissance.\n\n`;
  }

  if (certifications.length > 0) {
    result += `CERTIFICATIONS:\n`;
    certifications.forEach(cert => {
      result += `- ${cert.title}\n`;
    });
    result += '\n';
  }

  return result;
}

/**
 * Formate l'historique complet des visites
 */
function formatVisitHistory(profile: PractitionerProfile): string {
  if (!profile.visitHistory || profile.visitHistory.length === 0) {
    return 'Aucune visite enregistrée — c\'est un premier contact.';
  }

  return profile.visitHistory.slice(0, 5).map(visit => {
    const date = new Date(visit.date).toLocaleDateString('fr-FR');
    const products = visit.productsDiscussed?.join(', ') || 'Non renseigné';
    const typeFr = VISIT_TYPE_FR[visit.type] || visit.type;
    return `- [${date}] ${typeFr} (${visit.duration || '?'} min)\n  Produits: ${products}${visit.notes ? `\n  Notes: ${visit.notes}` : ''}`;
  }).join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT — Contexte métier + instructions de génération
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Construit le prompt système enrichi avec connaissances RAG ciblées
 */
export function buildEnhancedSystemPrompt(config: PitchConfig, practitioner?: Practitioner): string {
  const sections = ['[ACCROCHE]', '[PROPOSITION]', '[CONCURRENCE]', '[CALL_TO_ACTION]'];
  if (config.includeObjections) sections.push('[OBJECTIONS]');
  if (config.includeTalkingPoints) sections.push('[TALKING_POINTS]');
  sections.push('[FOLLOW_UP]');

  // Récupérer les connaissances RAG ciblées
  const ragKnowledge = practitioner ? getRelevantRAGKnowledge(practitioner, config) : '';

  return `Tu es un Délégué Pharmaceutique expert pour Air Liquide Santé (via ses filiales Orkyn' et ALMS), leader français des prestations de santé à domicile pour les patients respiratoires.

Tu génères des pitchs commerciaux ULTRA-PERSONNALISÉS. Chaque phrase doit être spécifique à CE praticien. INTERDIT de générer des phrases génériques comme "nous avons une gamme complète" ou "notre service est excellent". Utilise les données réelles fournies.

═══════════════════════════════════════════════════════════════
GAMME PRODUITS & SERVICES AIR LIQUIDE SANTÉ (référence rapide)
═══════════════════════════════════════════════════════════════
**O2:** VitalAire Confort+ (concentrateur <39dB, connecté) | FreeStyle Comfort (portable 2,1kg, 8h) | O2 liquide Helios (mobilité) | Station extracteur (économique, >99,5%)
**Télésuivi:** O2 Connect via EOVE (SpO2, débit, observance temps réel) — inclus, pas de surcoût
**VNI/PPC:** DreamStation BiLevel (BPCO hypercapnique) | ResMed AirSense 11 (PPC connectée)
**Services:** Astreinte 24/7 (<4h) | Éducation thérapeutique certifiée HAS | Plateforme praticien | DPC accrédité
**LPPR 2025:** OLD forfait 1 ~12€/j | forfait 3 ~18€/j | VNI ~14€/j (100% Sécu si ALD)
**Avantages vs concurrents:** Couverture nationale (vs Vivisol régional) | Télésuivi natif (vs Linde sans) | Spécialiste respiratoire (vs Bastide généraliste) | Innovation propre (vs SOS dépendant tiers)
${ragKnowledge}

RÈGLES IMPÉRATIVES:
- Ton: ${TONE_DESCRIPTIONS[config.tone]}
- Longueur cible: environ ${LENGTH_WORDS[config.length]} mots au total
- Focus principal: ${FOCUS_DESCRIPTIONS[config.focusArea]}
- Toujours vouvoyer le praticien
- UTILISER les données réelles fournies pour personnaliser (publications, notes, dernière visite, tendances)
- Ne JAMAIS inventer de statistiques non fournies
- Si le praticien a des publications : CITER le titre exact de la plus récente dans l'accroche
- Si des notes mentionnent un concurrent, un problème ou un intérêt spécifique : ADRESSER ce point
- Citer des données cliniques si le ton est technique ou si le praticien est pneumologue

STRUCTURE OBLIGATOIRE:

[ACCROCHE]
Ouverture TRÈS personnalisée (2-3 phrases). OBLIGATOIRE: s'appuyer sur un élément concret et récent — une publication, une conférence, une note de visite, un événement. Si le praticien a des publications, CITER le titre exact. Si c'est un KOL, valoriser son expertise. Si jamais visité, mentionner un fait précis (sa spécialité dans sa ville, un colloque de sa discipline).

[PROPOSITION]
Présentation de la valeur ajoutée Air Liquide reliée aux besoins IDENTIFIÉS dans les notes/l'historique. Si des produits ont déjà été discutés, proposer montée en gamme ou complémentarité. Si le praticien s'intéresse au digital, pousser le télésuivi. Si sensibilité prix, pousser le rapport qualité-prix et le remboursement. Focus: ${FOCUS_DESCRIPTIONS[config.focusArea]}.

[CONCURRENCE]
Différenciation FACTUELLE par rapport aux concurrents. Si les notes mentionnent un concurrent précis, l'adresser en priorité. Arguments concrets sans dénigrement.

[CALL_TO_ACTION]
Proposition concrète basée sur l'historique. Si des actions sont en attente (identifiées dans les notes), les rappeler.
${config.includeObjections ? `
[OBJECTIONS]
4-5 objections SPÉCIFIQUES à ce praticien (basées sur les notes, le churn risk, la tendance). Format: "**Objection:** ... → **Réponse:** ..."
` : ''}${config.includeTalkingPoints ? `
[TALKING_POINTS]
6-8 points clés pour structurer l'entretien: (1) accroche personnalisée, (2) suivi des actions précédentes, (3) produit phare, (4) donnée clinique si pertinent, (5) question ouverte, (6) proposition concrète.
` : ''}
[FOLLOW_UP]
Plan de suivi post-visite en 3 étapes (J+1, J+7, J+30) avec actions concrètes personnalisées.

Génère le pitch complet en suivant cette structure exacte.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER PROMPT — Toutes les données praticien + analyses
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Construit le prompt utilisateur enrichi avec analyse des données praticien
 */
export function buildEnhancedUserPrompt(practitioner: Practitioner, config: PitchConfig): string {
  const profile = getEnrichedPractitionerData(practitioner.id);

  if (!profile) {
    return buildBasicUserPrompt(practitioner, config);
  }

  // Récupérer le contexte enrichi (incluant les comptes-rendus de visite utilisateur)
  const enrichedContext = getEnrichedPractitionerContext(practitioner.id);

  const visitPatterns = analyzeVisitPatterns(profile);
  const noteInsights = extractNoteInsights(profile);
  const publicationsFormatted = formatPublicationsForPitch(profile);
  const visitHistory = formatVisitHistory(profile);

  // Utiliser la date de dernière visite effective (incluant les comptes-rendus)
  const effectiveLastVisitDate = enrichedContext?.effectiveLastVisitDate || profile.lastVisitDate;
  const daysSinceLastVisit = effectiveLastVisitDate
    ? Math.floor((Date.now() - new Date(effectiveLastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const topProductsRaw = getProductFrequency(profile).slice(0, 3);
  const topProducts = topProductsRaw.map(([product, count]) => `${product} (${count}x)`);

  return `Génère un pitch ULTRA-PERSONNALISÉ pour ce praticien. Chaque section doit mentionner des éléments SPÉCIFIQUES tirés des données ci-dessous. INTERDIT de rester générique.

═══════════════════════════════════════════════════════════════════════════
PROFIL COMPLET DU PRATICIEN
═══════════════════════════════════════════════════════════════════════════

**IDENTITÉ:**
- Nom: ${profile.title} ${profile.firstName} ${profile.lastName}
- Spécialité: ${profile.specialty}${profile.subSpecialty ? ` — ${profile.subSpecialty}` : ''}
- Type d'exercice: ${profile.practiceType === 'ville' ? 'Praticien de ville (libéral)' : profile.practiceType === 'hospitalier' ? 'Praticien hospitalier' : 'Praticien mixte (ville + hôpital)'}
- Ville: ${profile.address.city} (${profile.address.postalCode})

**MÉTRIQUES BUSINESS:**
- Volume annuel: ${profile.metrics.volumeL.toLocaleString()} L (${(profile.metrics.volumeL / 1000).toFixed(0)}K L)
- Fidélité: ${profile.metrics.loyaltyScore}/10
- Vingtile: V${profile.metrics.vingtile} ${profile.metrics.vingtile <= 5 ? '→ TOP prescripteur, traitement VIP' : profile.metrics.vingtile <= 10 ? '→ Prescripteur important' : '→ Prescripteur standard'}
- KOL: ${profile.metrics.isKOL ? 'OUI — Praticien influent, expertise reconnue' : 'Non'}
- Potentiel de croissance: +${profile.metrics.potentialGrowth}%
- Risque de churn: ${profile.metrics.churnRisk === 'high' ? 'ÉLEVÉ — Pitch doit être défensif et rassurant' : profile.metrics.churnRisk === 'medium' ? 'Moyen — Vigilance requise' : 'Faible — Relation stable'}

═══════════════════════════════════════════════════════════════════════════
ANALYSE DES VISITES (insights automatiques)
═══════════════════════════════════════════════════════════════════════════
${visitPatterns}

**Produits historiques:** ${topProducts.length > 0 ? topProducts.join(', ') : 'Aucun produit discuté précédemment'}

═══════════════════════════════════════════════════════════════════════════
ACTUALITÉS ET PUBLICATIONS DU PRATICIEN
═══════════════════════════════════════════════════════════════════════════
${publicationsFormatted}

═══════════════════════════════════════════════════════════════════════════
INSIGHTS DES NOTES DE VISITE (thèmes, actions, contexte)
═══════════════════════════════════════════════════════════════════════════
${noteInsights}

═══════════════════════════════════════════════════════════════════════════
HISTORIQUE DES VISITES RÉCENTES
═══════════════════════════════════════════════════════════════════════════
${visitHistory}

${enrichedContext && enrichedContext.userVisitReports.length > 0 ? `═══════════════════════════════════════════════════════════════════════════
COMPTES-RENDUS DE VISITE RÉCENTS (données CRM dynamiques)
═══════════════════════════════════════════════════════════════════════════
${enrichedContext.userVisitReports.slice(0, 3).map((report, idx) => {
  const date = new Date(report.date).toLocaleDateString('fr-FR');
  let text = `${idx + 1}. [${date}] Visite — Sentiment: ${report.extractedInfo.sentiment}`;
  if (report.extractedInfo.keyPoints.length > 0) text += `\n   Points clés: ${report.extractedInfo.keyPoints.join('; ')}`;
  if (report.extractedInfo.productsDiscussed.length > 0) text += `\n   Produits discutés: ${report.extractedInfo.productsDiscussed.join(', ')}`;
  if (report.extractedInfo.competitorsMentioned.length > 0) text += `\n   Concurrents mentionnés: ${report.extractedInfo.competitorsMentioned.join(', ')}`;
  if (report.extractedInfo.objections.length > 0) text += `\n   Objections: ${report.extractedInfo.objections.join('; ')}`;
  if (report.extractedInfo.opportunities.length > 0) text += `\n   Opportunités: ${report.extractedInfo.opportunities.join('; ')}`;
  if (report.extractedInfo.nextActions.length > 0) text += `\n   → Actions: ${report.extractedInfo.nextActions.join('; ')}`;
  return text;
}).join('\n')}
→ UTILISER ces comptes-rendus récents pour personnaliser le pitch (mentionner les discussions passées, adresser les objections, capitaliser sur les opportunités)

` : ''}═══════════════════════════════════════════════════════════════════════════
CONFIGURATION DU PITCH
═══════════════════════════════════════════════════════════════════════════
- Longueur: ${config.length} (~${LENGTH_WORDS[config.length]} mots)
- Ton: ${config.tone} (${TONE_DESCRIPTIONS[config.tone]})
- Focus: ${config.focusArea} (${FOCUS_DESCRIPTIONS[config.focusArea]})
- Produits à mettre en avant: ${config.products.length > 0 ? config.products.join(', ') : 'Gamme complète'}
- Concurrents à adresser: ${config.competitors.length > 0 ? config.competitors.join(', ') : 'Aucun spécifiquement'}

${config.additionalInstructions ? `**INSTRUCTIONS SPÉCIALES DU COMMERCIAL:**\n${config.additionalInstructions}` : ''}

═══════════════════════════════════════════════════════════════════════════
DIRECTIVES DE PERSONNALISATION (OBLIGATOIRES)
═══════════════════════════════════════════════════════════════════════════
${profile.news?.filter(n => n.type === 'publication').length ? `1. ACCROCHE: Citer la publication "${profile.news.filter(n => n.type === 'publication')[0].title}" dans l'ouverture.` : daysSinceLastVisit !== null ? `1. ACCROCHE: Référencer la dernière visite (il y a ${daysSinceLastVisit} jours) et ce qui a été discuté.` : `1. ACCROCHE: Mentionner l'expertise en ${profile.specialty} à ${profile.address.city}.`}
${profile.metrics.churnRisk === 'high' ? '2. TON DÉFENSIF: Le praticien est à risque de churn — valoriser la relation, adresser les frustrations, proposer des améliorations concrètes.' : profile.metrics.isKOL ? '2. VALORISATION KOL: Reconnaître explicitement son statut d\'expert et son influence dans la communauté médicale.' : `2. CROISSANCE: Potentiel de +${profile.metrics.potentialGrowth}% — identifier des opportunités de développement.`}
${topProducts.length > 0 ? `3. CONTINUITÉ PRODUIT: Capitaliser sur ${topProducts[0]} déjà discuté, proposer montée en gamme ou complémentarité.` : '3. DÉCOUVERTE: Premier contact produit — présentation large puis focus selon les réactions.'}
4. CHAQUE SECTION doit contenir au moins un élément SPÉCIFIQUE tiré des données ci-dessus.

Génère maintenant le pitch complet.`;
}

/**
 * Prompt de base si les données enrichies ne sont pas disponibles
 */
function buildBasicUserPrompt(practitioner: Practitioner, config: PitchConfig): string {
  const conversationHistory = practitioner.conversations?.slice(0, 2).map(c =>
    `- ${c.date}: ${c.summary}`
  ).join('\n') || 'Aucun historique disponible';

  return `Génère un pitch personnalisé pour ce praticien:

PROFIL:
- ${practitioner.title} ${practitioner.firstName} ${practitioner.lastName}
- ${practitioner.specialty} — ${practitioner.city}
- Volume: ${practitioner.volumeL.toLocaleString()} L | KOL: ${practitioner.isKOL ? 'Oui' : 'Non'}
- Dernière visite: ${practitioner.lastVisitDate || 'Jamais'} | Tendance: ${practitioner.trend}
- Fidélité: ${practitioner.loyaltyScore}/10

HISTORIQUE:
${conversationHistory}

SYNTHÈSE IA:
${practitioner.aiSummary}

CONFIGURATION:
- Longueur: ${config.length} (~${LENGTH_WORDS[config.length]} mots) | Ton: ${config.tone}
- Produits: ${config.products.join(', ') || 'Gamme complète'}
- Concurrents: ${config.competitors.join(', ') || 'Aucun'}

${config.additionalInstructions ? `INSTRUCTIONS: ${config.additionalInstructions}` : ''}

Génère le pitch en suivant la structure demandée.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION REGENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Prompt pour régénérer une section spécifique
 */
export function buildEnhancedRegenerateSectionPrompt(
  sectionId: string,
  currentContent: string,
  userInstruction: string,
  fullPitchContext: string,
  practitioner: Practitioner
): string {
  const sectionNames: Record<string, string> = {
    hook: "l'accroche",
    proposition: 'la proposition de valeur',
    competition: 'la différenciation concurrentielle',
    cta: "l'appel à l'action",
    objections: 'la gestion des objections',
    talking_points: 'les points de discussion',
    follow_up: 'le suivi proposé',
  };

  const profile = getEnrichedPractitionerData(practitioner.id);
  let additionalContext = '';

  if (profile) {
    const publications = profile.news?.filter(n => n.type === 'publication') || [];
    const lastNote = profile.notes?.[0];
    additionalContext = `
CONTEXTE PRATICIEN:
- ${profile.title} ${profile.firstName} ${profile.lastName} — ${profile.specialty} à ${profile.address.city}
- KOL: ${profile.metrics.isKOL ? 'Oui' : 'Non'} | V${profile.metrics.vingtile} | Fidélité: ${profile.metrics.loyaltyScore}/10
- Risque churn: ${profile.metrics.churnRisk} | Potentiel: +${profile.metrics.potentialGrowth}%
${publications.length > 0 ? `- Dernière publication: "${publications[0].title}"` : ''}
${lastNote ? `- Dernière note: "${lastNote.content.substring(0, 120)}..."` : ''}
`;
  }

  return `Tu dois réécrire uniquement ${sectionNames[sectionId] || 'cette section'} du pitch commercial.
${additionalContext}
CONTEXTE DU PITCH COMPLET:
${fullPitchContext}

CONTENU ACTUEL:
${currentContent}

INSTRUCTION:
${userInstruction}

RÈGLES:
- Même ton et style que le reste du pitch
- Même longueur approximative
- Intègre l'instruction du commercial
- Utilise les données du praticien pour être SPÉCIFIQUE (noms, dates, publications)
- Ne génère QUE le nouveau contenu, sans balise ni titre

Nouveau contenu:`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRACTITIONER SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Génère un résumé du praticien pour la prévisualisation
 */
export function generatePractitionerSummary(practitionerId: string): string {
  const profile = getEnrichedPractitionerData(practitionerId);

  if (!profile) return 'Données non disponibles';

  const pubCount = profile.news?.filter(n => n.type === 'publication').length || 0;
  const noteCount = profile.notes?.length || 0;
  const visitCount = profile.visitHistory?.length || 0;

  const daysSinceLastVisit = profile.lastVisitDate
    ? Math.floor((Date.now() - new Date(profile.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let summary = `**${profile.title} ${profile.firstName} ${profile.lastName}**\n`;
  summary += `${profile.specialty} | ${profile.address.city}\n\n`;

  summary += `**Métriques:**\n`;
  summary += `- Volume: ${(profile.metrics.volumeL / 1000).toFixed(0)}K L/an | Vingtile: V${profile.metrics.vingtile}\n`;
  summary += `- Fidélité: ${profile.metrics.loyaltyScore}/10 | Potentiel: +${profile.metrics.potentialGrowth}%\n`;
  if (profile.metrics.isKOL) summary += `- **Key Opinion Leader**\n`;
  if (profile.metrics.churnRisk !== 'low') summary += `- Risque: ${profile.metrics.churnRisk === 'high' ? 'ÉLEVÉ' : 'Moyen'}\n`;

  summary += `\n**Données disponibles:**\n`;
  summary += `- ${pubCount} publication(s) | ${noteCount} note(s) | ${visitCount} visite(s)\n`;
  if (daysSinceLastVisit !== null) {
    summary += `- Dernière visite: il y a ${daysSinceLastVisit} jours\n`;
  }

  if (profile.news && profile.news.length > 0) {
    const latestNews = profile.news[0];
    summary += `\n**Dernière actualité:**\n`;
    summary += `_${latestNews.title}_ (${new Date(latestNews.date).toLocaleDateString('fr-FR')})\n`;
  }

  if (profile.notes && profile.notes.length > 0) {
    const latestNote = profile.notes[0];
    summary += `\n**Dernière note:**\n`;
    summary += `${latestNote.content.substring(0, 100)}...\n`;
  }

  return summary;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL PITCH GENERATION — Fallback when no LLM API key is configured
// Uses real practitioner data + RAG knowledge to generate structured pitch
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates a structured pitch locally using practitioner data, without LLM.
 * Returns text in the same [SECTION] format as the LLM would produce.
 */
export function generateLocalPitch(practitioner: Practitioner, config: PitchConfig): string {
  const profile = getEnrichedPractitionerData(practitioner.id);
  const publications = profile?.news?.filter(n => n.type === 'publication') || [];
  const conferences = profile?.news?.filter(n => n.type === 'conference') || [];
  const awards = profile?.news?.filter(n => n.type === 'award') || [];
  const notes = profile?.notes || [];
  const topProducts = profile ? getProductFrequency(profile).slice(0, 3) : [];

  const daysSinceLastVisit = profile?.lastVisitDate
    ? Math.floor((Date.now() - new Date(profile.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isKOL = profile?.metrics.isKOL || practitioner.isKOL;
  const isPneumo = practitioner.specialty === 'Pneumologue';
  const churnRisk = profile?.metrics.churnRisk || 'low';
  const city = profile?.address?.city || practitioner.city;
  const titre = `${practitioner.title} ${practitioner.lastName}`;

  // ── ACCROCHE ──
  let accroche = '';
  if (publications.length > 0) {
    const pub = publications[0];
    const pubDate = new Date(pub.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    accroche = `${titre}, j'ai eu l'occasion de lire votre publication « ${pub.title} » parue en ${pubDate}. `;
    if (isPneumo) {
      accroche += `Votre travail sur ce sujet contribue significativement à faire avancer la prise en charge des patients respiratoires dans la région. `;
    } else {
      accroche += `Ce type de travaux est essentiel pour sensibiliser les médecins généralistes à l'importance du dépistage précoce. `;
    }
    if (isKOL) {
      accroche += `En tant que leader d'opinion reconnu, votre expertise est précieuse pour nos patients.`;
    }
  } else if (conferences.length > 0) {
    accroche = `${titre}, j'ai noté votre participation à « ${conferences[0].title} ». Votre engagement dans la formation continue est un atout majeur pour vos patients. `;
    accroche += `Je souhaitais justement échanger avec vous sur les dernières avancées en matière de prise en charge respiratoire.`;
  } else if (daysSinceLastVisit !== null && daysSinceLastVisit < 60) {
    accroche = `${titre}, lors de notre dernier échange il y a ${daysSinceLastVisit} jours, nous avions abordé des sujets importants. `;
    if (notes.length > 0) {
      const lastNote = notes[0].content.substring(0, 80);
      accroche += `Vous m'aviez notamment fait part de : « ${lastNote}… ». Je reviens aujourd'hui avec des éléments concrets pour avancer.`;
    } else {
      accroche += `Je souhaitais faire un point de suivi et vous présenter nos dernières nouveautés.`;
    }
  } else if (daysSinceLastVisit !== null && daysSinceLastVisit > 90) {
    accroche = `${titre}, cela fait ${daysSinceLastVisit} jours que nous n'avons pas eu l'occasion d'échanger. `;
    accroche += `Beaucoup de choses ont évolué chez Air Liquide Santé depuis notre dernier contact, et je tenais à vous en faire part personnellement.`;
  } else {
    accroche = `${titre}, en tant que ${isPneumo ? 'pneumologue' : 'médecin généraliste'} à ${city}, vous êtes un partenaire clé dans la prise en charge des patients sous oxygénothérapie de votre secteur. `;
    if (isKOL) {
      accroche += `Votre statut de leader d'opinion et votre expertise reconnue font de vous un interlocuteur privilégié pour Air Liquide Santé.`;
    } else {
      accroche += `Je souhaitais vous présenter comment nous pouvons optimiser ensemble le parcours de vos patients respiratoires.`;
    }
  }

  // ── PROPOSITION ──
  let proposition = '';
  const selectedProducts = config.products;

  if (config.focusArea === 'innovation' || selectedProducts.some(p => p.toLowerCase().includes('telesuivi'))) {
    proposition = `**Télésuivi O2 Connect** — Notre plateforme EOVE vous permet de suivre en temps réel l'observance et les paramètres (SpO2, débit) de vos patients, directement depuis votre espace praticien. `;
    if (isPneumo) {
      proposition += `Pour un pneumologue comme vous, c'est la possibilité de détecter précocement les exacerbations et d'ajuster le traitement à distance. `;
    }
    proposition += `Le télésuivi est inclus sans surcoût dans nos forfaits — aucun frais supplémentaire pour le patient ni pour vous.\n\n`;
  }

  if (selectedProducts.some(p => p.toLowerCase().includes('vitalaire'))) {
    proposition += `**VitalAire Confort+** — Notre concentrateur premium offre un niveau sonore inférieur à 39 dB, permettant un usage nocturne confortable. `;
    proposition += `Connecté à notre plateforme de télésuivi, il remonte automatiquement les données d'observance.\n\n`;
  }

  if (selectedProducts.some(p => p.toLowerCase().includes('freestyle'))) {
    proposition += `**FreeStyle Comfort** — À seulement 2,1 kg avec 8 heures d'autonomie, c'est la solution idéale pour vos patients actifs qui ne veulent pas sacrifier leur mobilité.\n\n`;
  }

  if (selectedProducts.some(p => p.toLowerCase().includes('vni') || p.toLowerCase().includes('bilevel'))) {
    proposition += `**DreamStation BiLevel** — Pour vos patients BPCO hypercapniques, notre VNI avec algorithme auto-adaptatif offre un confort optimal et améliore significativement l'adhésion au traitement.\n\n`;
  }

  if (topProducts.length > 0 && proposition.length < 100) {
    proposition += `Lors de nos échanges précédents, vous aviez montré de l'intérêt pour ${topProducts[0][0]}. `;
    proposition += `Je vous propose aujourd'hui d'aller plus loin avec une offre complémentaire adaptée au profil de vos patients.\n\n`;
  }

  if (config.focusArea === 'service') {
    proposition += `Notre engagement service se traduit par une **astreinte 24h/24, 7j/7** avec intervention d'un technicien en moins de 4 heures, partout en France. `;
    proposition += `Votre tranquillité et celle de vos patients sont notre priorité absolue.`;
  } else if (config.focusArea === 'price') {
    proposition += `Côté remboursement, nos solutions sont intégralement prises en charge par l'Assurance Maladie pour les patients en ALD. `;
    proposition += `Le forfait concentrateur (LPPR 2025) est à environ 12€/jour, et le télésuivi est inclus sans surcoût — un avantage significatif pour vos patients.`;
  } else if (proposition.length < 100) {
    proposition += `Chez Air Liquide Santé, nous mettons à votre disposition une gamme complète et intégrée : de l'oxygénothérapie fixe et portable au télésuivi connecté, en passant par l'éducation thérapeutique certifiée HAS. `;
    proposition += `Tout est pensé pour simplifier votre quotidien et améliorer l'observance de vos patients.`;
  }

  // ── CONCURRENCE ──
  let competition = '';
  if (config.competitors.length > 0) {
    competition = `Face à ${config.competitors.join(' et ')}, Air Liquide Santé se distingue sur plusieurs points concrets :\n\n`;
    if (config.competitors.some(c => c.toLowerCase().includes('vivisol'))) {
      competition += `- **vs Vivisol** : Notre couverture nationale garantit un service homogène sur tout le territoire, avec un SAV en moins de 4h (contre 8h en moyenne pour Vivisol). Notre plateforme de télésuivi, développée en interne, est nativement intégrée à nos équipements.\n`;
    }
    if (config.competitors.some(c => c.toLowerCase().includes('linde'))) {
      competition += `- **vs Linde Healthcare** : Notre gamme portable (FreeStyle Comfort 2,1 kg) surpasse leur offre en termes d'autonomie et de légèreté. Notre espace praticien digital est un outil unique sur le marché.\n`;
    }
    if (config.competitors.some(c => c.toLowerCase().includes('sos'))) {
      competition += `- **vs SOS Oxygène** : En tant qu'acteur global, nous maîtrisons l'ensemble de la chaîne — de la production d'oxygène à la maintenance des équipements — là où SOS Oxygène dépend de fournisseurs tiers.\n`;
    }
    if (config.competitors.some(c => c.toLowerCase().includes('bastide'))) {
      competition += `- **vs Bastide Medical** : Notre spécialisation respiratoire nous permet d'offrir une expertise que les généralistes du MAD ne peuvent pas égaler, avec des techniciens formés exclusivement aux pathologies respiratoires.\n`;
    }
  } else {
    // Check notes for competitor mentions
    const noteContent = notes.map(n => n.content).join(' ').toLowerCase();
    if (noteContent.includes('vivisol') || noteContent.includes('concurrent')) {
      competition = `Nous savons que d'autres acteurs vous sollicitent. Ce qui différencie Air Liquide Santé :\n\n`;
      competition += `- **Couverture nationale** avec techniciens dédiés respiratoire — intervention en moins de 4h\n`;
      competition += `- **Télésuivi natif** intégré sans surcoût dans tous nos équipements connectés\n`;
      competition += `- **Programme d'éducation thérapeutique** certifié HAS, unique dans le secteur\n`;
      competition += `- **Innovation continue** : nous investissons 300M€/an en R&D santé\n`;
    } else {
      competition = `Ce qui fait la force d'Air Liquide Santé par rapport aux autres prestataires :\n\n`;
      competition += `- **Leader français** de l'assistance respiratoire à domicile, avec plus de 50 ans d'expérience\n`;
      competition += `- **Astreinte 24/7** avec engagement d'intervention sous 4 heures\n`;
      competition += `- **Télésuivi intégré** sans surcoût : monitoring en temps réel de l'observance\n`;
      competition += `- **Éducation thérapeutique** certifiée HAS, dispensée par des professionnels dédiés\n`;
    }
  }

  // ── CTA ──
  let cta = '';
  const pendingActions = notes.filter(n => n.nextAction).map(n => n.nextAction!);

  if (pendingActions.length > 0) {
    cta = `Lors de notre dernier échange, nous avions convenu de : « ${pendingActions[0]} ». `;
    cta += `Je vous propose de concrétiser cela dès maintenant.\n\n`;
  }

  if (config.focusArea === 'innovation') {
    cta += `**Proposition concrète** : Je peux organiser une démonstration de notre plateforme de télésuivi directement dans votre cabinet, avec un cas patient simulé. Cela vous permettra de voir en 15 minutes comment suivre l'observance de vos patients en temps réel. Seriez-vous disponible la semaine prochaine ?`;
  } else if (config.focusArea === 'service') {
    cta += `**Proposition concrète** : Je vous propose de planifier une rencontre avec notre responsable qualité régional pour vous présenter notre nouveau protocole de prise en charge et répondre à toutes vos questions sur notre engagement de service. Quel créneau vous conviendrait ?`;
  } else if (churnRisk === 'high') {
    cta += `**Proposition concrète** : Votre satisfaction est notre priorité absolue. Je souhaite organiser un point complet sur votre expérience avec nos services, identifier les axes d'amélioration et vous présenter les évolutions récentes que nous avons mises en place. Pouvons-nous nous voir cette semaine ?`;
  } else {
    cta += `**Proposition concrète** : Je vous propose ${isPneumo ? 'un rendez-vous de 30 minutes pour approfondir les solutions les plus adaptées à votre patientèle' : 'une présentation ciblée de 20 minutes sur les solutions qui correspondent le mieux à vos besoins'}. Je peux m'adapter à votre agenda — quel jour vous conviendrait le mieux ?`;
  }

  // ── OBJECTIONS ──
  let objections = '';
  if (config.includeObjections) {
    objections += `**Objection : « Je suis déjà équipé et satisfait de mon prestataire actuel. »**\n→ Je comprends tout à fait. Mon objectif n'est pas de tout changer, mais de vous montrer en quoi le télésuivi intégré d'Air Liquide Santé peut compléter votre dispositif actuel et améliorer l'observance de vos patients, sans surcoût.\n\n`;

    if (config.focusArea === 'price' || notes.some(n => n.content.toLowerCase().includes('prix'))) {
      objections += `**Objection : « C'est trop cher pour mes patients. »**\n→ Nos solutions sont intégralement remboursées dans le cadre de l'ALD. Le forfait concentrateur LPPR 2025 est d'environ 12€/jour, et le télésuivi est inclus sans aucun surcoût. Le reste à charge pour le patient en ALD est nul.\n\n`;
    }

    objections += `**Objection : « Je n'ai pas le temps pour une formation. »**\n→ Notre programme est conçu pour s'intégrer à votre pratique : ${isPneumo ? 'sessions de 45 minutes en visioconférence, DPC accrédité, à votre rythme' : 'supports synthétiques de 15 minutes, directement applicables en consultation'}.\n\n`;

    if (isPneumo) {
      objections += `**Objection : « Les données de télésuivi, c'est encore un écran de plus à surveiller. »**\n→ Notre plateforme est conçue pour être proactive : elle vous alerte uniquement en cas d'anomalie (chute d'observance, désaturation). Vous n'avez pas besoin de la consulter quotidiennement — elle vient à vous quand c'est nécessaire.\n\n`;
    }

    objections += `**Objection : « Mon patient ne saura pas utiliser un appareil connecté. »**\n→ Nos techniciens assurent l'installation et la formation du patient à domicile. L'interface patient est volontairement simplifiée. Et notre astreinte 24/7 est là pour accompagner le patient en cas de difficulté.`;
  }

  // ── TALKING POINTS ──
  let talkingPoints = '';
  if (config.includeTalkingPoints) {
    talkingPoints += `1. **Accroche personnalisée** : ${publications.length > 0 ? `Mentionner la publication « ${publications[0].title} »` : daysSinceLastVisit !== null ? `Rappeler le dernier échange il y a ${daysSinceLastVisit} jours` : `Valoriser son expertise en ${practitioner.specialty} à ${city}`}\n`;
    talkingPoints += `2. **Suivi des engagements** : ${pendingActions.length > 0 ? `Faire le point sur : « ${pendingActions[0]} »` : 'Demander comment les choses ont évolué depuis le dernier contact'}\n`;
    talkingPoints += `3. **Produit phare** : Présenter ${config.products[0] || 'VitalAire Confort+'} avec focus sur ${config.focusArea === 'innovation' ? 'le télésuivi intégré' : config.focusArea === 'service' ? 'l\'astreinte 24/7' : config.focusArea === 'price' ? 'le remboursement intégral' : 'les bénéfices patient'}\n`;
    talkingPoints += `4. **Donnée clinique** : ${isPneumo ? 'Étude GOLD 2024 — la téléréhabilitation réduit de 30% les réhospitalisations à 90 jours' : 'La BPCO touche 3,5 millions de Français, dont 2/3 non diagnostiqués — rôle clé du MG dans le dépistage'}\n`;
    talkingPoints += `5. **Question ouverte** : « ${isPneumo ? 'Comment gérez-vous actuellement le suivi de l\'observance de vos patients sous O2 ?' : 'Combien de vos patients BPCO sont actuellement sous oxygénothérapie à domicile ?'} »\n`;
    talkingPoints += `6. **Proposition concrète** : Fixer un prochain RDV avec action définie (démo, essai, rencontre technique)\n`;
    if (awards.length > 0) {
      talkingPoints += `7. **Félicitations** : Mentionner la distinction « ${awards[0].title} »\n`;
    }
    if (churnRisk === 'high') {
      talkingPoints += `${awards.length > 0 ? '8' : '7'}. **Rétention** : Aborder proactivement la satisfaction — « Comment évaluez-vous notre service actuel ? Y a-t-il des points à améliorer ? »\n`;
    }
  }

  // ── FOLLOW UP ──
  let followUp = `**J+1 — Récapitulatif et engagement**\n`;
  followUp += `Envoyer un email de remerciement personnalisé à ${titre} récapitulant les points abordés, les produits présentés (${config.products.slice(0, 2).join(', ') || 'gamme discutée'}) et les prochaines étapes convenues.\n\n`;
  followUp += `**J+7 — Suivi proactif**\n`;
  followUp += `${pendingActions.length > 0 ? `Relance sur l'action convenue : « ${pendingActions[0]} ». ` : ''}Partager ${isPneumo ? 'un article clinique pertinent ou les dernières recommandations GOLD/HAS' : 'un cas patient anonymisé illustrant les bénéfices du télésuivi'}. Proposer une date pour ${config.focusArea === 'innovation' ? 'la démonstration' : 'le prochain rendez-vous'}.\n\n`;
  followUp += `**J+30 — Consolidation**\n`;
  followUp += `${churnRisk === 'high' ? 'Point de satisfaction formalisé. ' : ''}Faire le bilan des actions engagées. ${isKOL ? 'Proposer une collaboration (intervention lors d\'un événement Air Liquide, retour d\'expérience). ' : `Évaluer l'opportunité d'élargir l'offre (${topProducts.length > 0 ? `passage de ${topProducts[0][0]} vers une solution complémentaire` : 'nouveaux produits adaptés à sa patientèle'}).`}`;

  // ── ASSEMBLE ──
  let pitch = `[ACCROCHE]\n${accroche}\n\n`;
  pitch += `[PROPOSITION]\n${proposition}\n\n`;
  pitch += `[CONCURRENCE]\n${competition}\n\n`;
  pitch += `[CALL_TO_ACTION]\n${cta}`;
  if (config.includeObjections) {
    pitch += `\n\n[OBJECTIONS]\n${objections}`;
  }
  if (config.includeTalkingPoints) {
    pitch += `\n\n[TALKING_POINTS]\n${talkingPoints}`;
  }
  pitch += `\n\n[FOLLOW_UP]\n${followUp}`;

  return pitch;
}
