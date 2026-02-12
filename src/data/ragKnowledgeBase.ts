/**
 * ARIA RAG Knowledge Base — Base de connaissances exhaustive
 *
 * Contient toutes les connaissances métier structurées pour le Coach IA :
 * - Air Liquide Santé (produits, services, organisation)
 * - BPCO (connaissances cliniques, recommandations GOLD/HAS)
 * - Paysage concurrentiel (Vivisol, France Oxygène, PSAD)
 * - Cadre réglementaire (LPPR, arrêtés, remboursement)
 * - Données épidémiologiques clés
 *
 * Chaque chunk est tagué avec des métadonnées pour un retrieval précis.
 * Généré le 06/02/2026 pour ARIA — Air Liquide Santé × Capgemini I&D
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type KnowledgeCategory =
  | 'air_liquide_corporate'
  | 'air_liquide_france'
  | 'alms_devices'
  | 'orkyn'
  | 'telesuivi'
  | 'bpco_gold'
  | 'bpco_has'
  | 'bpco_clinique'
  | 'oxygenotherapie'
  | 'concurrent'
  | 'reglementation'
  | 'epidemiologie'
  | 'lppr_remboursement';

export type KnowledgeTag =
  | 'air_liquide'
  | 'orkyn'
  | 'bpco'
  | 'oxygenotherapie'
  | 'lppr'
  | 'concurrent'
  | 'gold'
  | 'has'
  | 'telesuivi'
  | 'vivisol'
  | 'reglementation'
  | 'epidemiologie'
  | 'dispositif_medical'
  | 'ventilation'
  | 'sommeil'
  | 'parcours_soins'
  | 'exacerbation'
  | 'spirometrie'
  | 'ameli'
  | 'vidal';

export interface KnowledgeChunk {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  tags: KnowledgeTag[];
  source: string;
  sourceUrl: string;
  date: string;
  priority: 1 | 2 | 3;
}

export interface KnowledgeSource {
  id: string;
  name: string;
  url: string;
  category: KnowledgeCategory;
  description: string;
  priority: 1 | 2 | 3;
  downloadable: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCES RÉFÉRENCÉES (pour UI de téléchargement / consultation)
// ═══════════════════════════════════════════════════════════════════════════════

export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  // Priorité 1 — Documents de référence
  {
    id: 'has-parcours-bpco',
    name: 'Guide parcours de soins BPCO — HAS',
    url: 'https://www.has-sante.fr/jcms/c_1242507/fr/guide-du-parcours-de-soins-bronchopneumopathie-chronique-obstructive-bpco',
    category: 'bpco_has',
    description: 'Document de référence française : 10 messages clés, coordination ville-hôpital, sevrage tabagique, réadaptation respiratoire',
    priority: 1,
    downloadable: true,
  },
  {
    id: 'has-parcours-bpco-pdf',
    name: 'Guide BPCO HAS — PDF complet',
    url: 'https://www.has-sante.fr/upload/docs/application/pdf/2020-01/app_323_guide_bpco_actu_2019_vf.pdf',
    category: 'bpco_has',
    description: 'Épidémiologie (7,5% des +45 ans), 19 000 décès/an, sous-diagnostic 75%, traitement détaillé',
    priority: 1,
    downloadable: true,
  },
  {
    id: 'has-rapport-oxygenotherapie',
    name: 'Rapport oxygénothérapie HAS',
    url: 'https://www.has-sante.fr/upload/docs/application/pdf/2013-01/rapport_oxygenotherapie.pdf',
    category: 'oxygenotherapie',
    description: 'Évaluation complète : sources O2, LPPR, dispositifs, ~150 000 patients OLD en France (estimation 2024)',
    priority: 1,
    downloadable: true,
  },
  {
    id: 'recomedicales-bpco-2025',
    name: 'RecoMédicales BPCO 2025',
    url: 'https://recomedicales.fr/recommandations/bronchopneumopathie-chronique-obstructive/',
    category: 'bpco_clinique',
    description: 'Synthèse à jour : définition, traitements inhalés, OLD seuils, exacerbations, 3,5M personnes en France',
    priority: 1,
    downloadable: false,
  },
  {
    id: 'gold-2025',
    name: 'GOLD 2025 Report',
    url: 'https://goldcopd.org',
    category: 'bpco_gold',
    description: 'Rapport complet : définition, classification ABE, spirométrie, traitements, O2 longue durée',
    priority: 1,
    downloadable: false,
  },
  {
    id: 'gold-pocket-guide-fr',
    name: 'GOLD Pocket Guide (français)',
    url: 'https://goldcopd.org/wp-content/uploads/2016/04/wms-GOLD-2017-Pocket-Guide-Final-French.pdf',
    category: 'bpco_gold',
    description: 'Version française condensée : oxygénothérapie >15h/j, CAT score, VPPNI, soins palliatifs',
    priority: 1,
    downloadable: true,
  },
  // Priorité 2 — Pages produits et concurrence
  {
    id: 'orkyn-home',
    name: 'Orkyn\' — Page d\'accueil',
    url: 'https://www.orkyn.fr/',
    category: 'orkyn',
    description: '1900 collaborateurs, 62 sites, 180 000+ patients/jour',
    priority: 2,
    downloadable: false,
  },
  {
    id: 'orkyn-oxygenotherapie',
    name: 'Orkyn\' — L\'oxygénothérapie',
    url: 'https://www.orkyn.fr/insuffisance-respiratoire/loxygenotherapie',
    category: 'orkyn',
    description: 'Sources O2 (concentrateur, cuve, bouteille), BPDO, consignes sécurité, indications',
    priority: 2,
    downloadable: false,
  },
  {
    id: 'orkyn-telesuivi',
    name: 'Orkyn\' — Télésuivi ventilation',
    url: 'https://www.orkyn.fr/orkyn-deploie-son-offre-de-telesuivi-dans-linsuffisance-respiratoire-chronique',
    category: 'telesuivi',
    description: 'Algorithme d\'alertes, cellule experte infirmiers, pionniers du télésuivi VNI',
    priority: 2,
    downloadable: false,
  },
  {
    id: 'al-healthcare',
    name: 'Air Liquide Healthcare',
    url: 'https://healthcare.airliquide.com/fr',
    category: 'air_liquide_corporate',
    description: 'Mission, positionnement patient-centré, approche Value-Based Healthcare',
    priority: 2,
    downloadable: false,
  },
  {
    id: 'al-sante-groupe',
    name: 'Air Liquide Groupe — Page Santé',
    url: 'https://www.airliquide.com/fr/groupe/activites/sante',
    category: 'air_liquide_corporate',
    description: '15 600 collaborateurs, 2,1M patients, 20 000 hôpitaux, 30+ pays',
    priority: 2,
    downloadable: false,
  },
  {
    id: 'alsf-home',
    name: 'Air Liquide Santé France',
    url: 'https://fr.healthcare.airliquide.com/',
    category: 'air_liquide_france',
    description: 'Gaz médicinaux vs médicaux, NPS 68.4, formation, EcoVadis Or 2025',
    priority: 2,
    downloadable: false,
  },
  {
    id: 'alms-home',
    name: 'Air Liquide Medical Systems',
    url: 'https://fr.medicaldevice.airliquide.com/',
    category: 'alms_devices',
    description: 'Ventilateurs, masques VNI, dispositifs de distribution gaz, Bag CPAP, ALMS Academy',
    priority: 2,
    downloadable: false,
  },
  {
    id: 'vivisol',
    name: 'Vivisol France',
    url: 'https://www.vivisol.fr/',
    category: 'concurrent',
    description: 'Filiale SOL Group, oxygénothérapie, ventilation, nutrition, télémédecine',
    priority: 2,
    downloadable: false,
  },
  {
    id: 'france-oxygene',
    name: 'France Oxygène',
    url: 'https://www.franceoxygene.fr/',
    category: 'concurrent',
    description: '75 000 patients, certification ISO 9001, réseau national',
    priority: 2,
    downloadable: false,
  },
  {
    id: 'vidal-oxygene',
    name: 'Fiche VIDAL Oxygène médicinal AL',
    url: 'https://www.vidal.fr/medicaments/oxygene-medicinal-air-liquide-sante-france-200-bar-gaz-p-inhal-12536.html',
    category: 'oxygenotherapie',
    description: 'Monographie officielle, conditions stockage, VIDAL Recos associées',
    priority: 2,
    downloadable: false,
  },
  {
    id: 'arrete-oxygenotherapie-2015',
    name: 'Arrêté oxygénothérapie 2015 (Légifrance)',
    url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000030289820',
    category: 'reglementation',
    description: 'Modification nomenclature O2 : OCT, OLD, forfaits déambulation, dyspnée soins palliatifs',
    priority: 2,
    downloadable: false,
  },
  {
    id: 'arrete-ppc-2017',
    name: 'Arrêté PPC sommeil 2017 (Légifrance)',
    url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000036209897',
    category: 'reglementation',
    description: 'Procédure inscription PPC, télésuivi apnée sommeil, forfaits associés respiratoire',
    priority: 2,
    downloadable: false,
  },
  // Priorité 3 — Données structurées
  {
    id: 'open-lpp-ameli',
    name: 'Open LPP Ameli',
    url: 'https://www.assurance-maladie.ameli.fr/etudes-et-donnees/open-lpp-base-complete-depenses-dispositifs-medicaux',
    category: 'lppr_remboursement',
    description: 'Données dépenses DM 2014-2024, volumes, remboursements par spécialité prescripteur',
    priority: 3,
    downloadable: true,
  },
  {
    id: 'ameli-indicateurs-bpco',
    name: 'Indicateurs BPCO Ameli',
    url: 'https://www.ameli.fr/medecin/exercice-liberal/prise-charge-situation-type-soin/prise-en-charge-selon-la-pathologie/bpco-indicateurs-parcours-soins-patient',
    category: 'bpco_has',
    description: '7 indicateurs mesurables : dépistage 21%, vaccination 53%, EFR annuelle',
    priority: 3,
    downloadable: false,
  },
  {
    id: 'open-lpp-datagouv',
    name: 'Open LPP data.gouv.fr',
    url: 'https://www.data.gouv.fr/datasets/open-lpp-base-complete-sur-les-depenses-de-dispositifs-medicaux-inscrits-a-la-liste-de-produits-et-prestations-lpp-interregimes/',
    category: 'lppr_remboursement',
    description: 'Jeux de données téléchargeables CSV, nomenclature fine LPP',
    priority: 3,
    downloadable: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE CHUNKS — Base de connaissances structurée
// ═══════════════════════════════════════════════════════════════════════════════

export const KNOWLEDGE_CHUNKS: KnowledgeChunk[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. AIR LIQUIDE SANTÉ — Corporate & Organisation
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'al-corp-vision',
    title: 'Air Liquide Healthcare — Vision globale',
    content: `Air Liquide Healthcare est un acteur mondial majeur de la santé. Chiffres clés :
- 15 600 collaborateurs dédiés à la santé
- 2,1 millions de patients pris en charge
- 20 000 hôpitaux partenaires
- Présence dans plus de 30 pays
Activités principales : respiratoire (oxygénothérapie, ventilation), perfusion à domicile, diabète, maladie de Parkinson.
Air Liquide est le leader mondial des gaz médicaux et de la santé à domicile. La branche Santé représente environ 20% du chiffre d'affaires du groupe Air Liquide (environ 6,6 milliards d'euros en 2024).`,
    category: 'air_liquide_corporate',
    tags: ['air_liquide'],
    source: 'Air Liquide Groupe — Page Santé',
    sourceUrl: 'https://www.airliquide.com/fr/groupe/activites/sante',
    date: '2025',
    priority: 1,
  },
  {
    id: 'al-corp-repartition-ca',
    title: 'Air Liquide Healthcare — Répartition du chiffre d\'affaires',
    content: `Répartition du chiffre d'affaires de la branche Santé d'Air Liquide :
- Gaz médicaux hôpitaux : 35% du CA
- Santé à domicile : 46% du CA (activité principale)
- Hygiène : 10% du CA
- Ingrédients de spécialité : 9% du CA
La santé à domicile est donc l'activité dominante, représentant presque la moitié du chiffre d'affaires de la branche Santé. Cette répartition reflète la stratégie du groupe de se positionner comme un acteur complet de la chaîne de soins, de l'hôpital au domicile du patient.`,
    category: 'air_liquide_corporate',
    tags: ['air_liquide'],
    source: 'Nos activités en bref — Air Liquide Healthcare',
    sourceUrl: 'https://healthcare.airliquide.com/fr/nos-activites-dans-la-sante-en-bref',
    date: '2025',
    priority: 1,
  },
  {
    id: 'al-corp-mission',
    title: 'Air Liquide Healthcare — Mission Changing Care',
    content: `La mission d'Air Liquide Healthcare est résumée par "Changing Care. With You." L'approche est centrée sur le patient (patient-centré) et s'inscrit dans une démarche de Value-Based Healthcare (soins basés sur la valeur).
Principes fondamentaux :
- Placer le patient au centre de toutes les décisions
- Mesurer les résultats de santé (outcomes) plutôt que les volumes d'actes
- Coordination étroite entre l'hôpital et le domicile (continuum de soins)
- Innovation technologique au service de la personnalisation des soins
- Engagement sociétal et développement durable (EcoVadis Or 2025)
Le positionnement vise à transformer Air Liquide d'un fournisseur de gaz en un véritable partenaire de santé.`,
    category: 'air_liquide_corporate',
    tags: ['air_liquide'],
    source: 'Air Liquide Healthcare',
    sourceUrl: 'https://healthcare.airliquide.com/fr',
    date: '2025',
    priority: 1,
  },
  {
    id: 'al-sante-domicile',
    title: 'Air Liquide — Santé à domicile (prestations)',
    content: `Air Liquide Santé à domicile assure la prise en charge des patients à leur domicile avec les prestations suivantes :
- Visites régulières de techniciens et infirmiers à domicile
- Télésuivi des patients (monitoring à distance des paramètres)
- Coordination ville-hôpital : liaison entre le médecin prescripteur, l'hôpital et le patient
- Plans de soins personnalisés adaptés à chaque pathologie
- Éducation thérapeutique du patient (ETP)
- Installation et maintenance des dispositifs médicaux à domicile
- Livraison d'oxygène médical et consommables
- Astreinte 24h/24 et 7j/7 pour les urgences
Le modèle repose sur une équipe pluridisciplinaire : pharmaciens, infirmiers, techniciens respiratoires, diététiciens.`,
    category: 'air_liquide_corporate',
    tags: ['air_liquide', 'oxygenotherapie'],
    source: 'Santé à domicile — Air Liquide Healthcare',
    sourceUrl: 'https://healthcare.airliquide.com/fr/nos-activites/sante-domicile',
    date: '2025',
    priority: 1,
  },
  {
    id: 'al-faq-chiffres',
    title: 'Le saviez-vous ? Air Liquide & Santé — FAQ',
    content: `FAQ vulgarisée Air Liquide & Santé :
- Les gaz médicaux (oxygène, protoxyde d'azote, hélium médical) sont des médicaments à part entière, soumis à une AMM
- Le télésuivi permet de suivre à distance l'observance et les paramètres des patients sous ventilation ou oxygénothérapie
- Air Liquide accompagne des patients atteints de maladies chroniques : BPCO, insuffisance respiratoire, apnée du sommeil, diabète, Parkinson
- BiotechMarine est la filiale d'ingrédients de spécialité (actifs marins pour cosmétique et santé)
- Air Liquide est aussi actif dans la cryoconservation (cellules, tissus, échantillons biologiques)`,
    category: 'air_liquide_corporate',
    tags: ['air_liquide'],
    source: 'Le saviez-vous — Air Liquide',
    sourceUrl: 'https://www.airliquide.com/fr/histoires/shareholding/le-saviez-vous-air-liquide-et-la-sante',
    date: '2025',
    priority: 2,
  },
  {
    id: 'al-etude-melchior',
    title: 'Air Liquide — Analyse stratégique (étude Melchior)',
    content: `Analyse stratégique complète d'Air Liquide (source Melchior) :
- Air Liquide est le leader mondial des gaz industriels et médicaux, fondé en 1902
- L'entreprise s'est transformée d'un pure player gaz vers un acteur de santé complet
- La branche Santé connaît une croissance supérieure au reste du groupe
- Enjeux futurs : digitalisation des soins, télémédecine, IA prédictive, vieillissement de la population
- Avantage concurrentiel : réseau de distribution capillaire, expertise gazière + médicale unique
- Stratégie de croissance : acquisitions ciblées, expansion géographique, développement de solutions connectées
- Le modèle PSAD (Prestataire de Santé à Domicile) est un relais de croissance majeur dans un contexte de virage ambulatoire (transfert de l'hôpital vers le domicile).`,
    category: 'air_liquide_corporate',
    tags: ['air_liquide'],
    source: 'Étude de cas Melchior',
    sourceUrl: 'https://www.melchior.fr/etude-de-cas/l-avenir-de-la-sante-le-cas-air-liquide',
    date: '2025',
    priority: 2,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 1.2 Air Liquide Santé France (Gaz médicaux hôpitaux)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'alsf-gaz-medicaux',
    title: 'Air Liquide Santé France — Gaz médicaux',
    content: `Air Liquide Santé France (ALSF) est la filiale dédiée aux gaz médicinaux pour les hôpitaux en France.
Points clés :
- Distinction importante : gaz MÉDICINAUX (médicaments avec AMM) vs gaz MÉDICAUX (usage technique en milieu hospitalier)
- NPS (Net Promoter Score) de 68.4, indiquant une très haute satisfaction client
- Certifié EcoVadis Or 2025 (responsabilité sociétale)
- Offre de formation continue pour le personnel hospitalier
- Produits : oxygène médicinal, protoxyde d'azote, mélanges MEOPA, hélium médical, azote médical
- Services associés : distribution, installation de réseaux de gaz hospitaliers, maintenance, audits sécurité
- Matériel médical : dispositifs de distribution gaz médicaux, équipements de cryoconservation, systèmes d'aspiration médicale.`,
    category: 'air_liquide_france',
    tags: ['air_liquide', 'oxygenotherapie'],
    source: 'Air Liquide Santé France',
    sourceUrl: 'https://fr.healthcare.airliquide.com/',
    date: '2025',
    priority: 2,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 1.3 Air Liquide Medical Systems (ALMS)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'alms-dispositifs',
    title: 'Air Liquide Medical Systems (ALMS) — Dispositifs médicaux',
    content: `Air Liquide Medical Systems (ALMS) conçoit et fabrique des dispositifs médicaux innovants :
- Ventilateurs : pour la ventilation non invasive (VNI) et invasive, en milieu hospitalier et à domicile
- Masques VNI : interfaces patient optimisées pour le confort et l'efficacité de la ventilation
- Dispositifs de distribution de gaz médicaux : régulateurs, débitmètres, humidificateurs
- Bag CPAP : système de pression positive continue pour les nouveau-nés (néonatalogie)
- ALMS Academy : programme de formation pour les professionnels de santé sur l'utilisation des dispositifs
ALMS est un acteur reconnu de l'innovation dans le domaine respiratoire, avec un focus sur la VNI (ventilation non invasive) et les dispositifs de néonatalogie.`,
    category: 'alms_devices',
    tags: ['air_liquide', 'dispositif_medical', 'ventilation'],
    source: 'Air Liquide Medical Systems',
    sourceUrl: 'https://fr.medicaldevice.airliquide.com/',
    date: '2025',
    priority: 2,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 1.3b CATALOGUE PRODUITS & SERVICES — Vue d'ensemble Air Liquide Santé
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'al-catalogue-complet',
    title: 'Air Liquide Santé — Catalogue complet des produits et services',
    content: `Catalogue des produits et services d'Air Liquide Santé (vue d'ensemble de toutes les filiales) :

**1. OXYGÉNOTHÉRAPIE (Orkyn' + ALSF)**
- Concentrateurs d'oxygène fixes (jusqu'à 5 L/min, fonctionnement électrique)
- Concentrateurs d'oxygène portables (pour la déambulation, acceptés en avion)
- Oxygène liquide médical : cuves fixes + portables rechargeables (haute autonomie)
- Bouteilles d'oxygène gazeux comprimé (200 bar) pour secours et déplacements
- Oxygène médicinal Air Liquide Santé France (AMM, O₂ ≥ 99,5%)
- Consommables : lunettes nasales, masques à oxygène, tubulures, humidificateurs
- Forfait OLD (Oxygénothérapie Longue Durée >15h/j)
- Forfait OCT (Oxygénothérapie Courte Durée)
- Forfait ODYSP (dyspnée soins palliatifs)

**2. VENTILATION & RESPIRATOIRE (ALMS + Orkyn')**
- Ventilateurs domicile pour Ventilation Non Invasive (VNI)
- Ventilateurs pour ventilation invasive (trachéotomie)
- Appareils PPC/CPAP (Pression Positive Continue) pour l'apnée du sommeil
- Masques VNI : nasaux, faciaux, narinaires — interfaces patient ALMS
- Bag CPAP néonatal (ventilation des nouveau-nés)
- Humidificateurs chauffants pour circuits de ventilation
- Consommables ventilation : circuits, filtres, joints, harnais

**3. GAZ MÉDICINAUX HÔPITAUX (ALSF)**
- Oxygène médicinal (bouteilles et réseaux hospitaliers)
- Protoxyde d'azote médical
- Mélange MEOPA (50% O₂ / 50% N₂O — analgésie procédurale)
- Hélium médical (Héliox — bronchospasme sévère)
- Azote médical (cryochirurgie, cryoconservation)
- Air médical (alimentation respirateurs)
- Installation et maintenance de réseaux de gaz hospitaliers
- Audit sécurité des installations de gaz médicaux

**4. PERFUSION À DOMICILE (Orkyn')**
- Pompes à perfusion ambulatoires (antibiothérapie IV, chimiothérapie, nutrition parentérale)
- Diffuseurs portables
- Consommables de perfusion

**5. DIABÈTE (Orkyn')**
- Pompes à insuline externes
- Capteurs de glycémie en continu (CGM)
- Consommables diabète (cathéters, réservoirs, sets de perfusion)

**6. NEUROLOGIE (Orkyn')**
- Pompes à apomorphine (traitement de la maladie de Parkinson avancée)
- Consommables neurologie

**7. NUTRITION (Orkyn')**
- Nutrition entérale à domicile (sondes, pompes, poches)
- Nutrition parentérale à domicile

**8. SOLUTIONS NUMÉRIQUES & TÉLÉSUIVI**
- Plateformes de télésuivi PPC (observance apnée du sommeil)
- Télésuivi VNI (algorithmes d'alertes, cellule experte)
- Chronic Care Connect (télésurveillance insuffisance cardiaque & diabète)
- Applications patient et portails professionnels

**9. SERVICES ASSOCIÉS**
- Installation et mise en service à domicile
- Formation des patients (éducation thérapeutique)
- Astreinte 24h/24, 7j/7
- Maintenance préventive et curative
- Livraison d'oxygène et consommables
- Coordination ville-hôpital
- Pré-visite pharmacien

Au total, Air Liquide Santé couvre environ **25-30 familles de produits et services** à travers ses filiales, répartis sur 8 domaines thérapeutiques principaux.`,
    category: 'air_liquide_corporate',
    tags: ['air_liquide', 'orkyn', 'dispositif_medical', 'oxygenotherapie', 'ventilation', 'sommeil'],
    source: 'Synthèse Air Liquide Healthcare / Orkyn\' / ALMS / ALSF',
    sourceUrl: 'https://healthcare.airliquide.com/fr/nos-activites-dans-la-sante-en-bref',
    date: '2025',
    priority: 1,
  },
  {
    id: 'al-services-domicile-detail',
    title: 'Air Liquide / Orkyn\' — Services de santé à domicile (détail)',
    content: `Services proposés par Air Liquide / Orkyn' dans le cadre de la santé à domicile :

**Modèle de service PSAD :**
Orkyn' ne vend pas directement des produits aux patients. Le modèle économique repose sur des **forfaits de prestations** remboursés par l'Assurance Maladie (LPPR). Chaque forfait inclut :
- Le dispositif médical (prêt ou location)
- L'installation et la mise en service au domicile du patient
- La formation initiale du patient et de ses aidants
- La maintenance préventive et curative
- Le renouvellement des consommables
- L'astreinte 24h/24, 7j/7 pour les urgences
- Le suivi régulier par un technicien ou infirmier

**Prestations respiratoires (cœur de métier) :**
- Oxygénothérapie : installation concentrateur ou cuve O₂ liquide, livraison bouteilles, suivi SpO₂
- Ventilation : installation et réglage VNI, suivi observance, télésuivi avec alertes
- Apnée du sommeil : PPC avec télésuivi obligatoire, choix du masque, accompagnement observance

**Valeur ajoutée différenciante :**
- Réseau national de 62 sites = proximité géographique
- Pharmaciens responsables de la conformité réglementaire
- Cellule experte infirmiers pour le télésuivi VNI
- Coordination ville-hôpital (lien prescripteur-patient)
- Programme d'éducation thérapeutique structuré
- Partenariats technologiques (FeetMe, beatHealth, Libheros)

**Nombre de produits au catalogue :**
En combinant l'ensemble des filiales (Orkyn', ALMS, ALSF), Air Liquide Santé France propose environ **25 à 30 familles de produits/dispositifs médicaux** et une dizaine de **services associés**, couvrant 8 domaines thérapeutiques (respiratoire, sommeil, diabète, neurologie, nutrition, perfusion, gaz médicaux hospitaliers, solutions numériques).`,
    category: 'orkyn',
    tags: ['orkyn', 'air_liquide', 'dispositif_medical', 'oxygenotherapie'],
    source: 'Synthèse Orkyn\' / Air Liquide Healthcare',
    sourceUrl: 'https://www.orkyn.fr/',
    date: '2025',
    priority: 1,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 1.4 ORKYN' (PSAD — Santé à domicile France)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'orkyn-presentation',
    title: 'Orkyn\' — Présentation générale',
    content: `Orkyn' est le Prestataire de Santé à Domicile (PSAD) d'Air Liquide en France.
Chiffres clés :
- 1 900 collaborateurs
- 62 sites répartis sur tout le territoire français
- Plus de 180 000 patients pris en charge chaque jour
Domaines de prestations :
- Respiratoire : oxygénothérapie (OLD, OCT), ventilation (VNI, PPC apnée du sommeil)
- Sommeil : traitement de l'apnée du sommeil par PPC (Pression Positive Continue)
- Diabète : pompes à insuline, capteurs de glycémie, consommables
- Neurologie : pompes à apomorphine (maladie de Parkinson)
- Nutrition : nutrition entérale et parentérale à domicile
- Perfusion : perfusion à domicile (antibiothérapie, chimiothérapie, nutrition parentérale)
Orkyn' est le principal relais terrain d'Air Liquide pour la santé à domicile en France.`,
    category: 'orkyn',
    tags: ['orkyn', 'air_liquide', 'oxygenotherapie'],
    source: 'Orkyn\'',
    sourceUrl: 'https://www.orkyn.fr/',
    date: '2025',
    priority: 1,
  },
  {
    id: 'orkyn-oxygenotherapie',
    title: 'Orkyn\' — L\'oxygénothérapie en détail',
    content: `L'oxygénothérapie consiste à administrer de l'oxygène médical à un patient dont la concentration en oxygène dans le sang est insuffisante (hypoxémie).

Sources d'oxygène à domicile :
1. **Concentrateur d'oxygène** (extracteur) : appareil électrique qui filtre l'azote de l'air ambiant pour délivrer de l'oxygène concentré (93-96%). Le plus courant à domicile. Avantages : pas de livraison, autonomie illimitée tant qu'il y a de l'électricité.
2. **Oxygène liquide** (cuve + portable) : oxygène stocké sous forme liquide dans un réservoir fixe (cuve), avec un portable rechargeable pour la déambulation. Avantage : très haute autonomie en déambulation, débit élevé possible.
3. **Bouteilles d'oxygène gazeux** : oxygène comprimé en bouteille (200 bar). Utilisé en secours ou pour les déplacements courts. Autonomie limitée.

Indications principales :
- BPCO avec insuffisance respiratoire chronique
- Fibrose pulmonaire
- Hypertension artérielle pulmonaire
- Insuffisance cardiaque sévère
- Soins palliatifs (dyspnée)

BPDO (Bouteille de Pharmacie d'Oxygène) : bouteille d'oxygène de secours fournie au patient, à utiliser en cas de panne de courant ou défaillance du concentrateur.

Consignes de sécurité : ne jamais fumer à proximité de l'oxygène, éloigner des sources de chaleur, aérer la pièce, ne pas graisser les raccords.`,
    category: 'orkyn',
    tags: ['orkyn', 'oxygenotherapie', 'bpco'],
    source: 'Orkyn\' — L\'oxygénothérapie',
    sourceUrl: 'https://www.orkyn.fr/insuffisance-respiratoire/loxygenotherapie',
    date: '2025',
    priority: 1,
  },
  {
    id: 'orkyn-old-vs-oct',
    title: 'Oxygénothérapie de Longue Durée (OLD) vs Courte Durée (OCT)',
    content: `Différences entre l'Oxygénothérapie de Longue Durée (OLD) et l'Oxygénothérapie de Courte Durée (OCT) :

**OLD (Oxygénothérapie de Longue Durée) :**
- Durée : >15 heures par jour (idéalement 24h/24)
- Indication : PaO2 ≤ 55 mmHg en air ambiant au repos, ou PaO2 entre 55-60 mmHg avec signes d'hypoxie chronique (polyglobulie, HTAP, désaturations nocturnes, insuffisance cardiaque droite)
- Objectif : améliorer la survie et la qualité de vie dans l'insuffisance respiratoire chronique
- Durée minimale efficace : au moins 15h/j (études NOTT et MRC)
- Sources d'O2 : concentrateur fixe + portable/bouteille pour déambulation

**OCT (Oxygénothérapie de Courte Durée) :**
- Durée : prescription temporaire (quelques semaines à 3 mois)
- Indication : insuffisance respiratoire transitoire (post-hospitalisation, exacerbation BPCO, en attente de stabilisation)
- Objectif : passer un cap aigu, permettre la récupération
- Source d'O2 : généralement concentrateur ou bouteilles

**Seuils PaO2 pour l'OLD :**
- PaO2 ≤ 55 mmHg : indication formelle
- PaO2 55-60 mmHg : si polyglobulie (Ht > 55%), HTAP, signes d'insuffisance cardiaque droite, désaturations nocturnes
- Deux mesures à au moins 3 semaines d'intervalle en état stable sont nécessaires.`,
    category: 'orkyn',
    tags: ['orkyn', 'oxygenotherapie', 'bpco'],
    source: 'Orkyn\' — OLD vs OCT',
    sourceUrl: 'https://www.orkyn.fr/insuffisance-respiratoire/faq/loxygenotherapie-de-longue-duree-old-et-de-courte-duree-quelles-differences',
    date: '2025',
    priority: 1,
  },
  {
    id: 'orkyn-bpco-source-o2',
    title: 'BPCO — Choisir la bonne source d\'oxygène',
    content: `Le choix de la bonne source d'oxygène pour un patient BPCO est crucial et dépend de son profil :

**Pré-visite du pharmacien :** Avant l'installation, un pharmacien Orkyn' réalise une évaluation du domicile et du profil patient pour recommander la source la plus adaptée.

**Critères de choix :**
1. Débit prescrit : les concentrateurs vont généralement jusqu'à 5 L/min, l'oxygène liquide peut aller plus haut
2. Mobilité du patient : un patient actif nécessite un portable performant (oxygène liquide ou concentrateur portable)
3. Durée d'utilisation quotidienne : >15h/j (OLD) oriente vers un concentrateur fixe + solution de déambulation
4. Lieu de vie : accessibilité pour les livraisons (oxygène liquide nécessite des livraisons régulières)
5. Mode de vie : voyages fréquents → concentrateur portable (accepté en avion avec certaines restrictions)

**Avantages par source :**
- Concentrateur fixe : économique, pas de livraison, fonctionnement continu
- Concentrateur portable : mobilité, accepté en avion, pas de livraison de gaz
- Oxygène liquide : haute autonomie en déambulation, débits élevés possibles
- Bouteilles : secours, déplacements courts, simplicité d'utilisation`,
    category: 'orkyn',
    tags: ['orkyn', 'oxygenotherapie', 'bpco'],
    source: 'Orkyn\' — Bonne source d\'O2',
    sourceUrl: 'https://www.orkyn.fr/bpco-les-avantages-de-disposer-de-la-bonne-source-doxygene',
    date: '2025',
    priority: 1,
  },
  {
    id: 'orkyn-telesuivi-vni',
    title: 'Orkyn\' — Télésuivi ventilation (VNI)',
    content: `Orkyn' est pionnier du télésuivi dans la ventilation non invasive (VNI) en France.

**Système de télésuivi :**
- Algorithme d'alertes automatisé qui détecte les anomalies d'utilisation (fuites, mauvaise observance, paramètres anormaux)
- Cellule experte composée d'infirmiers spécialisés qui analysent les alertes et contactent le patient si nécessaire
- Coordination avec le médecin prescripteur en cas d'anomalie significative
- Suivi proactif de l'observance (durée d'utilisation, régularité)

**Étude eVENT :** Étude multicentrique menée par Orkyn' évaluant l'impact de la télésurveillance + accompagnement infirmier sur les patients sous VNI. Résultats cliniques démontrant une amélioration de l'observance et une réduction des ré-hospitalisations.

**Avantages du télésuivi :**
- Détection précoce des problèmes (fuites, intolérance)
- Réduction des hospitalisations non programmées
- Amélioration de l'observance thérapeutique
- Optimisation des visites à domicile (ciblées sur les patients en difficulté)
- Meilleure coordination ville-hôpital`,
    category: 'telesuivi',
    tags: ['orkyn', 'telesuivi', 'ventilation'],
    source: 'Orkyn\' — Télésuivi ventilation',
    sourceUrl: 'https://www.orkyn.fr/orkyn-deploie-son-offre-de-telesuivi-dans-linsuffisance-respiratoire-chronique',
    date: '2025',
    priority: 1,
  },
  {
    id: 'orkyn-innovation-event',
    title: 'Orkyn\' — Innovation & étude eVENT',
    content: `L'étude eVENT est une étude multicentrique menée par Orkyn' visant à évaluer l'impact d'un programme de télésurveillance combiné à un accompagnement infirmier personnalisé pour les patients sous ventilation non invasive (VNI).

Objectifs de l'étude :
- Mesurer l'impact sur l'observance thérapeutique de la VNI
- Évaluer la réduction des exacerbations et ré-hospitalisations
- Quantifier la satisfaction patient et la qualité de vie

Le programme combine :
- Transmission automatique des données de ventilation via les dispositifs connectés
- Analyse algorithmique des données avec génération d'alertes
- Intervention d'infirmiers experts en cas d'alerte
- Accompagnement éducatif renforcé pour les patients en difficulté

Cette approche s'inscrit dans la tendance de "technologisation" des soins à domicile, où la combinaison de la télésurveillance et de l'intervention humaine ciblée permet d'optimiser les résultats cliniques.`,
    category: 'orkyn',
    tags: ['orkyn', 'telesuivi', 'ventilation'],
    source: 'Orkyn\' — Innovation',
    sourceUrl: 'https://www.orkyn.fr/orkyn-linnovation-au-service-du-souffle',
    date: '2025',
    priority: 2,
  },
  {
    id: 'orkyn-journee-bpco',
    title: 'Orkyn\' — Journée mondiale BPCO',
    content: `Orkyn' participe activement à la Journée mondiale de sensibilisation à la BPCO :
- Initiative déployée dans 21 entités Air Liquide dans 18 pays
- Recueil des besoins des patients et des aidants
- Campagnes de sensibilisation sur le sous-diagnostic de la BPCO
- Promotion du dépistage précoce par spirométrie
- Témoignages de patients pour réduire la stigmatisation
Cette mobilisation mondiale illustre l'engagement d'Air Liquide dans la lutte contre la BPCO, 3ème cause de mortalité dans le monde.`,
    category: 'orkyn',
    tags: ['orkyn', 'bpco', 'air_liquide'],
    source: 'Orkyn\' — Journée mondiale BPCO',
    sourceUrl: 'https://www.orkyn.fr/journee-mondiale-de-sensibilisation-la-bpco',
    date: '2025',
    priority: 2,
  },
  {
    id: 'orkyn-metiers',
    title: 'Orkyn\' — Métiers et organisation terrain',
    content: `Organisation terrain d'Orkyn' et métiers clés :
- **Délégués commerciaux** : Interlocuteurs privilégiés des médecins prescripteurs. Ils visitent les pneumologues et généralistes pour promouvoir les services Orkyn' et accompagner les prescriptions.
- **Techniciens respiratoires** : Assurent l'installation, la maintenance et le suivi technique des dispositifs à domicile. Formés aux différentes sources d'oxygène et ventilateurs.
- **Pharmaciens** : Responsables de la conformité réglementaire, de la validation des prescriptions et de l'éducation thérapeutique. Réalisent les pré-visites avant installation.
- **Infirmiers** : Cellule experte de télésuivi, accompagnement des patients complexes, éducation thérapeutique, coordination avec les médecins.
- **Coordinateurs ville-hôpital** : Font le lien entre les équipes hospitalières et le suivi à domicile pour assurer la continuité des soins.

Les 62 sites répartis en France permettent une couverture nationale avec des temps d'intervention rapides.`,
    category: 'orkyn',
    tags: ['orkyn', 'air_liquide'],
    source: 'Orkyn\' — Carrière',
    sourceUrl: 'https://www.orkyn.fr/carriere',
    date: '2025',
    priority: 2,
  },
  {
    id: 'orkyn-partenariats',
    title: 'Orkyn\' — Partenariats et innovations',
    content: `Orkyn' développe des partenariats stratégiques pour innover :
- **FeetMe** : Semelles connectées pour le suivi de la mobilité des patients (corrélation avec l'état respiratoire)
- **beatHealth** : Solutions de monitoring cardiaque connecté pour les patients insuffisants respiratoires avec comorbidités cardiaques
- **Elsan Dom** : Partenariat avec le groupe Elsan pour la prise en charge à domicile des patients post-hospitalisation
- **Libheros** : Plateforme de mise en relation avec des infirmiers libéraux pour les soins à domicile
Ces partenariats illustrent la stratégie d'écosystème d'Orkyn', combinant dispositifs médicaux, objets connectés et services numériques.`,
    category: 'orkyn',
    tags: ['orkyn', 'air_liquide', 'telesuivi'],
    source: 'LinkedIn Orkyn\'',
    sourceUrl: 'https://fr.linkedin.com/company/orkyn\'',
    date: '2025',
    priority: 2,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 1.5 Chronic Care Connect (Télésuivi)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'chronic-care-connect',
    title: 'Chronic Care Connect — Programme de télésurveillance',
    content: `Chronic Care Connect est le programme de télésurveillance développé par CDM e-Health, filiale d'Air Liquide.

Caractéristiques :
- Plus de 2 000 patients suivis
- Pathologies couvertes : insuffisance cardiaque et diabète
- Suivi connecté des paramètres vitaux à domicile (poids, tension, glycémie, saturation)
- Alertes automatiques en cas de décompensation
- Intervention rapide d'une équipe soignante coordonnée
- Résultat marquant : +50% de survie à 1 an (étude allemande)
- Déploiement en France et en Espagne

Ce programme illustre la diversification d'Air Liquide au-delà du respiratoire vers la gestion des maladies chroniques en général, en utilisant les technologies de télésurveillance comme levier d'amélioration des résultats cliniques.`,
    category: 'telesuivi',
    tags: ['air_liquide', 'telesuivi'],
    source: 'Chronic Care Connect — French Healthcare',
    sourceUrl: 'https://frenchhealthcare.fr/actualite-de-nos-adherents/chronic-care-connect-telesuivi-des-patients-a-domicile/',
    date: '2025',
    priority: 2,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 1.6 Contrat Espagne
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'al-contrat-espagne-2025',
    title: 'Air Liquide — Contrat majeur en Espagne (sept. 2025)',
    content: `En septembre 2025, Air Liquide a remporté un contrat majeur en Espagne pour la prise en charge de patients souffrant de maladies respiratoires.

Détails du contrat :
- Contrat de 5 ans avec la région de Madrid
- Patients BPCO et apnée du sommeil
- Déploiement d'algorithmes prédictifs et d'intelligence artificielle
- Télésuivi avancé des patients à domicile
- Innovation : utilisation de l'IA pour prédire les exacerbations et optimiser les interventions

Ce contrat est significatif car il illustre la direction stratégique d'Air Liquide :
- La combinaison de la prise en charge respiratoire traditionnelle avec les technologies numériques
- L'utilisation de l'IA comme différenciateur concurrentiel
- Le modèle de contrat long terme (5 ans) avec engagement sur les résultats

Contexte mondial : +23% de cas de BPCO attendus d'ici 2050 dans le monde selon l'OMS et l'European Respiratory Society (ERS).`,
    category: 'air_liquide_corporate',
    tags: ['air_liquide', 'bpco', 'telesuivi'],
    source: 'Communiqué Air Liquide — Contrat Madrid',
    sourceUrl: 'https://www.airliquide.com/fr/groupe/communiques-presse-actualites/23-09-2025/air-liquide-remporte-un-contrat-majeur-en-espagne-pour-prendre-en-charge-les-patients-souffrant-de',
    date: '2025-09',
    priority: 1,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. BPCO — Connaissances cliniques & Recommandations
  // ──────────────────────────────────────────────────────────────────────────

  // 2.1 GOLD
  {
    id: 'gold-2025-definition',
    title: 'GOLD 2025 — Définition et classification de la BPCO',
    content: `La BPCO (Bronchopneumopathie Chronique Obstructive) selon GOLD 2025 :

**Définition :** Maladie respiratoire chronique caractérisée par des symptômes respiratoires persistants (dyspnée, toux, expectoration) et une obstruction bronchique non complètement réversible, causée par des anomalies des voies aériennes et/ou des alvéoles, généralement dues à une exposition significative à des particules ou gaz nocifs (principalement le tabac).

**Classification spirométrique GOLD (post-bronchodilatateur, VEMS/CVF < 0.70) :**
- GOLD 1 (Légère) : VEMS ≥ 80% de la valeur prédite
- GOLD 2 (Modérée) : 50% ≤ VEMS < 80%
- GOLD 3 (Sévère) : 30% ≤ VEMS < 50%
- GOLD 4 (Très sévère) : VEMS < 30%

**Classification ABE (évaluation combinée, remplace ABCD en 2023) :**
- Groupe A : Peu de symptômes (mMRC 0-1, CAT < 10), 0-1 exacerbation modérée/an
- Groupe B : Symptômes significatifs (mMRC ≥ 2, CAT ≥ 10), 0-1 exacerbation modérée/an
- Groupe E (Exacerbateur) : ≥ 2 exacerbations modérées/an OU ≥ 1 hospitalisation pour exacerbation

La spirométrie est INDISPENSABLE pour confirmer le diagnostic de BPCO. Le rapport VEMS/CVF post-bronchodilatateur < 0.70 est le critère diagnostic.`,
    category: 'bpco_gold',
    tags: ['bpco', 'gold', 'spirometrie'],
    source: 'GOLD 2025 Report',
    sourceUrl: 'https://goldcopd.org',
    date: '2025',
    priority: 1,
  },
  {
    id: 'gold-2025-traitements',
    title: 'GOLD 2025 — Traitements de la BPCO stable',
    content: `Traitements de la BPCO stable selon GOLD 2025 :

**Bronchodilatateurs inhalés (traitement de base) :**
- **LABA** (β2-agonistes longue durée d'action) : Formotérol, Salmétérol, Indacatérol, Olodatérol, Vilantérol
- **LAMA** (anticholinergiques longue durée d'action) : Tiotropium, Glycopyrronium, Uméclidinium, Aclidinium
- **LABA+LAMA** (associations fixes) : Indacatérol/Glycopyrronium (Ultibro), Vilantérol/Uméclidinium (Anoro), Tiotropium/Olodatérol (Spiolto)

**Corticostéroïdes inhalés (CSI) — en escalade :**
- **LABA+LAMA+CSI** (triple thérapie) : Fluticasone/Uméclidinium/Vilantérol (Trelegy), Béclométasone/Formotérol/Glycopyrronium (Trimbow)
- CSI indiqués si : exacerbations fréquentes (≥2/an) et éosinophiles ≥ 300 cellules/µL
- NE PAS initier de CSI si éosinophiles < 100 ou antécédent de pneumonie à répétition

**Traitement initial recommandé :**
- Groupe A : LABA ou LAMA (au choix)
- Groupe B : LABA+LAMA
- Groupe E : LABA+LAMA (considérer LABA+LAMA+CSI si éosinophiles ≥ 300)

**Oxygénothérapie de longue durée (OLD) :**
- Indiquée si PaO2 ≤ 55 mmHg ou SaO2 ≤ 88% au repos
- Au moins 15 heures par jour pour bénéfice sur la survie
- Réévaluation à 60-90 jours

**Autres traitements :**
- Réadaptation respiratoire (exercice + éducation) : recommandée pour TOUS les patients symptomatiques
- Vaccination : grippe (annuelle), pneumocoque, COVID-19, coqueluche, zona
- Sevrage tabagique : intervention la plus efficace pour ralentir le déclin du VEMS`,
    category: 'bpco_gold',
    tags: ['bpco', 'gold', 'oxygenotherapie'],
    source: 'GOLD 2025 Report',
    sourceUrl: 'https://goldcopd.org',
    date: '2025',
    priority: 1,
  },
  {
    id: 'gold-pocket-guide-fr',
    title: 'GOLD Pocket Guide français — Points clés',
    content: `Points clés du GOLD Pocket Guide (version française) :

**Oxygénothérapie longue durée :**
- Prescrite si PaO2 ≤ 55 mmHg (ou SaO2 ≤ 88%)
- Objectif : maintenir SaO2 ≥ 90%
- Durée : au moins 15 heures par jour, idéalement en continu
- Réévaluation nécessaire après 60-90 jours

**CAT Score (COPD Assessment Test) :**
- Questionnaire de 8 items, score de 0 à 40
- Score < 10 : impact faible
- Score 10-20 : impact moyen
- Score 21-30 : impact élevé
- Score > 30 : impact très élevé
- Seuil pour symptômes significatifs : CAT ≥ 10

**mMRC (Modified Medical Research Council) :**
- Grade 0 : dyspnée à l'effort soutenu uniquement
- Grade 1 : dyspnée en marchant vite ou en montant une pente
- Grade 2 : marche plus lentement que les gens du même âge
- Grade 3 : s'arrête après 100m ou quelques minutes
- Grade 4 : trop essoufflé pour quitter la maison
- Seuil : mMRC ≥ 2 pour symptômes significatifs

**VPPNI (Ventilation à Pression Positive Non Invasive) :**
- Indiquée en cas d'exacerbation avec acidose respiratoire (pH < 7.35)
- Réduit la mortalité et le recours à l'intubation
- Peut être utilisée au long cours chez certains patients hypercapniques stables

**Soins palliatifs :**
- À envisager pour les patients BPCO très sévères avec exacerbations fréquentes
- Dyspnée terminale : morphine à faible dose, oxygénothérapie de confort (ODYSP)`,
    category: 'bpco_gold',
    tags: ['bpco', 'gold', 'oxygenotherapie', 'ventilation'],
    source: 'GOLD Pocket Guide FR',
    sourceUrl: 'https://goldcopd.org/wp-content/uploads/2016/04/wms-GOLD-2017-Pocket-Guide-Final-French.pdf',
    date: '2025',
    priority: 1,
  },
  {
    id: 'gold-classification-abe',
    title: 'Classification GOLD ABE — Évaluation combinée',
    content: `La classification GOLD ABE (introduite en 2023, affinée en 2025) remplace l'ancienne classification ABCD :

**Principes :**
1. Confirmer le diagnostic par spirométrie (VEMS/CVF < 0.70 post-BD)
2. Évaluer la sévérité de l'obstruction (GOLD 1-4)
3. Classer le patient en A, B ou E selon les symptômes et les exacerbations

**Groupe A — Faible risque, peu de symptômes :**
- mMRC 0-1 ou CAT < 10
- 0-1 exacerbation modérée par an (pas d'hospitalisation)
- Traitement : bronchodilatateur de courte ou longue durée d'action

**Groupe B — Faible risque, symptômes significatifs :**
- mMRC ≥ 2 ou CAT ≥ 10
- 0-1 exacerbation modérée par an (pas d'hospitalisation)
- Traitement : LABA+LAMA d'emblée

**Groupe E — Exacerbateur (fusion des anciens C et D) :**
- ≥ 2 exacerbations modérées par an, OU ≥ 1 hospitalisation pour exacerbation
- Quel que soit le niveau de symptômes
- Traitement : LABA+LAMA, avec CSI si éosinophiles ≥ 300/µL

**Pourquoi le changement ABCD → ABE ?**
- Simplification (3 groupes au lieu de 4)
- Meilleure identification des patients à haut risque (exacerbateurs)
- Les groupes C et D avaient des traitements similaires → fusion en E

**Prévalence en France :**
- Environ 6% des 45-65 ans
- Sous-diagnostic estimé à 2/3 des cas (seuls ~30% diagnostiqués)`,
    category: 'bpco_gold',
    tags: ['bpco', 'gold', 'spirometrie'],
    source: 'GPnotebook — Critères GOLD',
    sourceUrl: 'https://gpnotebook.com/fr/pages/pneumologie/criteres-de-linitiative-mondiale-pour-la-maladie-pulmonaire-obstructive-chronique-gold',
    date: '2025',
    priority: 1,
  },

  // 2.2 HAS
  {
    id: 'has-parcours-bpco',
    title: 'HAS — Guide du parcours de soins BPCO (10 messages clés)',
    content: `Guide du parcours de soins BPCO de la HAS — 10 messages clés :

1. **Dépistage** : Rechercher une BPCO chez tout fumeur ou ex-fumeur de plus de 40 ans avec des symptômes respiratoires (toux, expectoration, dyspnée). Questionnaire de dépistage en 5 questions.
2. **Spirométrie** : La spirométrie est indispensable au diagnostic. Un rapport VEMS/CVF < 0.70 post-bronchodilatateur confirme le diagnostic.
3. **Sevrage tabagique** : C'est la mesure LA PLUS EFFICACE pour ralentir l'évolution de la maladie. Doit être proposé à chaque consultation.
4. **Vaccinations** : Grippe (annuelle), pneumocoque (tous les 5 ans), COVID-19. Réduisent le risque d'exacerbation.
5. **Réadaptation respiratoire** : Recommandée pour TOUS les patients symptomatiques (mMRC ≥ 2 ou CAT ≥ 10). Combine exercice physique + éducation thérapeutique.
6. **Traitement inhalé** : Escalade thérapeutique progressive LABA ou LAMA → LABA+LAMA → LABA+LAMA+CSI selon le contrôle des symptômes et les exacerbations.
7. **Exacerbations** : Reconnaître et traiter précocement. Plan d'action écrit remis au patient. Antibiotiques si expectoration purulente.
8. **Coordination ville-hôpital** : Suivi partagé entre médecin traitant, pneumologue et PSAD. Dossier médical partagé.
9. **Oxygénothérapie** : Indication si insuffisance respiratoire chronique (PaO2 ≤ 55 mmHg). Minimum 15h/j.
10. **Suivi régulier** : Au minimum annuel chez le pneumologue avec EFR (spirométrie) + gazométrie. Plus fréquent si instable.`,
    category: 'bpco_has',
    tags: ['bpco', 'has', 'parcours_soins', 'spirometrie'],
    source: 'HAS — Guide parcours BPCO',
    sourceUrl: 'https://www.has-sante.fr/jcms/c_1242507/fr/guide-du-parcours-de-soins-bronchopneumopathie-chronique-obstructive-bpco',
    date: '2019',
    priority: 1,
  },
  {
    id: 'has-bpco-epidemio',
    title: 'HAS — Épidémiologie BPCO en France',
    content: `Épidémiologie de la BPCO en France (données HAS) :

**Prévalence :**
- 3,5 millions de personnes atteintes en France (estimation Santé Publique France)
- Prévalence de 7,5% chez les plus de 45 ans
- 6% chez les 45-65 ans
- Augmente avec l'âge et le tabagisme

**Mortalité :**
- Environ 19 000 décès par an liés à la BPCO en France (2013)
- 3ème cause de mortalité dans le monde (OMS)
- 3,23 millions de décès dans le monde en 2019

**Sous-diagnostic :**
- 75% des cas ne sont PAS diagnostiqués (HAS)
- Seuls 21% des patients à risque bénéficient d'un dépistage spirométrique (indicateurs Ameli)
- Le diagnostic est souvent posé tardivement, au stade d'exacerbation sévère

**Facteurs de risque :**
- Tabagisme : responsable de 90% des cas de BPCO
- Exposition professionnelle : 15-20% des cas (poussières, fumées, produits chimiques)
- Pollution atmosphérique
- Déficit en alpha-1 antitrypsine (rare, génétique)

**Impact socio-économique :**
- Coût direct estimé à 3,5 milliards d'euros par an en France
- Première cause d'arrêt maladie de longue durée en pneumologie
- Handicap fonctionnel majeur (dyspnée, intolérance à l'effort)`,
    category: 'bpco_has',
    tags: ['bpco', 'has', 'epidemiologie'],
    source: 'HAS — Guide BPCO PDF complet',
    sourceUrl: 'https://www.has-sante.fr/upload/docs/application/pdf/2020-01/app_323_guide_bpco_actu_2019_vf.pdf',
    date: '2019',
    priority: 1,
  },
  {
    id: 'has-bpco-diagnostic',
    title: 'HAS — BPCO diagnostic et prise en charge',
    content: `BPCO — Diagnostic et prise en charge selon la HAS :

**Diagnostic :**
- Suspicion : toux chronique, expectoration, dyspnée progressive chez un fumeur/ex-fumeur > 40 ans
- Confirmation : spirométrie avec test de réversibilité aux bronchodilatateurs
- Critère : VEMS/CVF < 0.70 post-bronchodilatateur (obstruction non complètement réversible)
- Diagnostic différentiel : asthme (réversibilité complète), insuffisance cardiaque, bronchectasies

**Prise en charge :**
- Sevrage tabagique (priorité absolue)
- Bronchodilatateurs inhalés (base du traitement)
- Réadaptation respiratoire (exercice + éducation)
- Vaccination (grippe, pneumocoque)
- Traitement des comorbidités (cardiovasculaires, diabète, dépression, ostéoporose)
- Oxygénothérapie si insuffisance respiratoire chronique

**Complications :**
- Exacerbations aiguës (EABPCO) : aggravation des symptômes nécessitant une modification du traitement
- Insuffisance respiratoire chronique (IRC) : nécessitant oxygénothérapie et/ou ventilation
- Cœur pulmonaire chronique (HTAP, insuffisance cardiaque droite)
- Pneumothorax
- Dénutrition et sarcopénie

**Impact socioprofessionnel :**
- La BPCO est une cause majeure d'invalidité professionnelle
- Adaptation du poste de travail souvent nécessaire
- ALD 30 (Affection de Longue Durée) pour la BPCO sévère`,
    category: 'bpco_has',
    tags: ['bpco', 'has', 'spirometrie', 'parcours_soins'],
    source: 'HAS — BPCO diagnostic',
    sourceUrl: 'https://www.has-sante.fr/jcms/p_3115145/fr/bpco-diagnostic-et-prise-en-charge',
    date: '2024',
    priority: 1,
  },
  {
    id: 'has-outils-parcours',
    title: 'HAS — 3 outils pour améliorer le parcours BPCO',
    content: `La HAS propose 3 outils pratiques pour améliorer le parcours de soins des patients BPCO :

**1. Questionnaire de dépistage (5 questions) :**
- Toussez-vous souvent (tous les jours) ?
- Avez-vous souvent des sécrétions bronchiques (crachats) ?
- Êtes-vous plus facilement essoufflé que les personnes de votre âge ?
- Avez-vous plus de 40 ans ?
- Fumez-vous ou avez-vous fumé ?
→ Si ≥ 3 réponses positives : proposer une spirométrie de dépistage

**2. Fiches de réhabilitation respiratoire :**
- Programme structuré d'au minimum 4-8 semaines
- Exercice physique adapté (endurance + renforcement musculaire)
- Éducation thérapeutique (connaissance de la maladie, techniques d'inhalation)
- Prise en charge psychosociale
- Peut être réalisée en centre, en ambulatoire ou à domicile

**3. Plan d'action personnalisé pour les exacerbations :**
- Document remis au patient, rédigé avec le médecin
- Décrit les signes d'alerte (augmentation de la dyspnée, expectoration purulente, fièvre)
- Détaille les mesures à prendre (augmentation des bronchodilatateurs, corticoïdes oraux, antibiotiques)
- Indique quand consulter en urgence`,
    category: 'bpco_has',
    tags: ['bpco', 'has', 'parcours_soins'],
    source: 'HAS — 3 outils parcours BPCO',
    sourceUrl: 'https://www.has-sante.fr/jcms/pprd_2974631/fr/bpco-3-outils-pour-ameliorer-le-parcours-de-soins-des-patients',
    date: '2024',
    priority: 1,
  },
  {
    id: 'has-indicateurs-qualite',
    title: 'HAS — Indicateurs de qualité du parcours BPCO',
    content: `18 indicateurs de qualité du parcours de soins BPCO définis par la HAS. Résultats nationaux (dernière évaluation) :

**Indicateurs de dépistage et diagnostic :**
- 21% des patients à risque ont bénéficié d'un dépistage spirométrique (très insuffisant)
- La spirométrie est l'examen clé sous-utilisé en ville

**Indicateurs de vaccination :**
- 53% des patients BPCO sont vaccinés contre la grippe (objectif > 75%)
- Couverture pneumococcique encore plus faible

**Indicateurs de traitement :**
- 74% des patients reçoivent des bronchodilatateurs après une hospitalisation pour exacerbation
- Taux de prescription de réadaptation respiratoire reste insuffisant

**Indicateurs de suivi :**
- EFR (spirométrie) annuelle encore insuffisamment réalisée
- Suivi de la gazométrie non systématique

**Constat principal :** 1 seul indicateur qualité sur 7 dépasse 70% en ville (HAS 2022). Cela illustre un parcours de soins très sous-optimal en France, avec un diagnostic trop tardif, des vaccinations insuffisantes et un suivi non systématique.

Ce constat est un argument fort pour les délégués : chaque prescripteur peut améliorer ces indicateurs, et les outils Air Liquide/Orkyn' (télésuivi, coordination) contribuent à cette amélioration.`,
    category: 'bpco_has',
    tags: ['bpco', 'has', 'parcours_soins', 'ameli'],
    source: 'HAS — Indicateurs qualité BPCO',
    sourceUrl: 'https://www.has-sante.fr/jcms/p_3151500/fr/patients-a-risque-ou-atteints-de-bronchopneumopathie-chronique-obstructive-bpco-indicateurs-de-qualite-du-parcours-de-soins',
    date: '2022',
    priority: 1,
  },
  {
    id: 'has-eabpco-antibio-2024',
    title: 'HAS — Exacerbations BPCO : antibiothérapie (MAJ déc. 2024)',
    content: `Mise à jour décembre 2024 de la HAS sur l'antibiothérapie dans les exacerbations aiguës de BPCO (EABPCO) :

**Définition EABPCO :** Aggravation aiguë des symptômes respiratoires au-delà des variations quotidiennes normales, nécessitant une modification du traitement.

**Critères d'Anthonisen (indication d'antibiotiques) :**
- Augmentation de la dyspnée
- Augmentation du volume de l'expectoration
- Purulence de l'expectoration (expectoration jaune-vert)
→ Antibiotiques indiqués si 2 des 3 critères présents, dont la purulence

**Stratégie antibiotique recommandée :**
- 1ère intention : Amoxicilline 3g/j pendant 5 jours
- Alternative si allergie : Pristinamycine ou Macrolide
- BPCO sévère (VEMS < 30%) : Amoxicilline-acide clavulanique ou C3G
- Durée : 5 jours (raccourcie par rapport aux anciennes recommandations)

**Critères d'hospitalisation :**
- Dyspnée de repos, SpO2 < 90%, confusion
- Échec du traitement ambulatoire
- Comorbidités sévères (insuffisance cardiaque, diabète décompensé)
- Exacerbation sévère d'emblée
- Impossibilité de prise en charge à domicile (isolement social)`,
    category: 'bpco_has',
    tags: ['bpco', 'has', 'exacerbation'],
    source: 'HAS — EABPCO antibiothérapie 2024',
    sourceUrl: 'https://www.has-sante.fr/jcms/p_3528903/fr/choix-et-durees-d-antibiotherapie-dans-les-exacerbations-aigues-de-bronchopneumopathie-chronique-obstructive-eabpco',
    date: '2024-12',
    priority: 1,
  },
  {
    id: 'has-rapport-oxygenotherapie',
    title: 'HAS — Rapport complet sur l\'oxygénothérapie',
    content: `Rapport d'évaluation de la HAS sur l'oxygénothérapie (source complète) :

**Patients sous OLD en France :** Environ 150 000 patients sous oxygénothérapie de longue durée (estimation 2024, base ~100 000 en 2010, croissance +3-5%/an). Dont ~50 000-60 000 sous oxygène liquide (LOX).

**Sources d'oxygène évaluées :**
1. Oxygène gazeux en bouteilles (200 bar) : usage historique, secours, déambulation courte
2. Oxygène liquide (cuve + portable) : solution de référence pour déambulation prolongée
3. Concentrateurs d'oxygène fixes : solution économique pour utilisation sédentaire
4. Concentrateurs portables : solution émergente pour mobilité

**Inscription LPPR :**
- Les dispositifs d'oxygénothérapie sont inscrits sur la Liste des Produits et Prestations Remboursables (LPPR)
- Forfaits hebdomadaires incluant : matériel, livraison, maintenance, astreinte 24/7
- Prescription initiale par pneumologue ou médecin d'un centre d'insuffisance respiratoire
- Renouvellement possible par le médecin traitant

**Types de forfaits :**
- Forfait oxygénothérapie à long terme (OLD) : >15h/j
- Forfait oxygénothérapie à court terme (OCT) : prescription temporaire
- Forfait de déambulation : pour l'oxygène portable
- Forfait ODYSP : oxygénothérapie dyspnée soins palliatifs`,
    category: 'oxygenotherapie',
    tags: ['oxygenotherapie', 'has', 'lppr'],
    source: 'HAS — Rapport oxygénothérapie',
    sourceUrl: 'https://www.has-sante.fr/upload/docs/application/pdf/2013-01/rapport_oxygenotherapie.pdf',
    date: '2013',
    priority: 1,
  },

  // 2.3 Indicateurs Ameli
  {
    id: 'ameli-indicateurs-bpco',
    title: 'Ameli — 7 indicateurs du parcours BPCO',
    content: `L'Assurance Maladie (Ameli) mesure 7 indicateurs clés du parcours de soins des patients BPCO :

1. **Dépistage spirométrique** : 21% des patients à risque ont bénéficié d'une spirométrie → TRÈS INSUFFISANT
2. **Vaccination antigrippale** : 53% des patients BPCO vaccinés → INSUFFISANT (objectif 75%)
3. **EFR annuelle** : Proportion de patients ayant bénéficié d'explorations fonctionnelles respiratoires dans l'année → SOUS-OPTIMAL
4. **Bronchodilatateurs post-hospitalisation** : 74% des patients reçoivent un traitement bronchodilatateur après une hospitalisation pour exacerbation → ACCEPTABLE
5. **Réadaptation respiratoire** : Taux de prescription de réhabilitation respiratoire → TRÈS INSUFFISANT
6. **Suivi pneumologue** : Proportion de patients suivis au moins annuellement par un pneumologue → VARIABLE
7. **Sevrage tabagique** : Proportion de fumeurs BPCO ayant bénéficié d'une aide au sevrage → INSUFFISANT

**Constat majeur :** 1 seul indicateur sur 7 dépasse 70% en ville. Le parcours de soins BPCO en France reste largement sous-optimal, avec un dépistage trop tardif et un suivi insuffisant.

**Opportunité pour Air Liquide / Orkyn' :** Les outils de télésuivi, la coordination ville-hôpital et l'accompagnement patient d'Orkyn' peuvent contribuer directement à améliorer ces indicateurs.`,
    category: 'bpco_has',
    tags: ['bpco', 'ameli', 'parcours_soins', 'has'],
    source: 'Indicateurs BPCO Ameli',
    sourceUrl: 'https://www.ameli.fr/medecin/exercice-liberal/prise-charge-situation-type-soin/prise-en-charge-selon-la-pathologie/bpco-indicateurs-parcours-soins-patient',
    date: '2024',
    priority: 1,
  },

  // 2.4 Synthèses cliniques
  {
    id: 'recomedicales-bpco-2025',
    title: 'RecoMédicales — BPCO 2025 (synthèse à jour)',
    content: `Synthèse actualisée BPCO 2025 (RecoMédicales) :

**Épidémiologie France :**
- 3,5 millions de personnes atteintes
- 75% sous-diagnostiquées
- Prévalence > 6% chez les 45-65 ans
- ~19 000 décès/an

**Traitements inhalés (tableau complet) :**
LABA (β2-agonistes longue durée) :
- Formotérol (Foradil, Asmelor) 12µg × 2/j
- Salmétérol (Serevent) 50µg × 2/j
- Indacatérol (Onbrez) 150-300µg × 1/j
- Olodatérol (Striverdi) 5µg × 1/j

LAMA (anticholinergiques longue durée) :
- Tiotropium (Spiriva) 18µg × 1/j ou 5µg (Respimat)
- Glycopyrronium (Seebri) 44µg × 1/j
- Uméclidinium (Incruse) 55µg × 1/j
- Aclidinium (Bretaris) 322µg × 2/j

LABA+LAMA (associations) :
- Indacatérol/Glycopyrronium (Ultibro Breezhaler)
- Vilantérol/Uméclidinium (Anoro Ellipta)
- Olodatérol/Tiotropium (Spiolto Respimat)
- Formotérol/Aclidinium (Duaklir Genuair)

Triple thérapie (LABA+LAMA+CSI) :
- Fluticasone/Uméclidinium/Vilantérol (Trelegy Ellipta)
- Béclométasone/Formotérol/Glycopyrronium (Trimbow)

**OLD (seuils) :**
- PaO2 ≤ 55 mmHg : indication formelle
- PaO2 55-60 mmHg avec signes d'hypoxie chronique : indication
- Minimum 15h/j, idéalement en continu
- ~150 000 patients sous OLD en France (2024)`,
    category: 'bpco_clinique',
    tags: ['bpco', 'oxygenotherapie'],
    source: 'RecoMédicales BPCO 2025',
    sourceUrl: 'https://recomedicales.fr/recommandations/bronchopneumopathie-chronique-obstructive/',
    date: '2025',
    priority: 1,
  },
  {
    id: 'gold-2023-resume',
    title: 'GOLD 2023 — Résumé et implications pratiques (Pr. Roche)',
    content: `Résumé des recommandations GOLD 2023 par le Pr. Nicolas Roche (Fréquence Médicale) :

**Nouvelle définition :** La BPCO est désormais définie comme une condition hétérogène caractérisée par des symptômes respiratoires chroniques, une obstruction bronchique et des anomalies structurelles des voies aériennes et/ou des alvéoles.

**Concept de pré-BPCO :** Identification de sujets à risque de développer une BPCO (fumeurs symptomatiques avec spirométrie normale). Permet une intervention précoce (sevrage tabagique).

**Télé-réadaptation :** La réadaptation respiratoire à distance (via visioconférence, applications) est reconnue comme une alternative validée quand l'accès à un centre est limité.

**Impact sur la mortalité :**
- La triple thérapie (LABA+LAMA+CSI) a démontré une réduction de la mortalité dans les études IMPACT et ETHOS
- Le bénéfice est maximal chez les patients avec éosinophiles élevés et exacerbations fréquentes

**Classification ABE :** Simplification de l'ancienne classification ABCD en ABE, fusionnant les groupes C et D en un seul groupe E (Exacerbateur), car le traitement était similaire.

**Message clé :** "Le traitement de la BPCO n'est plus seulement symptomatique — il peut influencer la mortalité."`,
    category: 'bpco_clinique',
    tags: ['bpco', 'gold'],
    source: 'Fréquence Médicale — GOLD 2023',
    sourceUrl: 'https://www.frequencemedicale.com/pneumologie/actualites/10508-Recommandations-GOLD-2023-resume-et-implications-pratiques',
    date: '2023',
    priority: 2,
  },
  {
    id: 'classification-gold-pratique',
    title: 'Classification GOLD — Utilisation pratique et eBPCO France',
    content: `Utilisation pratique de la classification GOLD en France :

**Groupes simplifiés :**
- Groupe A : Peu de symptômes, peu d'exacerbations → LABA ou LAMA seul
- Groupe B : Symptômes significatifs, peu d'exacerbations → LABA+LAMA
- Groupe E : Exacerbateur (≥2 exacerbations/an ou ≥1 hospitalisation) → LABA+LAMA ± CSI

**Exemples pratiques :**
- Patient fumeur 55 ans, toux chronique, essoufflé à la montée d'escaliers (mMRC 2), 1 exacerbation/an → Groupe B → LABA+LAMA
- Patient 68 ans, VEMS 35%, 3 exacerbations dans l'année, 1 hospitalisation → Groupe E → Triple thérapie (LABA+LAMA+CSI)
- Patient 50 ans, toux matinale, pas d'essoufflement (mMRC 0), pas d'exacerbation → Groupe A → LABA ou LAMA

**Prévalence en France :**
- 6% des 45-65 ans sont atteints de BPCO
- 2 patients sur 3 ne sont pas diagnostiqués (sous-diagnostic massif)
- eBPCO (exacerbations) : cause majeure d'hospitalisation et de mortalité

**L'eBPCO en France :**
- Chaque exacerbation accélère le déclin du VEMS
- 1 hospitalisation pour eBPCO = mortalité à 1 an de 20-25%
- Prévention : vaccination, bronchodilatateurs au long cours, réadaptation, traitement des comorbidités`,
    category: 'bpco_clinique',
    tags: ['bpco', 'gold', 'exacerbation'],
    source: 'AJPO2 — Classification GOLD',
    sourceUrl: 'https://www.ajpo2.fr/stades-bpco-classification-gold-utilisation.html',
    date: '2025',
    priority: 2,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. PAYSAGE CONCURRENTIEL
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'vivisol-france',
    title: 'Vivisol France — Concurrent direct (SOL Group)',
    content: `Vivisol France est un concurrent direct d'Air Liquide / Orkyn' dans la santé à domicile :

**Identité :**
- Filiale du groupe SOL, 3ème gazier européen (après Air Liquide et Linde)
- Groupe familial italien fondé en 1927
- Présence dans plus de 30 pays en Europe

**Services :**
- Oxygénothérapie à domicile (service historique)
- Ventilation non invasive (VNI) et PPC (apnée du sommeil)
- Troubles du sommeil (diagnostic + traitement)
- Aérosolthérapie
- Nutrition entérale et parentérale
- Télémédecine et télésuivi
- Service ViviTravel : accompagnement des patients lors de leurs déplacements et voyages (différenciateur)
- Astreinte 24h/24, 7j/7

**Points forts concurrentiels :**
- Flexibilité d'une structure familiale vs grandes corporations
- Service ViviTravel unique
- Groupe SOL = fournisseur intégré (production de gaz + prestations domicile)

**Stratégie :** Expansion par acquisition en France (notamment France Oxygène), investissement dans le numérique et la télémédecine.`,
    category: 'concurrent',
    tags: ['concurrent', 'vivisol'],
    source: 'Vivisol France',
    sourceUrl: 'https://www.vivisol.fr/',
    date: '2025',
    priority: 2,
  },
  {
    id: 'france-oxygene',
    title: 'France Oxygène — Concurrent (réseau SOL/Vivisol)',
    content: `France Oxygène est un prestataire de santé à domicile appartenant au groupe SOL (via Vivisol) :

**Identité :**
- Créé en 1996
- 75 000 patients pris en charge
- Certifié ISO 9001 (qualité)
- Réseau national de centres de distribution
- Fondation d'entreprise CAPAIR (actions de solidarité)

**Services :**
- Oxygénothérapie à domicile (OLD, OCT, déambulation)
- Ventilation (VNI, PPC)
- Troubles du sommeil
- Service ViviTravel (partagé avec Vivisol)
- Éducation thérapeutique des patients
- Département InfuSol : perfusion à domicile (diversification)

**Historique :**
- Fondé en 1996, a grandi par acquisitions successives
- Intégré au groupe SOL, partageant les ressources avec Vivisol
- Positionnement de proximité avec un maillage territorial dense

**Différenciateurs :**
- Fondation CAPAIR : image RSE forte
- InfuSol : expertise perfusion comme relais de croissance
- Certification ISO 9001 : gage de qualité processualisée`,
    category: 'concurrent',
    tags: ['concurrent', 'vivisol'],
    source: 'France Oxygène',
    sourceUrl: 'https://www.franceoxygene.fr/',
    date: '2025',
    priority: 2,
  },
  {
    id: 'marche-psad-panorama',
    title: 'Marché PSAD — Panorama et acteurs clés',
    content: `Panorama du marché des Prestataires de Santé à Domicile (PSAD) en France :

**12 acteurs clés :**
1. **Air Liquide / Orkyn'** — Leader, 180 000+ patients/jour
2. **Vivisol / France Oxygène** — 3ème gazier européen (SOL Group), 75 000 patients
3. **Bastide Le Confort Médical** — Coté en bourse, multi-activités (respiratoire, nutrition, perfusion, MAD)
4. **SOS Oxygène** — Spécialiste respiratoire historique
5. **Isis Medical** — Réseau régional, spécialiste VNI et PPC
6. **Elivie / Asdia** — Acteurs régionaux en croissance
7. **Linde Homecare** — Filiale du géant gazier Linde (possible sortie du marché français évoquée)
8. **Santé Cie** — Groupe en consolidation
9. **La Poste Santé & Autonomie** — Nouvel entrant (diversification de La Poste)
10. **Elsan Dom** — Extension des cliniques Elsan vers le domicile
11. **Libheros** — Plateforme digitale de coordination d'infirmiers
12. **LVL Médical** — Historique, réseau régional

**Tendances du marché :**
- Consolidation avancée : les gros rachètent les petits
- "Technologisation" des dispositifs médicaux : télésuivi, IA, objets connectés
- Baisses tarifaires récurrentes des forfaits LPPR (pression CNAM)
- Possible sortie de Linde du marché français (opportunité de parts de marché)
- Partenariats avec les EHPAD et les groupes de cliniques (Elsan)
- Montée en puissance de la télésurveillance (DMN : Dispositifs Médicaux Numériques)
- Rôle croissant de l'IGAS dans la régulation du secteur

**Enjeux pour Air Liquide :**
- Maintenir le leadership face à la concurrence
- Innover dans le digital (IA, télésuivi) comme différenciateur
- Gérer la pression tarifaire de l'Assurance Maladie
- Saisir les parts de marché si Linde se retire`,
    category: 'concurrent',
    tags: ['concurrent', 'vivisol', 'air_liquide'],
    source: 'Xerfi — Étude PSAD',
    sourceUrl: 'https://www.xerfi.com/presentationetude/le-marche-des-prestations-de-sante-a-domicile_SME38',
    date: '2025',
    priority: 1,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3.3 Oxygène médicinal (VIDAL)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'vidal-oxygene-medicinal',
    title: 'VIDAL — Oxygène médicinal Air Liquide (monographie)',
    content: `Fiche VIDAL de l'Oxygène médicinal Air Liquide Santé France 200 bar, gaz pour inhalation :

**Classification :** Médicament soumis à AMM (Autorisation de Mise sur le Marché)
**Forme :** Gaz pour inhalation en bouteille sous pression (200 bar)
**Principe actif :** Oxygène (O2) médicinal ≥ 99,5%

**Indications :**
- Insuffisance respiratoire aiguë et chronique
- Oxygénothérapie normobare et hyperbare
- Alimentation des respirateurs en anesthésie-réanimation

**Conditions de stockage :**
- Température ambiante (< 50°C)
- À l'abri des sources de chaleur et des flammes
- Bouteille en position verticale, fixée pour éviter les chutes
- Ne pas graisser les raccords (risque d'explosion)

**Précautions :**
- Ne jamais fumer ni approcher de flamme pendant l'utilisation
- Ventiler la pièce
- Respecter le débit prescrit
- Surveiller la saturation en oxygène (risque d'hyperoxie)

**VIDAL Recos associées :** BPCO, asthme sévère, insuffisance respiratoire, COVID-19 (formes sévères)

L'oxygène médicinal est un médicament à part entière, différent de l'oxygène industriel. Sa production, distribution et utilisation sont réglementées par l'ANSM.`,
    category: 'oxygenotherapie',
    tags: ['oxygenotherapie', 'vidal', 'air_liquide'],
    source: 'VIDAL — Oxygène médicinal AL',
    sourceUrl: 'https://www.vidal.fr/medicaments/oxygene-medicinal-air-liquide-sante-france-200-bar-gaz-p-inhal-12536.html',
    date: '2025',
    priority: 2,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. CADRE RÉGLEMENTAIRE & REMBOURSEMENT
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'lppr-explication',
    title: 'LPPR (LPP) — Liste des Produits et Prestations Remboursables',
    content: `La LPPR (Liste des Produits et Prestations Remboursables), désormais appelée LPP, est le catalogue des dispositifs médicaux et prestations remboursés par l'Assurance Maladie :

**Processus d'inscription :**
1. Le fabricant/prestataire dépose un dossier auprès de la HAS
2. La CNEDiMTS (Commission Nationale d'Évaluation des Dispositifs Médicaux et Technologies de Santé) évalue le service attendu (SA) et l'amélioration du service attendu (ASA)
3. Le CEPS (Comité Économique des Produits de Santé) négocie le tarif
4. Inscription pour 5 ans, avec renouvellement

**Structure de la LPPR :**
- Titre I : Dispositifs médicaux pour traitements et matériels d'aide à la vie
- Titre II : Orthèses et prothèses externes
- Titre III : Dispositifs médicaux implantables
- Titre IV : Véhicules pour handicapés physiques

**L'oxygénothérapie dans la LPPR :**
- Les forfaits d'oxygénothérapie sont inscrits au Titre I
- Forfaits hebdomadaires incluant matériel + prestations + astreinte
- Prescription initiale par pneumologue, renouvellement par médecin traitant
- Remboursement à 60% par l'Assurance Maladie, complément par la mutuelle
- En ALD (BPCO sévère) : prise en charge à 100%`,
    category: 'lppr_remboursement',
    tags: ['lppr', 'reglementation', 'oxygenotherapie'],
    source: 'VIDAL — Qu\'est-ce que la LPPR',
    sourceUrl: 'https://www.vidal.fr/parapharmacie/utilisation/regles-bon-usage-parapharmacie/lppr.html',
    date: '2025',
    priority: 1,
  },
  {
    id: 'tarifs-oxygenotherapie',
    title: 'Tarifs de l\'oxygénothérapie (remboursement)',
    content: `Tarifs et remboursement de l'oxygénothérapie en France :

**Forfaits hebdomadaires oxygénothérapie :**
- O2 courte durée (OCT) : 44,46 €/semaine (code LPP 1128104)
- Les forfaits incluent : le matériel (concentrateur ou bouteille), la livraison, l'installation, la maintenance, l'astreinte 24/7, les consommables (tubulure, lunettes nasales, humidificateur)

**Forfaits OLD (Oxygénothérapie Longue Durée) :**
- Forfait fixe (concentrateur) : forfait hebdomadaire
- Forfait liquide (cuve + portable) : forfait hebdomadaire majoré (coût de production et livraison)
- Forfait de déambulation : supplément pour source portable

**Forfait ODYSP :** Forfait spécifique pour l'oxygénothérapie dans la dyspnée des soins palliatifs

**Remboursement :**
- Base : 60% par l'Assurance Maladie
- Complément : 40% par la mutuelle/complémentaire santé
- ALD 30 (BPCO sévère, insuffisance respiratoire chronique) : 100% Assurance Maladie
- Le ticket modérateur est supprimé pour les patients en ALD

**Contexte économique :**
- Les tarifs LPPR font l'objet de baisses tarifaires régulières imposées par la CNAM
- Les PSAD doivent optimiser leurs coûts pour maintenir leurs marges
- Le volume de patients sous OLD est en croissance constante (vieillissement de la population, augmentation de la BPCO)`,
    category: 'lppr_remboursement',
    tags: ['lppr', 'oxygenotherapie', 'reglementation'],
    source: 'Altivie — Matériel médical remboursé',
    sourceUrl: 'https://www.altivie.fr/article/liste-materiel-medical-rembourse',
    date: '2025',
    priority: 2,
  },
  {
    id: 'arrete-o2-2015',
    title: 'Arrêté oxygénothérapie 2015 — Nomenclature LPPR',
    content: `Arrêté du 23 février 2015 modifiant la nomenclature de l'oxygénothérapie dans la LPPR (Légifrance) :

**Modifications clés :**
- Révision des forfaits OCT (Oxygénothérapie Courte Durée) : durée maximale de prescription et conditions de renouvellement
- Révision des forfaits OLD (Oxygénothérapie Longue Durée) : critères d'éligibilité précisés (PaO2 ≤ 55 mmHg, ou 55-60 avec signes associés)
- Forfaits de déambulation : conditions d'attribution pour l'oxygène portable (patient mobile, nécessité médicale documentée)
- Création du forfait ODYSP : Oxygénothérapie pour la Dyspnée en Soins Palliatifs — permet la prescription d'O2 pour le confort du patient en fin de vie, sans les critères habituels de PaO2

**Impact pour les PSAD :**
- Clarification des critères de prescription et de renouvellement
- Encadrement plus strict des forfaits de déambulation
- Nouvelles opportunités avec le forfait ODYSP (soins palliatifs)
- Nécessité d'adapter les processus administratifs et de formation des équipes`,
    category: 'reglementation',
    tags: ['reglementation', 'lppr', 'oxygenotherapie'],
    source: 'Légifrance — Arrêté oxygénothérapie 2015',
    sourceUrl: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000030289820',
    date: '2015',
    priority: 2,
  },
  {
    id: 'arrete-ppc-2017',
    title: 'Arrêté PPC apnée du sommeil 2017 — Télésuivi obligatoire',
    content: `Arrêté du 13 décembre 2017 concernant la PPC (Pression Positive Continue) pour l'apnée du sommeil (Légifrance) :

**Contexte :** L'apnée du sommeil (Syndrome d'Apnées-Hypopnées Obstructives du Sommeil — SAHOS) touche environ 4% de la population française. Le traitement de référence est la PPC.

**Dispositions clés :**
- Procédure d'inscription de la PPC sur la LPPR
- **Télésuivi obligatoire** : les appareils de PPC doivent être équipés d'un module de télétransmission
- Le remboursement est conditionné à l'observance : le patient doit utiliser la PPC au moins 4 heures par nuit, pendant au moins 20 jours sur 28
- Le PSAD doit assurer le suivi de l'observance via le télésuivi et intervenir en cas de non-observance

**Forfaits associés respiratoire :**
- Forfait PPC : inclut l'appareil, le masque, le télésuivi, les visites de suivi
- Forfait humidificateur chauffant (si nécessaire)
- Forfait de renouvellement des consommables (masques, filtres, tubulures)

**Impact pour les PSAD :**
- Le télésuivi est devenu un élément central du modèle économique PPC
- Les PSAD doivent investir dans les plateformes de télésurveillance
- La conditionnalité du remboursement à l'observance crée un enjeu d'accompagnement patient
- C'est un précédent pour la possible extension du télésuivi à d'autres pathologies (VNI, OLD)`,
    category: 'reglementation',
    tags: ['reglementation', 'sommeil', 'telesuivi', 'lppr'],
    source: 'Légifrance — Arrêté PPC 2017',
    sourceUrl: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000036209897',
    date: '2017',
    priority: 2,
  },
  {
    id: 'fedepsad-phrv',
    title: 'FEDEPSAD — Gestion patients PHRV et coordination ARS',
    content: `Communiqué de la FEDEPSAD (Fédération des Prestataires de Santé à Domicile) :

**Gestion des patients PHRV (Patients Hautement à Risque Vital) :**
- Les patients PHRV dépendent d'un dispositif médical vital à domicile (ventilateur, oxygène)
- Le PSAD doit assurer une continuité de soins absolue :
  - Sources de secours d'oxygène (bouteilles de backup en cas de panne)
  - Batteries pour les ventilateurs (autonomie suffisante en cas de coupure de courant)
  - Astreinte 24/7 avec intervention rapide

**Coordination avec les ARS :**
- Les ARS (Agences Régionales de Santé) coordonnent les plans de secours pour les patients PHRV
- Signalement obligatoire des patients PHRV auprès de l'ARS et d'ENEDIS (gestionnaire du réseau électrique)
- En cas de canicule, tempête, coupure prolongée : activation du plan de secours avec évacuation possible

**Enjeu pour les PSAD :**
- La gestion des patients PHRV est un indicateur de qualité majeur
- Les protocoles de sécurité doivent être régulièrement testés et mis à jour
- La traçabilité des interventions et des dispositifs de secours est obligatoire`,
    category: 'reglementation',
    tags: ['reglementation', 'oxygenotherapie', 'ventilation'],
    source: 'FEDEPSAD — Communiqué',
    sourceUrl: 'https://www.vivisol.fr/w/fedepsad-communiqu%C3%A9-de-presse',
    date: '2025',
    priority: 2,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. DONNÉES ÉPIDÉMIOLOGIQUES CLÉS
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'epidemio-bpco-france',
    title: 'Données épidémiologiques BPCO — France et Monde',
    content: `Données épidémiologiques clés de la BPCO :

**France :**
- 3,5 millions de personnes atteintes de BPCO (Santé Publique France)
- 75% sous-diagnostiquées (seuls ~30% des cas sont identifiés)
- Prévalence > 6% chez les 45-65 ans
- ~19 000 décès par an liés à la BPCO (2013)
- ~150 000 patients sous oxygénothérapie longue durée (OLD, estimation 2024)
- Dont 50 000-60 000 sous oxygène liquide (LOX)
- Tabagisme = cause de 90% des cas de BPCO
- 1 seul indicateur qualité sur 7 dépasse 70% en ville (HAS 2022)
- Coût direct : ~3,5 milliards d'euros par an
- 7,5% des plus de 45 ans touchés
- 1ère cause d'arrêt maladie de longue durée en pneumologie

**Monde :**
- 3,23 millions de décès dans le monde en 2019 (OMS)
- 3ème cause de mortalité mondiale
- +23% de cas de BPCO attendus d'ici 2050 (projections OMS/ERS)
- 480 millions de personnes touchées dans le monde
- Le tabac est le facteur de risque principal, mais la pollution de l'air intérieur (biomasse) est majeure dans les pays en développement
- Le fardeau de la BPCO augmente à cause du vieillissement de la population et de l'exposition cumulée au tabac

**Tendances :**
- Incidence en hausse constante chez les femmes (rattrapage du tabagisme féminin)
- Vieillissement de la population = plus de patients sévères
- Le dépistage précoce reste le principal levier d'amélioration
- La télémédecine et le télésuivi ouvrent de nouvelles possibilités de prise en charge`,
    category: 'epidemiologie',
    tags: ['bpco', 'epidemiologie'],
    source: 'Synthèse multi-sources (Santé Publique France, OMS, HAS, ERS)',
    sourceUrl: 'https://www.has-sante.fr/upload/docs/application/pdf/2020-01/app_323_guide_bpco_actu_2019_vf.pdf',
    date: '2025',
    priority: 1,
  },
  {
    id: 'epidemio-oxygenotherapie',
    title: 'Données épidémiologiques — Oxygénothérapie en France',
    content: `Données clés sur l'oxygénothérapie en France :

**Patients sous oxygénothérapie :**
- ~150 000 patients sous OLD (Oxygénothérapie de Longue Durée) en France (estimation 2024)
- Dont ~50 000-60 000 sous oxygène liquide (LOX)
- Croissance constante (+3-5% par an depuis 2006)
- Principales pathologies : BPCO (50-60%), fibrose pulmonaire (15-20%), insuffisance cardiaque (10%), autres (10-15%)

**Marché de l'oxygénothérapie à domicile :**
- Marché estimé à environ 800 millions d'euros en France (forfaits OLD+OCT+ODYSP)
- Air Liquide (~40M€ CA O2 pur, ~55% de part de marché O2, couvrant ~80 000 patients OLD)
- ~3 200 pneumologues en France (60% hospitaliers, 25% libéraux, 15% mixtes)
- Concurrents principaux : Vivisol/France Oxygène (~7%), SOS Oxygène (~7%), Isis/Elivie (~10%), Linde (~4%)
- Croissance tirée par le vieillissement et l'augmentation de la BPCO

**Tendances :**
- Transition progressive des bouteilles vers les concentrateurs (coût moindre)
- Développement des concentrateurs portables (mobilité patient)
- Pression tarifaire de l'Assurance Maladie sur les forfaits LPPR
- Intégration du télésuivi dans le suivi de l'oxygénothérapie (saturation en oxygène à distance)
- Émergence de l'oxygénothérapie haut débit à domicile pour certains patients`,
    category: 'epidemiologie',
    tags: ['oxygenotherapie', 'epidemiologie', 'lppr'],
    source: 'Synthèse multi-sources (HAS, CNAM, Xerfi)',
    sourceUrl: 'https://www.has-sante.fr/upload/docs/application/pdf/2013-01/rapport_oxygenotherapie.pdf',
    date: '2025',
    priority: 1,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTIQUES DE LA BASE
// ═══════════════════════════════════════════════════════════════════════════════

export function getKnowledgeBaseStats() {
  const chunks = KNOWLEDGE_CHUNKS;
  const sources = KNOWLEDGE_SOURCES;

  const byCategory: Record<string, number> = {};
  const byTag: Record<string, number> = {};
  let totalChars = 0;

  for (const chunk of chunks) {
    byCategory[chunk.category] = (byCategory[chunk.category] || 0) + 1;
    for (const tag of chunk.tags) {
      byTag[tag] = (byTag[tag] || 0) + 1;
    }
    totalChars += chunk.content.length;
  }

  return {
    totalChunks: chunks.length,
    totalSources: sources.length,
    totalCharacters: totalChars,
    estimatedTokens: Math.round(totalChars / 4),
    byCategory,
    byTag,
    priorityCounts: {
      p1: chunks.filter(c => c.priority === 1).length,
      p2: chunks.filter(c => c.priority === 2).length,
      p3: chunks.filter(c => c.priority === 3).length,
    },
    downloadableSources: sources.filter(s => s.downloadable).length,
  };
}
