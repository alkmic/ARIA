import type { PractitionerProfile, PractitionerNote, PractitionerNews, VisitRecord } from '../types/database';

/**
 * Générateur de données réalistes et cohérentes pour les praticiens
 * V2 : Données ultra-variées et crédibles pour démo Air Liquide Santé
 */

// ═══════════════════════════════════════════════════════════
// DONNÉES DE RÉFÉRENCE
// ═══════════════════════════════════════════════════════════

const CITIES_RHONE_ALPES = [
  { name: 'LYON', postalCode: '69001', coords: { lat: 45.7640, lng: 4.8357 } },
  { name: 'VILLEURBANNE', postalCode: '69100', coords: { lat: 45.7676, lng: 4.8799 } },
  { name: 'GRENOBLE', postalCode: '38000', coords: { lat: 45.1885, lng: 5.7245 } },
  { name: 'SAINT-ÉTIENNE', postalCode: '42000', coords: { lat: 45.4397, lng: 4.3872 } },
  { name: 'ANNECY', postalCode: '74000', coords: { lat: 45.8992, lng: 6.1294 } },
  { name: 'CHAMBÉRY', postalCode: '73000', coords: { lat: 45.5646, lng: 5.9178 } },
  { name: 'VALENCE', postalCode: '26000', coords: { lat: 44.9334, lng: 4.8924 } },
  { name: 'BOURG-EN-BRESSE', postalCode: '01000', coords: { lat: 46.2056, lng: 5.2256 } },
  { name: 'VIENNE', postalCode: '38200', coords: { lat: 45.5253, lng: 4.8777 } },
  { name: 'ANNEMASSE', postalCode: '74100', coords: { lat: 46.1958, lng: 6.2354 } },
];

const STREET_NAMES = [
  'Avenue de la République', 'Rue Victor Hugo', 'Boulevard Gambetta',
  'Place de la Liberté', 'Rue du Général de Gaulle', 'Avenue Jean Jaurès',
  'Rue Anatole France', 'Boulevard des Belges', 'Rue de la Paix',
  'Avenue Maréchal Foch', 'Rue Émile Zola', 'Boulevard Voltaire',
  'Rue Pasteur', 'Avenue des Alpes', 'Rue du Docteur Bonhomme',
];

const FIRST_NAMES_M = [
  'Jean', 'Pierre', 'Louis', 'Michel', 'Paul', 'André', 'François',
  'Philippe', 'Antoine', 'Marc', 'Alain', 'Jacques', 'Henri', 'Bernard',
  'Christophe', 'Éric', 'Stéphane', 'Olivier', 'Nicolas', 'Thierry',
  'Laurent', 'Patrick', 'Yves', 'Sébastien', 'Frédéric',
];

const FIRST_NAMES_F = [
  'Marie', 'Sophie', 'Catherine', 'Anne', 'Isabelle', 'Claire',
  'Nathalie', 'Sylvie', 'Françoise', 'Hélène', 'Valérie', 'Monique',
  'Brigitte', 'Élise', 'Charlotte', 'Céline', 'Sandrine', 'Aurélie',
  'Caroline', 'Delphine', 'Laurence', 'Véronique', 'Martine', 'Julie',
];

const LAST_NAMES = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit',
  'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel',
  'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel',
  'Girard', 'André', 'Lefèvre', 'Mercier', 'Dupont', 'Lambert', 'Bonnet',
  'François', 'Martinez', 'Legrand', 'Garnier', 'Faure', 'Rousseau',
  'Blanc', 'Guerin', 'Muller', 'Henry', 'Roussel', 'Nicolas', 'Perrin',
  'Morin', 'Mathieu', 'Clement', 'Gauthier', 'Dumont', 'Lopez', 'Fontaine',
  'Chevalier', 'Robin',
];

// ═══════════════════════════════════════════════════════════
// AUTEURS DES NOTES (équipe commerciale variée)
// ═══════════════════════════════════════════════════════════
const NOTE_AUTHORS = [
  'Marie Dupont', 'Sophie Martin', 'Lucas Bernard', 'Thomas Lefebvre',
  'Julie Moreau', 'Antoine Garnier',
];

// Products are defined in PRODUCT_COMBOS below (used for visit history generation)

