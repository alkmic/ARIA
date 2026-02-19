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

// ─── News Title translations ─────────────────────────────────
const newsTitleMap: Record<string, string> = {
  // Pneumo publication titles
  "Publication dans l'European Respiratory Journal": "Publication in the European Respiratory Journal",
  "Article dans Revue des Maladies Respiratoires": "Article in Revue des Maladies Respiratoires",
  "Étude multicentrique parue dans CHEST": "Multicenter study published in CHEST",
  "Lettre à l'éditeur dans Thorax": "Letter to the editor in Thorax",
  "Revue systématique dans Respiratory Medicine": "Systematic review in Respiratory Medicine",
  "Article original dans Pneumologie Clinique": "Original article in Clinical Pulmonology",
  "Chapitre dans le Traité de Pneumologie (EMC)": "Chapter in the Treatise on Pulmonology (EMC)",
  // Pneumo other titles
  "Certification Universitaire": "University Certification",
  "Intervention au congrès": "Conference presentation",
  "Distinction professionnelle": "Professional distinction",
  "Organisation d'un événement médical": "Organization of a medical event",
  // Generaliste publication titles
  "Article dans la Revue du Praticien": "Article in Revue du Praticien",
  "Publication dans Exercer - Revue de médecine générale": "Publication in Exercer - General Medicine Journal",
  "Contribution au Quotidien du Médecin": "Contribution to Le Quotidien du Médecin",
  "Article dans Médecine - Revue de l'UNAFORMEC": "Article in Médecine - UNAFORMEC Journal",
  // Generaliste other titles
  "Formation certifiante": "Certified training",
  "Participation à un congrès": "Conference participation",
  "Événement médical local": "Local medical event",
  // New practitioner override titles
  "Nomination comme chef de service pneumologie au CHU Lyon-Sud": "Appointed as head of pulmonology department at CHU Lyon-Sud",
  "Publication dans The Lancet Respiratory Medicine": "Publication in The Lancet Respiratory Medicine",
  "Ouverture d'un cabinet de pneumologie à Grenoble Europole": "Opening of a pulmonology practice in Grenoble Europole",
  "DIU Sommeil et Ventilation obtenu à Paris-Descartes": "Inter-university diploma in Sleep and Ventilation obtained at Paris-Descartes",
  "Création d'une maison de santé pluriprofessionnelle à Annecy-le-Vieux": "Creation of a multi-professional health center in Annecy-le-Vieux",
  "Recrutement au CHU de Saint-Étienne — Service pneumo-oncologie": "Recruitment at CHU de Saint-Étienne — Pulmonary oncology department",
  "Communication orale au Congrès de Pneumologie de Langue Française 2025": "Oral presentation at the French-Language Pulmonology Congress 2025",
  "Reprise du cabinet du Dr Maurin à Valence (départ en retraite)": "Takeover of Dr Maurin's practice in Valence (retirement)",
  "Lancement du réseau Respir'Alpes (réseau sentinelle BPCO)": "Launch of the Respir'Alpes network (COPD sentinel network)",
  "Étude dans la Revue des Maladies Respiratoires": "Study in the Revue des Maladies Respiratoires",
};

export function localizeNewsTitle(title: string): string {
  if (getLanguage() !== 'en') return title;
  return newsTitleMap[title] || title;
}

// ─── News Content translations ───────────────────────────────
// Exact-match map for hardcoded new-practitioner content
const newsContentExactMap: Record<string, string> = {
  "Nommé chef du service de pneumologie au CHU Lyon-Sud, succédant au Pr Étienne qui part en retraite. Prend en charge un service de 45 lits avec une unité de soins intensifs respiratoires. Fort potentiel prescripteur — pas encore dans notre réseau.":
    "Appointed head of the pulmonology department at CHU Lyon-Sud, succeeding Pr Étienne who is retiring. Takes over a 45-bed department with a respiratory intensive care unit. High prescribing potential — not yet in our network.",
  "Co-auteur principal d'une étude randomisée sur l'impact du télésuivi SpO2 continu sur la réduction des hospitalisations chez les patients BPCO sévères. Résultats : -42% de réhospitalisations à 6 mois.":
    "Lead co-author of a randomized study on the impact of continuous SpO2 remote monitoring on reducing hospitalizations in severe COPD patients. Results: -42% rehospitalizations at 6 months.",
  "Installation récente dans le quartier Europole de Grenoble, spécialisée en pathologies du sommeil et ventilation non invasive. Patientèle en construction, réfère actuellement au CHU de Grenoble.":
    "Recently established in the Europole district of Grenoble, specializing in sleep disorders and non-invasive ventilation. Building patient base, currently refers to CHU de Grenoble.",
  "Obtention du DIU de pathologies du sommeil et ventilation, formation reconnue comme référence en France. Spécialisation en SAHOS et overlap syndrome.":
    "Obtained the inter-university diploma in sleep disorders and ventilation, a training recognized as a reference in France. Specialization in OSAHS and overlap syndrome.",
  "Cofondateur de la MSP des Aravis avec 4 MG, 2 IDE, 1 kiné et 1 pharmacien. Structure orientée parcours de soins chroniques avec un accent sur les pathologies respiratoires (zone de montagne).":
    "Co-founder of the MSP des Aravis with 4 GPs, 2 nurses, 1 physiotherapist and 1 pharmacist. Structure focused on chronic care pathways with an emphasis on respiratory diseases (mountain area).",
  "Nouvellement recrutée comme PH en pneumo-oncologie au CHU de Saint-Étienne. Arrive du CHU de Toulouse où elle était assistante. Spécialisation dans la prise en charge palliative des cancers bronchiques avec oxygénothérapie.":
    "Newly recruited as a hospital practitioner in pulmonary oncology at CHU de Saint-Étienne. Coming from CHU de Toulouse where she was an assistant. Specialization in palliative care of bronchial cancers with oxygen therapy.",
  "Présentation sur l'optimisation de l'oxygénothérapie palliative chez les patients atteints de cancer bronchique non à petites cellules. Focus sur la qualité de vie et le maintien à domicile.":
    "Presentation on optimizing palliative oxygen therapy in patients with non-small cell lung cancer. Focus on quality of life and home care.",
  "Reprend le cabinet du Dr Maurin qui comptait 15 patients sous oxygénothérapie suivis par Bastide Médical. Le Dr Joubert souhaite réévaluer les contrats fournisseurs et moderniser les équipements.":
    "Takes over Dr Maurin's practice which had 15 patients on oxygen therapy managed by Bastide Médical. Dr Joubert wishes to reassess supplier contracts and modernize equipment.",
  "Initiatrice et coordinatrice du réseau Respir'Alpes, premier réseau sentinelle de dépistage et suivi BPCO en Savoie. 12 MG et 3 pneumologues impliqués. Objectif : 500 spirométries de dépistage en 2026.":
    "Initiator and coordinator of the Respir'Alpes network, the first COPD screening and monitoring sentinel network in Savoie. 12 GPs and 3 pulmonologists involved. Goal: 500 screening spirometries in 2026.",
  "Publication sur le sous-diagnostic de la BPCO en zones rurales et de montagne. Données sur 800 patients en Savoie montrant un retard diagnostique moyen de 5 ans. Plaidoyer pour le dépistage systématique en médecine de ville.":
    "Publication on the under-diagnosis of COPD in rural and mountain areas. Data on 800 patients in Savoie showing an average diagnostic delay of 5 years. Advocacy for systematic screening in primary care.",
};

