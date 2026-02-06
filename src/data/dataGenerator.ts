import type { PractitionerProfile, PractitionerNote, PractitionerNews, VisitRecord } from '../types/database';

/**
 * Générateur de données réalistes et cohérentes pour les praticiens
 * Chaque praticien a un profil unique avec des notes, actualités et historique variés
 */

// Données de référence pour la région Rhône-Alpes
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
  'Avenue Maréchal Foch', 'Rue Pasteur', 'Rue Émile Zola',
  'Avenue des Alpes', 'Rue du Docteur Calmette', 'Boulevard de la Croix-Rousse',
];

const FIRST_NAMES_M = ['Jean', 'Pierre', 'Louis', 'Michel', 'Paul', 'André', 'François', 'Philippe', 'Antoine', 'Marc', 'Alain', 'Jacques', 'Henri', 'Bernard', 'Christophe', 'Nicolas', 'Thierry', 'Éric', 'Olivier', 'David'];
const FIRST_NAMES_F = ['Marie', 'Sophie', 'Catherine', 'Anne', 'Isabelle', 'Claire', 'Nathalie', 'Sylvie', 'Françoise', 'Hélène', 'Valérie', 'Monique', 'Brigitte', 'Élise', 'Charlotte', 'Sandrine', 'Laurence', 'Céline', 'Aurélie', 'Delphine'];
const LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Lefèvre', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand', 'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guerin', 'Muller', 'Henry', 'Roussel', 'Nicolas', 'Perrin', 'Morin', 'Mathieu', 'Clement', 'Gauthier', 'Dumont', 'Lopez', 'Fontaine', 'Chevalier', 'Robin'];

// Noms des délégués variés (pas toujours le même auteur)
const DELEGATE_NAMES = ['Marie Dupont', 'Sophie Martin', 'Thomas Laurent', 'Julie Perrin', 'Antoine Faure'];

// Concurrents
const COMPETITORS = ['Vivisol', 'Linde Healthcare', 'SOS Oxygène', 'Bastide Médical', 'Orkyn'];

// ============================================================
// TEMPLATES DE NOTES TRÈS VARIÉS (30+)
// Chaque note est unique grâce aux variables contextuelles
// ============================================================
const VISIT_NOTE_TEMPLATES_PNEUMO = [
  "Visite approfondie de 40 min. Discussion sur {count} patients sous OLD dont 2 avec mauvaise observance. {name} souhaite tester notre oxymètre connecté pour le suivi à distance. RDV de démonstration prévu dans 3 semaines.",
  "Entretien centré sur la transition OLD liquide → concentrateur portable pour des patients actifs. {name} a 3 patients sportifs qui se plaignent des contraintes de l'oxygène liquide. Envoi du dossier technique FreeStyle.",
  "{name} nous a signalé un retour technique : le débitmètre du patient Mme Gérin ne fonctionne plus correctement. Intervention SAV programmée sous 48h. En dehors de ça, très satisfait de la qualité globale du service.",
  "Présentation des nouvelles fonctionnalités du monitoring à distance. {name} impressionné par le tableau de bord patient. Souhaite l'intégrer pour ses {count} patients les plus sévères. Devis à préparer.",
  "Discussion sur les recommandations GOLD 2025 et l'impact sur les prescriptions d'oxygénothérapie. {name} pense que 4 patients pourraient bénéficier d'une VNI nocturne en complément de l'OLD.",
  "Échange sur le sevrage tabagique chez les patients BPCO sous oxygène. {name} collabore avec la consultation tabacologie du CHU pour un protocole combiné. Opportunité de partenariat éducatif.",
  "{name} nous alerte : un patient est passé chez {competitor} pour le renouvellement de son concentrateur. Raison invoquée : délai d'intervention trop long. À investiguer avec le service technique.",
  "Revue trimestrielle des {count} patients suivis. 2 dossiers à renouveler dans les 3 prochains mois. {name} recommande d'anticiper les visites de contrôle pour éviter les ruptures de prise en charge.",
  "RDV court car urgence clinique à gérer. {name} nous confirme néanmoins sa participation au workshop régional sur la réhabilitation respiratoire qu'on organise le mois prochain. 5 minutes productives.",
  "Visite orientée innovation : présentation du concentrateur nouvelle génération plus silencieux (-30 dB). {name} très intéressé, a 2 patients qui se plaignent du bruit nocturne de leur appareil actuel.",
];

