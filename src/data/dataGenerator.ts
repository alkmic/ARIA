import type { PractitionerProfile, PractitionerNote, PractitionerNews, VisitRecord, PracticeType, CompetitorBattlecard } from '../types/database';

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
// Separate news templates per specialty for maximum diversity
const NEWS_TEMPLATES_PNEUMO = {
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
        "la phénotypisation des patients BPCO pour l'oxygénothérapie personnalisée",
        "les facteurs prédictifs de mauvaise observance de l'OLD",
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
        "la prise en charge de l'insuffisance respiratoire aiguë sur chronique",
        "le suivi à distance des patients sous oxygénothérapie de déambulation",
      ],
    },
    {
      title: "Étude multicentrique parue dans CHEST",
      contentTemplate: "Investigateur principal pour une étude sur {topic}",
      topics: [
        "les biomarqueurs prédictifs d'exacerbation BPCO",
        "la télémédecine appliquée au suivi des patients sous O2",
        "les bénéfices de l'oxygénothérapie de déambulation",
        "l'impact de l'activité physique supervisée chez le patient sous OLD",
      ],
    },
    {
      title: "Lettre à l'éditeur dans Thorax",
      contentTemplate: "Commentaire sur {topic}",
      topics: [
        "les critères de sevrage de l'oxygénothérapie longue durée",
        "l'utilisation du NO exhalé dans le suivi BPCO",
        "la place de la réhabilitation pulmonaire précoce",
        "les recommandations ERS sur la VNI à domicile",
      ],
    },
    {
      title: "Revue systématique dans Respiratory Medicine",
      contentTemplate: "Analyse de la littérature sur {topic}",
      topics: [
        "l'observance de l'OLD au-delà de 15h/jour et mortalité",
        "la VNI versus l'O2 seul en BPCO sévère hypercapnique",
        "les dispositifs connectés en pneumologie ambulatoire",
        "l'évaluation médico-économique du télésuivi respiratoire",
      ],
    },
    {
      title: "Article original dans Pneumologie Clinique",
      contentTemplate: "Étude prospective sur {topic}",
      topics: [
        "la satisfaction des patients sous concentrateur portable",
        "l'adhésion au traitement par PPC chez les patients SAHOS sévères",
        "les comorbidités cardiovasculaires des patients BPCO sous OLD",
        "le rôle de l'infirmier coordinateur dans le parcours BPCO",
      ],
    },
    {
      title: "Chapitre dans le Traité de Pneumologie (EMC)",
      contentTemplate: "Rédaction d'un chapitre sur {topic}",
      topics: [
        "les indications et modalités de l'oxygénothérapie de longue durée",
        "la ventilation mécanique à domicile : indications et surveillance",
        "le syndrome obésité-hypoventilation : diagnostic et traitement",
      ],
    },
  ],
  certification: [
    {
      title: "Certification Universitaire",
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
      title: "Intervention au congrès",
      contentTemplate: "Présentation sur {topic} au {event}",
      topics: [
        "les avancées en oxygénothérapie",
        "la prise en charge des BPCO sévères",
        "l'éducation thérapeutique du patient respiratoire",
        "l'observance du traitement par O2 au long cours",
        "les parcours de soins innovants en pneumologie",
        "le rôle du télésuivi en post-hospitalisation BPCO",
        "les nouvelles cibles thérapeutiques dans l'asthme sévère",
      ],
      events: [
        "Congrès de la SPLF",
        "Congrès ERS (European Respiratory Society)",
        "Journées de Pneumologie Rhône-Alpes",
        "Congrès CPLF",
        "Journées Francophones d'Allergologie",
        "Assises Nationales de la BPCO",
        "Congrès CHEST (American College of Chest Physicians)",
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
        "son implication dans le programme de dépistage BPCO en médecine de ville",
      ],
    },
  ],
  event: [
    {
      title: "Organisation d'un événement médical",
      contentTemplate: "{event} sur {topic}",
      events: ["Formation continue", "Atelier pratique", "Table ronde", "Séminaire", "Journée d'étude", "Webinaire"],
      topics: [
        "la gestion de l'oxygénothérapie en ville",
        "les nouvelles technologies en assistance respiratoire",
        "le parcours de soins du patient BPCO",
        "l'interprofessionnalité dans la prise en charge respiratoire",
        "les innovations en ventilation à domicile",
        "l'utilisation des données connectées en pneumologie",
      ],
    },
  ],
};