// Prefix-based content template translations
const newsContentPrefixMap: Array<[string, string]> = [
  ["Co-auteur d'une étude sur ", "Co-author of a study on "],
  ["Publication d'un cas clinique sur ", "Case report on "],
  ["Investigateur principal pour une étude sur ", "Principal investigator for a study on "],
  ["Commentaire sur ", "Commentary on "],
  ["Analyse de la littérature sur ", "Literature review on "],
  ["Étude prospective sur ", "Prospective study on "],
  ["Rédaction d'un chapitre sur ", "Writing of a chapter on "],
  ["Obtention d'un ", "Obtained a "],
  ["Présentation sur ", "Presentation on "],
  ["Reconnaissance pour ", "Recognition for "],
  ["Publication sur ", "Publication on "],
  ["Retour d'expérience sur ", "Experience report on "],
  ["Tribune sur ", "Op-ed on "],
  ["Synthèse pratique sur ", "Practice review on "],
  ["Intervention sur ", "Presentation on "],
];

// Topic translations (all topics from pneumo and generaliste templates)
const topicMap: Record<string, string> = {
  // ── Pneumo publication topics (European Respiratory Journal) ──
  "le sevrage tabagique chez le patient BPCO sous oxygénothérapie": "smoking cessation in COPD patients on oxygen therapy",
  "l'optimisation des débits d'O2 en fonction de l'activité physique": "optimizing O2 flow rates based on physical activity",
  "l'impact de l'oxygénothérapie nocturne sur la qualité de vie": "the impact of nocturnal oxygen therapy on quality of life",
  "les nouvelles recommandations pour l'oxygénothérapie ambulatoire": "new guidelines for ambulatory oxygen therapy",
  "la place du télésuivi dans le parcours de soins BPCO": "the role of remote monitoring in the COPD care pathway",
  "l'évaluation de la dyspnée chez les patients sous OLD": "dyspnea assessment in patients on LTOT",
  "la phénotypisation des patients BPCO pour l'oxygénothérapie personnalisée": "phenotyping COPD patients for personalized oxygen therapy",
  "les facteurs prédictifs de mauvaise observance de l'OLD": "predictive factors of poor LTOT adherence",
  // ── Pneumo publication topics (Revue des Maladies Respiratoires) ──
  "la gestion de l'hypoxémie sévère en ambulatoire": "managing severe hypoxemia in outpatient settings",
  "l'adaptation des traitements chez les patients BPCO âgés": "treatment adaptation in elderly COPD patients",
  "les complications de l'oxygénothérapie de longue durée": "complications of long-term oxygen therapy",
  "l'optimisation de la VNI chez le patient obèse hypercapnique": "optimizing NIV in obese hypercapnic patients",
  "la réhabilitation respiratoire en post-exacerbation": "pulmonary rehabilitation post-exacerbation",
  "la prise en charge de l'insuffisance respiratoire aiguë sur chronique": "management of acute-on-chronic respiratory failure",
  "le suivi à distance des patients sous oxygénothérapie de déambulation": "remote monitoring of patients on ambulatory oxygen therapy",
  // ── Pneumo publication topics (CHEST) ──
  "les biomarqueurs prédictifs d'exacerbation BPCO": "predictive biomarkers for COPD exacerbation",
  "la télémédecine appliquée au suivi des patients sous O2": "telemedicine applied to monitoring patients on O2",
  "les bénéfices de l'oxygénothérapie de déambulation": "the benefits of ambulatory oxygen therapy",
  "l'impact de l'activité physique supervisée chez le patient sous OLD": "the impact of supervised physical activity in LTOT patients",
  // ── Pneumo publication topics (Thorax) ──
  "les critères de sevrage de l'oxygénothérapie longue durée": "criteria for weaning off long-term oxygen therapy",
  "l'utilisation du NO exhalé dans le suivi BPCO": "the use of exhaled NO in COPD monitoring",
  "la place de la réhabilitation pulmonaire précoce": "the role of early pulmonary rehabilitation",
  "les recommandations ERS sur la VNI à domicile": "ERS guidelines on home NIV",
  // ── Pneumo publication topics (Respiratory Medicine) ──
  "l'observance de l'OLD au-delà de 15h/jour et mortalité": "LTOT adherence beyond 15h/day and mortality",
  "la VNI versus l'O2 seul en BPCO sévère hypercapnique": "NIV versus O2 alone in severe hypercapnic COPD",
  "les dispositifs connectés en pneumologie ambulatoire": "connected devices in ambulatory pulmonology",
  "l'évaluation médico-économique du télésuivi respiratoire": "medico-economic evaluation of respiratory remote monitoring",
  // ── Pneumo publication topics (Pneumologie Clinique) ──
  "la satisfaction des patients sous concentrateur portable": "patient satisfaction with portable concentrators",
  "l'adhésion au traitement par PPC chez les patients SAHOS sévères": "CPAP treatment adherence in severe OSAHS patients",
  "les comorbidités cardiovasculaires des patients BPCO sous OLD": "cardiovascular comorbidities in COPD patients on LTOT",
  "le rôle de l'infirmier coordinateur dans le parcours BPCO": "the role of the coordinating nurse in the COPD pathway",
  // ── Pneumo publication topics (EMC) ──
  "les indications et modalités de l'oxygénothérapie de longue durée": "indications and modalities of long-term oxygen therapy",
  "la ventilation mécanique à domicile : indications et surveillance": "home mechanical ventilation: indications and monitoring",
  "le syndrome obésité-hypoventilation : diagnostic et traitement": "obesity hypoventilation syndrome: diagnosis and treatment",
  // ── Pneumo conference topics ──
  "les avancées en oxygénothérapie": "advances in oxygen therapy",
  "la prise en charge des BPCO sévères": "management of severe COPD",
  "l'éducation thérapeutique du patient respiratoire": "therapeutic education for respiratory patients",
  "l'observance du traitement par O2 au long cours": "long-term O2 treatment adherence",
  "les parcours de soins innovants en pneumologie": "innovative care pathways in pulmonology",
  "le rôle du télésuivi en post-hospitalisation BPCO": "the role of remote monitoring in post-hospitalization COPD",
  "les nouvelles cibles thérapeutiques dans l'asthme sévère": "new therapeutic targets in severe asthma",
  // ── Pneumo event topics ──
  "la gestion de l'oxygénothérapie en ville": "managing oxygen therapy in community practice",
  "les nouvelles technologies en assistance respiratoire": "new technologies in respiratory support",
  "le parcours de soins du patient BPCO": "the COPD patient care pathway",
  "l'interprofessionnalité dans la prise en charge respiratoire": "interprofessional care in respiratory management",
  "les innovations en ventilation à domicile": "innovations in home ventilation",
  "l'utilisation des données connectées en pneumologie": "the use of connected data in pulmonology",
  // ── Generaliste publication topics (Revue du Praticien) ──
  "le dépistage de la BPCO en soins primaires": "COPD screening in primary care",
  "la coordination ville-hôpital pour les patients sous O2": "community-hospital coordination for patients on O2",
  "les red flags en consultation pour orientation pneumologique": "red flags in consultation for pulmonology referral",
  "l'accompagnement du patient BPCO en médecine générale": "supporting the COPD patient in general practice",
  "le rôle du médecin traitant dans le renouvellement de l'OLD": "the role of the attending physician in LTOT renewal",
  "la gestion du sevrage tabagique en cabinet de ville": "managing smoking cessation in community practice",
  "les critères d'adressage au pneumologue pour bilan respiratoire": "referral criteria to a pulmonologist for respiratory assessment",
  // ── Generaliste publication topics (Exercer) ──
  "l'organisation de la consultation BPCO en cabinet libéral": "organizing COPD consultations in private practice",
  "la place de la spirométrie au cabinet du généraliste": "the role of spirometry in the GP's office",
  "l'éducation thérapeutique du patient insuffisant respiratoire": "therapeutic education for respiratory failure patients",
  "le suivi à domicile des patients sous assistance respiratoire": "home monitoring of patients on respiratory support",
  "l'intégration du télésuivi dans la pratique de médecine générale": "integrating remote monitoring into general practice",
  "le parcours patient BPCO vu depuis les soins primaires": "the COPD patient pathway from a primary care perspective",
  // ── Generaliste publication topics (Quotidien du Médecin) ──
  "l'enjeu du dépistage précoce de la BPCO en France": "the challenge of early COPD screening in France",
  "la prise en charge ambulatoire de l'insuffisance respiratoire chronique": "outpatient management of chronic respiratory failure",
  "l'apport du numérique dans le suivi des maladies chroniques": "the contribution of digital tools in chronic disease monitoring",
  "le rôle du généraliste dans la prévention de l'aggravation BPCO": "the role of the GP in preventing COPD worsening",
  // ── Generaliste publication topics (UNAFORMEC) ──
  "la prescription d'oxygénothérapie de longue durée en ville": "prescribing long-term oxygen therapy in community practice",
  "les outils d'évaluation de la dyspnée utilisables en consultation": "dyspnea assessment tools usable in consultation",
  "le suivi post-hospitalisation du patient BPCO exacerbé": "post-hospitalization follow-up of exacerbated COPD patients",
  "l'accompagnement du patient insuffisant respiratoire chronique et de son aidant": "supporting the chronic respiratory failure patient and their caregiver",
  // ── Generaliste conference topics ──
  "le repérage des maladies respiratoires en soins primaires": "identifying respiratory diseases in primary care",
  "les outils numériques pour le médecin traitant": "digital tools for the attending physician",
  "la coordination des acteurs du domicile (HAD, PSAD, IDE)": "coordinating home care actors (HAH, HSSP, nurses)",
  "l'optimisation du suivi des patients chroniques": "optimizing chronic patient follow-up",
  "les parcours de soins des patients insuffisants respiratoires": "care pathways for respiratory failure patients",
  "la téléconsultation et le télésuivi en médecine générale": "teleconsultation and remote monitoring in general practice",
  "l'impact de la pollution atmosphérique sur les pathologies respiratoires": "the impact of air pollution on respiratory diseases",
  // ── Generaliste event topics ──
  "le bon usage des dispositifs médicaux respiratoires": "the proper use of respiratory medical devices",
  "la prise en charge du patient BPCO en médecine de ville": "managing the COPD patient in community practice",
  "les innovations du PSAD et télésuivi": "innovations in HSSP and remote monitoring",
  "la prévention et le sevrage tabagique": "prevention and smoking cessation",
  "la gestion des poly-pathologies chez le sujet âgé": "managing multi-morbidity in the elderly",
  "l'organisation du maintien à domicile des patients chroniques": "organizing home care for chronic patients",
  "l'utilisation de la spirométrie en cabinet de ville": "using spirometry in community practice",
  "la coordination IDE-MG pour le suivi des patients sous O2": "nurse-GP coordination for monitoring patients on O2",
};