// ═══════════════════════════════════════════════════════════
// TEMPLATES DE NOTES - PNEUMOLOGUES (30+ templates uniques)
// ═══════════════════════════════════════════════════════════
const NOTES_PNEUMO = [
  {
    content: "Visite approfondie avec {title} {lastName}. Discussion sur {count} patients BPCO stade III-IV actuellement sous OLD. Très intéressé(e) par le nouveau concentrateur portable FreeStyle pour améliorer l'autonomie de ses patients les plus mobiles. Demande une démonstration en cabinet.",
    type: 'visit' as const,
    nextAction: "Planifier démonstration FreeStyle en cabinet sous 15 jours",
  },
  {
    content: "Échange téléphonique productif avec {title} {lastName}. Souhaite mettre en place le télésuivi O2 Connect pour ses {count} patients les plus instables. Questions sur l'intégration avec son logiciel médical. A mentionné avoir reçu une proposition de Vivisol récemment.",
    type: 'phone' as const,
    nextAction: "Envoyer documentation technique télésuivi + tarifs",
  },
  {
    content: "Rendez-vous avec {title} {lastName} au CHU. Présentation des données cliniques sur l'observance avec le télésuivi. Convaincu(e) par les résultats de l'étude multicentrique. Souhaite équiper progressivement tous ses patients sous OLD.",
    type: 'visit' as const,
    nextAction: "Préparer convention de partenariat télésuivi",
  },
  {
    content: "Visite de routine. {title} {lastName} satisfait(e) de la qualité du service Air Liquide. Aucun incident technique signalé sur les {count} patients suivis. Discussion sur les recommandations GOLD 2025 et l'impact sur les prescriptions d'oxygénothérapie.",
    type: 'visit' as const,
  },
  {
    content: "{title} {lastName} m'a contacté(e) pour un problème d'approvisionnement en oxygène liquide pour un patient à domicile. Incident résolu en moins de 4h grâce au service d'astreinte. Le praticien a apprécié la réactivité et compare favorablement à son expérience passée avec SOS Oxygène.",
    type: 'phone' as const,
    nextAction: "Suivi qualité dans 1 semaine",
  },
  {
    content: "Participation à la réunion pluridisciplinaire du service de pneumologie. {title} {lastName} a présenté un cas complexe de patient BPCO avec comorbidités cardiaques. Nos solutions de télésuivi ont été citées comme référence. Excellent pour notre image.",
    type: 'visit' as const,
  },
  {
    content: "Entretien avec {title} {lastName} sur la VNI (Ventilation Non Invasive). {count} patients candidats identifiés dans son service. Souhaite comparer nos appareils BiLevel aux solutions Philips. Discussion technique sur les masques et l'observance.",
    type: 'visit' as const,
    nextAction: "Organiser essai comparatif BiLevel vs Philips",
  },
  {
    content: "Email de {title} {lastName} demandant des informations sur nos programmes de réhabilitation respiratoire à domicile. Patient BPCO stade II avec déconditionnement. Intérêt pour une approche intégrée O2 + activité physique adaptée.",
    type: 'email' as const,
    nextAction: "Répondre avec brochure programme réhabilitation",
  },
  {
    content: "Rencontre fortuite avec {title} {lastName} au congrès SPLF. Discussion informelle sur les avancées en matière d'oxygénothérapie de courte durée (OCT). Évoque un intérêt pour la nébulisation connectée. Très engagé(e) dans la recherche clinique.",
    type: 'visit' as const,
    nextAction: "Inviter au prochain symposium Air Liquide",
  },
  {
    content: "Appel de {title} {lastName} pour signaler le transfert de {count} patients vers un autre pneumologue de la ville. Raison : départ en retraite partielle. S'assurer de la continuité du service et identifier le praticien reprenant le suivi.",
    type: 'phone' as const,
    nextAction: "Contacter le pneumologue successeur pour présentation",
  },
  {
    content: "Visite avec démonstration du nouvel oxymètre connecté. {title} {lastName} impressionné(e) par la précision et la transmission automatique des données SpO2. Souhaite l'intégrer dans le protocole de suivi de ses patients sous OLD. Demande {count} unités en test.",
    type: 'visit' as const,
    nextAction: "Livrer {count} oxymètres connectés en test sous 10 jours",
  },
  {
    content: "Discussion stratégique avec {title} {lastName} sur la transition des patients vers l'oxygène concentré vs liquide. Analyse coût-bénéfice présentée. Le praticien confirme que la mobilité reste le critère n°1 pour ses patients actifs.",
    type: 'visit' as const,
  },
  {
    content: "Entretien téléphonique suite à la publication récente de {title} {lastName} dans l'European Respiratory Journal. Échange sur les implications cliniques. Proposition de co-organiser un webinaire sur le sujet avec nos équipes médicales.",
    type: 'phone' as const,
    nextAction: "Proposer date pour webinaire conjoint",
  },
  {
    content: "{title} {lastName} mentionne des retours négatifs sur le bruit du concentrateur fixe chez {count} patients. Discussion sur les solutions : passage au modèle silencieux ou au liquide portable pour la nuit. Patient prioritaire identifié.",
    type: 'visit' as const,
    nextAction: "Échange concentrateur bruyant chez M. [patient] sous 5 jours",
  },
  {
    content: "Formation continue organisée dans le service de {title} {lastName}. 12 IDE et 3 internes formés à l'utilisation des concentrateurs et au protocole de télésuivi. Excellente réception. Le praticien demande une session de rappel dans 6 mois.",
    type: 'visit' as const,
    nextAction: "Planifier session de rappel formation dans 6 mois",
  },
];