const VISIT_NOTE_TEMPLATES_GENERAL = [
  "Visite de courtoisie, {name} très occupé mais a pris 15 min. A mentionné un nouveau patient BPCO diagnostiqué la semaine dernière qui aura besoin d'une mise sous O2. Dossier à préparer.",
  "Excellent échange. {name} apprécie notre réactivité SAV. A recommandé Air Liquide à un confrère de {city} qui cherche un prestataire fiable. Contact transmis.",
  "Discussion sur les protocoles d'oxygénothérapie en médecine générale. {name} souhaiterait une formation courte (1h) pour son équipe sur les critères de mise sous OLD. À organiser.",
  "{name} a exprimé des préoccupations sur le coût des consommables pour ses patients. A comparé nos tarifs avec {competitor}. Besoin de préparer un argumentaire prix détaillé.",
  "Visite productive de 25 min. {name} suit {count} patients sous O2 et tous sont stables. Pas de nouveaux besoins immédiats, mais souhaite être informé des innovations en télésuivi.",
  "Le Dr est intéressé par notre programme d'éducation thérapeutique pour son patient M. Renaud (BPCO stade III). L'observance est un vrai sujet — le patient retire son O2 la nuit.",
  "{name} a posé des questions sur la VNI après avoir assisté à une présentation au congrès régional. Première fois qu'il envisage de prescrire pour un de ses patients. Bon potentiel.",
  "Passage rapide à la clinique. {name} nous informe qu'un de ses patients (Mme Lefèvre) est en maison de retraite maintenant. Besoin de coordonner le transfert d'équipement avec l'EHPAD.",
  "Bonne relation maintenue. {name} satisfait du service mais note que le livreur d'oxygène a été en retard 2 fois ce mois. Remonté à la logistique. Aucune rupture de service heureusement.",
  "Rencontre à l'occasion d'un déjeuner FMC sur les pathologies respiratoires. {name} a montré un intérêt pour l'aérosolthérapie à domicile. Suite à donner lors de la prochaine visite.",
];

const PHONE_NOTE_TEMPLATES = [
  "Appel pour confirmer la livraison d'oxygène chez Mme Dupré. {name} demande aussi un renouvellement d'ordonnance pour son patient M. Bourget.",
  "Appel entrant : {name} souhaite signaler un dysfonctionnement sur le concentrateur de M. Vidal. Intervention technique planifiée pour demain matin.",
  "Appel de suivi suite à la dernière visite. {name} confirme que le patient Mme Gérard s'adapte bien au concentrateur portable. Retours positifs.",
  "Point téléphonique rapide. {name} demande de la documentation sur nos nouvelles solutions de VNI pour un patient qui vient d'être diagnostiqué SAS sévère.",
  "Relance pour la présentation produit à l'équipe médicale. {name} propose le mardi 14h, créneau bloqué pour 6 médecins. Très belle opportunité.",
];

const EMAIL_NOTE_TEMPLATES = [
  "Mail reçu : {name} a transmis une ordonnance pour mise sous O2 d'un nouveau patient, M. Tessier, BPCO stade IV. Mise en place prévue cette semaine.",
  "Échange par mail concernant la facturation du trimestre. {name} signale un doublon. Transmis au service comptabilité pour correction.",
  "Réponse à notre invitation au symposium sur l'oxygénothérapie — {name} confirme sa participation et souhaite amener 2 internes.",
  "Mail de {name} : demande de certificat CE pour le concentrateur portable, requis par l'administration de l'hôpital pour validation du remboursement.",
];

