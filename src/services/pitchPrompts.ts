import type { Practitioner } from '../types';
import type { PitchConfig } from '../types/pitch';

const LENGTH_WORDS = {
  short: 150,
  medium: 300,
  long: 500,
};

const TONE_DESCRIPTIONS = {
  formal: 'professionnel et institutionnel, vouvoiement strict',
  conversational: 'chaleureux et naturel, tout en restant professionnel',
  technical: 'précis et technique, avec des données cliniques',
};

export function buildSystemPrompt(config: PitchConfig): string {
  return `Tu es un assistant commercial expert pour Air Liquide Santé, leader français de l'oxygénothérapie à domicile et des solutions pour patients BPCO (Broncho-Pneumopathie Chronique Obstructive).

Tu génères des pitchs commerciaux personnalisés pour des délégués pharmaceutiques qui visitent des professionnels de santé.

RÈGLES STRICTES:
- Ton: ${TONE_DESCRIPTIONS[config.tone]}
- Longueur cible: environ ${LENGTH_WORDS[config.length]} mots au total
- Toujours vouvoyer le praticien
- Utiliser des données concrètes fournies dans le contexte
- Ne jamais inventer de statistiques non fournies
- Le pitch doit être naturel et convaincant, pas robotique

STRUCTURE OBLIGATOIRE - Utilise exactement ces balises:

[ACCROCHE]
Une phrase d'ouverture personnalisée et percutante basée sur le contexte du praticien. Doit capter l'attention immédiatement.

[PROPOSITION]
Présentation claire de la valeur ajoutée des produits Air Liquide sélectionnés. Focus sur les bénéfices pour le praticien ET ses patients.

[CONCURRENCE]
Différenciation factuelle par rapport aux concurrents mentionnés. Arguments concrets sans dénigrement.

[CALL_TO_ACTION]
Proposition concrète et engageante pour la prochaine étape. Doit être actionnable et réaliste.

Génère le pitch complet en suivant cette structure exacte.`;
}

export function buildUserPrompt(practitioner: Practitioner, config: PitchConfig): string {
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
- Canal de contact préféré: ${practitioner.preferredChannel}
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

${config.additionalInstructions ? `INSTRUCTIONS SPÉCIALES DU COMMERCIAL:\n${config.additionalInstructions}` : ''}

Génère maintenant le pitch en respectant la structure [ACCROCHE], [PROPOSITION], [CONCURRENCE], [CALL_TO_ACTION].`;
}

export function buildRegenerateSectionPrompt(
  sectionId: string,
  currentContent: string,
  userInstruction: string,
  fullPitchContext: string
): string {
  const sectionNames: Record<string, string> = {
    hook: "l'accroche",
    proposition: 'la proposition de valeur',
    competition: 'la différenciation concurrentielle',
    cta: "l'appel à l'action",
  };

  return `Tu dois réécrire uniquement ${sectionNames[sectionId]} du pitch commercial.

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
- Ne génère QUE le nouveau contenu de cette section, sans balise ni titre

Nouveau contenu:`;
}
