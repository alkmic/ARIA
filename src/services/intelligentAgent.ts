import { DataService } from './dataService';
import type { PractitionerProfile } from '../types/database';

/**
 * Service d'agent intelligent pour le Coach IA
 * Système à 2 étapes :
 * 1. Analyser la question → identifier praticien + type d'info
 * 2. Récupérer données ciblées → générer réponse
 */

export interface QueryAnalysis {
  practitionerName?: string;
  practitionerId?: string;
  infoType: 'publications' | 'news' | 'notes' | 'contact' | 'metrics' | 'all' | 'general';
  context: string;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  context: string;
  error?: string;
}

/**
 * Étape 1 : Analyser la question pour identifier ce qui est demandé
 */
export function analyzeQuery(question: string): QueryAnalysis {
  const lowerQuestion = question.toLowerCase();

  // Détection du type d'information demandée
  let infoType: QueryAnalysis['infoType'] = 'general';

  if (lowerQuestion.includes('publication') || lowerQuestion.includes('publié') || lowerQuestion.includes('article')) {
    infoType = 'publications';
  } else if (lowerQuestion.includes('actualité') || lowerQuestion.includes('news') || lowerQuestion.includes('récent')) {
    infoType = 'news';
  } else if (lowerQuestion.includes('note') || lowerQuestion.includes('visite') || lowerQuestion.includes('historique')) {
    infoType = 'notes';
  } else if (lowerQuestion.includes('adresse') || lowerQuestion.includes('email') || lowerQuestion.includes('téléphone') || lowerQuestion.includes('contact')) {
    infoType = 'contact';
  } else if (lowerQuestion.includes('volume') || lowerQuestion.includes('fidélité') || lowerQuestion.includes('vingtile') || lowerQuestion.includes('métrique')) {
    infoType = 'metrics';
  } else if (lowerQuestion.includes('que sais-tu') || lowerQuestion.includes('tout sur') || lowerQuestion.includes('profil')) {
    infoType = 'all';
  }

  // Recherche du praticien mentionné
  let practitionerName: string | undefined;
  let practitionerId: string | undefined;

  // Recherche floue
  const matches = DataService.fuzzySearchPractitioner(question);
  if (matches.length > 0) {
    const practitioner = matches[0];
    practitionerName = `${practitioner.firstName} ${practitioner.lastName}`;
    practitionerId = practitioner.id;
  }

  return {
    practitionerName,
    practitionerId,
    infoType,
    context: question,
  };
}

/**
 * Étape 2 : Récupérer les données ciblées selon l'analyse
 */
export function fetchTargetedData(analysis: QueryAnalysis): AgentResponse {
  // Si aucun praticien n'est identifié, retourner une requête générale
  if (!analysis.practitionerId) {
    return {
      success: false,
      context: 'Aucun praticien spécifique identifié dans la question.',
      error: 'Veuillez préciser le nom du praticien.',
    };
  }

  const practitioner = DataService.getPractitionerById(analysis.practitionerId);

  if (!practitioner) {
    return {
      success: false,
      context: `Praticien ${analysis.practitionerName} introuvable.`,
      error: 'Praticien non trouvé dans la base de données.',
    };
  }

  // Construire le contexte ciblé selon le type d'information
  let targetedContext = '';

  switch (analysis.infoType) {
    case 'publications':
    case 'news':
      // Actualités et publications
      targetedContext = buildNewsContext(practitioner);
      break;

    case 'notes':
      // Notes de visite
      targetedContext = buildNotesContext(practitioner);
      break;

    case 'contact':
      // Informations de contact
      targetedContext = buildContactContext(practitioner);
      break;

    case 'metrics':
      // Métriques business
      targetedContext = buildMetricsContext(practitioner);
      break;

    case 'all':
      // Tout (contexte complet)
      targetedContext = DataService.getCompletePractitionerContext(practitioner.id);
      break;

    default:
      // Contexte général
      targetedContext = DataService.getCompletePractitionerContext(practitioner.id);
  }

  return {
    success: true,
    data: practitioner,
    context: targetedContext,
  };
}