// ============================================================
// TEMPLATES D'ACTUALITÉS VARIÉS
// ============================================================
const NEWS_TEMPLATES = {
  publication: [
    {
      title: "Publication dans l'European Respiratory Journal",
      contentTemplate: "Co-auteur d'une étude sur {topic}",
      topics: [
        "le sevrage tabagique chez le patient BPCO avec oxygénothérapie",
        "l'optimisation des débits d'oxygène en fonction de l'activité physique",
        "l'impact de l'oxygénothérapie nocturne sur la qualité de vie",
        "les nouvelles recommandations pour l'oxygénothérapie ambulatoire",
        "la non-observance de l'OLD chez les patients de plus de 75 ans",
        "les bénéfices de la réhabilitation respiratoire à domicile",
      ],
    },
    {
      title: "Article dans Revue des Maladies Respiratoires",
      contentTemplate: "Publication d'un cas clinique sur {topic}",
      topics: [
        "la gestion de l'hypoxémie sévère en ambulatoire",
        "l'adaptation des traitements chez les patients BPCO âgés",
        "les complications de l'oxygénothérapie de longue durée",
        "l'efficacité de la VNI nocturne en BPCO sévère",
        "la prise en charge des exacerbations fréquentes à domicile",
      ],
    },
    {
      title: "Publication dans Respiratory Medicine",
      contentTemplate: "Étude multicentrique sur {topic}",
      topics: [
        "les phénotypes cliniques des patients sous OLD en France",
        "l'impact du suivi connecté sur l'observance de l'oxygénothérapie",
        "la qualité de vie sous concentrateur portable vs liquide",
      ],
    },
  ],
  certification: [
    {
      title: "Certification Universitaire en Pneumologie",
      contentTemplate: "Obtention d'un {cert} en {domain}",
      certs: ["DU", "DIU", "Master 2", "Certificat de compétences"],
      domains: [
        "réhabilitation respiratoire",
        "pneumologie interventionnelle",
        "allergologie respiratoire",
        "oncologie thoracique",
        "médecine du sommeil",
        "ventilation mécanique à domicile",
      ],
    },
  ],
  conference: [
    {
      title: "Intervention au Congrès de Pneumologie",
      contentTemplate: "Présentation sur {topic} au {event}",
      topics: [
        "les avancées en oxygénothérapie ambulatoire",
        "la prise en charge des BPCO sévères à domicile",
        "l'éducation thérapeutique du patient respiratoire",
        "le télésuivi des patients sous oxygène",
        "les parcours de soins respiratoires en ville",
        "l'innovation dans les dispositifs médicaux respiratoires",
      ],
      events: [
        "Congrès de la SPLF (Société de Pneumologie de Langue Française)",
        "Congrès ERS (European Respiratory Society) à Vienne",
        "Journées de Pneumologie Rhône-Alpes",
        "Congrès CPLF (Congrès de Pneumologie de Langue Française)",
        "Forum Alvéole (ventilation et O2 à domicile)",
        "Assises du CNCH (Centre National des Cardiologues des Hôpitaux)",
      ],
    },
  ],
  award: [
    {
      title: "Distinction professionnelle",
      contentTemplate: "Reconnaissance pour {achievement}",
      achievements: [
        "son excellence dans la prise en charge des patients sous oxygénothérapie",
        "sa contribution à la recherche en pneumologie ambulatoire",
        "son engagement dans l'éducation thérapeutique respiratoire",
        "son innovation dans les protocoles de télésuivi des patients BPCO",
        "son implication dans la formation des jeunes pneumologues",
      ],
    },
  ],
  event: [
    {
      title: "Organisation d'un événement médical",
      contentTemplate: "{event} sur {topic}",
      events: ["Formation continue régionale", "Atelier pratique hospitalier", "Table ronde interprofessionnelle", "Webinaire", "Séminaire"],
      topics: [
        "la gestion de l'oxygénothérapie en ville",
        "les nouvelles technologies en assistance respiratoire",
        "le parcours de soins du patient BPCO",
        "le rôle du médecin traitant dans le suivi de l'OLD",
        "les critères de choix entre OLD liquide et concentrateur",
      ],
    },
  ],
};

