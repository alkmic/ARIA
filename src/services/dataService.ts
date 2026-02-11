import { practitionersDB } from '../data/practitionersDatabase';
import type { PractitionerProfile, PractitionerNote, PractitionerNews, VisitRecord } from '../types/database';

/**
 * Service centralisé pour accéder aux données
 * Utilisé par le frontend ET le LLM pour garantir la cohérence
 */

export class DataService {
  /**
   * Récupère tous les praticiens
   */
  static getAllPractitioners(): PractitionerProfile[] {
    return practitionersDB.practitioners;
  }

  /**
   * Récupère un praticien par son ID
   */
  static getPractitionerById(id: string): PractitionerProfile | undefined {
    return practitionersDB.practitioners.find(p => p.id === id);
  }

  /**
   * Recherche un praticien par nom (nom ou prénom)
   */
  static searchPractitionerByName(query: string): PractitionerProfile | undefined {
    const lowerQuery = query.toLowerCase();
    return practitionersDB.practitioners.find(p =>
      p.lastName.toLowerCase().includes(lowerQuery) ||
      p.firstName.toLowerCase().includes(lowerQuery) ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Récupère toutes les notes d'un praticien
   */
  static getPractitionerNotes(practitionerId: string): PractitionerNote[] {
    const practitioner = this.getPractitionerById(practitionerId);
    return practitioner?.notes || [];
  }

  /**
   * Récupère toutes les actualités d'un praticien
   */
  static getPractitionerNews(practitionerId: string): PractitionerNews[] {
    const practitioner = this.getPractitionerById(practitionerId);
    return practitioner?.news || [];
  }

  /**
   * Récupère l'historique de visites d'un praticien
   */
  static getPractitionerVisitHistory(practitionerId: string): VisitRecord[] {
    const practitioner = this.getPractitionerById(practitionerId);
    return practitioner?.visitHistory || [];
  }

  /**
   * Récupère le contexte complet d'un praticien pour le LLM
   */
  static getCompletePractitionerContext(practitionerId: string): string {
    const p = this.getPractitionerById(practitionerId);
    if (!p) return '';

    const today = new Date();
    const lastVisit = p.lastVisitDate
      ? new Date(p.lastVisitDate).toLocaleDateString('fr-FR')
      : 'jamais visité';
    const daysSinceVisit = p.lastVisitDate
      ? Math.floor((today.getTime() - new Date(p.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    let context = `
╔════════════════════════════════════════════════════════════════════════════╗
║ FICHE COMPLÈTE - ${p.title} ${p.firstName} ${p.lastName}
╚════════════════════════════════════════════════════════════════════════════╝

INFORMATIONS PERSONNELLES :
- Identité complète : ${p.title} ${p.firstName} ${p.lastName}
- Spécialité : ${p.specialty}${p.subSpecialty ? ` (${p.subSpecialty})` : ''}
- Statut : ${p.metrics.isKOL ? 'KEY OPINION LEADER (KOL)' : 'Praticien standard'}

ADRESSE & CONTACT :
- Adresse complète : ${p.address.street}, ${p.address.postalCode} ${p.address.city}
- Coordonnées GPS : ${p.address.coords.lat.toFixed(6)}, ${p.address.coords.lng.toFixed(6)}
- Email : ${p.contact.email}
- Téléphone : ${p.contact.phone}${p.contact.mobile ? `\n- Mobile : ${p.contact.mobile}` : ''}

MÉTRIQUES BUSINESS :
- Volume annuel : ${(p.metrics.volumeL / 1000).toFixed(1)}K L/an (${(p.metrics.volumeMonthly / 1000).toFixed(1)}K L/mois)
- Score de fidélité : ${p.metrics.loyaltyScore}/10
- Vingtile : ${p.metrics.vingtile} (${p.metrics.vingtile <= 5 ? 'TOP PRESCRIPTEUR' : p.metrics.vingtile <= 10 ? 'Gros prescripteur' : 'Prescripteur moyen'})
- Potentiel de croissance : +${p.metrics.potentialGrowth}%
- Risque de churn : ${p.metrics.churnRisk === 'low' ? 'FAIBLE' : p.metrics.churnRisk === 'medium' ? 'MOYEN' : 'ÉLEVÉ'}

HISTORIQUE DE RELATION :
- Dernière visite : ${lastVisit} (il y a ${daysSinceVisit} jours)
- Prochaine visite planifiée : ${p.nextScheduledVisit ? new Date(p.nextScheduledVisit).toLocaleDateString('fr-FR') : 'Non planifiée'}
- Priorité de visite : ${p.metrics.isKOL && daysSinceVisit > 60 ? 'TRÈS URGENT' : daysSinceVisit > 90 ? 'URGENT' : daysSinceVisit > 60 ? 'MOYEN' : 'Normal'}
`;

    // Actualités/Publications
    if (p.news && p.news.length > 0) {
      context += `\nACTUALITÉS & PUBLICATIONS (${p.news.length}) :\n`;
      p.news.forEach((news, idx) => {
        context += `\n${idx + 1}. [${new Date(news.date).toLocaleDateString('fr-FR')}] ${news.title}\n`;
        context += `   Type : ${news.type}\n`;
        context += `   ${news.content}\n`;
        if (news.relevance) {
          context += `   ${news.relevance}\n`;
        }
      });
    } else {
      context += `\nACTUALITÉS & PUBLICATIONS : Aucune actualité récente enregistrée\n`;
    }

    // Notes de visite
    if (p.notes && p.notes.length > 0) {
      context += `\nNOTES DE VISITE (${p.notes.length} dernières notes) :\n`;
      p.notes.slice(0, 5).forEach((note, idx) => {
        context += `\n${idx + 1}. [${new Date(note.date).toLocaleDateString('fr-FR')}] ${note.type.toUpperCase()}\n`;
        context += `   ${note.content}\n`;
        if (note.nextAction) {
          context += `   -> Action suivante : ${note.nextAction}\n`;
        }
      });
    } else {
      context += `\nNOTES DE VISITE : Aucune note enregistrée\n`;
    }

    // Historique de visites
    if (p.visitHistory && p.visitHistory.length > 0) {
      context += `\nHISTORIQUE DE VISITES (${p.visitHistory.length} visites) :\n`;
      p.visitHistory.slice(0, 3).forEach((visit, idx) => {
        context += `   ${idx + 1}. ${new Date(visit.date).toLocaleDateString('fr-FR')}`;
        if (visit.duration) {
          context += ` (${visit.duration}min)`;
        }
        if (visit.productsDiscussed && visit.productsDiscussed.length > 0) {
          context += ` - Produits : ${visit.productsDiscussed.join(', ')}`;
        }
        context += `\n`;
      });
    }

    context += `\n═══════════════════════════════════════════════════════════════════════════\n`;

    return context;
  }

  /**
   * Recherche floue de praticiens (pour le LLM)
   */
  static fuzzySearchPractitioner(query: string): PractitionerProfile[] {
    const lowerQuery = query.toLowerCase();
    return practitionersDB.practitioners.filter(p => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const reverseName = `${p.lastName} ${p.firstName}`.toLowerCase();
      return (
        fullName.includes(lowerQuery) ||
        reverseName.includes(lowerQuery) ||
        p.lastName.toLowerCase().includes(lowerQuery) ||
        p.firstName.toLowerCase().includes(lowerQuery) ||
        p.address.city.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Récupère les top KOLs
   */
  static getKOLs(): PractitionerProfile[] {
    return practitionersDB.practitioners
      .filter(p => p.metrics.isKOL)
      .sort((a, b) => b.metrics.volumeL - a.metrics.volumeL);
  }

  /**
   * Récupère les praticiens à risque
   */
  static getAtRiskPractitioners(): PractitionerProfile[] {
    return practitionersDB.practitioners
      .filter(p => p.metrics.churnRisk === 'high' || (p.metrics.isKOL && p.metrics.churnRisk === 'medium'))
      .sort((a, b) => b.metrics.volumeL - a.metrics.volumeL);
  }

  /**
   * Recherche de news/publications à travers TOUS les praticiens
   * Permet de répondre à "dernière publication du Dr X" ou "toutes les publications des Bernard"
   */
  static searchNews(query: string): { practitioner: PractitionerProfile; news: PractitionerNews }[] {
    const lowerQuery = query.toLowerCase();
    const results: { practitioner: PractitionerProfile; news: PractitionerNews }[] = [];

    for (const p of practitionersDB.practitioners) {
      if (!p.news || p.news.length === 0) continue;

      // Check if query matches practitioner name
      const nameMatch =
        p.firstName.toLowerCase().includes(lowerQuery) ||
        p.lastName.toLowerCase().includes(lowerQuery) ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(lowerQuery) ||
        `${p.lastName} ${p.firstName}`.toLowerCase().includes(lowerQuery);

      // Check each news item
      for (const news of p.news) {
        const newsMatch =
          news.title.toLowerCase().includes(lowerQuery) ||
          news.content.toLowerCase().includes(lowerQuery) ||
          news.type.toLowerCase().includes(lowerQuery) ||
          (news.source && news.source.toLowerCase().includes(lowerQuery));

        if (nameMatch || newsMatch) {
          results.push({ practitioner: p, news });
        }
      }
    }

    // Sort by date descending (most recent first)
    return results.sort((a, b) => new Date(b.news.date).getTime() - new Date(a.news.date).getTime());
  }

  /**
   * Recherche de news par type à travers tous les praticiens
   */
  static searchNewsByType(type: PractitionerNews['type']): { practitioner: PractitionerProfile; news: PractitionerNews }[] {
    const results: { practitioner: PractitionerProfile; news: PractitionerNews }[] = [];

    for (const p of practitionersDB.practitioners) {
      if (!p.news) continue;
      for (const news of p.news) {
        if (news.type === type) {
          results.push({ practitioner: p, news });
        }
      }
    }

    return results.sort((a, b) => new Date(b.news.date).getTime() - new Date(a.news.date).getTime());
  }

  /**
   * Digest formaté de toutes les actualités pour injection dans le contexte LLM
   * Utilisé par le Coach IA pour répondre à des questions cross-praticiens sur les publications
   */
  static getNewsDigestForLLM(maxItems: number = 50): string {
    const allNews: { practitioner: PractitionerProfile; news: PractitionerNews }[] = [];

    for (const p of practitionersDB.practitioners) {
      if (!p.news) continue;
      for (const news of p.news) {
        allNews.push({ practitioner: p, news });
      }
    }

    // Sort by date (most recent first)
    allNews.sort((a, b) => new Date(b.news.date).getTime() - new Date(a.news.date).getTime());

    if (allNews.length === 0) return '';

    // Group by type for better readability
    const byType: Record<string, typeof allNews> = {};
    for (const item of allNews.slice(0, maxItems)) {
      const type = item.news.type;
      if (!byType[type]) byType[type] = [];
      byType[type].push(item);
    }

    const typeLabels: Record<string, string> = {
      publication: 'Publications scientifiques',
      conference: 'Conférences',
      certification: 'Certifications & Formations',
      award: 'Distinctions',
      event: 'Événements',
    };

    let digest = `\n## ACTUALITÉS & PUBLICATIONS DE TOUS LES PRATICIENS (${allNews.length} total)\n`;

    for (const [type, items] of Object.entries(byType)) {
      digest += `\n### ${typeLabels[type] || type} (${items.length})\n`;
      for (const item of items) {
        const dateStr = new Date(item.news.date).toLocaleDateString('fr-FR');
        digest += `- [${dateStr}] ${item.practitioner.title} ${item.practitioner.firstName} ${item.practitioner.lastName} (${item.practitioner.specialty}, ${item.practitioner.address.city}) : "${item.news.title}"`;
        if (item.news.source) digest += ` — Source: ${item.news.source}`;
        digest += '\n';
      }
    }

    return digest;
  }

  /**
   * Statistiques globales
   */
  static getGlobalStats() {
    const practitioners = this.getAllPractitioners();
    return {
      totalPractitioners: practitioners.length,
      totalKOLs: practitioners.filter(p => p.metrics.isKOL).length,
      totalVolume: practitioners.reduce((sum, p) => sum + p.metrics.volumeL, 0),
      averageLoyalty: practitioners.reduce((sum, p) => sum + p.metrics.loyaltyScore, 0) / practitioners.length,
      pneumologues: practitioners.filter(p => p.specialty === 'Pneumologue').length,
      generalistes: practitioners.filter(p => p.specialty === 'Médecin généraliste').length,
    };
  }
}