/**
 * Construire le contexte pour les actualités/publications
 */
function buildNewsContext(practitioner: PractitionerProfile): string {
  let context = `
╔════════════════════════════════════════════════════════════════════════════╗
║ ACTUALITÉS & PUBLICATIONS - ${practitioner.title} ${practitioner.firstName} ${practitioner.lastName}
╚════════════════════════════════════════════════════════════════════════════╝

📋 INFORMATIONS PRATICIEN :
- Identité : ${practitioner.title} ${practitioner.firstName} ${practitioner.lastName}
- Spécialité : ${practitioner.specialty}${practitioner.subSpecialty ? ` (${practitioner.subSpecialty})` : ''}
- Statut : ${practitioner.metrics.isKOL ? '⭐ KEY OPINION LEADER (KOL)' : 'Praticien standard'}
- Ville : ${practitioner.address.city}

📰 ACTUALITÉS & PUBLICATIONS (${practitioner.news.length}) :
`;

  if (practitioner.news.length > 0) {
    practitioner.news.forEach((news, idx) => {
      context += `\n${idx + 1}. [${new Date(news.date).toLocaleDateString('fr-FR')}] ${news.title}\n`;
      context += `   Type : ${news.type}\n`;
      context += `   ${news.content}\n`;
      if (news.relevance) {
        context += `   ${news.relevance}\n`;
      }
      if (news.source) {
        context += `   Source : ${news.source}\n`;
      }
    });
  } else {
    context += '\nAucune actualité ou publication récente enregistrée pour ce praticien.\n';
  }

  context += `\n═══════════════════════════════════════════════════════════════════════════\n`;
  return context;
}

/**
 * Construire le contexte pour les notes de visite
 */
function buildNotesContext(practitioner: PractitionerProfile): string {
  let context = `
╔════════════════════════════════════════════════════════════════════════════╗
║ NOTES DE VISITE - ${practitioner.title} ${practitioner.firstName} ${practitioner.lastName}
╚════════════════════════════════════════════════════════════════════════════╝

📋 INFORMATIONS PRATICIEN :
- Identité : ${practitioner.title} ${practitioner.firstName} ${practitioner.lastName}
- Spécialité : ${practitioner.specialty}
- Ville : ${practitioner.address.city}
- Dernière visite : ${practitioner.lastVisitDate ? new Date(practitioner.lastVisitDate).toLocaleDateString('fr-FR') : 'Jamais visité'}

📝 NOTES DE VISITE (${practitioner.notes.length}) :
`;

  if (practitioner.notes.length > 0) {
    practitioner.notes.forEach((note, idx) => {
      context += `\n${idx + 1}. [${new Date(note.date).toLocaleDateString('fr-FR')}] ${note.type.toUpperCase()}\n`;
      context += `   Auteur : ${note.author}\n`;
      context += `   ${note.content}\n`;
      if (note.nextAction) {
        context += `   ➡️ Action suivante : ${note.nextAction}\n`;
      }
    });
  } else {
    context += '\nAucune note de visite enregistrée pour ce praticien.\n';
  }

  context += `\n═══════════════════════════════════════════════════════════════════════════\n`;
  return context;
}

/**
 * Construire le contexte pour les informations de contact
 */