// Certification/domain translations (for "Obtention d'un {cert} en {domain}")
const certMap: Record<string, string> = {
  "DU": "University Diploma",
  "DIU": "Inter-University Diploma",
  "Master 2": "Master's Degree",
  "Capacité": "Medical Capacity Certificate",
  "Attestation": "Certificate",
  "DPC": "Continuing Professional Development",
};

const domainMap: Record<string, string> = {
  // Pneumo domains
  "réhabilitation respiratoire": "pulmonary rehabilitation",
  "pneumologie interventionnelle": "interventional pulmonology",
  "allergologie respiratoire": "respiratory allergology",
  "oncologie thoracique": "thoracic oncology",
  "soins palliatifs respiratoires": "respiratory palliative care",
  "sommeil et ventilation": "sleep and ventilation",
  // Generaliste domains
  "éducation thérapeutique du patient": "therapeutic patient education",
  "tabacologie": "tobacco addiction medicine",
  "médecine du sommeil": "sleep medicine",
  "gérontologie et polypathologies": "gerontology and multi-morbidity",
  "coordination des soins à domicile": "home care coordination",
  "maladies respiratoires chroniques": "chronic respiratory diseases",
  "soins palliatifs et accompagnement": "palliative care and support",
  "médecine d'urgence ambulatoire": "ambulatory emergency medicine",
};

// Event name translations (for "{event} sur {topic}")
const eventNameMap: Record<string, string> = {
  // Pneumo events
  "Formation continue": "Continuing education",
  "Atelier pratique": "Practical workshop",
  "Table ronde": "Round table",
  "Séminaire": "Seminar",
  "Journée d'étude": "Study day",
  "Webinaire": "Webinar",
  // Generaliste events
  "Soirée FMC": "CME evening",
  "Groupe de pairs": "Peer group",
  "Journée MSP": "Health center day",
  "Réunion pluriprofessionnelle": "Multi-professional meeting",
  "Séminaire DPC": "CPD seminar",
  "Staff paramédical": "Allied health staff meeting",
};

// Conference event translations (for "Présentation sur {topic} au {event}")
const conferenceEventMap: Record<string, string> = {
  // Pneumo conference events
  "Congrès de la SPLF": "SPLF Congress",
  "Congrès ERS (European Respiratory Society)": "ERS Congress (European Respiratory Society)",
  "Journées de Pneumologie Rhône-Alpes": "Rhône-Alpes Pulmonology Days",
  "Congrès CPLF": "CPLF Congress",
  "Journées Francophones d'Allergologie": "French-Speaking Allergology Days",
  "Assises Nationales de la BPCO": "National COPD Conference",
  "Congrès CHEST (American College of Chest Physicians)": "CHEST Congress (American College of Chest Physicians)",
  // Generaliste conference events
  "Congrès de la Médecine Générale France": "General Medicine Congress France",
  "Journées Nationales de Médecine Générale (JNMG)": "National General Medicine Days (JNMG)",
  "Journées régionales de FMC": "Regional CME Days",
  "Rencontres de la HAS": "HAS Meetings",
  "Colloque Soins Primaires et Coordination": "Primary Care and Coordination Symposium",
  "Assises de la Médecine Générale": "General Medicine Conference",
  "Congrès WONCA France": "WONCA France Congress",
};

