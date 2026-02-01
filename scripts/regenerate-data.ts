/**
 * Script pour régénérer les données des praticiens
 * avec les nouveaux volumes réalistes
 */

// Helper functions inlined since we can't easily import TypeScript
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const FIRST_NAMES_M = [
  'Jean', 'Pierre', 'Louis', 'Michel', 'Paul', 'André', 'François', 'Philippe',
  'Antoine', 'Marc', 'Alain', 'Jacques', 'Henri', 'Bernard', 'Christophe', 'Éric', 'Gérard'
];

const FIRST_NAMES_F = [
  'Marie', 'Sophie', 'Catherine', 'Anne', 'Isabelle', 'Claire', 'Nathalie', 'Sylvie',
  'Françoise', 'Hélène', 'Valérie', 'Monique', 'Brigitte', 'Élise', 'Charlotte'
];

const LAST_NAMES = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand',
  'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David',
  'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Lefèvre',
  'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand',
  'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guerin', 'Muller', 'Henry', 'Roussel',
  'Nicolas', 'Perrin', 'Morin', 'Mathieu', 'Clement', 'Gauthier', 'Dumont', 'Lopez',
  'Fontaine', 'Chevalier', 'Robin', 'Denis', 'Barbier', 'Meunier'
];

const CITIES = [
  { city: 'Lyon', postalCode: '69001', department: '69', coords: { lat: 45.767, lng: 4.833 } },
  { city: 'Lyon 3e', postalCode: '69003', department: '69', coords: { lat: 45.760, lng: 4.848 } },
  { city: 'Lyon 6e', postalCode: '69006', department: '69', coords: { lat: 45.770, lng: 4.851 } },
  { city: 'Villeurbanne', postalCode: '69100', department: '69', coords: { lat: 45.771, lng: 4.890 } },
  { city: 'Grenoble', postalCode: '38000', department: '38', coords: { lat: 45.188, lng: 5.724 } },
  { city: 'Saint-Étienne', postalCode: '42000', department: '42', coords: { lat: 45.439, lng: 4.387 } },
  { city: 'Annecy', postalCode: '74000', department: '74', coords: { lat: 45.899, lng: 6.129 } },
  { city: 'Chambéry', postalCode: '73000', department: '73', coords: { lat: 45.564, lng: 5.917 } },
  { city: 'Valence', postalCode: '26000', department: '26', coords: { lat: 44.933, lng: 4.892 } },
  { city: 'Vienne', postalCode: '38200', department: '38', coords: { lat: 45.525, lng: 4.874 } },
  { city: 'Bourg-en-Bresse', postalCode: '01000', department: '01', coords: { lat: 46.205, lng: 5.225 } },
  { city: 'Roanne', postalCode: '42300', department: '42', coords: { lat: 46.043, lng: 4.068 } },
  { city: 'Annemasse', postalCode: '74100', department: '74', coords: { lat: 46.193, lng: 6.234 } },
  { city: 'Ferney-Voltaire', postalCode: '01210', department: '01', coords: { lat: 46.258, lng: 6.108 } },
];

const STREETS = [
  'rue de la République', 'avenue Jean Jaurès', 'boulevard Gambetta', 'rue Victor Hugo',
  'place Bellecour', 'cours Lafayette', 'avenue Foch', 'rue Pasteur', 'rue de la Liberté',
  'boulevard de la Croix-Rousse', 'rue Garibaldi', 'avenue Berthelot'
];