// ============================================================
// TEMPLATES D'HISTORIQUE DE VISITE VARIÉS
// ============================================================
const VISIT_HISTORY_TEMPLATES = [
  { notes: "Présentation des nouvelles solutions d'oxygénothérapie portable. Praticien réceptif, souhaite documentation complète.", products: ['Concentrateur portable FreeStyle'] },
  { notes: "Revue des patients sous OLD. Discussion sur les renouvellements d'ordonnance à venir et les critères de suivi.", products: ['Oxygène liquide (OLD)'] },
  { notes: "Point sur le service technique. Aucune réclamation depuis 3 mois. Le praticien souligne la qualité des interventions.", products: ['Service technique 24/7'] },
  { notes: "Échange sur les nouveaux protocoles VNI pour le SAS. Le praticien envisage de diversifier ses prescriptions.", products: ['VNI (Ventilation Non Invasive)', 'CPAP AutoSet'] },
  { notes: "Discussion sur l'éducation thérapeutique des patients et l'amélioration de l'observance.", products: ['Programme éducation thérapeutique'] },
  { notes: "Présentation du monitoring connecté et du tableau de bord patient. Fort intérêt pour le suivi à distance.", products: ['Monitoring à distance', 'Oxymètre connecté'] },
  { notes: "Visite de routine. Le praticien a mentionné 2 nouveaux patients à équiper dans le mois.", products: ['Concentrateur fixe Aérolib', 'Oxygène liquide (OLD)'] },
  { notes: "Formation de 20 min sur le nouveau débitmètre intelligent. Mise en place chez 3 patients de suite.", products: ['Débitmètre intelligent'] },
  { notes: "Point trimestriel avec revue de l'ensemble du portefeuille patients. Tous les indicateurs sont stables.", products: ['Oxygène liquide (OLD)', 'Service technique 24/7'] },
  { notes: "Discussion concurrence : le praticien a reçu une offre de Vivisol. Argumentaire contre-offre préparé.", products: ['Concentrateur fixe Aérolib'] },
  { notes: "Visite centrée sur l'aérosolthérapie pour un patient asthmatique sévère. Ordonnance établie sur place.", products: ['Aérosolthérapie'] },
  { notes: "Déjeuner de travail pour discuter du partenariat sur un atelier d'éducation thérapeutique au cabinet.", products: ['Programme éducation thérapeutique'] },
];

// ============================================================
// GÉNÉRATEUR ALÉATOIRE SEEDÉ (pour reproductibilité par praticien)
// ============================================================
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function randomChoice<T>(array: T[], rand: () => number = Math.random): T {
  return array[Math.floor(rand() * array.length)];
}

function randomInt(min: number, max: number, rand: () => number = Math.random): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function generateRealisticVolume(vingtile: number, specialty: string, isKOL: boolean, rand: () => number): number {
  let baseVolume: number;

  if (specialty === 'Pneumologue') {
    if (vingtile <= 2) baseVolume = randomInt(200000, 300000, rand);
    else if (vingtile <= 5) baseVolume = randomInt(120000, 200000, rand);
    else if (vingtile <= 10) baseVolume = randomInt(60000, 120000, rand);
    else if (vingtile <= 15) baseVolume = randomInt(30000, 60000, rand);
    else baseVolume = randomInt(10000, 30000, rand);
  } else {
    if (vingtile <= 2) baseVolume = randomInt(50000, 80000, rand);
    else if (vingtile <= 5) baseVolume = randomInt(30000, 50000, rand);
    else if (vingtile <= 10) baseVolume = randomInt(15000, 30000, rand);
    else if (vingtile <= 15) baseVolume = randomInt(8000, 15000, rand);
    else baseVolume = randomInt(3000, 8000, rand);
  }

  if (isKOL) {
    baseVolume *= 1 + (randomInt(15, 25, rand) / 100);
  }

  return Math.round(baseVolume);
}

