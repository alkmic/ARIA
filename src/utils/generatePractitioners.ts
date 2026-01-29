import type { Practitioner } from '../types';

const firstNames = [
  'Jean', 'Marie', 'Pierre', 'Sophie', 'Michel', 'Anne', 'François', 'Isabelle',
  'Philippe', 'Catherine', 'Alain', 'Nathalie', 'Bernard', 'Sylvie', 'Jacques',
  'Monique', 'Claude', 'Françoise', 'Daniel', 'Nicole', 'Thierry', 'Christine',
  'Patrick', 'Martine', 'Laurent', 'Valérie', 'Dominique', 'Brigitte', 'Gérard',
  'Chantal', 'Christian', 'Michèle', 'Marc', 'Hélène', 'André', 'Annie',
  'Olivier', 'Sandrine', 'Nicolas', 'Véronique', 'Sébastien', 'Stéphanie',
  'David', 'Céline', 'Christophe', 'Laurence', 'Bruno', 'Corinne', 'Éric',
  'Patricia', 'Julien', 'Caroline', 'Didier', 'Agnès', 'Pascal', 'Béatrice',
  'Vincent', 'Fabienne', 'Thomas', 'Marianne', 'Frédéric', 'Élisabeth',
  'Antoine', 'Delphine', 'Guillaume', 'Emmanuelle', 'Mathieu', 'Florence',
  'Alexandre', 'Muriel', 'Maxime', 'Odile', 'Henri', 'Joëlle', 'Louis', 'Karine'
];

const lastNames = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit',
  'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel',
  'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel',
  'Girard', 'André', 'Lefevre', 'Mercier', 'Dupont', 'Lambert', 'Bonnet',
  'François', 'Martinez', 'Legrand', 'Garnier', 'Faure', 'Rousseau', 'Blanc',
  'Guerin', 'Muller', 'Henry', 'Roussel', 'Nicolas', 'Perrin', 'Morin',
  'Mathieu', 'Clement', 'Gauthier', 'Dumont', 'Lopez', 'Fontaine', 'Chevalier',
  'Robin', 'Masson', 'Sanchez', 'Gerard', 'Nguyen', 'Boyer', 'Denis',
  'Lemaire', 'Duval', 'Joly', 'Gautier', 'Roger', 'Roy', 'Noel', 'Meyer',
  'Lucas', 'Meunier', 'Jean', 'Perez', 'Marchand', 'Dufour', 'Blanchard',
  'Marie', 'Barbier', 'Brun', 'Dumas', 'Brunet', 'Schmitt', 'Leroux',
  'Colin', 'Fernandez', 'Pierre', 'Renard', 'Arnaud', 'Rolland', 'Caron',
  'Aubert', 'Giraud', 'Leclerc', 'Vidal', 'Bourgeois', 'Renaud', 'Lemoine',
  'Picard', 'Gaillard', 'Philippe', 'Leclercq', 'Lacroix', 'Fabre', 'Dupuis',
  'Olivier', 'Rodriguez', 'Da Silva', 'Hubert', 'Louis', 'Charles', 'Guillot',
  'Riviere', 'Le Gall', 'Guillaume', 'Adam', 'Rey', 'Moulin', 'Gonzalez',
  'Berger', 'Lecomte', 'Menard', 'Fleury', 'Deschamps', 'Carpentier', 'Julien',
  'Benoit', 'Paris', 'Maillard', 'Marchal', 'Aubry', 'Vasseur', 'Le Roux',
  'Prevost', 'Tessier', 'Poirier', 'Launay', 'Collet', 'Charpentier', 'Pasquier',
  'Humbert', 'Poulain', 'Collin', 'Bouvier', 'Perrot', 'Reynaud', 'Marty',
  'Royer', 'Schneider', 'Fischer', 'Weber', 'Legros', 'Colin', 'Vaillant'
];

const cities01 = [
  { city: 'Bourg-en-Bresse', postalCode: '01000' },
  { city: 'Oyonnax', postalCode: '01100' },
  { city: 'Bellegarde-sur-Valserine', postalCode: '01200' },
  { city: 'Ambérieu-en-Bugey', postalCode: '01500' },
  { city: 'Gex', postalCode: '01170' },
  { city: 'Ferney-Voltaire', postalCode: '01210' },
  { city: 'Divonne-les-Bains', postalCode: '01220' },
  { city: 'Meximieux', postalCode: '01800' },
];

