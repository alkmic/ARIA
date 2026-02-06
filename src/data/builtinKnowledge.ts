/**
 * Base de connaissances intégrée — Données Air Liquide Santé, BPCO, réglementation
 * Ces données sont toujours disponibles pour le Coach IA, même sans documents uploadés.
 */

export interface KnowledgeChunk {
  id: string;
  category: 'air_liquide' | 'clinique' | 'reglementaire' | 'concurrence' | 'epidemiologie';
  title: string;
  content: string;
  tags: string[];
  source: string;
}

export const BUILTIN_KNOWLEDGE: KnowledgeChunk[] = [
  // ===== ÉPIDÉMIOLOGIE BPCO =====
  {
    id: 'epid-bpco-france',
    category: 'epidemiologie',
    title: 'BPCO en France — Chiffres clés',
    content: `La BPCO (Bronchopneumopathie Chronique Obstructive) touche 3,5 millions de personnes en France (Santé Publique France).
75% des cas sont sous-diagnostiqués : seuls 30% des cas sont identifiés.
Prévalence supérieure à 6% chez les 45-65 ans.
Environ 19 000 décès par an liés à la BPCO en France (données 2013).
Environ 100 000 patients sont sous oxygénothérapie longue durée (OLD) en France.
Le tabagisme est responsable de 90% des cas de BPCO.
Sur les 7 indicateurs qualité HAS du parcours de soins BPCO, un seul dépasse 70% en ville (HAS 2022) : seulement 21% des patients sont dépistés et 53% vaccinés contre la grippe.`,
    tags: ['bpco', 'épidémiologie', 'france', 'chiffres', 'prévalence', 'mortalité'],
    source: 'Santé Publique France, HAS 2022'
  },
  {
    id: 'epid-bpco-mondial',
    category: 'epidemiologie',
    title: 'BPCO dans le monde — Projections',
    content: `À l'échelle mondiale, la BPCO a causé 3,23 millions de décès en 2019 (OMS).
L'OMS et l'ERS prévoient une augmentation de +23% des cas de BPCO d'ici 2050.
La BPCO est la 3ème cause de mortalité mondiale selon l'OMS.
Le sous-diagnostic est un problème universel : 2/3 des cas ne sont pas identifiés.`,
    tags: ['bpco', 'mondial', 'oms', 'projections', 'mortalité'],
    source: 'OMS, ERS'
  },

  // ===== AIR LIQUIDE SANTÉ =====
  {
    id: 'al-sante-overview',
    category: 'air_liquide',
    title: 'Air Liquide Healthcare — Vue d\'ensemble',
    content: `Air Liquide Healthcare emploie 15 600 collaborateurs et prend en charge 2,1 millions de patients dans plus de 30 pays, via 20 000 hôpitaux partenaires.
Répartition du chiffre d'affaires santé :
- Gaz médicaux hôpitaux : 35%
- Santé à domicile : 46%
- Hygiène : 10%
- Ingrédients de spécialité : 9%
Activités principales : respiratoire, perfusion, diabète, neurologie (Parkinson), sommeil.
Positionnement : approche patient-centrée, Value-Based Healthcare, mission "Changing Care. With You".`,
    tags: ['air liquide', 'healthcare', 'organisation', 'chiffres', 'activités'],
    source: 'airliquide.com, healthcare.airliquide.com'
  },
  {
    id: 'al-sante-france',
    category: 'air_liquide',
    title: 'Air Liquide Santé France (ALSF) — Gaz médicaux hôpitaux',
    content: `Air Liquide Santé France (ALSF) est spécialisée dans les gaz médicinaux et médicaux pour les hôpitaux.
NPS (Net Promoter Score) de 68.4, témoignant d'une haute satisfaction client.
Certifié EcoVadis Or 2025 pour la responsabilité sociétale.
Activités : distribution de gaz médicaux, cryoconservation, aspiration médicale, formation des professionnels de santé.`,
    tags: ['alsf', 'gaz médicaux', 'hôpital', 'nps', 'ecovadis'],
    source: 'fr.healthcare.airliquide.com'
  },
  {
    id: 'al-alms',
    category: 'air_liquide',
    title: 'Air Liquide Medical Systems (ALMS) — Dispositifs médicaux',
    content: `Air Liquide Medical Systems (ALMS) conçoit et fabrique des dispositifs médicaux :
- Ventilateurs de réanimation et de transport
- Masques VNI (Ventilation Non Invasive)
- Dispositifs de distribution de gaz médicaux
- Bag CPAP pour néonatologie
- ALMS Academy : formation des professionnels de santé aux dispositifs médicaux.`,
    tags: ['alms', 'dispositifs médicaux', 'ventilateurs', 'vni', 'cpap'],
    source: 'fr.medicaldevice.airliquide.com'
  },
  {
    id: 'al-orkyn',
    category: 'air_liquide',
    title: 'ORKYN\' — Prestataire de santé à domicile (PSAD)',
    content: `ORKYN' est la filiale d'Air Liquide dédiée à la santé à domicile en France.
Chiffres clés : 1 900 collaborateurs, 62 sites en France, plus de 180 000 patients pris en charge chaque jour.
Prestations : respiratoire (oxygénothérapie, ventilation), sommeil (PPC), diabète (pompes à insuline), neurologie (Parkinson), nutrition entérale, perfusion à domicile.
Services : visites à domicile, télésuivi, coordination ville-hôpital, plans personnalisés de soins, éducation thérapeutique.
Orkyn' est pionnier du télésuivi VNI avec l'étude multicentrique eVENT (télésurveillance + accompagnement infirmier).`,
    tags: ['orkyn', 'psad', 'domicile', 'oxygénothérapie', 'ventilation', 'télésuivi'],
    source: 'orkyn.fr'
  },
  {
    id: 'al-oxygenotherapie',
    category: 'air_liquide',
    title: 'Oxygénothérapie — Sources et indications',
    content: `L'oxygénothérapie à domicile utilise différentes sources d'oxygène :
- Concentrateur d'oxygène : appareil électrique qui concentre l'O2 de l'air ambiant (économique, continu)
- Cuve d'oxygène liquide : réservoir de stockage pour patients à haut débit ou déambulation
- Bouteilles d'oxygène gazeux : portables, pour la déambulation et les urgences
Types de prescription :
- OLD (Oxygénothérapie Longue Durée) : >15h/jour, pour PaO2 ≤55 mmHg ou ≤60 mmHg avec complications
- OCT (Oxygénothérapie Courte durée) : pour l'effort ou la déambulation
- ODYSP : dyspnée en soins palliatifs
Le choix de la source dépend du profil patient : mobilité, débit prescrit, durée d'utilisation quotidienne.
Consignes de sécurité : ne pas fumer à proximité, éloigner des sources de chaleur, ventilation du local.`,
    tags: ['oxygénothérapie', 'old', 'oct', 'concentrateur', 'oxygène liquide', 'prescription'],
    source: 'orkyn.fr, HAS'
  },
  {
    id: 'al-telesuivi',
    category: 'air_liquide',
    title: 'Télésuivi et e-santé Air Liquide',
    content: `Air Liquide déploie plusieurs solutions de télésuivi :
- Télésuivi VNI/PPC : algorithmes d'alertes, cellule experte d'infirmiers, suivi à distance de l'observance
- Chronic Care Connect (filiale CDM e-Health) : programme de télésurveillance pour insuffisance cardiaque et diabète, +2000 patients suivis, +50% de survie à 1 an (étude allemande)
- Étude eVENT (Orkyn') : étude multicentrique démontrant les bénéfices cliniques de la télésurveillance VNI avec accompagnement infirmier
- Contrat Madrid (septembre 2025) : contrat 5 ans BPCO + apnée du sommeil, utilisant algorithmes prédictifs et IA pour le télésuivi.`,
    tags: ['télésuivi', 'e-santé', 'vni', 'ppc', 'chronic care', 'télésurveillance'],
    source: 'orkyn.fr, airliquide.com'
  },

  // ===== RECOMMANDATIONS CLINIQUES =====
  {
    id: 'gold-2025',
    category: 'clinique',
    title: 'Recommandations GOLD 2025 — Classification et traitement BPCO',
    content: `Le rapport GOLD (Global Initiative for Chronic Obstructive Lung Disease) 2025 définit :
Classification spirométrique : GOLD 1 (léger, VEMS ≥80%), GOLD 2 (modéré, 50-79%), GOLD 3 (sévère, 30-49%), GOLD 4 (très sévère, <30%).
Évaluation combinée ABE : basée sur les symptômes (CAT, mMRC) et les exacerbations.
Traitement initial :
- Groupe A : bronchodilatateur courte durée à la demande
- Groupe B : LABA ou LAMA en monothérapie
- Groupe E (exacerbateurs) : LABA+LAMA ou LABA+LAMA+CSI si éosinophiles ≥300
Oxygénothérapie longue durée : recommandée si PaO2 ≤55 mmHg ou ≤60 mmHg avec complications (polyglobulie, HTAP, insuffisance cardiaque droite).
La réadaptation respiratoire est recommandée à tous les stades.
La vaccination (grippe, pneumocoque, COVID) est systématiquement recommandée.`,
    tags: ['gold', 'bpco', 'classification', 'traitement', 'spirométrie', 'laba', 'lama'],
    source: 'GOLD 2025, goldcopd.org'
  },
  {
    id: 'has-bpco',
    category: 'clinique',
    title: 'HAS — Parcours de soins BPCO en France',
    content: `La HAS (Haute Autorité de Santé) définit le parcours de soins BPCO avec 10 messages clés :
1. Dépistage systématique des fumeurs/ex-fumeurs >40 ans par spirométrie
2. Sevrage tabagique comme priorité thérapeutique absolue
3. Bronchodilatateurs inhalés en 1ère ligne
4. Réadaptation respiratoire pour tout patient essoufflé
5. Vaccination antigrippale et antipneumococcique annuelle
6. Oxygénothérapie si insuffisance respiratoire chronique (PaO2 ≤55mmHg)
7. Ventilation non invasive si hypercapnie chronique
8. Coordination ville-hôpital indispensable
9. Éducation thérapeutique du patient
10. Plan d'action personnalisé pour les exacerbations
Indicateurs qualité (2022) : seulement 21% des patients BPCO dépistés, 53% vaccinés grippe, 74% ayant des bronchodilatateurs post-hospitalisation.`,
    tags: ['has', 'parcours de soins', 'bpco', 'recommandations', 'dépistage', 'vaccination'],
    source: 'HAS, has-sante.fr'
  },
  {
    id: 'exacerbations-bpco',
    category: 'clinique',
    title: 'Exacerbations aiguës de BPCO (EABPCO)',
    content: `Les exacerbations aiguës de BPCO (EABPCO) sont des épisodes d'aggravation aiguë des symptômes respiratoires.
Mise à jour HAS décembre 2024 — Stratégie antibiotique :
- Exacerbation légère à modérée : pas d'antibiothérapie systématique, réévaluation à 48-72h
- Exacerbation sévère ou avec expectoration purulente : amoxicilline 1g x3/j pendant 5 jours
- Allergie pénicilline : macrolides ou C3G
Critères d'hospitalisation : dyspnée sévère, troubles de conscience, échec traitement ambulatoire, comorbidités sévères.
Prévention : vaccination, sevrage tabagique, réadaptation, optimisation du traitement de fond.`,
    tags: ['exacerbation', 'eabpco', 'antibiothérapie', 'hospitalisation', 'urgence'],
    source: 'HAS 2024'
  },

  // ===== CONCURRENCE =====
  {
    id: 'concurrence-vivisol',
    category: 'concurrence',
    title: 'Vivisol / France Oxygène (SOL Group)',
    content: `Vivisol France est la filiale santé du SOL Group (3ème gazier européen).
Marques en France : Vivisol France et France Oxygène (75 000 patients, certifié ISO 9001).
Services : oxygénothérapie à domicile (service historique), ventilation non invasive, troubles du sommeil (PPC), aérosolthérapie, nutrition, perfusion (département InfuSol).
Avantages concurrentiels : service ViviTravel pour patients voyageurs, réseau national, fondation d'entreprise CAPAIR, éducation thérapeutique.
Historique France Oxygène depuis 1996, intégré au SOL Group.`,
    tags: ['vivisol', 'france oxygène', 'sol group', 'concurrent', 'psad'],
    source: 'vivisol.fr, franceoxygene.fr'
  },
  {
    id: 'concurrence-marche',
    category: 'concurrence',
    title: 'Marché des PSAD en France — Panorama concurrentiel',
    content: `Le marché français des Prestataires de Santé à Domicile (PSAD) compte 12 acteurs clés :
1. Air Liquide (Orkyn') — leader, 180 000+ patients/jour
2. Bastide Médical — forte croissance, diversifié
3. SOS Oxygène — spécialiste respiratoire
4. Isis Médical — réseau régional
5. Elivie / Asdia — nutrition, perfusion
6. Linde Healthcare — possible sortie du marché français
7. Santé Cie — acteur montant
8. La Poste Santé & Autonomie — nouvel entrant
Tendances : consolidation avancée, partenariats EHPAD/cliniques (Elsan Dom), technologisation des DM, télésurveillance obligatoire, baisses tarifaires LPPR récurrentes.
Sources d'avantage : télésuivi, IA prédictive, intégration parcours de soins, taille du réseau terrain.`,
    tags: ['psad', 'marché', 'concurrence', 'consolidation', 'acteurs'],
    source: 'Xerfi, analyses sectorielles'
  },

  // ===== RÉGLEMENTATION =====
  {
    id: 'lppr-oxygenotherapie',
    category: 'reglementaire',
    title: 'LPPR / LPP — Remboursement oxygénothérapie',
    content: `La LPPR (Liste des Produits et Prestations Remboursables) définit les conditions de remboursement de l'oxygénothérapie :
- Oxygénothérapie courte durée : forfait 44,46€/semaine (code 1128104)
- OLD (Oxygénothérapie Longue Durée) : forfaits mensuels selon la source d'O2 et le débit
- Forfaits déambulation : suppléments pour O2 liquide portable
- ODYSP : forfait spécifique dyspnée soins palliatifs
La prescription initiale d'OLD est hospitalière (pneumologue ou médecin de médecine interne). Le renouvellement peut être fait par le médecin traitant.
La CNEDiMTS (Commission Nationale d'Évaluation des Dispositifs Médicaux) évalue les dispositifs. Le CEPS fixe les tarifs. L'inscription est renouvelée tous les 5 ans.
Données nationales : les dépenses DM LPP sont disponibles en open data (Ameli Open LPP).`,
    tags: ['lppr', 'lpp', 'remboursement', 'tarif', 'oxygénothérapie', 'prescription'],
    source: 'HAS, Ameli, Légifrance'
  },
  {
    id: 'reglementation-telesuivi',
    category: 'reglementaire',
    title: 'Réglementation du télésuivi — PPC et ventilation',
    content: `Le télésuivi des dispositifs médicaux est encadré par des arrêtés spécifiques :
- Arrêté 2017 : procédure d'inscription PPC apnée du sommeil avec télésuivi obligatoire de l'observance
- Télésurveillance médicale : décret 2023 sur le remboursement de la télésurveillance pour les maladies chroniques
- Obligations PSAD : transmission des données d'observance au prescripteur, alertes en cas de non-observance, accompagnement patient
- FEDEPSAD : coordination avec les ARS pour la gestion des patients à haut risque (PHRV), sources secours O2, batteries ventilateurs.`,
    tags: ['télésuivi', 'réglementation', 'ppc', 'observance', 'télésurveillance'],
    source: 'Légifrance, FEDEPSAD'
  },

  // ===== PRODUITS AIR LIQUIDE =====
  {
    id: 'al-produits-respiratoire',
    category: 'air_liquide',
    title: 'Gamme produits Air Liquide — Respiratoire',
    content: `Gamme respiratoire Air Liquide / Orkyn' :
Concentrateurs d'oxygène :
- VitalAire Confort+ : concentrateur haut de gamme, silencieux, faible consommation
- Concentrateurs portables : pour la mobilité des patients actifs
Oxygène liquide :
- Cuves domicile : autonomie 7-10 jours selon débit
- Portables O2 liquide : mobilité maximale, recharge sur cuve
Solutions de ventilation :
- ALMS ventilateurs de réanimation et de domicile
- Masques VNI : interfaces patient nasale, faciale, narinaire
Télésuivi :
- Plateforme de télésurveillance connectée
- Algorithmes d'alertes intelligents
- Cellule experte d'infirmiers disponible 24/7
Service 24/7 : assistance permanente, astreinte technique et médicale.
Formation patients : éducation thérapeutique personnalisée.`,
    tags: ['produits', 'concentrateur', 'oxygène liquide', 'ventilation', 'vitalaire'],
    source: 'orkyn.fr, healthcare.airliquide.com'
  },
];

/**
 * Catégories pour le filtrage UI
 */
export const KNOWLEDGE_CATEGORIES = {
  air_liquide: { label: 'Air Liquide', color: 'bg-blue-100 text-blue-700', icon: '🏢' },
  clinique: { label: 'Clinique / BPCO', color: 'bg-green-100 text-green-700', icon: '🫁' },
  reglementaire: { label: 'Réglementation', color: 'bg-amber-100 text-amber-700', icon: '📋' },
  concurrence: { label: 'Concurrence', color: 'bg-red-100 text-red-700', icon: '⚔️' },
  epidemiologie: { label: 'Épidémiologie', color: 'bg-teal-100 text-teal-700', icon: '📊' },
} as const;