// ═══════════════════════════════════════════════════════════
// TEMPLATES DE NOTES - MÉDECINS GÉNÉRALISTES (20+ templates)
// ═══════════════════════════════════════════════════════════
const NOTES_GENERALISTE = [
  {
    content: "Visite de présentation chez {title} {lastName}. Le médecin suit actuellement {count} patient(s) sous oxygénothérapie de longue durée. Bonne connaissance de nos services mais peu informé(e) sur les évolutions récentes du télésuivi. Intérêt marqué.",
    type: 'visit' as const,
    nextAction: "Envoyer plaquette télésuivi et rappeler dans 3 semaines",
  },
  {
    content: "Appel de {title} {lastName} pour une première prescription d'oxygénothérapie. Patient BPCO diagnostiqué récemment avec PaO2 < 55 mmHg. Accompagnement sur les démarches administratives LPPR. Mise en place prévue sous 48h.",
    type: 'phone' as const,
    nextAction: "Coordonner installation O2 chez le patient sous 48h",
  },
  {
    content: "Discussion avec {title} {lastName} sur le suivi de {count} patients sous O2 à domicile. Tout se passe bien, pas de problème technique signalé. Le médecin apprécie notre service de livraison et la ponctualité des techniciens.",
    type: 'visit' as const,
  },
  {
    content: "Passage rapide au cabinet de {title} {lastName}. En retard sur ses consultations, échange bref mais cordial. A mentionné un patient dont l'état se dégrade et qui pourrait nécessiter un passage de l'O2 gazeux au liquide portable.",
    type: 'visit' as const,
    nextAction: "Rappeler pour évaluation patient avec dégradation",
  },
  {
    content: "{title} {lastName} m'a signalé par email un problème de remboursement CPAM pour un patient sous concentrateur. Problème d'ordonnance de renouvellement. Accompagnement administratif effectué. Résolu en 3 jours.",
    type: 'email' as const,
  },
  {
    content: "Visite de courtoisie chez {title} {lastName}. Discussion sur l'éducation thérapeutique des patients BPCO. Intéressé(e) par notre programme de formation patients et le kit pédagogique. Remise de la documentation.",
    type: 'visit' as const,
  },
  {
    content: "Échange avec {title} {lastName} sur le sevrage tabagique et son impact sur les patients sous O2. {count} patients fumeurs identifiés. Discussion sur l'accompagnement que nous pouvons proposer en complément.",
    type: 'visit' as const,
    nextAction: "Fournir documentation programme sevrage tabagique",
  },
  {
    content: "Contact téléphonique de {title} {lastName} : question sur la conduite à tenir en cas de voyage à l'étranger pour un patient sous O2. Informations sur le service d'assistance internationale Air Liquide communiquées.",
    type: 'phone' as const,
  },
  {
    content: "{title} {lastName} mentionne avoir été démarché(e) par Bastide Médical. Prix plus bas annoncé mais service limité. J'ai présenté notre valeur ajoutée : télésuivi, astreinte 24/7, formation patients. Le médecin reste fidèle.",
    type: 'visit' as const,
    nextAction: "Surveillance concurrentielle Bastide sur ce secteur",
  },
  {
    content: "Visite chez {title} {lastName} avec présentation du nouveau kit éducation thérapeutique patient. Très bonne réception. Le médecin souhaite en distribuer à ses {count} patients sous O2 lors des prochaines consultations.",
    type: 'visit' as const,
    nextAction: "Livrer {count} kits éducation thérapeutique",
  },
  {
    content: "Appel de suivi après installation d'un concentrateur chez un patient de {title} {lastName}. Le patient est satisfait. Le médecin confirme une amélioration des symptômes après 2 semaines. Bon retour sur la qualité du matériel.",
    type: 'phone' as const,
  },
  {
    content: "{title} {lastName} signale un patient isolé géographiquement qui a des difficultés avec les livraisons d'O2 liquide. Discussion sur un passage au concentrateur avec backup bouteille. Solution acceptée par le praticien.",
    type: 'visit' as const,
    nextAction: "Organiser changement d'équipement chez patient isolé",
  },
  {
    content: "Première visite après la prise de contact initiale. {title} {lastName} prescrit occasionnellement de l'O2 (environ {count} patient(s)/an). Intéressé(e) par notre offre simplifiée pour les prescripteurs occasionnels. Bon potentiel à développer.",
    type: 'visit' as const,
    nextAction: "Envoyer offre simplifiée prescripteurs occasionnels",
  },
];