// Achievement translations (for "Reconnaissance pour {achievement}")
const achievementMap: Record<string, string> = {
  // Pneumo achievements
  "son excellence dans la prise en charge des patients sous oxygénothérapie": "excellence in managing patients on oxygen therapy",
  "sa contribution à la recherche en pneumologie": "contributions to pulmonology research",
  "son engagement dans l'éducation thérapeutique": "commitment to therapeutic education",
  "son rôle dans l'amélioration du parcours de soins BPCO dans la région": "role in improving the COPD care pathway in the region",
  "sa participation au réseau sentinelle de surveillance BPCO": "participation in the COPD surveillance sentinel network",
  "son implication dans le programme de dépistage BPCO en médecine de ville": "involvement in the COPD screening program in community practice",
  // Generaliste achievements
  "son engagement dans le dépistage des maladies respiratoires": "commitment to respiratory disease screening",
  "sa qualité de coordination avec les prestataires de santé à domicile": "quality of coordination with home health providers",
  "son rôle de maître de stage universitaire": "role as a university training supervisor",
  "son implication dans la maison de santé pluriprofessionnelle": "involvement in the multi-professional health center",
  "sa participation active au réseau de soins respiratoire régional": "active participation in the regional respiratory care network",
  "son travail sur l'amélioration du parcours BPCO en soins primaires": "work on improving the COPD pathway in primary care",
  "sa contribution à la formation des internes en médecine générale": "contribution to training medical residents in general practice",
};

export function localizeNewsContent(content: string): string {
  if (getLanguage() !== 'en') return content;

  // 1) Try exact match first (new-practitioner hardcoded content)
  if (newsContentExactMap[content]) return newsContentExactMap[content];

  // 2) Prefix-based matching for template-generated content
  for (const [frPrefix, enPrefix] of newsContentPrefixMap) {
    if (content.startsWith(frPrefix)) {
      const remainder = content.slice(frPrefix.length);

      // Special handling for "Obtention d'un {cert} en {domain}"
      if (frPrefix === "Obtention d'un ") {
        const enMatch = remainder.match(/^(.+?) en (.+)$/);
        if (enMatch) {
          const cert = certMap[enMatch[1]] || enMatch[1];
          const domain = domainMap[enMatch[2]] || enMatch[2];
          return `${enPrefix}${cert} in ${domain}`;
        }
      }

      // Special handling for "Présentation sur {topic} au {event}" (conference)
      if (frPrefix === "Présentation sur " || frPrefix === "Intervention sur ") {
        const confMatch = remainder.match(/^(.+?) au (.+)$/);
        if (confMatch) {
          const topic = topicMap[confMatch[1]] || confMatch[1];
          const event = conferenceEventMap[confMatch[2]] || confMatch[2];
          return `${enPrefix}${topic} at the ${event}`;
        }
      }

      // Special handling for "{event} sur {topic}" (event type)
      // This pattern is used when frPrefix is actually an event name
      // but since the content template is "{event} sur {topic}" without a prefix,
      // we handle it below in a separate check.

      // Special handling for "Reconnaissance pour {achievement}"
      if (frPrefix === "Reconnaissance pour ") {
        const achievement = achievementMap[remainder] || remainder;
        return `${enPrefix}${achievement}`;
      }

      // Default: translate the remainder as a topic
      const translatedRemainder = topicMap[remainder] || remainder;
      return `${enPrefix}${translatedRemainder}`;
    }
  }

  // 3) Handle "{event} sur {topic}" pattern (event type news)
  //    e.g. "Formation continue sur la gestion de l'oxygénothérapie en ville"
  for (const [frEvent, enEvent] of Object.entries(eventNameMap)) {
    const eventPrefix = `${frEvent} sur `;
    if (content.startsWith(eventPrefix)) {
      const topic = content.slice(eventPrefix.length);
      const translatedTopic = topicMap[topic] || topic;
      return `${enEvent} on ${translatedTopic}`;
    }
  }

  return content;
}

// ─── News Relevance translations ─────────────────────────────
// The relevance messages contain dynamic names like "Opportunité de renforcer le partenariat avec {firstName} {lastName}"
// We use prefix matching to handle names.
const newsRelevancePrefixMap: Array<[string, string]> = [
  ["Opportunité de renforcer le partenariat avec ", "Opportunity to strengthen the partnership with "],
  ["Levier de discussion stratégique sur nos innovations", "Strategic discussion lever on our innovations"],
  ["Sujet aligné avec notre offre de télésuivi", "Topic aligned with our remote monitoring offer"],
  ["Occasion de proposer un partenariat académique", "Opportunity to propose an academic partnership"],
  ["Point d'accroche pour la prochaine visite", "Talking point for the next visit"],
  ["Occasion de présenter nos services complémentaires", "Opportunity to present our complementary services"],
  ["Sujet en lien avec notre gamme de produits", "Topic related to our product range"],
  ["Bon prétexte pour reprendre contact", "Good reason to re-establish contact"],
];

// Exact-match relevance strings (new practitioner overrides)
const newsRelevanceExactMap: Record<string, string> = {
  "Opportunité majeure : nouveau chef de service = nouvelles décisions d'approvisionnement. Profil haut potentiel KOL à conquérir.":
    "Major opportunity: new department head = new supply decisions. High-potential KOL profile to win over.",
  "Sa publication porte EXACTEMENT sur le télésuivi O2 — notre produit phare. Levier de discussion idéal pour un premier contact.":
    "Their publication is EXACTLY about O2 remote monitoring — our flagship product. Ideal discussion lever for a first contact.",
  "Nouvelle installation = recherche active de prestataire. Fenêtre de captation très courte avant que la concurrence ne s'installe.":
    "New practice = actively seeking a provider. Very short window to capture before competitors move in.",
  "Certification récente = praticienne à jour, réceptive aux innovations. Proposer notre gamme PPC/VNI complète.":
    "Recent certification = up-to-date practitioner, receptive to innovations. Propose our full CPAP/NIV range.",
  "MSP = fort volume potentiel (4 MG prescripteurs). Si on capte la MSP, on capte tous les médecins. Priorité absolue.":
    "Health center = high potential volume (4 GP prescribers). If we capture the health center, we capture all the doctors. Absolute priority.",
  "Venue d'un autre CHU = pas de prestataire local attitré. Fenêtre de premier contact cruciale cette semaine.":
    "Coming from another university hospital = no established local provider. Crucial first-contact window this week.",
  "Sujet directement lié à nos solutions de maintien à domicile. Point d'accroche parfait pour une première visite.":
    "Topic directly related to our home care solutions. Perfect talking point for a first visit.",
  "15 patients sous O2 à récupérer ! Le Dr Joubert est ouvert au changement de prestataire. Visite de captation prioritaire.":
    "15 patients on O2 to win back! Dr Joubert is open to changing providers. Priority acquisition visit.",
  "Réseau de 12 MG + 3 pneumo = multiplicateur d'impact. Si Air Liquide devient partenaire du réseau, accès à tous les prescripteurs impliqués.":
    "Network of 12 GPs + 3 pulmonologists = impact multiplier. If Air Liquide becomes a network partner, access to all involved prescribers.",
  "Publication très alignée avec notre mission de dépistage. Proposer un partenariat de dépistage spirométrique avec notre matériel.":
    "Publication very aligned with our screening mission. Propose a spirometric screening partnership with our equipment.",
};

