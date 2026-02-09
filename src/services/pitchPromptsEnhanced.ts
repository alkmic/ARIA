/**
 * Service de génération de prompts enrichis pour le Pitch Generator
 * Utilise toutes les données disponibles: profil, notes, actualités, historique de visites
 */

import type { Practitioner } from '../types';
import type { PitchConfig } from '../types/pitch';
import { DataService } from './dataService';
import type { PractitionerProfile } from '../types/database';

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

/**
 * Récupère le profil complet du praticien avec toutes les données enrichies
 */
function getEnrichedPractitionerData(practitionerId: string): PractitionerProfile | null {
  return DataService.getPractitionerById(practitionerId) || null;
}

/**
 * Formate les notes de visite pour le contexte
 */
function formatVisitNotes(profile: PractitionerProfile): string {
  if (!profile.notes || profile.notes.length === 0) {
    return 'Aucune note de visite enregistrée.';
  }

  return profile.notes.slice(0, 5).map(note => {
    const date = new Date(note.date).toLocaleDateString('fr-FR');
    return `- [${date}] ${note.type.toUpperCase()}: ${note.content}${note.nextAction ? `\n  → Action suivante: ${note.nextAction}` : ''}`;
  }).join('\n');
}

/**
 * Formate les actualités et publications du praticien
 */
function formatNews(profile: PractitionerProfile): string {
  if (!profile.news || profile.news.length === 0) {
    return 'Aucune actualité référencée.';
  }

  const publications = profile.news.filter(n => n.type === 'publication');
  const conferences = profile.news.filter(n => n.type === 'conference');
  const certifications = profile.news.filter(n => n.type === 'certification');
  const awards = profile.news.filter(n => n.type === 'award');

  let result = '';

  if (publications.length > 0) {
    result += `**Publications (${publications.length}):**\n`;
    publications.slice(0, 3).forEach(pub => {
      result += `- "${pub.title}" (${new Date(pub.date).toLocaleDateString('fr-FR')})\n  ${pub.content}\n`;
    });
  }

  if (conferences.length > 0) {
    result += `\n**Conférences (${conferences.length}):**\n`;
    conferences.slice(0, 2).forEach(conf => {
      result += `- ${conf.title} (${new Date(conf.date).toLocaleDateString('fr-FR')})\n`;
    });
  }

  if (certifications.length > 0) {
    result += `\n**Certifications (${certifications.length}):**\n`;
    certifications.forEach(cert => {
      result += `- ${cert.title}\n`;
    });
  }

  if (awards.length > 0) {
    result += `\n**Distinctions (${awards.length}):**\n`;
    awards.forEach(award => {
      result += `- ${award.title}\n`;
    });
  }

  return result || 'Aucune actualité référencée.';
}

/**
 * Formate l'historique des visites
 */
function formatVisitHistory(profile: PractitionerProfile): string {
  if (!profile.visitHistory || profile.visitHistory.length === 0) {
    return 'Aucune visite enregistrée.';
  }

  return profile.visitHistory.slice(0, 5).map(visit => {
    const date = new Date(visit.date).toLocaleDateString('fr-FR');
    const products = visit.productsDiscussed?.join(', ') || 'Non renseigné';
    return `- [${date}] ${visit.type} (${visit.duration || '?'} min)\n  Produits: ${products}${visit.notes ? `\n  Notes: ${visit.notes}` : ''}`;
  }).join('\n');
}

/**
 * Construit le prompt système enrichi
 */
