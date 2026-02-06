/**
 * Service de génération de prompts enrichis pour le Pitch Generator
 * Utilise toutes les données disponibles: profil, notes, actualités, historique de visites
 */

import type { Practitioner } from '../types';
import type { PitchConfig } from '../types/pitch';
import { DataService } from './dataService';
import type { PractitionerProfile } from '../types/database';
import { useUserDataStore } from '../stores/useUserDataStore';

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

  return `Tu es un expert commercial senior pour Air Liquide Santé, leader français de l'oxygénothérapie à domicile et des solutions pour patients BPCO.

Tu génères des pitchs commerciaux ULTRA-PERSONNALISÉS en utilisant TOUTES les informations disponibles sur le praticien : son profil, ses publications, ses préférences connues, l'historique des visites et des échanges.

RÈGLES IMPÉRATIVES:
- Ton: ${TONE_DESCRIPTIONS[config.tone]}
- Longueur cible: environ ${LENGTH_WORDS[config.length]} mots au total
- Focus principal: ${FOCUS_DESCRIPTIONS[config.focusArea]}
- Toujours vouvoyer le praticien
- UTILISER les données réelles fournies pour personnaliser (publications récentes, dernière visite, tendances)
- Ne jamais inventer de statistiques non fournies
- Le pitch doit être naturel, convaincant et montrer que vous connaissez vraiment le praticien

STRUCTURE OBLIGATOIRE - Utilise exactement ces balises:

${sections.includes('[ACCROCHE]') ? `[ACCROCHE]
Une phrase d'ouverture TRÈS personnalisée basée sur une actualité récente du praticien (publication, conférence) ou la dernière interaction. Doit montrer que vous suivez son actualité et capter l'attention immédiatement.
` : ''}
${sections.includes('[PROPOSITION]') ? `[PROPOSITION]
Présentation de la valeur ajoutée des produits Air Liquide. Reliez les bénéfices aux besoins spécifiques identifiés dans l'historique des échanges. Focus sur ${config.focusArea === 'general' ? 'un équilibre entre service et innovation' : FOCUS_DESCRIPTIONS[config.focusArea]}.
` : ''}
${sections.includes('[CONCURRENCE]') ? `[CONCURRENCE]
Différenciation factuelle par rapport aux concurrents. Utilisez des arguments concrets sans dénigrement. Si le praticien a des préférences connues, adressez-les.
` : ''}
${sections.includes('[CALL_TO_ACTION]') ? `[CALL_TO_ACTION]
Proposition concrète et engageante pour la prochaine étape. Basez-vous sur l'historique pour proposer quelque chose de cohérent avec les discussions précédentes.
` : ''}
${config.includeObjections ? `[OBJECTIONS]
3-4 objections courantes avec leurs réponses préparées. Basez-vous sur l'historique des interactions pour anticiper les objections spécifiques de ce praticien.
` : ''}
${config.includeTalkingPoints ? `[TALKING_POINTS]
5-7 points clés à aborder pendant l'entretien, ordonnés par priorité. Incluez des éléments personnalisés basés sur les données du praticien.
` : ''}

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

  // Get user-created visit reports for this practitioner
  const { visitReports: allReports, userNotes: allNotes } = useUserDataStore.getState();
  const myReports = allReports.filter(r => r.practitionerId === practitioner.id);
  const myNotes = allNotes.filter(n => n.practitionerId === practitioner.id);

  // Build user data context
  let userDataSection = '';
  if (myReports.length > 0) {
    userDataSection += `\n═══════════════════════════════════════════════════════════════════════════
COMPTES-RENDUS DE VISITE DU DÉLÉGUÉ
═══════════════════════════════════════════════════════════════════════════\n`;
    myReports.slice(0, 3).forEach(report => {
      userDataSection += `\n**${report.date} (${report.extractedInfo.sentiment}):**\n`;
      if (report.extractedInfo.keyPoints.length > 0) {
        userDataSection += `Points clés: ${report.extractedInfo.keyPoints.join(', ')}\n`;
      }
      if (report.extractedInfo.nextActions.length > 0) {
        userDataSection += `Actions suivantes: ${report.extractedInfo.nextActions.join(', ')}\n`;
      }
      if (report.extractedInfo.objections.length > 0) {
        userDataSection += `Objections exprimées: ${report.extractedInfo.objections.join(', ')}\n`;
      }
      if (report.extractedInfo.opportunities.length > 0) {
        userDataSection += `Opportunités: ${report.extractedInfo.opportunities.join(', ')}\n`;
      }
      if (report.extractedInfo.competitorsMentioned.length > 0) {
        userDataSection += `Concurrents mentionnés: ${report.extractedInfo.competitorsMentioned.join(', ')}\n`;
      }
    });
  }
  if (myNotes.length > 0) {
    userDataSection += `\n═══════════════════════════════════════════════════════════════════════════
NOTES STRATÉGIQUES DU DÉLÉGUÉ
═══════════════════════════════════════════════════════════════════════════\n`;
    myNotes.slice(0, 5).forEach(note => {
      userDataSection += `- [${note.type.toUpperCase()}] ${note.content}\n`;
    });
  }

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

${userDataSection}

IMPORTANT: Utilise les publications récentes et l'historique des visites pour personnaliser l'accroche.
${myReports.length > 0 ? 'UTILISE les comptes-rendus de visite du délégué pour adapter le ton et aborder les sujets en cours.' : ''}
${myReports.some(r => r.extractedInfo.objections.length > 0) ? 'ATTENTION: Des objections ont été relevées lors de visites précédentes - adresse-les proactivement dans le pitch.' : ''}
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