export function localizeNewsRelevance(relevance: string): string {
  if (getLanguage() !== 'en') return relevance;

  // Exact match first
  if (newsRelevanceExactMap[relevance]) return newsRelevanceExactMap[relevance];

  // Prefix-based match (for those containing dynamic names)
  for (const [frPrefix, enPrefix] of newsRelevancePrefixMap) {
    if (relevance.startsWith(frPrefix)) {
      // For "Opportunité de renforcer le partenariat avec {name}", keep the name
      if (frPrefix.endsWith(' ')) {
        const name = relevance.slice(frPrefix.length);
        return `${enPrefix}${name}`;
      }
      return enPrefix;
    }
    // Also check exact match for non-name prefixes
    if (relevance === frPrefix) return enPrefix;
  }

  return relevance;
}

// ─── Battlecard translations ─────────────────────────────────
const battlecardTextMap: Record<string, string> = {
  // ── Vivisol ourAdvantages ──
  "Réactivité SAV +30% (astreinte 24/7 vs H+8 chez Vivisol)":
    "After-sales responsiveness +30% (24/7 on-call vs H+8 at Vivisol)",
  "Télésuivi O₂ Connect inclus gratuitement (supplément payant chez Vivisol)":
    "O₂ Connect remote monitoring included free (paid add-on at Vivisol)",
  "Formation patient à domicile par IDE dédiée":
    "Home patient training by dedicated nurse",
  "Gamme complète O2 + VNI + PPC (Vivisol limité en VNI)":
    "Full O2 + NIV + CPAP range (Vivisol limited in NIV)",
  "Plateforme Orkyn' patient avec appli mobile":
    "Orkyn' patient platform with mobile app",
  // ── Vivisol theirStrengths ──
  "Tarifs agressifs sur les concentrateurs fixes (-10 à -15%)":
    "Aggressive pricing on stationary concentrators (-10 to -15%)",
  "Implantation forte en Italie du Nord (patients frontaliers)":
    "Strong presence in Northern Italy (cross-border patients)",
  "Bonne relation historique avec certains CHU":
    "Good historical relationship with certain university hospitals",
  // ── Vivisol counterArguments ──
  "Le coût total de prise en charge (incluant réhospitalisations évitées par le télésuivi) est inférieur chez Air Liquide":
    "The total cost of care (including rehospitalizations prevented by remote monitoring) is lower at Air Liquide",
  "Notre astreinte 24/7 réduit les passages aux urgences — argument décisif pour les pneumologues hospitaliers":
    "Our 24/7 on-call service reduces ER visits — a decisive argument for hospital pulmonologists",
  "Nos données de télésuivi sont intégrables dans les DPI hospitaliers (interopérabilité HL7/FHIR)":
    "Our remote monitoring data can be integrated into hospital EHR systems (HL7/FHIR interoperability)",

  // ── Linde Healthcare ourAdvantages ──
  "Connectivité IoT native sur tous les dispositifs médicaux":
    "Native IoT connectivity on all medical devices",
  "Chronic Care Connect — suivi digital patient complet":
    "Chronic Care Connect — complete digital patient monitoring",
  "Plateforme Orkyn' dédiée avec éducation thérapeutique intégrée":
    "Dedicated Orkyn' platform with integrated therapeutic education",
  "Réseau technicien 2x plus dense en Rhône-Alpes":
    "Technician network 2x denser in Rhône-Alpes",
  "R&D interne avec brevets sur l'oxygénothérapie intelligente":
    "In-house R&D with patents on smart oxygen therapy",
  // ── Linde Healthcare theirStrengths ──
  "Adossé au groupe Linde (solidité financière)":
    "Backed by the Linde group (financial strength)",
  "Bonne gamme de gaz médicaux hospitaliers":
    "Good range of hospital medical gases",
  "Prix compétitifs sur les gros volumes hospitaliers":
    "Competitive pricing on large hospital volumes",
  // ── Linde Healthcare counterArguments ──
  "Linde est un industriel gazier — Air Liquide Santé est un spécialiste du parcours patient à domicile":
    "Linde is an industrial gas company — Air Liquide Healthcare is a home patient care specialist",
  "Notre plateforme de télésuivi est propriétaire et évolutive, pas un simple rebranding":
    "Our remote monitoring platform is proprietary and scalable, not a simple rebrand",
  "Nos IDE formateurs sont salariés (vs sous-traitance chez Linde) — continuité de la relation patient":
    "Our training nurses are employees (vs outsourced at Linde) — continuity of the patient relationship",

  // ── SOS Oxygène ourAdvantages ──
  "Couverture nationale complète (vs implantation régionale Sud)":
    "Full national coverage (vs regional presence in the South)",
  "Gamme VNI/PPC complète ALMS (SOS limité en ventilation)":
    "Full ALMS NIV/CPAP range (SOS limited in ventilation)",
  "R&D et innovation continue (télésuivi, IoT, IA)":
    "Continuous R&D and innovation (remote monitoring, IoT, AI)",
  "Capacité de prise en charge multi-pathologies (BPCO + SAS + IRC)":
    "Multi-pathology care capability (COPD + SAS + CRF)",
  "Interlocuteur unique pour l'ensemble du parcours respiratoire":
    "Single point of contact for the entire respiratory care pathway",
  // ── SOS Oxygène theirStrengths ──
  "Forte proximité locale dans le Sud-Est":
    "Strong local proximity in the Southeast",
  "Image de PME réactive et à taille humaine":
    "Image of a responsive, human-scale SME",
  "Bonne notoriété chez les MG de ville dans leur zone":
    "Good reputation among community GPs in their area",
  // ── SOS Oxygène counterArguments ──
  "Notre maillage territorial en Rhône-Alpes est équivalent avec en plus la couverture nationale pour les patients voyageurs":
    "Our territorial coverage in Rhône-Alpes is equivalent, with added national coverage for traveling patients",
  "Notre programme patient Orkyn' offre un suivi plus complet que la simple livraison":
    "Our Orkyn' patient program offers more comprehensive monitoring than simple delivery",
  "Pour les cas complexes (VNI + O2), un seul prestataire simplifie le parcours vs 2 intervenants":
    "For complex cases (NIV + O2), a single provider simplifies the pathway vs 2 providers",

  // ── Bastide Médical ourAdvantages ──
  "Expertise respiratoire pure (vs Bastide multi-activité : nutrition, perf, stomie...)":
    "Pure respiratory expertise (vs Bastide multi-activity: nutrition, infusion, ostomy...)",
  "Forfaits LPPR optimisés pour la pneumologie":
    "LPPR packages optimized for pulmonology",
  "Support technique respiratoire spécialisé 24/7":
    "Specialized respiratory technical support 24/7",
  "Équipes terrain 100% dédiées au respiratoire":
    "Field teams 100% dedicated to respiratory care",
  "Télésuivi O₂ avec algorithmes prédictifs d'exacerbation":
    "O₂ remote monitoring with predictive exacerbation algorithms",
  // ── Bastide Médical theirStrengths ──
  "Offre globale MAD (oxygène + nutrition + perfusion)":
    "Global home care offer (oxygen + nutrition + infusion)",
  "Réseau de pharmacies affiliées pour la capillarité":
    "Network of affiliated pharmacies for capillarity",
  "Communication active auprès des MG de ville":
    "Active communication with community GPs",
  // ── Bastide Médical counterArguments ──
  "Un généraliste du MAD ne peut pas égaler un spécialiste du respiratoire — nos techniciens sont formés exclusivement à la pneumologie":
    "A home care generalist cannot match a respiratory specialist — our technicians are trained exclusively in pulmonology",
  "La dispersion multi-activité de Bastide impacte les délais d'intervention respiratoire urgente":
    "Bastide's multi-activity dispersion impacts emergency respiratory intervention times",
  "Nos concentrateurs et VNI sont de dernière génération — Bastide revend souvent du matériel reconditionné":
    "Our concentrators and NIV devices are latest generation — Bastide often resells refurbished equipment",
};