function generateNews(
  _firstName: string,
  _lastName: string,
  specialty: string,
  isKOL: boolean,
  rand: () => number
): PractitionerNews[] {
  const news: PractitionerNews[] = [];
  const newsCount = isKOL ? randomInt(3, 6, rand) : (specialty === 'Pneumologue' ? randomInt(1, 3, rand) : randomInt(0, 2, rand));
  const usedTitles = new Set<string>();

  for (let i = 0; i < newsCount; i++) {
    const typeKeys = Object.keys(NEWS_TEMPLATES) as Array<keyof typeof NEWS_TEMPLATES>;
    const type = randomChoice(typeKeys, rand);
    const templates = NEWS_TEMPLATES[type];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const template: any = randomChoice(templates as any, rand);

    let content: string = template.contentTemplate;
    const title: string = template.title;

    // Avoid duplicate news titles per practitioner
    if (usedTitles.has(title + type)) continue;
    usedTitles.add(title + type);

    if (template.topics && Array.isArray(template.topics)) {
      content = content.replace('{topic}', randomChoice(template.topics as string[], rand));
    }
    if (template.certs && Array.isArray(template.certs)) {
      content = content.replace('{cert}', randomChoice(template.certs as string[], rand));
    }
    if (template.domains && Array.isArray(template.domains)) {
      content = content.replace('{domain}', randomChoice(template.domains as string[], rand));
    }
    if (template.events && Array.isArray(template.events)) {
      content = content.replace('{event}', randomChoice(template.events as string[], rand));
    }
    if (template.achievements && Array.isArray(template.achievements)) {
      content = content.replace('{achievement}', randomChoice(template.achievements as string[], rand));
    }

    const daysAgo = randomInt(10, 180, rand);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    news.push({
      id: `news-${i + 1}`,
      date: date.toISOString().split('T')[0],
      title,
      content,
      type,
      relevance: isKOL
        ? "Pertinence : Opportunité de discussion sur nos programmes d'accompagnement et innovations"
        : "Pertinence : Maintenir la relation et valoriser l'expertise",
      source: type === 'publication' ? 'Base bibliographique médicale' : undefined,
    });
  }

  return news.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function generateNotes(
  _firstName: string,
  lastName: string,
  specialty: string,
  city: string,
  isKOL: boolean,
  rand: () => number
): PractitionerNote[] {
  const notes: PractitionerNote[] = [];
  const noteCount = isKOL ? randomInt(4, 7, rand) : randomInt(2, 5, rand);

  // Select templates based on specialty
  const visitTemplates = specialty === 'Pneumologue'
    ? VISIT_NOTE_TEMPLATES_PNEUMO
    : VISIT_NOTE_TEMPLATES_GENERAL;

  const usedTemplateIndices = new Set<number>();

  for (let i = 0; i < noteCount; i++) {
    // Choose note type: 60% visit, 25% phone, 15% email
    const typeRoll = rand();
    let noteType: 'visit' | 'phone' | 'email';
    let templatePool: string[];

    if (typeRoll < 0.6) {
      noteType = 'visit';
      templatePool = visitTemplates;
    } else if (typeRoll < 0.85) {
      noteType = 'phone';
      templatePool = PHONE_NOTE_TEMPLATES;
    } else {
      noteType = 'email';
      templatePool = EMAIL_NOTE_TEMPLATES;
    }

    // Pick a template not yet used for this practitioner
    let templateIdx = Math.floor(rand() * templatePool.length);
    let attempts = 0;
    while (usedTemplateIndices.has(templateIdx + noteType.charCodeAt(0) * 100) && attempts < 10) {
      templateIdx = Math.floor(rand() * templatePool.length);
      attempts++;
    }
    usedTemplateIndices.add(templateIdx + noteType.charCodeAt(0) * 100);

    let content = templatePool[templateIdx];
    content = content.replace('{name}', `Dr ${lastName}`);
    content = content.replace('{count}', String(randomInt(2, 12, rand)));
    content = content.replace('{city}', city);
    content = content.replace('{competitor}', randomChoice(COMPETITORS, rand));

    const daysAgo = randomInt(14 + i * 30, 45 + i * 40, rand);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    // Varied authors
    const author = randomChoice(DELEGATE_NAMES, rand);

    // Next action for the most recent notes
    let nextAction: string | undefined;
    if (i === 0) {
      const nextActions = [
        'Envoyer documentation technique FreeStyle',
        'Planifier démonstration concentrateur',
        'Préparer argumentaire concurrence',
        'Organiser formation équipe médicale',
        'Relancer pour RDV de suivi',
        'Envoyer devis monitoring connecté',
        'Coordonner intervention SAV',
        'Programmer visite de renouvellement',
      ];
      nextAction = randomChoice(nextActions, rand);
    } else if (i === 1 && rand() > 0.5) {
      nextAction = randomChoice([
        'Transmettre résultats étude clinique',
        'Appeler pour confirmer RDV',
        'Vérifier état des équipements chez les patients',
      ], rand);
    }

    notes.push({
      id: `note-${i + 1}`,
      date: date.toISOString().split('T')[0],
      content,
      author,
      type: noteType,
      nextAction,
    });
  }

  return notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function generateVisitHistory(lastName: string, _specialty: string, rand: () => number): VisitRecord[] {
  const visits: VisitRecord[] = [];
  const visitCount = randomInt(3, 8, rand);
  const usedTemplateIndices = new Set<number>();

  for (let i = 0; i < visitCount; i++) {
    const daysAgo = randomInt(30 + i * 25, 60 + i * 30, rand);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    // Pick a unique visit history template
    let templateIdx = Math.floor(rand() * VISIT_HISTORY_TEMPLATES.length);
    let attempts = 0;
    while (usedTemplateIndices.has(templateIdx) && attempts < 10) {
      templateIdx = Math.floor(rand() * VISIT_HISTORY_TEMPLATES.length);
      attempts++;
    }
    usedTemplateIndices.add(templateIdx);

    const template = VISIT_HISTORY_TEMPLATES[templateIdx];

    visits.push({
      id: `visit-${i + 1}`,
      date: date.toISOString().split('T')[0],
      type: 'completed',
      duration: randomInt(15, 45, rand),
      notes: template.notes.replace('Praticien', `Dr ${lastName}`).replace('praticien', `Dr ${lastName}`),
      productsDiscussed: template.products,
    });
  }

  // Add one cancelled visit for realism (1 in 4 practitioners)
  if (rand() < 0.25 && visits.length > 2) {
    const daysAgo = randomInt(10, 60, rand);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    visits.push({
      id: `visit-cancelled-1`,
      date: date.toISOString().split('T')[0],
      type: 'cancelled',
      notes: `Visite annulée — Dr ${lastName} indisponible (${randomChoice(['urgence hospitalière', 'congrès', 'congé maladie', 'formation'], rand)}).`,
      productsDiscussed: [],
    });
  }

  return visits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function generatePractitioner(index: number): PractitionerProfile {
  // Seeded random per practitioner index for reproducible but unique data
  const rand = seededRandom(index * 31 + 42);

  const isMale = rand() > 0.4;
  const firstName = isMale ? randomChoice(FIRST_NAMES_M, rand) : randomChoice(FIRST_NAMES_F, rand);
  const lastName = randomChoice(LAST_NAMES, rand);
  const specialty = rand() < 0.20 ? 'Pneumologue' : 'Médecin généraliste';

  // Vingtile distribution
  const vingtile = rand() < 0.15 ? randomInt(1, 5, rand) : rand() < 0.4 ? randomInt(6, 10, rand) : randomInt(11, 20, rand);
  const isKOL = vingtile <= 5 && rand() < 0.3;

  const volumeL = generateRealisticVolume(vingtile, specialty, isKOL, rand);
  const volumeMonthly = Math.round(volumeL / 12);

  const loyaltyScore = vingtile <= 5 ? randomInt(7, 10, rand) : vingtile <= 10 ? randomInt(6, 9, rand) : randomInt(4, 8, rand);

  const city = randomChoice(CITIES_RHONE_ALPES, rand);
  const streetNumber = randomInt(1, 150, rand);
  const streetName = randomChoice(STREET_NAMES, rand);

  const emailDomain = randomChoice(['gmail.com', 'wanadoo.fr', 'orange.fr', 'outlook.fr', 'medecin.fr'], rand);
  const email = `${firstName.toLowerCase().replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a')}.${lastName.toLowerCase().replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a')}@${emailDomain}`;
  const phone = `04 ${randomInt(70, 79, rand)} ${randomInt(10, 99, rand)} ${randomInt(10, 99, rand)} ${randomInt(10, 99, rand)}`;

  // Some practitioners are "new to territory" — never visited
  const isNewToTerritory = rand() < 0.08; // ~10 practitioners out of 120
  const lastVisitDaysAgo = isNewToTerritory ? undefined : randomInt(5, 180, rand);
  const lastVisitDate = lastVisitDaysAgo !== undefined
    ? (() => { const d = new Date(); d.setDate(d.getDate() - lastVisitDaysAgo); return d; })()
    : undefined;

  return {
    id: `pract-${String(index + 1).padStart(3, '0')}`,
    title: 'Dr',
    firstName,
    lastName,
    specialty,
    subSpecialty: specialty === 'Pneumologue' ? randomChoice(['Allergologie', 'Oncologie thoracique', 'Réhabilitation respiratoire', 'Médecine du sommeil', undefined, undefined], rand) : undefined,
    avatarUrl: `https://i.pravatar.cc/150?img=${index + 1}`,

    address: {
      street: `${streetNumber} ${streetName}`,
      city: city.name,
      postalCode: city.postalCode,
      country: 'France',
      coords: {
        lat: city.coords.lat + (rand() - 0.5) * 0.02,
        lng: city.coords.lng + (rand() - 0.5) * 0.02,
      },
    },

    contact: {
      email,
      phone,
      mobile: rand() > 0.4 ? `06 ${randomInt(10, 99, rand)} ${randomInt(10, 99, rand)} ${randomInt(10, 99, rand)} ${randomInt(10, 99, rand)}` : undefined,
    },

    metrics: {
      volumeL,
      volumeMonthly,
      loyaltyScore,
      vingtile,
      isKOL,
      potentialGrowth: vingtile <= 10 ? randomInt(10, 30, rand) : randomInt(5, 15, rand),
      churnRisk: loyaltyScore >= 8 ? 'low' : loyaltyScore >= 6 ? 'medium' : 'high',
    },

    notes: isNewToTerritory
      ? [] // New practitioners have no notes yet
      : generateNotes(firstName, lastName, specialty, city.name, isKOL, rand),
    news: generateNews(firstName, lastName, specialty, isKOL, rand),
    visitHistory: isNewToTerritory
      ? [] // New practitioners have no visit history
      : generateVisitHistory(lastName, specialty, rand),

    createdAt: new Date('2024-01-15').toISOString(),
    lastVisitDate: lastVisitDate ? lastVisitDate.toISOString().split('T')[0] : undefined,
    nextScheduledVisit: rand() > 0.6 ? new Date(Date.now() + randomInt(7, 60, rand) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
  };
}

export function generateDatabase(count: number = 120): PractitionerProfile[] {
  const practitioners: PractitionerProfile[] = [];

  for (let i = 0; i < count; i++) {
    practitioners.push(generatePractitioner(i));
  }

  return practitioners.sort((a, b) => b.metrics.volumeL - a.metrics.volumeL);
}