function buildContactContext(practitioner: PractitionerProfile): string {
  return `
╔════════════════════════════════════════════════════════════════════════════╗
║ COORDONNÉES - ${practitioner.title} ${practitioner.firstName} ${practitioner.lastName}
╚════════════════════════════════════════════════════════════════════════════╝

📋 INFORMATIONS PRATICIEN :
- Identité complète : ${practitioner.title} ${practitioner.firstName} ${practitioner.lastName}
- Spécialité : ${practitioner.specialty}${practitioner.subSpecialty ? ` (${practitioner.subSpecialty})` : ''}

📍 ADRESSE & CONTACT :
- Adresse complète : ${practitioner.address.street}, ${practitioner.address.postalCode} ${practitioner.address.city}
- Pays : ${practitioner.address.country}
- Coordonnées GPS : ${practitioner.address.coords.lat.toFixed(6)}, ${practitioner.address.coords.lng.toFixed(6)}
- Email : ${practitioner.contact.email}
- Téléphone : ${practitioner.contact.phone}${practitioner.contact.mobile ? `\n- Mobile : ${practitioner.contact.mobile}` : ''}${practitioner.contact.fax ? `\n- Fax : ${practitioner.contact.fax}` : ''}

═══════════════════════════════════════════════════════════════════════════
`;
}

/**
 * Construire le contexte pour les métriques
 */
function buildMetricsContext(practitioner: PractitionerProfile): string {
  const today = new Date();
  const daysSinceVisit = practitioner.lastVisitDate
    ? Math.floor((today.getTime() - new Date(practitioner.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  return `
╔════════════════════════════════════════════════════════════════════════════╗
║ MÉTRIQUES BUSINESS - ${practitioner.title} ${practitioner.firstName} ${practitioner.lastName}
╚════════════════════════════════════════════════════════════════════════════╝

📋 INFORMATIONS PRATICIEN :
- Identité : ${practitioner.title} ${practitioner.firstName} ${practitioner.lastName}
- Spécialité : ${practitioner.specialty}
- Ville : ${practitioner.address.city}
- Statut : ${practitioner.metrics.isKOL ? '⭐ KEY OPINION LEADER (KOL)' : 'Praticien standard'}

📊 MÉTRIQUES BUSINESS :
- Volume annuel : ${(practitioner.metrics.volumeL / 1000).toFixed(1)}K L/an
- Volume mensuel moyen : ${(practitioner.metrics.volumeMonthly / 1000).toFixed(1)}K L/mois
- Score de fidélité : ${practitioner.metrics.loyaltyScore}/10
- Vingtile : ${practitioner.metrics.vingtile} (${practitioner.metrics.vingtile <= 5 ? 'TOP PRESCRIPTEUR' : practitioner.metrics.vingtile <= 10 ? 'Gros prescripteur' : 'Prescripteur moyen'})
- Potentiel de croissance : +${practitioner.metrics.potentialGrowth}%
- Risque de churn : ${practitioner.metrics.churnRisk === 'low' ? '🟢 FAIBLE' : practitioner.metrics.churnRisk === 'medium' ? '🟡 MOYEN' : '🔴 ÉLEVÉ'}

📅 HISTORIQUE :
- Dernière visite : ${practitioner.lastVisitDate ? new Date(practitioner.lastVisitDate).toLocaleDateString('fr-FR') : 'Jamais visité'} (il y a ${daysSinceVisit} jours)
- Prochaine visite planifiée : ${practitioner.nextScheduledVisit ? new Date(practitioner.nextScheduledVisit).toLocaleDateString('fr-FR') : 'Non planifiée'}
- Nombre de visites enregistrées : ${practitioner.visitHistory.length}
- Priorité de visite : ${practitioner.metrics.isKOL && daysSinceVisit > 60 ? '🔴 TRÈS URGENT' : daysSinceVisit > 90 ? '🟠 URGENT' : daysSinceVisit > 60 ? '🟡 MOYEN' : '🟢 Normal'}

═══════════════════════════════════════════════════════════════════════════
`;
}

/**
 * Fonction principale : Pipeline complet de l'agent
 */
export function processIntelligentQuery(question: string): AgentResponse {
  // Étape 1 : Analyser la question
  const analysis = analyzeQuery(question);

  // Étape 2 : Récupérer les données ciblées
  const response = fetchTargetedData(analysis);

  return response;
}
