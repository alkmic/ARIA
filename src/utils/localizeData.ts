/**
 * Utility to localize mock data that is hardcoded in French.
 * Used at display time to translate dynamic data strings
 * (specialties, month names, AI summaries, etc.)
 */
import { getLanguage } from '../i18n';
import type { Language } from '../i18n/LanguageContext';

/** Bilingual helper: returns EN or FR based on current language */
export function txt(fr: string, en: string): string {
  return getLanguage() === 'en' ? en : fr;
}

/** Same but accepts an explicit language parameter */
export function txtLang(fr: string, en: string, lang: Language): string {
  return lang === 'en' ? en : fr;
}

// ─── Specialty names ───────────────────────────────────────────
const specialtyMap: Record<string, string> = {
  'Pneumologue': 'Pulmonologist',
  'Médecin généraliste': 'General Practitioner',
};

export function localizeSpecialty(specialty: string): string {
  if (getLanguage() !== 'en') return specialty;
  return specialtyMap[specialty] || specialty;
}

// ─── Month abbreviations ──────────────────────────────────────
const monthFrToEn: Record<string, string> = {
  'Jan': 'Jan', 'Fév': 'Feb', 'Mar': 'Mar', 'Avr': 'Apr',
  'Mai': 'May', 'Jun': 'Jun', 'Jul': 'Jul', 'Aoû': 'Aug',
  'Août': 'Aug', 'Sep': 'Sep', 'Oct': 'Oct', 'Nov': 'Nov', 'Déc': 'Dec',
};

export function localizeMonth(month: string): string {
  if (getLanguage() !== 'en') return month;
  return monthFrToEn[month] || month;
}

// ─── User role ─────────────────────────────────────────────────
const roleMap: Record<string, string> = {
  'Déléguée Pharmaceutique': 'Pharmaceutical Representative',
  'Délégué Pharmaceutique': 'Pharmaceutical Representative',
  'Directeur Régional': 'Regional Manager',
};

export function localizeRole(role: string): string {
  if (getLanguage() !== 'en') return role;
  return roleMap[role] || role;
}

// ─── Practice type (for data values, not UI labels) ───────────
const practiceTypeMap: Record<string, string> = {
  'Libéral intégral': 'Full private practice',
  'Libéral temps partiel': 'Part-time private practice',
  'Mixte': 'Mixed',
};

export function localizePracticeType(type: string): string {
  if (getLanguage() !== 'en') return type;
  return practiceTypeMap[type] || type;
}

// ─── Channel preference ───────────────────────────────────────
const channelMap: Record<string, string> = {
  'Téléphone': 'Phone',
  'Face-to-face': 'Face-to-face',
  'Email': 'Email',
};

export function localizeChannel(channel: string): string {
  if (getLanguage() !== 'en') return channel;
  return channelMap[channel] || channel;
}

// ─── AI Summary translations ──────────────────────────────────
// Maps known French AI summaries to English equivalents
const aiSummaryMap: Record<string, string> = {
  "Prescripteur régulier et fidèle. Apprécie les échanges techniques sur les innovations thérapeutiques. Montre un intérêt particulier pour les études cliniques récentes.":
    "Regular and loyal prescriber. Appreciates technical discussions on therapeutic innovations. Shows particular interest in recent clinical studies.",
  "Médecin investi dans la prise en charge BPCO. Collabore avec plusieurs pneumologues. Ouvert aux nouvelles solutions pour améliorer le confort de ses patients.":
    "Physician committed to COPD management. Collaborates with several pulmonologists. Open to new solutions to improve patient comfort.",
  "Praticien expérimenté, très attaché aux preuves scientifiques. Participe activement aux formations continues. Excellent relais d'opinion auprès de ses confrères.":
    "Experienced practitioner, strongly attached to scientific evidence. Actively participates in continuing education. Excellent opinion relay among peers.",
  "Jeune installé dynamique, à l'écoute des innovations. Utilise beaucoup les outils digitaux. Potentiel de croissance important sur son secteur.":
    "Dynamic young practitioner, receptive to innovations. Heavy user of digital tools. Significant growth potential in their area.",
  "Médecin très organisé, préfère les rendez-vous planifiés. Apprécie les supports visuels et les données chiffrées. Prescripteur méthodique et rigoureux.":
    "Very organized physician, prefers scheduled appointments. Appreciates visual materials and quantitative data. Methodical and rigorous prescriber.",
  "Praticien de proximité, forte patientèle gériatrique. Sensible aux arguments de qualité de vie et de maintien à domicile. Très à l'écoute de ses patients.":
    "Community practitioner with a large geriatric patient base. Responsive to quality of life and home care arguments. Very attentive to patients.",
  "Leader d'opinion reconnu dans sa région. Intervient régulièrement en formation. Excellent contact pour les nouvelles études ou innovations produit.":
    "Recognized opinion leader in the region. Regularly involved in training. Excellent contact for new studies or product innovations.",
  "Médecin pragmatique, orienté résultats. Apprécie l'efficacité dans les échanges. Bon prescripteur quand il est convaincu de la valeur ajoutée.":
    "Pragmatic, results-oriented physician. Appreciates efficiency in exchanges. Good prescriber when convinced of added value.",
  "Praticien récemment installé, en phase de développement de patientèle. Montre beaucoup d'intérêt et de curiosité. Opportunité de fidélisation.":
    "Recently established practitioner, building patient base. Shows strong interest and curiosity. Loyalty-building opportunity.",
  "Médecin expérimenté proche de la retraite. Prescriptions stables. Maintient une pratique de qualité avec ses patients historiques.":
    "Experienced physician nearing retirement. Stable prescriptions. Maintains quality practice with long-term patients.",
};