const NEWS_TEMPLATES_GENERALISTE = {
  publication: [
    {
      title: "Article dans la Revue du Praticien",
      contentTemplate: "Publication sur {topic}",
      topics: [
        "le dépistage de la BPCO en soins primaires",
        "la coordination ville-hôpital pour les patients sous O2",
        "les red flags en consultation pour orientation pneumologique",
        "l'accompagnement du patient BPCO en médecine générale",
        "le rôle du médecin traitant dans le renouvellement de l'OLD",
        "la gestion du sevrage tabagique en cabinet de ville",
        "les critères d'adressage au pneumologue pour bilan respiratoire",
      ],
    },
    {
      title: "Publication dans Exercer - Revue de médecine générale",
      contentTemplate: "Retour d'expérience sur {topic}",
      topics: [
        "l'organisation de la consultation BPCO en cabinet libéral",
        "la place de la spirométrie au cabinet du généraliste",
        "l'éducation thérapeutique du patient insuffisant respiratoire",
        "le suivi à domicile des patients sous assistance respiratoire",
        "l'intégration du télésuivi dans la pratique de médecine générale",
        "le parcours patient BPCO vu depuis les soins primaires",
      ],
    },
    {
      title: "Contribution au Quotidien du Médecin",
      contentTemplate: "Tribune sur {topic}",
      topics: [
        "l'enjeu du dépistage précoce de la BPCO en France",
        "la prise en charge ambulatoire de l'insuffisance respiratoire chronique",
        "l'apport du numérique dans le suivi des maladies chroniques",
        "le rôle du généraliste dans la prévention de l'aggravation BPCO",
      ],
    },
    {
      title: "Article dans Médecine - Revue de l'UNAFORMEC",
      contentTemplate: "Synthèse pratique sur {topic}",
      topics: [
        "la prescription d'oxygénothérapie de longue durée en ville",
        "les outils d'évaluation de la dyspnée utilisables en consultation",
        "le suivi post-hospitalisation du patient BPCO exacerbé",
        "l'accompagnement du patient insuffisant respiratoire chronique et de son aidant",
      ],
    },
  ],
  certification: [
    {
      title: "Formation certifiante",
      contentTemplate: "Obtention d'un {cert} en {domain}",
      certs: ["DU", "DIU", "Attestation", "DPC"],
      domains: [
        "éducation thérapeutique du patient",
        "tabacologie",
        "médecine du sommeil",
        "gérontologie et polypathologies",
        "coordination des soins à domicile",
        "maladies respiratoires chroniques",
        "soins palliatifs et accompagnement",
        "médecine d'urgence ambulatoire",
      ],
    },
  ],
  conference: [
    {
      title: "Participation à un congrès",
      contentTemplate: "Intervention sur {topic} au {event}",
      topics: [
        "le repérage des maladies respiratoires en soins primaires",
        "les outils numériques pour le médecin traitant",
        "la coordination des acteurs du domicile (HAD, PSAD, IDE)",
        "l'optimisation du suivi des patients chroniques",
        "les parcours de soins des patients insuffisants respiratoires",
        "la téléconsultation et le télésuivi en médecine générale",
        "l'impact de la pollution atmosphérique sur les pathologies respiratoires",
      ],
      events: [
        "Congrès de la Médecine Générale France",
        "Journées Nationales de Médecine Générale (JNMG)",
        "Journées régionales de FMC",
        "Rencontres de la HAS",
        "Colloque Soins Primaires et Coordination",
        "Assises de la Médecine Générale",
        "Congrès WONCA France",
      ],
    },
  ],
  award: [
    {
      title: "Distinction professionnelle",
      contentTemplate: "Reconnaissance pour {achievement}",
      achievements: [
        "son engagement dans le dépistage des maladies respiratoires",
        "sa qualité de coordination avec les prestataires de santé à domicile",
        "son rôle de maître de stage universitaire",
        "son implication dans la maison de santé pluriprofessionnelle",
        "sa participation active au réseau de soins respiratoire régional",
        "son travail sur l'amélioration du parcours BPCO en soins primaires",
        "sa contribution à la formation des internes en médecine générale",
      ],
    },
  ],
  event: [
    {
      title: "Événement médical local",
      contentTemplate: "{event} sur {topic}",
      events: ["Soirée FMC", "Atelier pratique", "Groupe de pairs", "Journée MSP", "Réunion pluriprofessionnelle", "Séminaire DPC", "Staff paramédical"],
      topics: [
        "le bon usage des dispositifs médicaux respiratoires",
        "la prise en charge du patient BPCO en médecine de ville",
        "les innovations du PSAD et télésuivi",
        "la prévention et le sevrage tabagique",
        "la gestion des poly-pathologies chez le sujet âgé",
        "l'organisation du maintien à domicile des patients chroniques",
        "l'utilisation de la spirométrie en cabinet de ville",
        "la coordination IDE-MG pour le suivi des patients sous O2",
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
  globalUsedNews?: Set<string>,
): PractitionerNews[] {
  const news: PractitionerNews[] = [];
  // KOLs: 3-6, non-KOL pneumologues: 1-3, non-KOL generalistes: 0-2
  const newsCount = isKOL
    ? randomInt(3, 6, rng)
    : specialty === 'Pneumologue'
      ? randomInt(1, 3, rng)
      : randomInt(0, 2, rng);
  const usedTitles = globalUsedNews || new Set<string>();

  // Select specialty-specific templates
  const NEWS_TEMPLATES = specialty === 'Pneumologue' ? NEWS_TEMPLATES_PNEUMO : NEWS_TEMPLATES_GENERALISTE;

  // Type distribution per specialty
  const typeDistribution = specialty === 'Pneumologue'
    ? ['publication', 'publication', 'conference', 'conference', 'certification', 'award', 'event'] as const
    : ['event', 'event', 'certification', 'publication', 'conference', 'award'] as const;

  for (let i = 0; i < newsCount; i++) {
    const type = randomChoice([...typeDistribution], rng) as keyof typeof NEWS_TEMPLATES;

    const templates = NEWS_TEMPLATES[type];
    if (!templates || templates.length === 0) continue;

    // Try multiple times to find a unique news item (avoid cross-practitioner duplicates)
    let content = '';
    let title = '';
    let uniqueKey = '';
    let found = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      const template: any = randomChoice(templates as any, rng);
      content = template.contentTemplate;
      title = template.title;

      if (template.topics) content = content.replace('{topic}', randomChoice(template.topics, rng));
      if (template.certs) content = content.replace('{cert}', randomChoice(template.certs, rng));
      if (template.domains) content = content.replace('{domain}', randomChoice(template.domains, rng));
      if (template.events) content = content.replace('{event}', randomChoice(template.events, rng));
      if (template.achievements) content = content.replace('{achievement}', randomChoice(template.achievements, rng));

      uniqueKey = `${title}-${content.substring(0, 50)}`;
      if (!usedTitles.has(uniqueKey)) {
        found = true;
        break;
      }
    }
    if (!found) continue;
    usedTitles.add(uniqueKey);

    const daysAgo = randomInt(10, 200, rng);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    // More specific relevance messages
    const relevanceMessages = isKOL
      ? [
          `Opportunité de renforcer le partenariat avec ${firstName} ${lastName}`,
          `Levier de discussion stratégique sur nos innovations`,
          `Sujet aligné avec notre offre de télésuivi`,
          `Occasion de proposer un partenariat académique`,
        ]
      : [
          `Point d'accroche pour la prochaine visite`,
          `Occasion de présenter nos services complémentaires`,
          `Sujet en lien avec notre gamme de produits`,
          `Bon prétexte pour reprendre contact`,
        ];

    news.push({
      id: `news-${firstName.toLowerCase()}-${i + 1}`,
      date: date.toISOString().split('T')[0],
      title,
      content,
      type,
      relevance: randomChoice(relevanceMessages, rng),
      source: type === 'publication' ? randomChoice([
        'PubMed',
        'Base bibliographique médicale',
        'Google Scholar',
        'SUDOC',
      ], rng) : undefined,
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
// BATTLECARDS CONCURRENTIELLES
// ═══════════════════════════════════════════════════════════

const COMPETITOR_BATTLECARDS: Record<string, Omit<CompetitorBattlecard, 'isPrimary'>> = {
  'Vivisol': {
    competitor: 'Vivisol',
    ourAdvantages: [
      "Réactivité SAV +30% (astreinte 24/7 vs H+8 chez Vivisol)",
      "Télésuivi O₂ Connect inclus gratuitement (supplément payant chez Vivisol)",
      "Formation patient à domicile par IDE dédiée",
      "Gamme complète O2 + VNI + PPC (Vivisol limité en VNI)",
      "Plateforme Orkyn' patient avec appli mobile",
    ],
    theirStrengths: [
      "Tarifs agressifs sur les concentrateurs fixes (-10 à -15%)",
      "Implantation forte en Italie du Nord (patients frontaliers)",
      "Bonne relation historique avec certains CHU",
    ],
    counterArguments: [
      "Le coût total de prise en charge (incluant réhospitalisations évitées par le télésuivi) est inférieur chez Air Liquide",
      "Notre astreinte 24/7 réduit les passages aux urgences — argument décisif pour les pneumologues hospitaliers",
      "Nos données de télésuivi sont intégrables dans les DPI hospitaliers (interopérabilité HL7/FHIR)",
    ],
  },
  'Linde Healthcare': {
    competitor: 'Linde Healthcare',
    ourAdvantages: [
      "Connectivité IoT native sur tous les dispositifs médicaux",
      "Chronic Care Connect — suivi digital patient complet",
      "Plateforme Orkyn' dédiée avec éducation thérapeutique intégrée",
      "Réseau technicien 2x plus dense en Rhône-Alpes",
      "R&D interne avec brevets sur l'oxygénothérapie intelligente",
    ],
    theirStrengths: [
      "Adossé au groupe Linde (solidité financière)",
      "Bonne gamme de gaz médicaux hospitaliers",
      "Prix compétitifs sur les gros volumes hospitaliers",
    ],
    counterArguments: [
      "Linde est un industriel gazier — Air Liquide Santé est un spécialiste du parcours patient à domicile",
      "Notre plateforme de télésuivi est propriétaire et évolutive, pas un simple rebranding",
      "Nos IDE formateurs sont salariés (vs sous-traitance chez Linde) — continuité de la relation patient",
    ],
  },
  'SOS Oxygène': {
    competitor: 'SOS Oxygène',
    ourAdvantages: [
      "Couverture nationale complète (vs implantation régionale Sud)",
      "Gamme VNI/PPC complète ALMS (SOS limité en ventilation)",
      "R&D et innovation continue (télésuivi, IoT, IA)",
      "Capacité de prise en charge multi-pathologies (BPCO + SAS + IRC)",
      "Interlocuteur unique pour l'ensemble du parcours respiratoire",
    ],
    theirStrengths: [
      "Forte proximité locale dans le Sud-Est",
      "Image de PME réactive et à taille humaine",
      "Bonne notoriété chez les MG de ville dans leur zone",
    ],
    counterArguments: [
      "Notre maillage territorial en Rhône-Alpes est équivalent avec en plus la couverture nationale pour les patients voyageurs",
      "Notre programme patient Orkyn' offre un suivi plus complet que la simple livraison",
      "Pour les cas complexes (VNI + O2), un seul prestataire simplifie le parcours vs 2 intervenants",
    ],
  },
  'Bastide Médical': {
    competitor: 'Bastide Médical',
    ourAdvantages: [
      "Expertise respiratoire pure (vs Bastide multi-activité : nutrition, perf, stomie...)",
      "Forfaits LPPR optimisés pour la pneumologie",
      "Support technique respiratoire spécialisé 24/7",
      "Équipes terrain 100% dédiées au respiratoire",
      "Télésuivi O₂ avec algorithmes prédictifs d'exacerbation",
    ],
    theirStrengths: [
      "Offre globale MAD (oxygène + nutrition + perfusion)",
      "Réseau de pharmacies affiliées pour la capillarité",
      "Communication active auprès des MG de ville",
    ],
    counterArguments: [
      "Un généraliste du MAD ne peut pas égaler un spécialiste du respiratoire — nos techniciens sont formés exclusivement à la pneumologie",
      "La dispersion multi-activité de Bastide impacte les délais d'intervention respiratoire urgente",
      "Nos concentrateurs et VNI sont de dernière génération — Bastide revend souvent du matériel reconditionné",
    ],
  },
};

function generateBattlecards(previousProvider?: string, rng?: () => number): CompetitorBattlecard[] {
  const allCompetitors = Object.keys(COMPETITOR_BATTLECARDS);
  const battlecards: CompetitorBattlecard[] = [];

  if (previousProvider && COMPETITOR_BATTLECARDS[previousProvider]) {
    // Primary battlecard for the known previous provider
    battlecards.push({
      ...COMPETITOR_BATTLECARDS[previousProvider],
      isPrimary: true,
    });
  }

  // Add 1-2 other competitors for reference
  const others = allCompetitors.filter(c => c !== previousProvider);
  const otherCount = rng ? randomInt(1, 2, rng) : 1;
  for (let i = 0; i < otherCount && i < others.length; i++) {
    const idx = rng ? Math.floor(rng() * others.length) : i;
    const competitor = others.splice(idx, 1)[0];
    battlecards.push({
      ...COMPETITOR_BATTLECARDS[competitor],
      isPrimary: false,
    });
  }

  return battlecards;
}

// ═══════════════════════════════════════════════════════════
// GÉNÉRATEUR PRINCIPAL
// ═══════════════════════════════════════════════════════════

export function generatePractitioner(index: number, globalUsedNews?: Set<string>): PractitionerProfile {
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

  // Déterminer le type d'exercice de manière réaliste :
  // - Pneumologues : 50% hospitalier, 20% mixte, 30% ville
  // - MG : 80% ville, 10% mixte, 10% hospitalier
  // - KOLs : plus souvent hospitaliers ou mixtes
  let practiceType: PracticeType;
  if (specialty === 'Pneumologue') {
    if (isKOL) {
      practiceType = rng() < 0.55 ? 'hospitalier' : rng() < 0.75 ? 'mixte' : 'ville';
    } else {
      const r = rng();
      practiceType = r < 0.50 ? 'hospitalier' : r < 0.70 ? 'mixte' : 'ville';
    }
  } else {
    // Médecin généraliste
    const r = rng();
    practiceType = r < 0.80 ? 'ville' : r < 0.90 ? 'mixte' : 'hospitalier';
  }

  const subSpecialtyOptions = ['Allergologie respiratoire', 'Oncologie thoracique', 'Réhabilitation respiratoire', 'Sommeil et ventilation', 'Pneumologie interventionnelle'];

  return {
    id: `pract-${String(index + 1).padStart(3, '0')}`,
    title: practTitle,
    firstName,
    lastName,
    specialty,
    practiceType,
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
    news: generateNews(firstName, lastName, specialty, isKOL, rng, globalUsedNews),
    visitHistory: neverVisited ? [] : generateVisitHistory(firstName, lastName, practTitle, specialty, rng),
    battlecards: generateBattlecards(undefined, rng),

    createdAt: new Date('2024-01-15').toISOString(),
    lastVisitDate,
    nextScheduledVisit: !neverVisited && rng() > 0.6
      ? new Date(Date.now() + randomInt(7, 60, rng) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : undefined,
  };
}

// ═══════════════════════════════════════════════════════════
// NOUVEAUX PRATICIENS DÉTECTÉS (jamais visités, urgence haute)
// Ces praticiens simulent des détections récentes par le système
// ═══════════════════════════════════════════════════════════

interface NewPractitionerTemplate {
  firstName: string;
  lastName: string;
  isMale: boolean;
  specialty: 'Pneumologue' | 'Médecin généraliste';
  city: typeof CITIES_RHONE_ALPES[number];
  vingtile: number;
  isKOL: boolean;
  subSpecialty?: string;
  practiceType: PracticeType;
  detectedDaysAgo: number;
  previousProvider?: string;
  titleOverride?: 'Pr' | 'Dr';  // Override auto-title (e.g. Pr for academics regardless of KOL)
  newsOverrides: PractitionerNews[];
}

const NEW_PRACTITIONERS: NewPractitionerTemplate[] = [
  {
    firstName: 'Alexandre',
    lastName: 'Delorme',
    isMale: true,
    specialty: 'Pneumologue',
    city: CITIES_RHONE_ALPES[0], // Lyon
    vingtile: 2,
    isKOL: false,                // Pas encore KOL pour nous — à conquérir
    titleOverride: 'Pr',         // Titre académique (PU-PH), indépendant du statut KOL
    subSpecialty: 'Réhabilitation respiratoire',
    practiceType: 'hospitalier',
    detectedDaysAgo: 5,
    previousProvider: 'Vivisol',
    newsOverrides: [
      {
        id: 'news-delorme-1',
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: "Nomination comme chef de service pneumologie au CHU Lyon-Sud",
        content: "Nommé chef du service de pneumologie au CHU Lyon-Sud, succédant au Pr Étienne qui part en retraite. Prend en charge un service de 45 lits avec une unité de soins intensifs respiratoires. Fort potentiel prescripteur — pas encore dans notre réseau.",
        type: 'event',
        relevance: "Opportunité majeure : nouveau chef de service = nouvelles décisions d'approvisionnement. Profil haut potentiel KOL à conquérir.",
      },
      {
        id: 'news-delorme-2',
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: "Publication dans The Lancet Respiratory Medicine",
        content: "Co-auteur principal d'une étude randomisée sur l'impact du télésuivi SpO2 continu sur la réduction des hospitalisations chez les patients BPCO sévères. Résultats : -42% de réhospitalisations à 6 mois.",
        type: 'publication',
        relevance: "Sa publication porte EXACTEMENT sur le télésuivi O2 — notre produit phare. Levier de discussion idéal pour un premier contact.",
        source: 'PubMed',
      },
    ],
  },
  {
    firstName: 'Émilie',
    lastName: 'Beaumont',
    isMale: false,
    specialty: 'Pneumologue',
    city: CITIES_RHONE_ALPES[2], // Grenoble
    vingtile: 15,               // Installation récente — patientèle en construction, volume faible
    isKOL: false,
    subSpecialty: 'Sommeil et ventilation',
    practiceType: 'mixte',
    detectedDaysAgo: 8,
    previousProvider: 'Linde Healthcare',
    newsOverrides: [
      {
        id: 'news-beaumont-1',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: "Ouverture d'un cabinet de pneumologie à Grenoble Europole",
        content: "Installation récente dans le quartier Europole de Grenoble, spécialisée en pathologies du sommeil et ventilation non invasive. Patientèle en construction, réfère actuellement au CHU de Grenoble.",
        type: 'event',
        relevance: "Nouvelle installation = recherche active de prestataire. Fenêtre de captation très courte avant que la concurrence ne s'installe.",
      },
      {
        id: 'news-beaumont-2',
        date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: "DIU Sommeil et Ventilation obtenu à Paris-Descartes",
        content: "Obtention du DIU de pathologies du sommeil et ventilation, formation reconnue comme référence en France. Spécialisation en SAHOS et overlap syndrome.",
        type: 'certification',
        relevance: "Certification récente = praticienne à jour, réceptive aux innovations. Proposer notre gamme PPC/VNI complète.",
      },
    ],
  },
  {
    firstName: 'Raphaël',
    lastName: 'Fontanelli',
    isMale: true,
    specialty: 'Médecin généraliste',
    city: CITIES_RHONE_ALPES[4], // Annecy
    vingtile: 12,               // MSP récente — fort potentiel collectif mais volume individuel encore modeste
    isKOL: false,
    practiceType: 'ville',
    detectedDaysAgo: 12,
    newsOverrides: [
      {
        id: 'news-fontanelli-1',
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: "Création d'une maison de santé pluriprofessionnelle à Annecy-le-Vieux",
        content: "Cofondateur de la MSP des Aravis avec 4 MG, 2 IDE, 1 kiné et 1 pharmacien. Structure orientée parcours de soins chroniques avec un accent sur les pathologies respiratoires (zone de montagne).",
        type: 'event',
        relevance: "MSP = fort volume potentiel (4 MG prescripteurs). Si on capte la MSP, on capte tous les médecins. Priorité absolue.",
      },
    ],
  },
  {
    firstName: 'Nadia',
    lastName: 'Khelifi',
    isMale: false,
    specialty: 'Pneumologue',
    city: CITIES_RHONE_ALPES[3], // Saint-Étienne
    vingtile: 5,
    isKOL: false,
    subSpecialty: 'Oncologie thoracique',
    practiceType: 'hospitalier',
    detectedDaysAgo: 3,
    previousProvider: 'SOS Oxygène',
    newsOverrides: [
      {
        id: 'news-khelifi-1',
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: "Recrutement au CHU de Saint-Étienne — Service pneumo-oncologie",
        content: "Nouvellement recrutée comme PH en pneumo-oncologie au CHU de Saint-Étienne. Arrive du CHU de Toulouse où elle était assistante. Spécialisation dans la prise en charge palliative des cancers bronchiques avec oxygénothérapie.",
        type: 'event',
        relevance: "Venue d'un autre CHU = pas de prestataire local attitré. Fenêtre de premier contact cruciale cette semaine.",
      },
      {
        id: 'news-khelifi-2',
        date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: "Communication orale au Congrès de Pneumologie de Langue Française 2025",
        content: "Présentation sur l'optimisation de l'oxygénothérapie palliative chez les patients atteints de cancer bronchique non à petites cellules. Focus sur la qualité de vie et le maintien à domicile.",
        type: 'conference',
        relevance: "Sujet directement lié à nos solutions de maintien à domicile. Point d'accroche parfait pour une première visite.",
      },
    ],
  },
  {
    firstName: 'Marc',
    lastName: 'Joubert',
    isMale: true,
    specialty: 'Médecin généraliste',
    city: CITIES_RHONE_ALPES[6], // Valence
    vingtile: 10,               // Reprise cabinet avec 15 patients O2 — volume correct mais pas top prescripteur
    isKOL: false,
    practiceType: 'ville',
    detectedDaysAgo: 15,
    previousProvider: 'Bastide Médical',
    newsOverrides: [
      {
        id: 'news-joubert-1',
        date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: "Reprise du cabinet du Dr Maurin à Valence (départ en retraite)",
        content: "Reprend le cabinet du Dr Maurin qui comptait 15 patients sous oxygénothérapie suivis par Bastide Médical. Le Dr Joubert souhaite réévaluer les contrats fournisseurs et moderniser les équipements.",
        type: 'event',
        relevance: "15 patients sous O2 à récupérer ! Le Dr Joubert est ouvert au changement de prestataire. Visite de captation prioritaire.",
      },
    ],
  },
  {
    firstName: 'Camille',
    lastName: 'Ravier',
    isMale: false,
    specialty: 'Pneumologue',
    city: CITIES_RHONE_ALPES[5], // Chambéry
    vingtile: 3,
    isKOL: true,
    subSpecialty: 'Allergologie respiratoire',
    practiceType: 'mixte',       // Coordonne réseau ville-hôpital (12 MG + 3 pneumo)
    detectedDaysAgo: 7,
    newsOverrides: [
      {
        id: 'news-ravier-1',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: "Lancement du réseau Respir'Alpes (réseau sentinelle BPCO)",
        content: "Initiatrice et coordinatrice du réseau Respir'Alpes, premier réseau sentinelle de dépistage et suivi BPCO en Savoie. 12 MG et 3 pneumologues impliqués. Objectif : 500 spirométries de dépistage en 2026.",
        type: 'event',
        relevance: "Réseau de 12 MG + 3 pneumo = multiplicateur d'impact. Si Air Liquide devient partenaire du réseau, accès à tous les prescripteurs impliqués.",
      },
      {
        id: 'news-ravier-2',
        date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: "Étude dans la Revue des Maladies Respiratoires",
        content: "Publication sur le sous-diagnostic de la BPCO en zones rurales et de montagne. Données sur 800 patients en Savoie montrant un retard diagnostique moyen de 5 ans. Plaidoyer pour le dépistage systématique en médecine de ville.",
        type: 'publication',
        relevance: "Publication très alignée avec notre mission de dépistage. Proposer un partenariat de dépistage spirométrique avec notre matériel.",
        source: 'PubMed',
      },
    ],
  },
];

function generateNewPractitioner(template: NewPractitionerTemplate, baseIndex: number): PractitionerProfile {
  const rng = seededRandom((baseIndex + 200) * 7919 + 42);

  const city = template.city;
  const streetNumber = randomInt(1, 150, rng);
  const streetName = randomChoice(STREET_NAMES, rng);

  const emailDomain = randomChoice(['gmail.com', 'orange.fr', 'outlook.fr', 'medecin.fr'], rng);
  const cleanFirst = template.firstName.toLowerCase().replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a').replace(/[ùû]/g, 'u').replace(/ç/g, 'c').replace(/[ïî]/g, 'i');
  const cleanLast = template.lastName.toLowerCase().replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a');
  const email = `${cleanFirst}.${cleanLast}@${emailDomain}`;
  const phone = `04 ${randomInt(70, 79, rng)} ${randomInt(10, 99, rng)} ${randomInt(10, 99, rng)} ${randomInt(10, 99, rng)}`;

  const volumeL = generateRealisticVolume(template.vingtile, template.specialty, template.isKOL, rng);
  const loyaltyScore = 5; // Unknown loyalty for new practitioners

  const detectedDate = new Date();
  detectedDate.setDate(detectedDate.getDate() - template.detectedDaysAgo);

  const practTitle = template.titleOverride || (template.isKOL ? 'Pr' : 'Dr');

  return {
    id: `pract-new-${String(baseIndex + 1).padStart(2, '0')}`,
    title: practTitle,
    firstName: template.firstName,
    lastName: template.lastName,
    specialty: template.specialty,
    practiceType: template.practiceType,
    subSpecialty: template.subSpecialty,
    avatarUrl: `https://i.pravatar.cc/150?img=${baseIndex + 130}`,

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
      mobile: `06 ${randomInt(10, 99, rng)} ${randomInt(10, 99, rng)} ${randomInt(10, 99, rng)} ${randomInt(10, 99, rng)}`,
    },

    metrics: {
      volumeL,
      volumeMonthly: Math.round(volumeL / 12),
      loyaltyScore,
      vingtile: template.vingtile,
      isKOL: template.isKOL,
      potentialGrowth: randomInt(25, 50, rng),
      churnRisk: 'medium' as const,
    },

    // New practitioners have no visit history or notes (never visited)
    notes: [],
    news: template.newsOverrides,
    visitHistory: [],
    battlecards: generateBattlecards(template.previousProvider, rng),

    // New practitioner fields
    isNew: true,
    detectedDate: detectedDate.toISOString().split('T')[0],
    previousProvider: template.previousProvider,

    createdAt: detectedDate.toISOString(),
    lastVisitDate: undefined,
    nextScheduledVisit: undefined,
  };
}

export function generateDatabase(count: number = 120): PractitionerProfile[] {
  const practitioners: PractitionerProfile[] = [];
  // Shared set to prevent the same news from appearing on multiple practitioners
  const globalUsedNews = new Set<string>();

  for (let i = 0; i < count; i++) {
    practitioners.push(generatePractitioner(i, globalUsedNews));
  }

  // Add explicitly new practitioners (recently detected, never visited)
  NEW_PRACTITIONERS.forEach((template, i) => {
    practitioners.push(generateNewPractitioner(template, i));
  });

  return practitioners.sort((a, b) => b.metrics.volumeL - a.metrics.volumeL);
}