const cities69 = [
  { city: 'Lyon', postalCode: '69001' },
  { city: 'Lyon 2e', postalCode: '69002' },
  { city: 'Lyon 3e', postalCode: '69003' },
  { city: 'Lyon 6e', postalCode: '69006' },
  { city: 'Lyon 7e', postalCode: '69007' },
  { city: 'Villeurbanne', postalCode: '69100' },
  { city: 'Vénissieux', postalCode: '69200' },
  { city: 'Caluire-et-Cuire', postalCode: '69300' },
  { city: 'Bron', postalCode: '69500' },
  { city: 'Vaulx-en-Velin', postalCode: '69120' },
  { city: 'Oullins', postalCode: '69600' },
  { city: 'Saint-Priest', postalCode: '69800' },
  { city: 'Décines-Charpieu', postalCode: '69150' },
];

const cities38 = [
  { city: 'Grenoble', postalCode: '38000' },
  { city: 'Échirolles', postalCode: '38130' },
  { city: 'Saint-Martin-d\'Hères', postalCode: '38400' },
  { city: 'Vienne', postalCode: '38200' },
  { city: 'Fontaine', postalCode: '38600' },
  { city: 'Voiron', postalCode: '38500' },
  { city: 'Bourgoin-Jallieu', postalCode: '38300' },
];

const allCities = [
  ...cities01.map(c => ({ ...c, department: '01' })),
  ...cities69.map(c => ({ ...c, department: '69' })),
  ...cities38.map(c => ({ ...c, department: '38' })),
];

const streets = [
  'rue de la République', 'avenue Jean Jaurès', 'boulevard Gambetta',
  'place de la Liberté', 'rue Victor Hugo', 'avenue du Général de Gaulle',
  'rue Pasteur', 'cours Lafayette', 'rue Carnot', 'place Bellecour',
  'rue de la Mairie', 'avenue Foch', 'rue du Dr Schweitzer', 'cours Berriat',
  'rue Jean Moulin', 'place Wilson', 'boulevard Clemenceau', 'rue Thiers'
];

const aiSummaries = [
  "Prescripteur régulier et fidèle. Apprécie les échanges techniques sur les innovations thérapeutiques. Montre un intérêt particulier pour les études cliniques récentes.",
  "Médecin investi dans la prise en charge BPCO. Collabore avec plusieurs pneumologues. Ouvert aux nouvelles solutions pour améliorer le confort de ses patients.",
  "Praticien expérimenté, très attaché aux preuves scientifiques. Participe activement aux formations continues. Excellent relais d'opinion auprès de ses confrères.",
  "Jeune installé dynamique, à l'écoute des innovations. Utilise beaucoup les outils digitaux. Potentiel de croissance important sur son secteur.",
  "Médecin très organisé, préfère les rendez-vous planifiés. Apprécie les supports visuels et les données chiffrées. Prescripteur méthodique et rigoureux.",
  "Praticien de proximité, forte patientèle gériatrique. Sensible aux arguments de qualité de vie et de maintien à domicile. Très à l'écoute de ses patients.",
  "Leader d'opinion reconnu dans sa région. Intervient régulièrement en formation. Excellent contact pour les nouvelles études ou innovations produit.",
  "Médecin pragmatique, orienté résultats. Apprécie l'efficacité dans les échanges. Bon prescripteur quand il est convaincu de la valeur ajoutée.",
  "Praticien récemment installé, en phase de développement de patientèle. Montre beaucoup d'intérêt et de curiosité. Opportunité de fidélisation.",
  "Médecin expérimenté proche de la retraite. Prescriptions stables. Maintient une pratique de qualité avec ses patients historiques.",
];

const nextActions = [
  "Proposer un rendez-vous pour présenter les nouvelles options thérapeutiques",
  "Partager l'étude clinique récente sur l'oxygénothérapie portable",
  "Inviter à la prochaine formation sur la prise en charge BPCO",
  "Faire le point sur les patients actuels et identifier de nouveaux besoins",
  "Organiser une visite conjointe avec un confrère pneumologue",
  "Présenter le nouveau dispositif de télésuivi des patients",
  "Proposer un support patient pour l'éducation thérapeutique",
  "Planifier un déjeuner-formation avec d'autres praticiens du secteur",
  "Envoyer la documentation sur les dernières innovations produit",
  "Recueillir son retour d'expérience sur les patients équipés",
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): string {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysBack));
  return date.toISOString().split('T')[0];
}

