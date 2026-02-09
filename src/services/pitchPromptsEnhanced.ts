/**
 * Service de génération de prompts enrichis pour le Pitch Generator
 * Utilise toutes les données disponibles: profil, notes, actualités, historique de visites,
 * ET la base de connaissances RAG (68 chunks) pour des pitchs ultra-spécifiques.
 */

import type { Practitioner } from '../types';
import type { PitchConfig } from '../types/pitch';
import { DataService } from './dataService';
import { searchByCategory, searchByTag } from './ragService';
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

  const addChunks = (items: { title: string; content: string; source: string }[], max: number) => {
    for (const item of items) {
      if (chunks.length >= 12) return; // cap global
      if (addedTitles.has(item.title)) continue;
      if (max <= 0) return;
      chunks.push(item);
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
  } else {
    addChunks(searchByCategory('epidemiologie'), 2);
    addChunks(searchByTag('parcours_soins'), 1);
  }

  // 2. Connaissances produits selon la sélection
  const productKeywords = config.products.join(' ').toLowerCase();
  if (productKeywords.includes('telesuivi') || productKeywords.includes('connect')) {
    addChunks(searchByCategory('telesuivi'), 2);
  }
  if (productKeywords.includes('vitalaire') || productKeywords.includes('extracteur') ||
      productKeywords.includes('portable') || productKeywords.includes('o2')) {
    addChunks(searchByCategory('oxygenotherapie'), 2);
  }
  if (productKeywords.includes('vni') || productKeywords.includes('ppc') ||
      productKeywords.includes('ventil')) {
    addChunks(searchByTag('ventilation'), 1);
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

  // 5. Réglementation/remboursement (toujours utile)
  addChunks(searchByCategory('lppr_remboursement'), 1);

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
  const productFrequency: Record<string, number> = {};
  let completedCount = 0;

  visits.forEach(visit => {
    if (visit.type === 'completed') completedCount++;
    visit.productsDiscussed?.forEach(p => {
      productFrequency[p] = (productFrequency[p] || 0) + 1;
    });
  });

  const topProducts = Object.entries(productFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

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

  if (allContent.includes('prix') || allContent.includes('coût') || allContent.includes('tarif') || allContent.includes('cher')) {
    themes.push('Sensibilité prix/coûts');
  }
  if (allContent.includes('concurrent') || allContent.includes('vivisol') || allContent.includes('linde') || allContent.includes('sos')) {
    themes.push('Veille concurrentielle active');
  }
  if (allContent.includes('télésuivi') || allContent.includes('connect') || allContent.includes('digital') || allContent.includes('appli')) {
    themes.push('Intérêt pour le digital/télésuivi');
  }
  if (allContent.includes('observance') || allContent.includes('compliance') || allContent.includes('patient')) {
    themes.push('Focus sur l\'observance patient');
  }
  if (allContent.includes('satisfait') || allContent.includes('content') || allContent.includes('bien')) {
    themes.push('Globalement satisfait du service');
  }
  if (allContent.includes('problème') || allContent.includes('plainte') || allContent.includes('retard') || allContent.includes('insatisf')) {
    themes.push('Points d\'insatisfaction signalés');
  }
  if (allContent.includes('formation') || allContent.includes('éducation') || allContent.includes('dpc')) {
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
    return `- [${date}] ${visit.type} (${visit.duration || '?'} min)\n  Produits: ${products}${visit.notes ? `\n  Notes: ${visit.notes}` : ''}`;
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
CONNAISSANCE PRODUITS AIR LIQUIDE SANTÉ
═══════════════════════════════════════════════════════════════
**Oxygénothérapie (OLD / OCT):**
- VitalAire Confort+ : concentrateur premium, <39dB, connecté, télésuivi intégré
- FreeStyle Comfort : concentrateur portable 2,1kg, débit pulsé jusqu'à 6, autonomie 8h
- O2 liquide portable : système Helios/Companion pour patients très mobiles
- Station extracteur fixe : solution économique, fiabilité > 99,5%
- Télésuivi O2 Connect : monitoring SpO2, débit, observance en temps réel (plateforme EOVE)
- Critères OLD : PaO2 ≤ 55 mmHg ou PaO2 56-59 avec complications

**VNI / PPC:**
- DreamStation BiLevel : VNI pour BPCO hypercapnique, algorithme auto-adaptatif
- ResMed AirSense 11 : PPC dernière génération, connectée, masque confort

**Services différenciants:**
- Astreinte 24/7/365 : technicien en moins de 4h partout en France
- Éducation thérapeutique : programme certifié HAS pour patients BPCO
- Plateforme digitale : espace praticien avec suivi patients en temps réel
- Formation continue : DPC accrédité pour les professionnels de santé

**Remboursement (LPPR 2025):**
- OLD forfait 1 (concentrateur) : ~12€/jour | forfait 3 (O2 liquide) : ~18€/jour
- VNI : ~14€/jour (100% Sécu si ALD) | Télésuivi : inclus, pas de surcoût
${ragKnowledge}

═══════════════════════════════════════════════════════════════
INTELLIGENCE CONCURRENTIELLE
═══════════════════════════════════════════════════════════════
**vs Vivisol** : Moins de couverture territoriale, pas de télésuivi natif, SAV plus lent (8h vs 4h AL)
**vs Linde Healthcare** : Gamme limitée en portable, pas de plateforme digitale praticien
**vs SOS Oxygène** : Acteur régional, pas d'innovation produit, dépendant fournisseurs tiers
**vs Bastide Médical** : Généraliste MAD, pas spécialiste respiratoire, formation patients limitée

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

  const visitPatterns = analyzeVisitPatterns(profile);
  const noteInsights = extractNoteInsights(profile);
  const publicationsFormatted = formatPublicationsForPitch(profile);
  const visitHistory = formatVisitHistory(profile);

  const daysSinceLastVisit = profile.lastVisitDate
    ? Math.floor((Date.now() - new Date(profile.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const productsMentioned: Record<string, number> = {};
  profile.visitHistory?.forEach(visit => {
    visit.productsDiscussed?.forEach(product => {
      productsMentioned[product] = (productsMentioned[product] || 0) + 1;
    });
  });
  const topProducts = Object.entries(productsMentioned)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([product, count]) => `${product} (${count}x)`);

  return `Génère un pitch ULTRA-PERSONNALISÉ pour ce praticien. Chaque section doit mentionner des éléments SPÉCIFIQUES tirés des données ci-dessous. INTERDIT de rester générique.

═══════════════════════════════════════════════════════════════════════════
PROFIL COMPLET DU PRATICIEN
═══════════════════════════════════════════════════════════════════════════

**IDENTITÉ:**
- Nom: ${profile.title} ${profile.firstName} ${profile.lastName}
- Spécialité: ${profile.specialty}${profile.subSpecialty ? ` — ${profile.subSpecialty}` : ''}
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

═══════════════════════════════════════════════════════════════════════════
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