// ═══════════════════════════════════════════════════════════
// TEMPLATES D'ACTUALITÉS ET PUBLICATIONS
// ═══════════════════════════════════════════════════════════
const NEWS_TEMPLATES = {
  publication: [
    {
      title: "Publication dans l'European Respiratory Journal",
      contentTemplate: "Co-auteur d'une étude sur {topic}",
      topics: [
        "le sevrage tabagique chez le patient BPCO sous oxygénothérapie",
        "l'optimisation des débits d'O2 en fonction de l'activité physique",
        "l'impact de l'oxygénothérapie nocturne sur la qualité de vie",
        "les nouvelles recommandations pour l'oxygénothérapie ambulatoire",
        "la place du télésuivi dans le parcours de soins BPCO",
        "l'évaluation de la dyspnée chez les patients sous OLD",
      ],
    },
    {
      title: "Article dans Revue des Maladies Respiratoires",
      contentTemplate: "Publication d'un cas clinique sur {topic}",
      topics: [
        "la gestion de l'hypoxémie sévère en ambulatoire",
        "l'adaptation des traitements chez les patients BPCO âgés",
        "les complications de l'oxygénothérapie de longue durée",
        "l'optimisation de la VNI chez le patient obèse hypercapnique",
        "la réhabilitation respiratoire en post-exacerbation",
      ],
    },
    {
      title: "Étude multicentrique parue dans CHEST",
      contentTemplate: "Investigateur principal pour une étude sur {topic}",
      topics: [
        "les biomarqueurs prédictifs d'exacerbation BPCO",
        "la télémédecine appliquée au suivi des patients sous O2",
        "les bénéfices de l'oxygénothérapie de déambulation",
      ],
    },
  ],
  certification: [
    {
      title: "Certification Universitaire en Pneumologie",
      contentTemplate: "Obtention d'un {cert} en {domain}",
      certs: ["DU", "DIU", "Master 2", "Capacité"],
      domains: [
        "réhabilitation respiratoire",
        "pneumologie interventionnelle",
        "allergologie respiratoire",
        "oncologie thoracique",
        "soins palliatifs respiratoires",
        "sommeil et ventilation",
      ],
    },
  ],
  conference: [
    {
      title: "Intervention au Congrès de Pneumologie",
      contentTemplate: "Présentation sur {topic} au {event}",
      topics: [
        "les avancées en oxygénothérapie",
        "la prise en charge des BPCO sévères",
        "l'éducation thérapeutique du patient respiratoire",
        "l'observance du traitement par O2 au long cours",
        "les parcours de soins innovants en pneumologie",
      ],
      events: [
        "Congrès de la SPLF",
        "Congrès ERS (European Respiratory Society)",
        "Journées de Pneumologie Rhône-Alpes",
        "Congrès CPLF (Congrès de Pneumologie de Langue Française)",
        "Journées Francophones d'Allergologie",
      ],
    },
  ],
  award: [
    {
      title: "Distinction professionnelle",
      contentTemplate: "Reconnaissance pour {achievement}",
      achievements: [
        "son excellence dans la prise en charge des patients sous oxygénothérapie",
        "sa contribution à la recherche en pneumologie",
        "son engagement dans l'éducation thérapeutique",
        "son rôle dans l'amélioration du parcours de soins BPCO dans la région",
        "sa participation au réseau sentinelle de surveillance BPCO",
      ],
    },
  ],
  event: [
    {
      title: "Organisation d'un événement médical",
      contentTemplate: "{event} sur {topic}",
      events: ["Formation continue", "Atelier pratique", "Table ronde", "Séminaire", "Journée d'étude"],
      topics: [
        "la gestion de l'oxygénothérapie en ville",
        "les nouvelles technologies en assistance respiratoire",
        "le parcours de soins du patient BPCO",
        "l'interprofessionnalité dans la prise en charge respiratoire",
        "les innovations en ventilation à domicile",
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// TEMPLATES D'HISTORIQUE DE VISITE (variés et uniques)
// ═══════════════════════════════════════════════════════════
const VISIT_NOTES_PNEUMO = [
  "Présentation des résultats du télésuivi sur le trimestre. {count} patients suivis à distance avec 0 hospitalisations évitables. {title} {lastName} très satisfait(e).",
  "Discussion sur les critères d'éligibilité à l'O2 de déambulation. Revue de {count} dossiers patients. 2 candidats identifiés pour passage au portable.",
  "Évaluation conjointe de la satisfaction des patients sous concentrateur. Taux de satisfaction > 90%. Discussion sur les améliorations possibles du service de livraison.",
  "Présentation des nouvelles gammes de masques pour VNI. Test de 3 modèles sur mannequin. {title} {lastName} retient le modèle ComfortGel pour ses patients.",
  "Visite de suivi post-installation chez {count} patients. Tous les équipements fonctionnent correctement. Un patient demande un changement d'horaire de livraison.",
  "Réunion de coordination avec l'équipe paramédicale. Formation des IDE du service sur les alertes du télésuivi. Très bon accueil.",
  "Point sur les renouvellements d'ordonnances à venir. {count} patients à renouveler dans les 30 prochains jours. Planning établi avec le secrétariat.",
  "Entretien avec {title} {lastName} sur un cas complexe : patient sous O2 + VNI avec syndrome obésité-hypoventilation. Proposition d'un suivi renforcé avec BiPAP adaptée.",
];

const VISIT_NOTES_GENERALISTE = [
  "Visite de suivi chez {title} {lastName}. Discussion sur le patient Mme D. sous O2 depuis 3 mois. Amélioration nette des symptômes. Pas de modification de débit nécessaire.",
  "Échange bref mais efficace. {title} {lastName} confirme la bonne observance de son patient M. L. sous concentrateur fixe. Demande de documentation sur les consignes de sécurité.",
  "Passage au cabinet pour présenter la nouvelle plaquette d'éducation thérapeutique BPCO. {title} {lastName} apprécie le format simplifié pour ses patients.",
  "Accompagnement pour une première mise sous O2. Patient anxieux, {title} {lastName} demande un appel de suivi à J+7 par notre équipe. Mise en place effectuée sans incident.",
  "Visite de courtoisie. Pas de nouveau patient à équiper. {title} {lastName} mentionne une formation DPC à venir sur les pathologies respiratoires. Proposition d'intervenir en tant que partenaire.",
  "Discussion sur les critères d'alerte pour les patients BPCO en médecine de ville. Remise d'un protocole simplifié d'évaluation de la dyspnée (échelle mMRC).",
];

// ═══════════════════════════════════════════════════════════
// COMBINAISONS DE PRODUITS RÉALISTES
// ═══════════════════════════════════════════════════════════
const PRODUCT_COMBOS_PNEUMO = [
  ['VitalAire Confort+', 'Télésuivi O2 Connect'],
  ['Concentrateur portable FreeStyle', 'Oxymètre connecté'],
  ['VNI DreamStation', 'Formation patient'],
  ['Station extracteur fixe', 'Service 24/7'],
  ['Oxygène liquide portable', 'Télésuivi O2 Connect'],
  ['PPC ResMed AirSense', 'Masques VNI'],
  ['Nébuliseur ultrasonique', 'Aérosol doseur'],
  ['BPAP BiLevel', 'Oxymètre connecté', 'Télésuivi O2 Connect'],
  ['VitalAire Confort+', 'Kit éducation thérapeutique', 'Service 24/7'],
  ['Concentrateur portable FreeStyle', 'Oxygène liquide portable'],
];

const PRODUCT_COMBOS_GENERALISTE = [
  ['Concentrateur fixe standard', 'Service technique SAV'],
  ['Oxygène bouteille gazeux', 'Formation patient OLD'],
  ['VitalAire Confort+', 'Service 24/7'],
  ['Kit éducation thérapeutique', 'Oxymètre de pouls'],
  ['Concentrateur fixe standard', 'Télésuivi O2 basique'],
  ['Oxygène bouteille gazeux', 'Service 24/7'],
  ['Formation patient OLD', 'Kit éducation thérapeutique'],
];

// ═══════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════

// Générateur pseudo-aléatoire déterministe (pour éviter les doublons)
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function randomChoice<T>(array: T[], rng: () => number = Math.random): T {
  return array[Math.floor(rng() * array.length)];
}

function randomInt(min: number, max: number, rng: () => number = Math.random): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ═══════════════════════════════════════════════════════════
// GÉNÉRATEURS
// ═══════════════════════════════════════════════════════════

function generateRealisticVolume(vingtile: number, specialty: string, isKOL: boolean, rng: () => number): number {
  let baseVolume: number;

  if (specialty === 'Pneumologue') {
    if (vingtile <= 2) baseVolume = randomInt(200000, 300000, rng);
    else if (vingtile <= 5) baseVolume = randomInt(120000, 200000, rng);
    else if (vingtile <= 10) baseVolume = randomInt(60000, 120000, rng);
    else if (vingtile <= 15) baseVolume = randomInt(30000, 60000, rng);
    else baseVolume = randomInt(10000, 30000, rng);
  } else {
    if (vingtile <= 2) baseVolume = randomInt(50000, 80000, rng);
    else if (vingtile <= 5) baseVolume = randomInt(30000, 50000, rng);
    else if (vingtile <= 10) baseVolume = randomInt(15000, 30000, rng);
    else if (vingtile <= 15) baseVolume = randomInt(8000, 15000, rng);
    else baseVolume = randomInt(3000, 8000, rng);
  }

  if (isKOL) {
    baseVolume *= 1 + (randomInt(15, 25, rng) / 100);
  }

  return Math.round(baseVolume);
}

function generateNews(
  firstName: string,
  lastName: string,
  specialty: string,
  isKOL: boolean,
  rng: () => number,
): PractitionerNews[] {
  const news: PractitionerNews[] = [];
  const newsCount = isKOL ? randomInt(3, 6, rng) : randomInt(0, 2, rng);
  const usedTitles = new Set<string>();

  for (let i = 0; i < newsCount; i++) {
    // Pneumologues have more publications/conferences, generalistes more events
    let type: keyof typeof NEWS_TEMPLATES;
    if (specialty === 'Pneumologue') {
      type = randomChoice(['publication', 'publication', 'conference', 'certification', 'award', 'event'] as const, rng);
    } else {
      type = randomChoice(['event', 'certification', 'event', 'publication'] as const, rng);
    }

    const templates = NEWS_TEMPLATES[type];
    const template: any = randomChoice(templates as any, rng);

    let content: string = template.contentTemplate;
    let title: string = template.title;

    if (template.topics) content = content.replace('{topic}', randomChoice(template.topics, rng));
    if (template.certs) content = content.replace('{cert}', randomChoice(template.certs, rng));
    if (template.domains) content = content.replace('{domain}', randomChoice(template.domains, rng));
    if (template.events) content = content.replace('{event}', randomChoice(template.events, rng));
    if (template.achievements) content = content.replace('{achievement}', randomChoice(template.achievements, rng));

    // Ensure no duplicate titles
    const uniqueKey = `${title}-${content.substring(0, 30)}`;
    if (usedTitles.has(uniqueKey)) continue;
    usedTitles.add(uniqueKey);

    const daysAgo = randomInt(10, 180, rng);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    news.push({
      id: `news-${i + 1}`,
      date: date.toISOString().split('T')[0],
      title,
      content,
      type,
      relevance: isKOL
        ? `Pertinence : Opportunité de renforcer le partenariat avec ${firstName} ${lastName}`
        : `Pertinence : Point d'accroche pour la prochaine visite`,
      source: type === 'publication' ? 'Base bibliographique médicale' : undefined,
    });
  }

  return news.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function generateNotes(
  firstName: string,
  lastName: string,
  title: string,
  specialty: string,
  rng: () => number,
): PractitionerNote[] {
  const notes: PractitionerNote[] = [];
  const noteCount = randomInt(3, 7, rng);
  const templates = specialty === 'Pneumologue' ? NOTES_PNEUMO : NOTES_GENERALISTE;
  const usedIndices = new Set<number>();

  for (let i = 0; i < noteCount; i++) {
    // Pick a template that hasn't been used yet
    let templateIdx: number;
    let attempts = 0;
    do {
      templateIdx = Math.floor(rng() * templates.length);
      attempts++;
    } while (usedIndices.has(templateIdx) && attempts < 20);
    usedIndices.add(templateIdx);

    const template = templates[templateIdx];
    const patientCount = randomInt(2, 12, rng);
    let content = template.content
      .replace(/{name}/g, `${title} ${lastName}`)
      .replace(/{title}/g, title)
      .replace(/{lastName}/g, lastName)
      .replace(/{firstName}/g, firstName)
      .replace(/{count}/g, String(patientCount));

    let nextAction = template.nextAction
      ? template.nextAction.replace(/{count}/g, String(patientCount))
      : undefined;

    const daysAgo = randomInt(14 + i * 40, 45 + i * 50, rng);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    notes.push({
      id: `note-${i + 1}`,
      date: date.toISOString().split('T')[0],
      content,
      author: randomChoice(NOTE_AUTHORS, rng),
      type: template.type,
      nextAction,
    });
  }

  return notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function generateVisitHistory(
  firstName: string,
  lastName: string,
  title: string,
  specialty: string,
  rng: () => number,
): VisitRecord[] {
  const visits: VisitRecord[] = [];
  const visitCount = randomInt(4, 10, rng);
  const visitNoteTemplates = specialty === 'Pneumologue' ? VISIT_NOTES_PNEUMO : VISIT_NOTES_GENERALISTE;
  const productCombos = specialty === 'Pneumologue' ? PRODUCT_COMBOS_PNEUMO : PRODUCT_COMBOS_GENERALISTE;

  for (let i = 0; i < visitCount; i++) {
    const daysAgo = randomInt(30 + i * 25, 55 + i * 30, rng);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    // Pick a unique visit note
    const noteTemplate = visitNoteTemplates[i % visitNoteTemplates.length];
    const visitNote = noteTemplate
      .replace(/{title}/g, title)
      .replace(/{lastName}/g, lastName)
      .replace(/{firstName}/g, firstName)
      .replace(/{count}/g, String(randomInt(2, 8, rng)));

    visits.push({
      id: `visit-${i + 1}`,
      date: date.toISOString().split('T')[0],
      type: 'completed',
      duration: randomInt(15, 45, rng),
      notes: visitNote,
      productsDiscussed: randomChoice(productCombos, rng),
    });
  }

  return visits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ═══════════════════════════════════════════════════════════
// GÉNÉRATEUR PRINCIPAL
// ═══════════════════════════════════════════════════════════

export function generatePractitioner(index: number): PractitionerProfile {
  // Use seeded RNG for reproducibility but unique per practitioner
  const rng = seededRandom(index * 7919 + 42);

  const isMale = rng() > 0.4;
  const firstName = isMale ? randomChoice(FIRST_NAMES_M, rng) : randomChoice(FIRST_NAMES_F, rng);

  // Ensure unique last names by using index-based selection with rotation
  const lastName = LAST_NAMES[(index * 3 + Math.floor(rng() * 7)) % LAST_NAMES.length];

  const specialty = rng() < 0.20 ? 'Pneumologue' : 'Médecin généraliste';
  const vingtile = rng() < 0.15 ? randomInt(1, 5, rng) : rng() < 0.4 ? randomInt(6, 10, rng) : randomInt(11, 20, rng);
  const isKOL = vingtile <= 5 && rng() < 0.3;
  const volumeL = generateRealisticVolume(vingtile, specialty, isKOL, rng);
  const volumeMonthly = Math.round(volumeL / 12);
  const loyaltyScore = vingtile <= 5 ? randomInt(7, 10, rng) : vingtile <= 10 ? randomInt(6, 9, rng) : randomInt(4, 8, rng);

  const city = CITIES_RHONE_ALPES[index % CITIES_RHONE_ALPES.length];
  const streetNumber = randomInt(1, 150, rng);
  const streetName = randomChoice(STREET_NAMES, rng);

  const emailDomain = randomChoice(['gmail.com', 'wanadoo.fr', 'orange.fr', 'outlook.fr', 'medecin.fr'], rng);
  const email = `${firstName.toLowerCase().replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a').replace(/[ùû]/g, 'u').replace(/ç/g, 'c').replace(/[ïî]/g, 'i')}.${lastName.toLowerCase().replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a')}@${emailDomain}`;
  const phone = `04 ${randomInt(70, 79, rng)} ${randomInt(10, 99, rng)} ${randomInt(10, 99, rng)} ${randomInt(10, 99, rng)}`;

  // 10% of practitioners never visited (new detections)
  const neverVisited = rng() < 0.10;
  let lastVisitDate: string | undefined;
  if (!neverVisited) {
    const lastVisitDaysAgo = randomInt(5, 180, rng);
    const lvDate = new Date();
    lvDate.setDate(lvDate.getDate() - lastVisitDaysAgo);
    lastVisitDate = lvDate.toISOString().split('T')[0];
  }

  const practTitle = isKOL && rng() < 0.3 ? 'Pr' : 'Dr';

  const subSpecialtyOptions = ['Allergologie respiratoire', 'Oncologie thoracique', 'Réhabilitation respiratoire', 'Sommeil et ventilation', 'Pneumologie interventionnelle'];

  return {
    id: `pract-${String(index + 1).padStart(3, '0')}`,
    title: practTitle,
    firstName,
    lastName,
    specialty,
    subSpecialty: specialty === 'Pneumologue' ? randomChoice([...subSpecialtyOptions, undefined, undefined], rng) as string | undefined : undefined,
    avatarUrl: `https://i.pravatar.cc/150?img=${index + 1}`,

    address: {
      street: `${streetNumber} ${streetName}`,
      city: city.name,
      postalCode: city.postalCode,
      country: 'France',
      coords: {
        lat: city.coords.lat + (rng() - 0.5) * 0.02,
        lng: city.coords.lng + (rng() - 0.5) * 0.02,
      },
    },

    contact: {
      email,
      phone,
      mobile: rng() > 0.4 ? `06 ${randomInt(10, 99, rng)} ${randomInt(10, 99, rng)} ${randomInt(10, 99, rng)} ${randomInt(10, 99, rng)}` : undefined,
    },

    metrics: {
      volumeL,
      volumeMonthly,
      loyaltyScore,
      vingtile,
      isKOL,
      potentialGrowth: vingtile <= 10 ? randomInt(10, 35, rng) : randomInt(5, 15, rng),
      churnRisk: loyaltyScore >= 8 ? 'low' : loyaltyScore >= 6 ? 'medium' : 'high',
    },

    notes: neverVisited ? [] : generateNotes(firstName, lastName, practTitle, specialty, rng),
    news: generateNews(firstName, lastName, specialty, isKOL, rng),
    visitHistory: neverVisited ? [] : generateVisitHistory(firstName, lastName, practTitle, specialty, rng),

    createdAt: new Date('2024-01-15').toISOString(),
    lastVisitDate,
    nextScheduledVisit: !neverVisited && rng() > 0.6
      ? new Date(Date.now() + randomInt(7, 60, rng) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : undefined,
  };
}

export function generateDatabase(count: number = 120): PractitionerProfile[] {
  const practitioners: PractitionerProfile[] = [];

  for (let i = 0; i < count; i++) {
    practitioners.push(generatePractitioner(i));
  }

  return practitioners.sort((a, b) => b.metrics.volumeL - a.metrics.volumeL);
}