function generateRealisticVolume(vingtile: number, specialty: string, isKOL: boolean): number {
  let baseVolume: number;

  if (specialty === 'Pneumologue') {
    if (vingtile <= 2) {
      baseVolume = randomInt(200000, 300000);
    } else if (vingtile <= 5) {
      baseVolume = randomInt(120000, 200000);
    } else if (vingtile <= 10) {
      baseVolume = randomInt(60000, 120000);
    } else if (vingtile <= 15) {
      baseVolume = randomInt(30000, 60000);
    } else {
      baseVolume = randomInt(10000, 30000);
    }
  } else {
    if (vingtile <= 2) {
      baseVolume = randomInt(50000, 80000);
    } else if (vingtile <= 5) {
      baseVolume = randomInt(30000, 50000);
    } else if (vingtile <= 10) {
      baseVolume = randomInt(15000, 30000);
    } else if (vingtile <= 15) {
      baseVolume = randomInt(8000, 15000);
    } else {
      baseVolume = randomInt(3000, 8000);
    }
  }

  if (isKOL) {
    baseVolume *= 1 + (randomInt(15, 25) / 100);
  }

  return Math.round(baseVolume);
}

function generateNews(firstName: string, lastName: string, specialty: string, isKOL: boolean) {
  const newsTypes = ['publication', 'conference', 'certification', 'award'] as const;
  const numNews = isKOL ? randomInt(2, 4) : randomInt(0, 2);
  const news = [];

  const publicationTitles = [
    "Impact de l'oxygénothérapie longue durée sur la qualité de vie des patients BPCO",
    "Nouvelles approches dans le traitement de l'insuffisance respiratoire chronique",
    "Étude comparative des dispositifs d'oxygénothérapie portable",
    "Télésuivi et compliance à l'oxygénothérapie à domicile",
    "Optimisation de la prise en charge des patients sous OLD",
    "Bénéfices du télésuivi dans la gestion de l'oxygénothérapie",
    "Analyse rétrospective de 500 patients sous oxygénothérapie",
  ];

  for (let i = 0; i < numNews; i++) {
    const type = randomChoice(newsTypes);
    const date = new Date(Date.now() - randomInt(30, 365) * 24 * 60 * 60 * 1000);

    let title: string;
    let content: string;

    switch (type) {
      case 'publication':
        title = randomChoice(publicationTitles);
        content = `Publication dans une revue médicale de référence concernant ${specialty === 'Pneumologue' ? 'la pneumologie' : 'la médecine générale'}.`;
        break;
      case 'conference':
        title = `Intervention au congrès de ${randomChoice(['pneumologie', 'médecine respiratoire', 'soins à domicile'])}`;
        content = `Présentation lors du congrès annuel sur les avancées en matière d'oxygénothérapie.`;
        break;
      case 'certification':
        title = `Certification en ${randomChoice(['télésuivi respiratoire', 'oxygénothérapie avancée', 'ventilation non invasive'])}`;
        content = `Obtention d'une nouvelle certification professionnelle.`;
        break;
      case 'award':
        title = `Prix ${randomChoice(['de l\'innovation', 'd\'excellence clinique', 'du meilleur orateur'])}`;
        content = `Reconnaissance pour sa contribution au domaine de la santé respiratoire.`;
        break;
    }

    news.push({
      id: `N${String(i + 1).padStart(3, '0')}`,
      type,
      date: date.toISOString().split('T')[0],
      title,
      content,
      relevance: isKOL ? "Pertinent pour établir le contact - expertise reconnue" : undefined,
    });
  }

  return news.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function generatePractitioner(index: number) {
  const isMale = Math.random() > 0.4;
  const firstName = isMale ? randomChoice(FIRST_NAMES_M) : randomChoice(FIRST_NAMES_F);
  const lastName = randomChoice(LAST_NAMES);
  const specialty = Math.random() < 0.20 ? 'Pneumologue' : 'Médecin généraliste';
  const vingtile = Math.random() < 0.15 ? randomInt(1, 5) : Math.random() < 0.4 ? randomInt(6, 10) : randomInt(11, 20);
  const isKOL = (vingtile <= 3 && Math.random() < 0.6) || (vingtile <= 5 && Math.random() < 0.25);
  const volumeL = generateRealisticVolume(vingtile, specialty, isKOL);
  const loyaltyScore = Math.min(10, Math.max(1, 11 - vingtile + randomInt(-2, 2)));
  const location = randomChoice(CITIES);
  const street = `${randomInt(1, 200)} ${randomChoice(STREETS)}`;
  const lastVisitDate = new Date(Date.now() - randomInt(1, 180) * 24 * 60 * 60 * 1000);

  const trends = ['up', 'down', 'stable'] as const;
  const riskLevels = ['low', 'medium', 'high'] as const;

  return {
    id: `P${String(index + 1).padStart(3, '0')}`,
    firstName,
    lastName,
    title: 'Dr.',
    specialty,
    isKOL,
    vingtile,
    phone: `06 ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@cabinet-medical.fr`,
    address: street,
    postalCode: location.postalCode,
    city: location.city,
    department: location.department,
    volumeL,
    patientCount: Math.round(volumeL / 2000),
    conventionSector: randomChoice([1, 2]),
    activityType: randomChoice(['Libéral intégral', 'Libéral temps partiel', 'Mixte']),
    preferredChannel: randomChoice(['Face-to-face', 'Phone', 'Email', 'Video']),
    lastVisitDate: Math.random() > 0.1 ? lastVisitDate.toISOString().split('T')[0] : null,
    visitCount: randomInt(3, 25),
    loyaltyScore,
    trend: randomChoice(trends),
    aiSummary: isKOL
      ? "Leader d'opinion reconnu dans la région. Influence significative sur ses pairs. Fort intérêt pour les innovations thérapeutiques et les études cliniques."
      : randomChoice([
          "Praticien de proximité, forte patientèle gériatrique. Sensible aux arguments de qualité de vie et de maintien à domicile. Très à l'écoute de ses patients.",
          "Prescripteur régulier et fidèle. Apprécie les échanges techniques sur les innovations thérapeutiques. Montre un intérêt particulier pour les études cliniques récentes.",
          "Médecin investi dans la prise en charge BPCO. Collabore avec plusieurs pneumologues. Ouvert aux nouvelles solutions pour améliorer le confort de ses patients.",
        ]),
    nextBestAction: randomChoice([
      "Présenter le nouveau dispositif de télésuivi des patients",
      "Inviter à la prochaine formation sur la prise en charge BPCO",
      "Proposer un rendez-vous pour présenter les nouvelles options thérapeutiques",
      "Faire le point sur les patients actuels et identifier de nouveaux besoins",
      "Partager l'étude clinique récente sur l'oxygénothérapie portable",
    ]),
    riskLevel: loyaltyScore >= 7 ? 'low' : loyaltyScore >= 5 ? 'medium' : 'high',
    conversations: Array.from({ length: randomInt(1, 4) }, (_, i) => ({
      date: new Date(Date.now() - randomInt(30, 300) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      summary: randomChoice([
        "Point sur les nouvelles modalités de prise en charge. Intérêt pour le télésuivi.",
        "Discussion sur l'évolution de 3 patients sous O2. Retours positifs sur l'autonomie retrouvée.",
        "Échange sur un cas complexe de BPCO sévère. Coordination avec le pneumologue référent.",
        "Présentation des résultats de l'étude SUMMIT. Questions sur les critères de prescription.",
      ]),
      sentiment: randomChoice(['positive', 'neutral', 'negative']),
      actions: [randomChoice([
        "Présenter le nouveau dispositif de télésuivi des patients",
        "Inviter à la prochaine formation sur la prise en charge BPCO",
        "Proposer un rendez-vous pour présenter les nouvelles options thérapeutiques",
        "Faire le point sur les patients actuels et identifier de nouveaux besoins",
        "Partager l'étude clinique récente sur l'oxygénothérapie portable",
      ])],
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${firstName}${lastName}&backgroundColor=0066B3`,
    news: generateNews(firstName, lastName, specialty, isKOL),
  };
}

function generateDatabase(count: number = 120) {
  const practitioners = [];
  for (let i = 0; i < count; i++) {
    practitioners.push(generatePractitioner(i));
  }
  return practitioners.sort((a, b) => b.volumeL - a.volumeL);
}

// Generate and output data
const data = generateDatabase(120);
console.log(JSON.stringify(data, null, 2));