export function localizeBattlecardText(text: string): string {
  if (getLanguage() !== 'en') return text;
  return battlecardTextMap[text] || text;
}

// ─── Note Content translations ───────────────────────────────
// Uses regex patterns to match French note templates and translate while preserving variable parts.
// Each entry: [regex, replacement function or template string]
type NotePattern = [RegExp, (m: RegExpMatchArray) => string];

const pneumoNotePatterns: NotePattern[] = [
  [
    /^Visite approfondie avec (.+?) (.+?)\. Discussion sur (\d+) patients BPCO/,
    (m) => `In-depth visit with ${m[1]} ${m[2]}. Discussion on ${m[3]} COPD stage III-IV patients currently on LTOT. Very interested in the new FreeStyle portable concentrator to improve mobility for the most active patients. Requests an in-office demonstration.`,
  ],
  [
    /^Échange téléphonique productif avec (.+?) (.+?)\. Souhaite mettre en place le télésuivi O2 Connect pour ses (\d+) patients/,
    (m) => `Productive phone call with ${m[1]} ${m[2]}. Wants to set up O2 Connect remote monitoring for their ${m[3]} most unstable patients. Questions about integration with their medical software. Mentioned receiving a proposal from Vivisol recently.`,
  ],
  [
    /^Rendez-vous avec (.+?) (.+?) au CHU\. Présentation des données cliniques/,
    (m) => `Meeting with ${m[1]} ${m[2]} at the university hospital. Presentation of clinical data on adherence with remote monitoring. Convinced by the results of the multicenter study. Wants to gradually equip all LTOT patients.`,
  ],
  [
    /^Visite de routine\. (.+?) (.+?) satisfait/,
    (m) => `Routine visit. ${m[1]} ${m[2]} satisfied with Air Liquide service quality. No technical incidents reported on the monitored patients. Discussion on GOLD 2025 guidelines and their impact on oxygen therapy prescriptions.`,
  ],
  [
    /^(.+?) (.+?) m'a contacté\(e\) pour un problème d'approvisionnement en oxygène liquide/,
    (m) => `${m[1]} ${m[2]} contacted me about a liquid oxygen supply issue for a home patient. Incident resolved in under 4 hours thanks to the on-call service. The practitioner appreciated the responsiveness and compares favorably to their past experience with SOS Oxygène.`,
  ],
  [
    /^Participation à la réunion pluridisciplinaire du service de pneumologie\. (.+?) (.+?) a présenté/,
    (m) => `Participated in the multidisciplinary meeting of the pulmonology department. ${m[1]} ${m[2]} presented a complex case of a COPD patient with cardiac comorbidities. Our remote monitoring solutions were cited as a reference. Excellent for our image.`,
  ],
  [
    /^Entretien avec (.+?) (.+?) sur la VNI.*?(\d+) patients candidats/,
    (m) => `Discussion with ${m[1]} ${m[2]} on NIV (Non-Invasive Ventilation). ${m[3]} candidate patients identified in the department. Wants to compare our BiLevel devices to Philips solutions. Technical discussion on masks and adherence.`,
  ],
  [
    /^Email de (.+?) (.+?) demandant des informations sur nos programmes de réhabilitation/,
    (m) => `Email from ${m[1]} ${m[2]} requesting information about our home pulmonary rehabilitation programs. Stage II COPD patient with deconditioning. Interest in an integrated O2 + adapted physical activity approach.`,
  ],
  [
    /^Rencontre fortuite avec (.+?) (.+?) au congrès SPLF/,
    (m) => `Chance meeting with ${m[1]} ${m[2]} at the SPLF congress. Informal discussion on advances in short-term oxygen therapy (STOT). Expressed interest in connected nebulization. Very involved in clinical research.`,
  ],
  [
    /^Appel de (.+?) (.+?) pour signaler le transfert de (\d+) patients/,
    (m) => `Call from ${m[1]} ${m[2]} to report the transfer of ${m[3]} patients to another pulmonologist in the city. Reason: partial retirement. Ensure service continuity and identify the practitioner taking over follow-up.`,
  ],
  [
    /^Visite avec démonstration du nouvel oxymètre connecté\. (.+?) (.+?) impressionné.*?(\d+) unités en test/,
    (m) => `Visit with demonstration of the new connected pulse oximeter. ${m[1]} ${m[2]} impressed by the accuracy and automatic SpO2 data transmission. Wants to integrate it into the LTOT patient monitoring protocol. Requests ${m[3]} test units.`,
  ],
  [
    /^Discussion stratégique avec (.+?) (.+?) sur la transition des patients/,
    (m) => `Strategic discussion with ${m[1]} ${m[2]} on transitioning patients to concentrated vs liquid oxygen. Cost-benefit analysis presented. The practitioner confirms that mobility remains the #1 criterion for active patients.`,
  ],
  [
    /^Entretien téléphonique suite à la publication récente de (.+?) (.+?) dans l'European/,
    (m) => `Phone call following the recent publication by ${m[1]} ${m[2]} in the European Respiratory Journal. Discussion on clinical implications. Proposal to co-organize a webinar on the topic with our medical teams.`,
  ],
  [
    /^(.+?) (.+?) mentionne des retours négatifs sur le bruit du concentrateur fixe chez (\d+) patients/,
    (m) => `${m[1]} ${m[2]} mentions negative feedback about stationary concentrator noise from ${m[3]} patients. Discussion on solutions: switching to the quiet model or portable liquid for nighttime. Priority patient identified.`,
  ],
  [
    /^Formation continue organisée dans le service de (.+?) (.+?)\./,
    (m) => `Continuing education organized in the department of ${m[1]} ${m[2]}. 12 nurses and 3 residents trained on concentrator use and remote monitoring protocol. Excellent reception. The practitioner requests a refresher session in 6 months.`,
  ],
];

