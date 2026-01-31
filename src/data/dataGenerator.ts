import type { PractitionerProfile, PractitionerNote, PractitionerNews, VisitRecord } from '../types/database';

/**
 * Générateur de données réalistes et cohérentes pour les praticiens
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
  'Avenue de la République',
  'Rue Victor Hugo',
  'Boulevard Gambetta',
  'Place de la Liberté',
  'Rue du Général de Gaulle',
  'Avenue Jean Jaurès',
  'Rue Anatole France',
  'Boulevard des Belges',
  'Rue de la Paix',
  'Avenue Maréchal Foch',
];

const FIRST_NAMES_M = ['Jean', 'Pierre', 'Louis', 'Michel', 'Paul', 'André', 'François', 'Philippe', 'Antoine', 'Marc', 'Alain', 'Jacques', 'Henri', 'Bernard', 'Christophe'];
const FIRST_NAMES_F = ['Marie', 'Sophie', 'Catherine', 'Anne', 'Isabelle', 'Claire', 'Nathalie', 'Sylvie', 'Françoise', 'Hélène', 'Valérie', 'Monique', 'Brigitte', 'Élise', 'Charlotte'];
const LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Lefèvre', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand', 'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guerin', 'Muller', 'Henry', 'Roussel', 'Nicolas', 'Perrin', 'Morin', 'Mathieu', 'Clement', 'Gauthier', 'Dumont', 'Lopez', 'Fontaine', 'Chevalier', 'Robin'];

// Templates d'actualités réalistes par type
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
      ],
    },
    {
      title: "Article dans Revue des Maladies Respiratoires",
      contentTemplate: "Publication d'un cas clinique sur {topic}",
      topics: [
        "la gestion de l'hypoxémie sévère en ambulatoire",
        "l'adaptation des traitements chez les patients BPCO âgés",
        "les complications de l'oxygénothérapie de longue durée",
      ],
    },
  ],
  certification: [
    {
      title: "Certification Universitaire en Pneumologie",
      contentTemplate: "Obtention d'un {cert} en {domain}",
      certs: ["DU", "DIU", "Master 2"],
      domains: [
        "réhabilitation respiratoire",
        "pneumologie interventionnelle",
        "allergologie respiratoire",
        "oncologie thoracique",
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
      ],
      events: [
        "Congrès de la SPLF (Société de Pneumologie de Langue Française)",
        "Congrès ERS (European Respiratory Society)",
        "Journées de Pneumologie Rhône-Alpes",
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
      ],
    },
  ],
  event: [
    {
      title: "Organisation d'un événement médical",
      contentTemplate: "{event} sur {topic}",
      events: ["Formation continue", "Atelier pratique", "Table ronde"],
      topics: [
        "la gestion de l'oxygénothérapie en ville",
        "les nouvelles technologies en assistance respiratoire",
        "le parcours de soins du patient BPCO",
      ],
    },
  ],
};

// Templates de notes réalistes
const NOTE_TEMPLATES = [
  "Visite très productive. {name} intéressé(e) par nos nouvelles solutions d'oxygénothérapie portable. Discussion approfondie sur les besoins de {count} patients actuellement sous OLD. RDV prévu dans 2 mois pour suivi.",
  "Excellente relation. {name} prescrit régulièrement nos concentrateurs. Évoqué la possibilité d'une présentation produit à son équipe. Très satisfait(e) de notre service technique.",
  "Discussion sur l'amélioration de l'observance des patients. {name} apprécie notre programme d'éducation thérapeutique. Demande de documentation sur les nouveaux débitmètres intelligents.",
  "Entretien court mais productif. {name} a 2 nouveaux patients à équiper. Insiste sur la qualité du service et la rapidité d'intervention. Très bon potentiel de développement.",
  "Visite de courtoisie. {name} satisfait(e) de nos prestations. Discussion sur les évolutions réglementaires de l'oxygénothérapie. Aucun besoin immédiat identifié.",
];

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRealisticVolume(vingtile: number, specialty: string, isKOL: boolean): number {
  // Volumes réalistes en litres/an
  // Pneumologues prescrivent plus que généralistes
  // KOLs prescrivent plus
  // Vingtile 1-5 = gros prescripteurs, 15-20 = petits prescripteurs

  let baseVolume: number;

  if (specialty === 'Pneumologue') {
    // Pneumologues : 200K - 1.5M L/an
    if (vingtile <= 2) {
      baseVolume = randomInt(800000, 1500000);
    } else if (vingtile <= 5) {
      baseVolume = randomInt(400000, 800000);
    } else if (vingtile <= 10) {
      baseVolume = randomInt(150000, 400000);
    } else if (vingtile <= 15) {
      baseVolume = randomInt(60000, 150000);
    } else {
      baseVolume = randomInt(20000, 60000);
    }
  } else {
    // Médecins généralistes : 10K - 400K L/an
    if (vingtile <= 2) {
      baseVolume = randomInt(250000, 400000);
    } else if (vingtile <= 5) {
      baseVolume = randomInt(120000, 250000);
    } else if (vingtile <= 10) {
      baseVolume = randomInt(50000, 120000);
    } else if (vingtile <= 15) {
      baseVolume = randomInt(20000, 50000);
    } else {
      baseVolume = randomInt(5000, 20000);
    }
  }

  // Bonus KOL : +20-40%
  if (isKOL) {
    baseVolume *= 1 + (randomInt(20, 40) / 100);
  }

  return Math.round(baseVolume);
}

function generateNews(
  _firstName: string,
  _lastName: string,
  _specialty: string,
  isKOL: boolean
): PractitionerNews[] {
  const news: PractitionerNews[] = [];

  // KOLs ont plus d'actualités (3-6), autres ont moins (0-2)
  const newsCount = isKOL ? randomInt(3, 6) : randomInt(0, 2);

  for (let i = 0; i < newsCount; i++) {
    const typeKeys = Object.keys(NEWS_TEMPLATES) as Array<keyof typeof NEWS_TEMPLATES>;
    const type = randomChoice(typeKeys);
    const templates = NEWS_TEMPLATES[type];
    const template: any = randomChoice(templates as any);

    let content: string = template.contentTemplate;
    let title: string = template.title;

    // Remplacer les placeholders selon le type
    if (template.topics && Array.isArray(template.topics)) {
      const topic = randomChoice(template.topics as string[]);
      content = content.replace('{topic}', topic);
    }
    if (template.certs && Array.isArray(template.certs)) {
      const cert = randomChoice(template.certs as string[]);
      content = content.replace('{cert}', cert);
    }
    if (template.domains && Array.isArray(template.domains)) {
      const domain = randomChoice(template.domains as string[]);
      content = content.replace('{domain}', domain);
    }
    if (template.events && Array.isArray(template.events)) {
      const event = randomChoice(template.events as string[]);
      content = content.replace('{event}', event);
    }
    if (template.achievements && Array.isArray(template.achievements)) {
      const achievement = randomChoice(template.achievements as string[]);
      content = content.replace('{achievement}', achievement);
    }

    // Date dans les 6 derniers mois
    const daysAgo = randomInt(10, 180);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    news.push({
      id: `news-${i + 1}`,
      date: date.toISOString().split('T')[0],
      title,
      content,
      type,
      relevance: isKOL
        ? "💡 Pertinence : Opportunité de discussion sur nos programmes d'accompagnement et innovations"
        : "💡 Pertinence : Maintenir la relation et valoriser l'expertise",
      source: type === 'publication' ? 'Base bibliographique médicale' : undefined,
    });
  }

  return news.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function generateNotes(_firstName: string, lastName: string): PractitionerNote[] {
  const notes: PractitionerNote[] = [];
  const noteCount = randomInt(2, 6);

  for (let i = 0; i < noteCount; i++) {
    const template = randomChoice(NOTE_TEMPLATES);
    let content = template;
    content = content.replace('{name}', `Dr ${lastName}`);
    content = content.replace('{count}', String(randomInt(2, 8)));

    const daysAgo = randomInt(30, 365);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    notes.push({
      id: `note-${i + 1}`,
      date: date.toISOString().split('T')[0],
      content,
      author: 'Sophie Martin',
      type: randomChoice(['visit', 'phone', 'email'] as const),
      nextAction: i === 0 ? 'Relancer dans 2 mois pour présentation équipe' : undefined,
    });
  }

  return notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function generateVisitHistory(lastName: string): VisitRecord[] {
  const visits: VisitRecord[] = [];
  const visitCount = randomInt(4, 10);

  for (let i = 0; i < visitCount; i++) {
    const daysAgo = randomInt(30 + i * 30, 60 + i * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    visits.push({
      id: `visit-${i + 1}`,
      date: date.toISOString().split('T')[0],
      type: 'completed',
      duration: randomInt(20, 45),
      notes: `Visite productive avec Dr ${lastName}. Discussion sur les patients actuels.`,
      productsDiscussed: randomChoice([
        ['Concentrateur portable'],
        ['OLD classique', 'Concentrateur'],
        ['Service technique', 'Formation patient'],
      ]),
    });
  }

  return visits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function generatePractitioner(index: number): PractitionerProfile {
  // Déterminer si c'est un homme ou une femme
  const isMale = Math.random() > 0.4;
  const firstName = isMale ? randomChoice(FIRST_NAMES_M) : randomChoice(FIRST_NAMES_F);
  const lastName = randomChoice(LAST_NAMES);

  // Spécialité (70% pneumologue, 30% généraliste)
  const specialty = Math.random() < 0.7 ? 'Pneumologue' : 'Médecin généraliste';

  // Vingtile : distribution réaliste (plus de monde dans les vingtiles élevés)
  const vingtile = Math.random() < 0.15 ? randomInt(1, 5) : Math.random() < 0.4 ? randomInt(6, 10) : randomInt(11, 20);

  // KOL : seulement 15% des praticiens, principalement vingtile 1-5
  const isKOL = vingtile <= 5 && Math.random() < 0.3;

  // Volume réaliste
  const volumeL = generateRealisticVolume(vingtile, specialty, isKOL);
  const volumeMonthly = Math.round(volumeL / 12);

  // Loyalty score : corrélé au vingtile (meilleurs prescripteurs = plus fidèles en général)
  const loyaltyScore = vingtile <= 5 ? randomInt(7, 10) : vingtile <= 10 ? randomInt(6, 9) : randomInt(4, 8);

  // Adresse
  const city = randomChoice(CITIES_RHONE_ALPES);
  const streetNumber = randomInt(1, 150);
  const streetName = randomChoice(STREET_NAMES);

  // Email et téléphone
  const emailDomain = randomChoice(['gmail.com', 'wanadoo.fr', 'orange.fr', 'outlook.fr']);
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}`;
  const phone = `04 ${randomInt(70, 79)} ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`;

  // Dernière visite
  const lastVisitDaysAgo = randomInt(5, 180);
  const lastVisitDate = new Date();
  lastVisitDate.setDate(lastVisitDate.getDate() - lastVisitDaysAgo);

  return {
    id: `pract-${String(index + 1).padStart(3, '0')}`,
    title: 'Dr',
    firstName,
    lastName,
    specialty,
    subSpecialty: specialty === 'Pneumologue' ? randomChoice(['Allergologie', 'Oncologie thoracique', 'Réhabilitation respiratoire', undefined, undefined]) : undefined,
    avatarUrl: `https://i.pravatar.cc/150?img=${index + 1}`,

    address: {
      street: `${streetNumber} ${streetName}`,
      city: city.name,
      postalCode: city.postalCode,
      country: 'France',
      coords: {
        lat: city.coords.lat + (Math.random() - 0.5) * 0.02,
        lng: city.coords.lng + (Math.random() - 0.5) * 0.02,
      },
    },

    contact: {
      email,
      phone,
      mobile: Math.random() > 0.5 ? `06 ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}` : undefined,
    },

    metrics: {
      volumeL,
      volumeMonthly,
      loyaltyScore,
      vingtile,
      isKOL,
      potentialGrowth: vingtile <= 10 ? randomInt(10, 30) : randomInt(5, 15),
      churnRisk: loyaltyScore >= 8 ? 'low' : loyaltyScore >= 6 ? 'medium' : 'high',
    },

    notes: generateNotes(firstName, lastName),
    news: generateNews(firstName, lastName, specialty, isKOL),
    visitHistory: generateVisitHistory(lastName),

    createdAt: new Date('2024-01-15').toISOString(),
    lastVisitDate: lastVisitDate.toISOString().split('T')[0],
    nextScheduledVisit: Math.random() > 0.6 ? new Date(Date.now() + randomInt(7, 60) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
  };
}

export function generateDatabase(count: number = 120): PractitionerProfile[] {
  const practitioners: PractitionerProfile[] = [];

  for (let i = 0; i < count; i++) {
    practitioners.push(generatePractitioner(i));
  }

  // Trier par volume décroissant pour avoir les top prescripteurs en premier
  return practitioners.sort((a, b) => b.metrics.volumeL - a.metrics.volumeL);
}