function generateConversations(count: number): Practitioner['conversations'] {
  const conversations: Practitioner['conversations'] = [];
  const summaries = [
    "Discussion sur l'évolution de 3 patients sous O2. Retours positifs sur l'autonomie retrouvée.",
    "Présentation des résultats de l'étude SUMMIT. Questions sur les critères de prescription.",
    "Point sur les nouvelles modalités de prise en charge. Intérêt pour le télésuivi.",
    "Échange sur un cas complexe de BPCO sévère. Coordination avec le pneumologue référent.",
    "Formation sur les nouveaux débitmètres portables. Démonstration appréciée.",
    "Retour d'expérience patient très positif. Demande de documentation complémentaire.",
    "Discussion sur l'observance thérapeutique. Intérêt pour les outils d'accompagnement.",
    "Questions sur les modalités de remboursement et démarches administratives.",
  ];

  for (let i = 0; i < count; i++) {
    conversations.push({
      date: randomDate(180),
      summary: randomItem(summaries),
      sentiment: randomItem(['positive', 'neutral', 'negative'] as const),
      actions: [randomItem(nextActions)],
    });
  }

  return conversations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function generatePractitioners(): Practitioner[] {
  const practitioners: Practitioner[] = [];
  let id = 1;

  // Générer 50 Pneumologues (vingtiles 1-5, gros volumes)
  for (let i = 0; i < 50; i++) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const location = randomItem(allCities);
    const vingtile = randomInt(1, 5);
    const volumeL = randomInt(200000, 500000);
    const isKOL = Math.random() < 0.15; // 15% KOL parmi les pneumologues
    const hasRecentVisit = Math.random() < 0.6;
    const lastVisitDate = hasRecentVisit ? randomDate(180) : null;
    const visitCount = randomInt(3, 25);
    const loyaltyScore = randomInt(6, 10);

    practitioners.push({
      id: `P${id.toString().padStart(3, '0')}`,
      firstName,
      lastName,
      title: isKOL && Math.random() < 0.3 ? 'Pr.' : 'Dr.',
      specialty: 'Pneumologue',
      isKOL,
      vingtile,
      phone: `06 ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomItem(['gmail.com', 'orange.fr', 'wanadoo.fr', 'free.fr', 'cabinet-medical.fr'])}`,
      address: `${randomInt(1, 150)} ${randomItem(streets)}`,
      postalCode: location.postalCode,
      city: location.city,
      department: location.department,
      volumeL,
      patientCount: Math.floor(volumeL / 2000), // Estimation: 1 patient = ~2000L/an
      conventionSector: randomItem([1, 2] as const),
      activityType: randomItem(['Libéral intégral', 'Libéral temps partiel', 'Mixte'] as const),
      preferredChannel: randomItem(['Face-to-face', 'Email', 'Téléphone'] as const),
      lastVisitDate,
      visitCount,
      loyaltyScore,
      trend: randomItem(['up', 'down', 'stable'] as const),
      aiSummary: randomItem(aiSummaries),
      nextBestAction: randomItem(nextActions),
      riskLevel: !lastVisitDate || (new Date().getTime() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24) > 90 ? 'high' : randomItem(['low', 'medium'] as const),
      conversations: generateConversations(randomInt(2, 5)),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${firstName}${lastName}&backgroundColor=0066B3`,
    });

    id++;
  }

  // Générer 100 Médecins Généralistes (vingtiles 1-10, volumes plus faibles)
  for (let i = 0; i < 100; i++) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const location = randomItem(allCities);
    const vingtile = randomInt(1, 10);
    const volumeL = randomInt(1000, 10000);
    const isKOL = Math.random() < 0.05; // 5% KOL parmi les MG
    const hasRecentVisit = Math.random() < 0.5;
    const lastVisitDate = hasRecentVisit ? randomDate(180) : null;
    const visitCount = randomInt(1, 15);
    const loyaltyScore = randomInt(5, 9);

    practitioners.push({
      id: `P${id.toString().padStart(3, '0')}`,
      firstName,
      lastName,
      title: 'Dr.',
      specialty: 'Médecin généraliste',
      isKOL,
      vingtile,
      phone: `06 ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomItem(['gmail.com', 'orange.fr', 'wanadoo.fr', 'free.fr', 'cabinet-medical.fr'])}`,
      address: `${randomInt(1, 150)} ${randomItem(streets)}`,
      postalCode: location.postalCode,
      city: location.city,
      department: location.department,
      volumeL,
      patientCount: Math.floor(volumeL / 2000), // Estimation: 1 patient = ~2000L/an
      conventionSector: randomItem([1, 2] as const),
      activityType: randomItem(['Libéral intégral', 'Libéral temps partiel', 'Mixte'] as const),
      preferredChannel: randomItem(['Face-to-face', 'Email', 'Téléphone'] as const),
      lastVisitDate,
      visitCount,
      loyaltyScore,
      trend: randomItem(['up', 'down', 'stable'] as const),
      aiSummary: randomItem(aiSummaries),
      nextBestAction: randomItem(nextActions),
      riskLevel: !lastVisitDate || (new Date().getTime() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24) > 90 ? 'high' : randomItem(['low', 'medium'] as const),
      conversations: generateConversations(randomInt(0, 4)),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${firstName}${lastName}&backgroundColor=00A3E0`,
    });

    id++;
  }

  // Trier par vingtile puis par volume
  return practitioners.sort((a, b) => {
    if (a.vingtile !== b.vingtile) return a.vingtile - b.vingtile;
    return b.volumeL - a.volumeL;
  });
}