export function buildEnhancedSystemPrompt(config: PitchConfig): string {
  const sections = [
    '[ACCROCHE]',
    '[PROPOSITION]',
    '[CONCURRENCE]',
    '[CALL_TO_ACTION]'
  ];

  if (config.includeObjections) {
    sections.push('[OBJECTIONS]');
  }
  if (config.includeTalkingPoints) {
    sections.push('[TALKING_POINTS]');
  }

  // Add follow_up section
  sections.push('[FOLLOW_UP]');

  return `Tu es un Délégué Pharmaceutique expert pour Air Liquide Santé (via ses filiales Orkyn' et ALMS), leader français des prestations de santé à domicile pour les patients respiratoires.

Tu génères des pitchs commerciaux ULTRA-PERSONNALISÉS en utilisant TOUTES les informations disponibles sur le praticien : son profil, ses publications, ses préférences connues, l'historique des visites et des échanges.

═══════════════════════════════════════════════════════════════
CONNAISSANCE PRODUITS AIR LIQUIDE SANTÉ (utilise ces données)
═══════════════════════════════════════════════════════════════
**Oxygénothérapie (OLD / OCT):**
- VitalAire Confort+ : concentrateur premium, <39dB, connecté, télésuivi intégré
- FreeStyle Comfort : concentrateur portable 2,1kg, débit pulsé jusqu'à 6, autonomie 8h
- O2 liquide portable : système Helios/Companion pour patients très mobiles
- Station extracteur fixe : solution économique, fiabilité > 99,5%
- Télésuivi O2 Connect : monitoring SpO2, débit, observance en temps réel (plateforme EOVE)
- Critères OLD : PaO2 ≤ 55 mmHg ou PaO2 56-59 avec complications (HTAP, polyglobulie, désaturation nocturne)
- Critères OCT : 3 mois max, PaO2 entre 55-60 mmHg en situation aiguë

**VNI / PPC:**
- DreamStation BiLevel : VNI pour BPCO hypercapnique, algorithme auto-adaptatif
- ResMed AirSense 11 : PPC dernière génération, connectée, masque confort
- BPAP BiLevel ST : mode spontané/temporisé, pression 4-30 cmH2O

**Services différenciants:**
- Astreinte 24/7/365 : technicien en moins de 4h partout en France
- Éducation thérapeutique : programme certifié HAS pour patients BPCO
- Plateforme digitale : espace praticien avec suivi patients en temps réel
- Formation continue : DPC accrédité pour les professionnels de santé

**Remboursement (LPPR 2025):**
- OLD forfait 1 (concentrateur) : ~12€/jour
- OLD forfait 3 (O2 liquide) : ~18€/jour
- VNI : ~14€/jour (100% Sécu si ALD)
- Télésuivi : inclus dans le forfait, pas de surcoût

═══════════════════════════════════════════════════════════════
DONNÉES CLINIQUES BPCO (pour les pitchs techniques)
═══════════════════════════════════════════════════════════════
- GOLD 2025 : Classification ABE (groupe A, B, E) remplace ABCD
- 3,5 millions de patients BPCO en France, 75% sous-diagnostiqués
- Coût moyen exacerbation sévère : 8 000-12 000€ (hospitalisation)
- Télésuivi réduit les réhospitalisations de 25-40% (études récentes)
- Observance OLD > 15h/jour : amélioration survie significative à 5 ans

═══════════════════════════════════════════════════════════════
INTELLIGENCE CONCURRENTIELLE
═══════════════════════════════════════════════════════════════
**vs Vivisol** : Moins de couverture territoriale, pas de télésuivi natif, SAV plus lent (délai moyen 8h vs 4h AL)
**vs Linde Healthcare** : Gamme limitée en portable, pas de plateforme digitale praticien, tarifs similaires
**vs SOS Oxygène** : Acteur régional, pas d'innovation produit, dépendant fournisseurs tiers
**vs Bastide Médical** : Généraliste MAD, pas spécialiste respiratoire, formation patients limitée

RÈGLES IMPÉRATIVES:
- Ton: ${TONE_DESCRIPTIONS[config.tone]}
- Longueur cible: environ ${LENGTH_WORDS[config.length]} mots au total
- Focus principal: ${FOCUS_DESCRIPTIONS[config.focusArea]}
- Toujours vouvoyer le praticien
- UTILISER les données réelles fournies pour personnaliser (publications récentes, dernière visite, tendances)
- Ne jamais inventer de statistiques non fournies
- Le pitch doit être naturel, convaincant et montrer que vous connaissez vraiment le praticien
- Citer des données cliniques UNIQUEMENT si le ton est technique ou si le praticien est pneumologue

STRUCTURE OBLIGATOIRE - Utilise exactement ces balises:

${sections.includes('[ACCROCHE]') ? `[ACCROCHE]
Une ouverture TRÈS personnalisée (2-3 phrases) basée sur une actualité récente du praticien (publication, conférence) ou la dernière interaction. Doit montrer que vous suivez son actualité. Si le praticien est KOL, valorisez son expertise. Si jamais visité, créez un lien via sa spécialité ou sa localisation.
` : ''}
${sections.includes('[PROPOSITION]') ? `[PROPOSITION]
Présentation structurée de la valeur ajoutée Air Liquide. Reliez les bénéfices aux besoins spécifiques identifiés. Utilisez les données produits ci-dessus. Focus: ${config.focusArea === 'general' ? 'équilibre service/innovation' : FOCUS_DESCRIPTIONS[config.focusArea]}. Si pneumologue, intégrez des données cliniques. Si généraliste, restez pragmatique et simple.
` : ''}
${sections.includes('[CONCURRENCE]') ? `[CONCURRENCE]
Différenciation FACTUELLE par rapport aux concurrents mentionnés. Utilisez les données d'intelligence concurrentielle ci-dessus. Arguments concrets sans dénigrement : comparez les délais SAV, la couverture, l'innovation. Si le praticien a mentionné un concurrent dans ses notes, adressez ce concurrent en priorité.
` : ''}
${sections.includes('[CALL_TO_ACTION]') ? `[CALL_TO_ACTION]
Proposition concrète et engageante pour la prochaine étape. Exemples: démonstration produit en cabinet, mise en place d'un patient test, invitation à un événement, envoi de documentation technique, essai du télésuivi. Basez-vous sur l'historique.
` : ''}
${config.includeObjections ? `[OBJECTIONS]
4-5 objections courantes avec réponses préparées. Anticipez les objections basées sur l'historique (prix, complexité, changement de prestataire, etc.). Format: "**Objection:** ... → **Réponse:** ..."
` : ''}
${config.includeTalkingPoints ? `[TALKING_POINTS]
6-8 points clés ordonnés par priorité pour structurer l'entretien. Incluez: actualité du praticien, produit phare à présenter, données cliniques si pertinent, question ouverte à poser, proposition concrète. Format: puces numérotées.
` : ''}
[FOLLOW_UP]
Plan de suivi post-visite en 3 étapes (J+1, J+7, J+30) avec actions concrètes à chaque étape. Personnalisez selon le profil et les produits discutés.

Génère le pitch complet en suivant cette structure exacte.`;
}