export function localizeAiSummary(summary: string): string {
  if (getLanguage() !== 'en') return summary;
  return aiSummaryMap[summary] || summary;
}

// ─── Next Best Actions translations ───────────────────────────
const nextActionMap: Record<string, string> = {
  "Proposer un rendez-vous pour présenter les nouvelles options thérapeutiques":
    "Schedule an appointment to present new therapeutic options",
  "Partager l'étude clinique récente sur l'oxygénothérapie portable":
    "Share the recent clinical study on portable oxygen therapy",
  "Inviter à la prochaine formation sur la prise en charge BPCO":
    "Invite to the next COPD management training session",
  "Faire le point sur les patients actuels et identifier de nouveaux besoins":
    "Review current patients and identify new needs",
  "Organiser une visite conjointe avec un confrère pneumologue":
    "Organize a joint visit with a pulmonologist colleague",
  "Présenter le nouveau dispositif de télésuivi des patients":
    "Present the new remote patient monitoring device",
  "Proposer un support patient pour l'éducation thérapeutique":
    "Offer patient support for therapeutic education",
  "Planifier un déjeuner-formation avec d'autres praticiens du secteur":
    "Plan a lunch-and-learn with other practitioners in the area",
  "Envoyer la documentation sur les dernières innovations produit":
    "Send documentation on the latest product innovations",
  "Recueillir son retour d'expérience sur les patients équipés":
    "Gather feedback on equipped patients",
  "Planifier une visite pour discuter des dernières innovations":
    "Schedule a visit to discuss the latest innovations",
  "Visite de courtoisie et point sur les patients actuels":
    "Courtesy visit and review of current patients",
};

export function localizeNextAction(action: string): string {
  if (getLanguage() !== 'en') return action;
  return nextActionMap[action] || action;
}

// ─── Conversation summary translations ────────────────────────
const conversationSummaryMap: Record<string, string> = {
  "Discussion sur l'évolution de 3 patients sous O2. Retours positifs sur l'autonomie retrouvée.":
    "Discussion on the progress of 3 patients on O2. Positive feedback on regained autonomy.",
  "Présentation des résultats de l'étude SUMMIT. Questions sur les critères de prescription.":
    "Presentation of SUMMIT study results. Questions about prescription criteria.",
  "Point sur les nouvelles modalités de prise en charge. Intérêt pour le télésuivi.":
    "Update on new care modalities. Interest in remote monitoring.",
  "Échange sur un cas complexe de BPCO sévère. Coordination avec le pneumologue référent.":
    "Discussion on a complex severe COPD case. Coordination with the referring pulmonologist.",
  "Formation sur les nouveaux débitmètres portables. Démonstration appréciée.":
    "Training on new portable flow meters. Demonstration appreciated.",
  "Retour d'expérience patient très positif. Demande de documentation complémentaire.":
    "Very positive patient feedback. Request for additional documentation.",
  "Discussion sur l'observance thérapeutique. Intérêt pour les outils d'accompagnement.":
    "Discussion on treatment adherence. Interest in support tools.",
  "Questions sur les modalités de remboursement et démarches administratives.":
    "Questions about reimbursement procedures and administrative processes.",
};

export function localizeConversationSummary(summary: string): string {
  if (getLanguage() !== 'en') return summary;
  // Handle truncated summaries (from dataAdapter) - try partial match
  for (const [fr, en] of Object.entries(conversationSummaryMap)) {
    if (summary.startsWith(fr.substring(0, 30))) return en;
  }
  return summary;
}

// ─── Visit notes translations ─────────────────────────────────
const visitNoteMap: Record<string, string> = {
  'Présentation des nouvelles options thérapeutiques': 'Presentation of new therapeutic options',
  'Suivi KOL - Discussion nouveaux protocoles': 'KOL follow-up - New protocols discussion',
  'Visite de routine - Point sur les prescriptions': 'Routine visit - Prescription review',
  'Visite de réactivation - Praticien à risque': 'Reactivation visit - At-risk practitioner',
};

export function localizeVisitNote(note: string): string {
  if (getLanguage() !== 'en') return note;
  return visitNoteMap[note] || note;
}