const generalisteNotePatterns: NotePattern[] = [
  [
    /^Visite de présentation chez (.+?) (.+?)\. Le médecin suit actuellement (\d+) patient/,
    (m) => `Introduction visit at ${m[1]} ${m[2]}'s office. The physician currently manages ${m[3]} patient(s) on long-term oxygen therapy. Good knowledge of our services but not well informed about recent remote monitoring developments. Marked interest.`,
  ],
  [
    /^Appel de (.+?) (.+?) pour une première prescription d'oxygénothérapie/,
    (m) => `Call from ${m[1]} ${m[2]} for a first oxygen therapy prescription. Recently diagnosed COPD patient with PaO2 < 55 mmHg. Support with LPPR administrative procedures. Setup planned within 48 hours.`,
  ],
  [
    /^Discussion avec (.+?) (.+?) sur le suivi de (\d+) patients sous O2/,
    (m) => `Discussion with ${m[1]} ${m[2]} on monitoring ${m[3]} patients on home O2. Everything going well, no technical issues reported. The physician appreciates our delivery service and technician punctuality.`,
  ],
  [
    /^Passage rapide au cabinet de (.+?) (.+?)\. En retard sur ses consultations/,
    (m) => `Quick stop at ${m[1]} ${m[2]}'s office. Running late on consultations, brief but friendly exchange. Mentioned a patient whose condition is worsening and who may need to switch from gaseous O2 to portable liquid.`,
  ],
  [
    /^(.+?) (.+?) m'a signalé par email un problème de remboursement CPAM/,
    (m) => `${m[1]} ${m[2]} reported by email a CPAM reimbursement issue for a patient on a concentrator. Renewal prescription problem. Administrative support provided. Resolved in 3 days.`,
  ],
  [
    /^Visite de courtoisie chez (.+?) (.+?)\. Discussion sur l'éducation thérapeutique/,
    (m) => `Courtesy visit at ${m[1]} ${m[2]}'s office. Discussion on therapeutic education for COPD patients. Interested in our patient training program and educational kit. Documentation provided.`,
  ],
  [
    /^Échange avec (.+?) (.+?) sur le sevrage tabagique.*?(\d+) patients fumeurs/,
    (m) => `Discussion with ${m[1]} ${m[2]} on smoking cessation and its impact on patients on O2. ${m[3]} smoking patients identified. Discussion on the complementary support we can offer.`,
  ],
  [
    /^Contact téléphonique de (.+?) (.+?) : question sur la conduite à tenir/,
    (m) => `Phone contact from ${m[1]} ${m[2]}: question about what to do when a patient on O2 travels abroad. Information on the Air Liquide international assistance service provided.`,
  ],
  [
    /^(.+?) (.+?) mentionne avoir été démarché\(e\) par Bastide Médical/,
    (m) => `${m[1]} ${m[2]} mentions being approached by Bastide Médical. Lower price announced but limited service. I presented our added value: remote monitoring, 24/7 on-call, patient training. The physician remains loyal.`,
  ],
  [
    /^Visite chez (.+?) (.+?) avec présentation du nouveau kit éducation.*?(\d+) patients sous O2/,
    (m) => `Visit at ${m[1]} ${m[2]}'s office with presentation of the new patient therapeutic education kit. Very well received. The physician wants to distribute them to their ${m[3]} patients on O2 during upcoming consultations.`,
  ],
  [
    /^Appel de suivi après installation d'un concentrateur chez un patient de (.+?) (.+?)\./,
    (m) => `Follow-up call after concentrator installation for a patient of ${m[1]} ${m[2]}. The patient is satisfied. The physician confirms symptom improvement after 2 weeks. Good feedback on equipment quality.`,
  ],
  [
    /^(.+?) (.+?) signale un patient isolé géographiquement/,
    (m) => `${m[1]} ${m[2]} reports a geographically isolated patient having difficulties with liquid O2 deliveries. Discussion on switching to a concentrator with backup cylinder. Solution accepted by the practitioner.`,
  ],
  [
    /^Première visite après la prise de contact initiale\. (.+?) (.+?) prescrit occasionnellement.*?(\d+) patient/,
    (m) => `First visit after initial contact. ${m[1]} ${m[2]} occasionally prescribes O2 (approximately ${m[3]} patient(s)/year). Interested in our simplified offer for occasional prescribers. Good development potential.`,
  ],
];

const allNotePatterns = [...pneumoNotePatterns, ...generalisteNotePatterns];

export function localizeNoteContent(content: string): string {
  if (getLanguage() !== 'en') return content;

  for (const [regex, translator] of allNotePatterns) {
    const match = content.match(regex);
    if (match) return translator(match);
  }

  return content;
}

// ─── Note NextAction translations ────────────────────────────
const noteNextActionMap: Record<string, string> = {
  // Pneumo note nextActions
  "Planifier démonstration FreeStyle en cabinet sous 15 jours":
    "Schedule FreeStyle demonstration in office within 15 days",
  "Envoyer documentation technique télésuivi + tarifs":
    "Send remote monitoring technical documentation + pricing",
  "Préparer convention de partenariat télésuivi":
    "Prepare remote monitoring partnership agreement",
  "Suivi qualité dans 1 semaine":
    "Quality follow-up in 1 week",
  "Organiser essai comparatif BiLevel vs Philips":
    "Organize BiLevel vs Philips comparative trial",
  "Répondre avec brochure programme réhabilitation":
    "Reply with rehabilitation program brochure",
  "Inviter au prochain symposium Air Liquide":
    "Invite to the next Air Liquide symposium",
  "Contacter le pneumologue successeur pour présentation":
    "Contact the successor pulmonologist for an introduction",
  "Proposer date pour webinaire conjoint":
    "Propose a date for joint webinar",
  "Échange concentrateur bruyant chez M. [patient] sous 5 jours":
    "Replace noisy concentrator at Mr. [patient]'s within 5 days",
  "Planifier session de rappel formation dans 6 mois":
    "Schedule refresher training session in 6 months",
  // Generaliste note nextActions
  "Envoyer plaquette télésuivi et rappeler dans 3 semaines":
    "Send remote monitoring brochure and call back in 3 weeks",
  "Coordonner installation O2 chez le patient sous 48h":
    "Coordinate O2 setup at the patient's home within 48h",
  "Rappeler pour évaluation patient avec dégradation":
    "Call back for patient evaluation regarding deterioration",
  "Fournir documentation programme sevrage tabagique":
    "Provide smoking cessation program documentation",
  "Surveillance concurrentielle Bastide sur ce secteur":
    "Competitive monitoring of Bastide in this area",
  "Organiser changement d'équipement chez patient isolé":
    "Organize equipment change for isolated patient",
  "Envoyer offre simplifiée prescripteurs occasionnels":
    "Send simplified offer for occasional prescribers",
};