/**
 * Construit le prompt utilisateur enrichi avec toutes les données du praticien
 */
export function buildEnhancedUserPrompt(practitioner: Practitioner, config: PitchConfig): string {
  // Récupérer les données complètes du praticien
  const profile = getEnrichedPractitionerData(practitioner.id);

  if (!profile) {
    // Fallback sur les données de base
    return buildBasicUserPrompt(practitioner, config);
  }

  const visitNotes = formatVisitNotes(profile);
  const news = formatNews(profile);
  const visitHistory = formatVisitHistory(profile);

  // Calculer des métriques supplémentaires
  const daysSinceLastVisit = profile.lastVisitDate
    ? Math.floor((Date.now() - new Date(profile.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const totalPublications = profile.news?.filter(n => n.type === 'publication').length || 0;
  const recentActivity = profile.news?.filter(n => {
    const newsDate = new Date(n.date);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return newsDate > sixMonthsAgo;
  }).length || 0;

  // Analyser les produits les plus discutés
  const productsMentioned: Record<string, number> = {};
  profile.visitHistory?.forEach(visit => {
    visit.productsDiscussed?.forEach(product => {
      productsMentioned[product] = (productsMentioned[product] || 0) + 1;
    });
  });
  const topProducts = Object.entries(productsMentioned)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([product]) => product);

  return `Génère un pitch ULTRA-PERSONNALISÉ pour ce praticien en utilisant TOUTES les informations ci-dessous:

═══════════════════════════════════════════════════════════════════════════
PROFIL COMPLET DU PRATICIEN
═══════════════════════════════════════════════════════════════════════════

**IDENTITÉ:**
- Nom complet: ${profile.title} ${profile.firstName} ${profile.lastName}
- Spécialité: ${profile.specialty}${profile.subSpecialty ? ` (${profile.subSpecialty})` : ''}
- Établissement/Ville: ${profile.address.city}
- Adresse: ${profile.address.street}, ${profile.address.postalCode}

**MÉTRIQUES BUSINESS:**
- Volume annuel prescrit: ${profile.metrics.volumeL.toLocaleString()} litres O2 (${(profile.metrics.volumeL / 1000).toFixed(0)}K L)
- Score de fidélité: ${profile.metrics.loyaltyScore}/10
- Vingtile: ${profile.metrics.vingtile} ${profile.metrics.vingtile <= 5 ? '(Top prescripteur)' : profile.metrics.vingtile <= 10 ? '(Prescripteur important)' : ''}
- Key Opinion Leader: ${profile.metrics.isKOL ? 'OUI - Praticien influent dans son domaine' : 'Non'}
- Potentiel de croissance: +${profile.metrics.potentialGrowth}%
- Risque de churn: ${profile.metrics.churnRisk === 'high' ? 'ÉLEVÉ - Attention requise' : profile.metrics.churnRisk === 'medium' ? 'Moyen - À surveiller' : 'Faible'}

**HISTORIQUE DE RELATION:**
- Dernière visite: ${daysSinceLastVisit !== null ? `Il y a ${daysSinceLastVisit} jours` : 'Jamais visité'}
- Prochaine visite planifiée: ${profile.nextScheduledVisit ? new Date(profile.nextScheduledVisit).toLocaleDateString('fr-FR') : 'Non planifiée'}
${topProducts.length > 0 ? `- Produits favoris (historique): ${topProducts.join(', ')}` : ''}

═══════════════════════════════════════════════════════════════════════════
ACTUALITÉS ET PUBLICATIONS DU PRATICIEN
═══════════════════════════════════════════════════════════════════════════
${news}

**Statistiques:**
- Total publications: ${totalPublications}
- Activité récente (6 mois): ${recentActivity} événement(s)

═══════════════════════════════════════════════════════════════════════════
HISTORIQUE DES VISITES RÉCENTES
═══════════════════════════════════════════════════════════════════════════
${visitHistory}

═══════════════════════════════════════════════════════════════════════════
NOTES ET OBSERVATIONS
═══════════════════════════════════════════════════════════════════════════
${visitNotes}

═══════════════════════════════════════════════════════════════════════════
CONFIGURATION DU PITCH
═══════════════════════════════════════════════════════════════════════════
- Longueur souhaitée: ${config.length} (environ ${LENGTH_WORDS[config.length]} mots)
- Ton: ${config.tone} (${TONE_DESCRIPTIONS[config.tone]})
- Focus: ${config.focusArea} (${FOCUS_DESCRIPTIONS[config.focusArea]})
- Produits à mettre en avant: ${config.products.length > 0 ? config.products.join(', ') : 'Gamme complète'}
- Concurrents à adresser: ${config.competitors.length > 0 ? config.competitors.join(', ') : 'Aucun spécifiquement'}
- Inclure gestion des objections: ${config.includeObjections ? 'OUI' : 'Non'}
- Inclure points de discussion: ${config.includeTalkingPoints ? 'OUI' : 'Non'}

${config.additionalInstructions ? `**INSTRUCTIONS SPÉCIALES DU COMMERCIAL:**\n${config.additionalInstructions}` : ''}

═══════════════════════════════════════════════════════════════════════════

IMPORTANT: Utilise les publications récentes et l'historique des visites pour personnaliser l'accroche.
${profile.metrics.isKOL ? 'Ce praticien est un KOL - sois particulièrement attentif et professionnel.' : ''}
${profile.metrics.churnRisk === 'high' ? 'ATTENTION: Risque de churn élevé - le pitch doit être particulièrement convaincant et adresser les éventuelles frustrations.' : ''}
${totalPublications > 0 ? `Mentionne si possible une de ses ${totalPublications} publication(s) dans l'accroche.` : ''}

Génère maintenant le pitch complet en suivant la structure demandée.`;
}

/**
 * Prompt de base si les données enrichies ne sont pas disponibles
 */
function buildBasicUserPrompt(practitioner: Practitioner, config: PitchConfig): string {
  const conversationHistory = practitioner.conversations?.slice(0, 2).map(c =>
    `- ${c.date}: ${c.summary}`
  ).join('\n') || 'Aucun historique disponible';

  return `Génère un pitch personnalisé pour ce praticien:

PROFIL PRATICIEN:
- Nom complet: ${practitioner.title} ${practitioner.firstName} ${practitioner.lastName}
- Spécialité: ${practitioner.specialty}
- Établissement/Ville: ${practitioner.city}
- Volume annuel prescrit: ${practitioner.volumeL.toLocaleString()} litres d'O2
- Nombre de patients estimé: ${practitioner.patientCount}
- Key Opinion Leader: ${practitioner.isKOL ? 'Oui - praticien influent' : 'Non'}
- Dernière visite: ${practitioner.lastVisitDate || 'Jamais visité'}
- Tendance des prescriptions: ${practitioner.trend === 'up' ? 'En hausse' : practitioner.trend === 'down' ? 'En baisse' : 'Stable'}
- Score de fidélité: ${practitioner.loyaltyScore}/10

HISTORIQUE DES ÉCHANGES:
${conversationHistory}

SYNTHÈSE IA DU PRATICIEN:
${practitioner.aiSummary}

CONFIGURATION DU PITCH:
- Longueur souhaitée: ${config.length} (environ ${LENGTH_WORDS[config.length]} mots)
- Ton: ${config.tone}
- Produits à mettre en avant: ${config.products.join(', ') || 'Gamme complète'}
- Concurrents à adresser: ${config.competitors.join(', ') || 'Aucun spécifiquement'}

${config.additionalInstructions ? `INSTRUCTIONS SPÉCIALES:\n${config.additionalInstructions}` : ''}

Génère le pitch en suivant la structure demandée.`;
}

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
  const additionalContext = profile ? `
CONTEXTE PRATICIEN:
- ${profile.title} ${profile.firstName} ${profile.lastName}
- ${profile.specialty} à ${profile.address.city}
- KOL: ${profile.metrics.isKOL ? 'Oui' : 'Non'}
- Publications: ${profile.news?.filter(n => n.type === 'publication').length || 0}
` : '';

  return `Tu dois réécrire uniquement ${sectionNames[sectionId] || 'cette section'} du pitch commercial.

${additionalContext}

CONTEXTE DU PITCH COMPLET (pour cohérence):
${fullPitchContext}

CONTENU ACTUEL DE LA SECTION À RÉÉCRIRE:
${currentContent}

INSTRUCTION DU COMMERCIAL:
${userInstruction}

RÈGLES:
- Garde le même ton et style que le reste du pitch
- Respecte approximativement la même longueur
- Intègre l'instruction du commercial
- Utilise les données du praticien si pertinent
- Ne génère QUE le nouveau contenu de cette section, sans balise ni titre

Nouveau contenu:`;
}

/**
 * Génère un résumé du praticien pour la prévisualisation
 */
export function generatePractitionerSummary(practitionerId: string): string {
  const profile = getEnrichedPractitionerData(practitionerId);

  if (!profile) {
    return 'Données non disponibles';
  }

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

  // Dernière actualité
  if (profile.news && profile.news.length > 0) {
    const latestNews = profile.news[0];
    summary += `\n**Dernière actualité:**\n`;
    summary += `_${latestNews.title}_ (${new Date(latestNews.date).toLocaleDateString('fr-FR')})\n`;
  }

  // Dernière note
  if (profile.notes && profile.notes.length > 0) {
    const latestNote = profile.notes[0];
    summary += `\n**Dernière note:**\n`;
    summary += `${latestNote.content.substring(0, 100)}...\n`;
  }

  return summary;
}
