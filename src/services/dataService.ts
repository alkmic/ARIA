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
   * Génère l'historique mensuel des volumes pour un praticien (déterministe via ID)
   * Identique à la logique de PractitionerProfile.tsx pour cohérence
   */
  static generateVolumeHistory(annualVolume: number, practitionerId: string): Array<{ month: string; volume: number; vingtileAvg: number }> {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const monthlyBase = annualVolume / 12;
    const vingtileAvg = monthlyBase * 0.95;
    const seed = practitionerId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const pseudoRandom = (i: number) => {
      const x = Math.sin(seed * 31 + i * 17) * 10000;
      return x - Math.floor(x);
    };
    return months.map((month, i) => ({
      month,
      volume: Math.round(monthlyBase * (0.85 + pseudoRandom(i) * 0.3)),
      vingtileAvg: Math.round(vingtileAvg * (0.95 + pseudoRandom(i + 100) * 0.1))
    }));
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

    // Calculer la tendance depuis potentialGrowth
    const trend = p.metrics.potentialGrowth > 15 ? 'hausse' :
                  p.metrics.potentialGrowth < 5 ? 'baisse' : 'stable';
    const trendPercent = p.metrics.potentialGrowth > 15 ? `+${Math.round(p.metrics.potentialGrowth * 0.8)}%` :
                         p.metrics.potentialGrowth < 5 ? `-${Math.round((10 - p.metrics.potentialGrowth) * 0.8)}%` : '~0%';

    // Générer l'historique mensuel des volumes
    const volumeHistory = DataService.generateVolumeHistory(p.metrics.volumeL, p.id);

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
- Email : ${p.contact.email}
- Téléphone : ${p.contact.phone}${p.contact.mobile ? `\n- Mobile : ${p.contact.mobile}` : ''}

MÉTRIQUES BUSINESS :
- Volume annuel : ${(p.metrics.volumeL / 1000).toFixed(1)}K L/an (${(p.metrics.volumeMonthly / 1000).toFixed(1)}K L/mois)
- Score de fidélité : ${p.metrics.loyaltyScore}/10
- Vingtile : ${p.metrics.vingtile} (${p.metrics.vingtile <= 5 ? 'TOP PRESCRIPTEUR' : p.metrics.vingtile <= 10 ? 'Gros prescripteur' : 'Prescripteur moyen'})
- Potentiel de croissance : +${p.metrics.potentialGrowth}%
- Risque de churn : ${p.metrics.churnRisk === 'low' ? 'FAIBLE' : p.metrics.churnRisk === 'medium' ? 'MOYEN' : 'ÉLEVÉ'}
- Tendance prescription O2 : ${trend} (${trendPercent} vs période précédente)

ÉVOLUTION DES VOLUMES MENSUELS (litres O2) :
${volumeHistory.map(m => `- ${m.month}: ${m.volume} L (moyenne vingtile: ${m.vingtileAvg} L)`).join('\n')}

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