// Handle nextActions that contain {count} variable (already substituted at generation time)
const noteNextActionPatterns: NotePattern[] = [
  [
    /^Livrer (\d+) oxymètres connectés en test sous 10 jours$/,
    (m) => `Deliver ${m[1]} connected pulse oximeters for testing within 10 days`,
  ],
  [
    /^Livrer (\d+) kits éducation thérapeutique$/,
    (m) => `Deliver ${m[1]} therapeutic education kits`,
  ],
];

export function localizeNoteNextAction(action: string): string {
  if (getLanguage() !== 'en') return action;

  // Exact match
  if (noteNextActionMap[action]) return noteNextActionMap[action];

  // Pattern match for variable-containing actions
  for (const [regex, translator] of noteNextActionPatterns) {
    const match = action.match(regex);
    if (match) return translator(match);
  }

  return action;
}

// ─── Visit History Note translations ─────────────────────────
// Replaces the old simple visitNoteMap with comprehensive regex-based visit note translation.
const visitNotePneumoPatterns: NotePattern[] = [
  [
    /^Présentation des résultats du télésuivi sur le trimestre\. (\d+) patients suivis.*?(.+?) (.+?) très satisfait/,
    (m) => `Presentation of quarterly remote monitoring results. ${m[1]} patients monitored remotely with 0 avoidable hospitalizations. ${m[2]} ${m[3]} very satisfied.`,
  ],
  [
    /^Discussion sur les critères d'éligibilité à l'O2 de déambulation\. Revue de (\d+) dossiers/,
    (m) => `Discussion on eligibility criteria for ambulatory O2. Review of ${m[1]} patient files. 2 candidates identified for switching to portable.`,
  ],
  [
    /^Évaluation conjointe de la satisfaction des patients sous concentrateur/,
    () => `Joint evaluation of patient satisfaction with concentrators. Satisfaction rate > 90%. Discussion on possible improvements to the delivery service.`,
  ],
  [
    /^Présentation des nouvelles gammes de masques pour VNI.*?(.+?) (.+?) retient/,
    (m) => `Presentation of the new NIV mask ranges. Testing of 3 models on a mannequin. ${m[1]} ${m[2]} selects the ComfortGel model for their patients.`,
  ],
  [
    /^Visite de suivi post-installation chez (\d+) patients/,
    (m) => `Post-installation follow-up visit for ${m[1]} patients. All equipment functioning properly. One patient requests a delivery schedule change.`,
  ],
  [
    /^Réunion de coordination avec l'équipe paramédicale/,
    () => `Coordination meeting with the allied health team. Training of department nurses on remote monitoring alerts. Very well received.`,
  ],
  [
    /^Point sur les renouvellements d'ordonnances à venir\. (\d+) patients/,
    (m) => `Update on upcoming prescription renewals. ${m[1]} patients due for renewal in the next 30 days. Schedule established with the secretariat.`,
  ],
  [
    /^Entretien avec (.+?) (.+?) sur un cas complexe.*?patient sous O2 \+ VNI/,
    (m) => `Discussion with ${m[1]} ${m[2]} on a complex case: patient on O2 + NIV with obesity hypoventilation syndrome. Proposal for enhanced monitoring with adapted BiPAP.`,
  ],
];

const visitNoteGeneralistePatterns: NotePattern[] = [
  [
    /^Visite de suivi chez (.+?) (.+?)\. Discussion sur le patient/,
    (m) => `Follow-up visit at ${m[1]} ${m[2]}'s. Discussion about patient Mrs. D. on O2 for 3 months. Clear symptom improvement. No flow rate adjustment needed.`,
  ],
  [
    /^Échange bref mais efficace\. (.+?) (.+?) confirme la bonne observance/,
    (m) => `Brief but effective exchange. ${m[1]} ${m[2]} confirms good adherence of patient Mr. L. on stationary concentrator. Requests safety instructions documentation.`,
  ],
  [
    /^Passage au cabinet pour présenter la nouvelle plaquette.*?(.+?) (.+?) apprécie/,
    (m) => `Visit to the office to present the new COPD therapeutic education brochure. ${m[1]} ${m[2]} appreciates the simplified format for patients.`,
  ],
  [
    /^Accompagnement pour une première mise sous O2\. Patient anxieux, (.+?) (.+?) demande/,
    (m) => `Support for a first O2 setup. Anxious patient, ${m[1]} ${m[2]} requests a follow-up call at D+7 by our team. Setup completed without incident.`,
  ],
  [
    /^Visite de courtoisie\. Pas de nouveau patient.*?(.+?) (.+?) mentionne une formation/,
    (m) => `Courtesy visit. No new patients to equip. ${m[1]} ${m[2]} mentions an upcoming CPD training on respiratory diseases. Offer to participate as a partner.`,
  ],
  [
    /^Discussion sur les critères d'alerte pour les patients BPCO en médecine de ville/,
    () => `Discussion on alert criteria for COPD patients in community practice. Provided a simplified dyspnea assessment protocol (mMRC scale).`,
  ],
];

// Keep old simple map entries as fallback
const visitNoteSimpleMap: Record<string, string> = {
  'Présentation des nouvelles options thérapeutiques': 'Presentation of new therapeutic options',
  'Suivi KOL - Discussion nouveaux protocoles': 'KOL follow-up - New protocols discussion',
  'Visite de routine - Point sur les prescriptions': 'Routine visit - Prescription review',
  'Visite de réactivation - Praticien à risque': 'Reactivation visit - At-risk practitioner',
};

const allVisitNotePatterns = [...visitNotePneumoPatterns, ...visitNoteGeneralistePatterns];

export function localizeVisitNote(note: string): string {
  if (getLanguage() !== 'en') return note;

  // Simple exact match (legacy)
  if (visitNoteSimpleMap[note]) return visitNoteSimpleMap[note];

  // Regex pattern match
  for (const [regex, translator] of allVisitNotePatterns) {
    const match = note.match(regex);
    if (match) return translator(match);
  }

  return note;
}

// ─── Sub-specialty translations ──────────────────────────────
const subSpecialtyMap: Record<string, string> = {
  "Allergologie respiratoire": "Respiratory Allergology",
  "Oncologie thoracique": "Thoracic Oncology",
  "Réhabilitation respiratoire": "Pulmonary Rehabilitation",
  "Sommeil et ventilation": "Sleep and Ventilation",
  "Pneumologie interventionnelle": "Interventional Pulmonology",
};

export function localizeSubSpecialty(sub: string): string {
  if (getLanguage() !== 'en') return sub;
  return subSpecialtyMap[sub] || sub;
}

// ─── News Source translations ────────────────────────────────
const sourceMap: Record<string, string> = {
  "Base bibliographique médicale": "Medical bibliographic database",
  "PubMed": "PubMed",
  "Google Scholar": "Google Scholar",
  "SUDOC": "SUDOC",
};

export function localizeSource(source: string): string {
  if (getLanguage() !== 'en') return source;
  return sourceMap[source] || source;
}
