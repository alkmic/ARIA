/**
 * Pont dynamique entre les comptes-rendus de visite (useUserDataStore)
 * et les profils praticiens (DataService).
 *
 * Ce service garantit que :
 * 1. Les comptes-rendus enrichissent durablement les fiches praticiens
 * 2. Le Coach IA peut exploiter les données des comptes-rendus
 * 3. Le Pitch IA utilise toutes les données disponibles
 */

import { DataService } from './dataService';
import { useUserDataStore, type VisitReportData, type UserNote } from '../stores/useUserDataStore';
import type { PractitionerProfile, PractitionerNote, VisitRecord } from '../types/database';

/**
 * Contexte enrichi d'un praticien = profil de base + données utilisateur
 */
export interface EnrichedPractitionerContext {
  profile: PractitionerProfile;
  userVisitReports: VisitReportData[];
  userNotes: UserNote[];
  /** Notes de visite générées depuis les comptes-rendus */
  mergedNotes: PractitionerNote[];
  /** Historique de visites fusionné (base + comptes-rendus) */
  mergedVisitHistory: VisitRecord[];
  /** Date de dernière visite réelle (incluant les comptes-rendus) */
  effectiveLastVisitDate: string | null;
}

/**
 * Récupère le contexte enrichi d'un praticien en fusionnant
 * les données statiques (DataService) et les données utilisateur (useUserDataStore).
 */
export function getEnrichedPractitionerContext(practitionerId: string): EnrichedPractitionerContext | null {
  const profile = DataService.getPractitionerById(practitionerId);
  if (!profile) return null;

  const store = useUserDataStore.getState();
  const userVisitReports = store.getVisitReportsForPractitioner(practitionerId);
  const userNotes = store.getNotesForPractitioner(practitionerId);

  // Convertir les comptes-rendus en notes de visite pour la fiche praticien
  const reportNotes: PractitionerNote[] = userVisitReports.map(report => ({
    id: `report-${report.id}`,
    date: report.date,
    content: formatReportAsNote(report),
    author: 'Marie Dupont (CRV)',
    type: 'visit' as const,
    nextAction: report.extractedInfo.nextActions.length > 0
      ? report.extractedInfo.nextActions[0]
      : undefined,
  }));

  // Convertir les comptes-rendus en visites pour l'historique
  const reportVisits: VisitRecord[] = userVisitReports.map(report => ({
    id: `report-visit-${report.id}`,
    date: report.date,
    type: 'completed' as const,
    duration: 30, // Durée estimée
    notes: report.extractedInfo.keyPoints.join('. '),
    productsDiscussed: report.extractedInfo.productsDiscussed,
  }));

  // Fusionner et trier par date décroissante
  const mergedNotes = [...reportNotes, ...profile.notes]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const mergedVisitHistory = [...reportVisits, ...profile.visitHistory]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Déterminer la date de dernière visite effective
  const allVisitDates = [
    ...userVisitReports.map(r => r.date),
    profile.lastVisitDate || '',
  ].filter(Boolean);
  const effectiveLastVisitDate = allVisitDates.length > 0
    ? allVisitDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
    : null;

  return {
    profile,
    userVisitReports,
    userNotes,
    mergedNotes,
    mergedVisitHistory,
    effectiveLastVisitDate,
  };
}

/**
 * Formate un compte-rendu de visite en note lisible pour la fiche praticien
 */
function formatReportAsNote(report: VisitReportData): string {
  const parts: string[] = [];

  if (report.extractedInfo.keyPoints.length > 0) {
    parts.push(`Points clés : ${report.extractedInfo.keyPoints.join('. ')}`);
  }

  if (report.extractedInfo.productsDiscussed.length > 0) {
    parts.push(`Produits discutés : ${report.extractedInfo.productsDiscussed.join(', ')}`);
  }

  if (report.extractedInfo.competitorsMentioned.length > 0) {
    parts.push(`Concurrents mentionnés : ${report.extractedInfo.competitorsMentioned.join(', ')}`);
  }

  if (report.extractedInfo.objections.length > 0) {
    parts.push(`Objections : ${report.extractedInfo.objections.join('. ')}`);
  }

  if (report.extractedInfo.opportunities.length > 0) {
    parts.push(`Opportunités : ${report.extractedInfo.opportunities.join('. ')}`);
  }

  const sentiment = report.extractedInfo.sentiment === 'positive' ? 'positif'
    : report.extractedInfo.sentiment === 'negative' ? 'négatif'
    : 'neutre';
  parts.push(`Sentiment général : ${sentiment}`);

  return parts.join('. ');
}

/**
 * Génère le contexte LLM enrichi pour un praticien,
 * incluant les comptes-rendus de visite et les notes utilisateur.
 * Utilisé par le Coach IA et le Pitch IA.
 */
export function getCompletePractitionerContextWithReports(practitionerId: string): string {
  const enriched = getEnrichedPractitionerContext(practitionerId);
  if (!enriched) return '';

  const { profile, userVisitReports, userNotes, effectiveLastVisitDate } = enriched;

  // Contexte de base depuis DataService
  let context = DataService.getCompletePractitionerContext(practitionerId);

  // Enrichir avec les comptes-rendus de visite utilisateur
  if (userVisitReports.length > 0) {
    context += `\nCOMPTES-RENDUS DE VISITE RÉCENTS (${userVisitReports.length} rapport(s)) :\n`;
    userVisitReports.slice(0, 5).forEach((report, idx) => {
      const date = new Date(report.date).toLocaleDateString('fr-FR');
      context += `\n${idx + 1}. [${date}] Compte-rendu de visite\n`;
      context += `   Sentiment : ${report.extractedInfo.sentiment}\n`;

      if (report.extractedInfo.keyPoints.length > 0) {
        context += `   Points clés : ${report.extractedInfo.keyPoints.join(' | ')}\n`;
      }
      if (report.extractedInfo.productsDiscussed.length > 0) {
        context += `   Produits discutés : ${report.extractedInfo.productsDiscussed.join(', ')}\n`;
      }
      if (report.extractedInfo.competitorsMentioned.length > 0) {
        context += `   Concurrents mentionnés : ${report.extractedInfo.competitorsMentioned.join(', ')}\n`;
      }
      if (report.extractedInfo.objections.length > 0) {
        context += `   Objections : ${report.extractedInfo.objections.join(' | ')}\n`;
      }
      if (report.extractedInfo.opportunities.length > 0) {
        context += `   Opportunités : ${report.extractedInfo.opportunities.join(' | ')}\n`;
      }
      if (report.extractedInfo.nextActions.length > 0) {
        context += `   -> Actions à suivre : ${report.extractedInfo.nextActions.join(' | ')}\n`;
      }
    });
  }

  // Enrichir avec les notes utilisateur
  if (userNotes.length > 0) {
    context += `\nNOTES PERSONNELLES (${userNotes.length} note(s)) :\n`;
    userNotes.slice(0, 5).forEach((note, idx) => {
      const date = new Date(note.createdAt).toLocaleDateString('fr-FR');
      context += `${idx + 1}. [${date}] (${note.type}) ${note.content}\n`;
    });
  }

  // Actualiser la dernière visite si un compte-rendu est plus récent
  if (effectiveLastVisitDate && effectiveLastVisitDate !== profile.lastVisitDate) {
    const daysSince = Math.floor(
      (Date.now() - new Date(effectiveLastVisitDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    context += `\nDERNIÈRE VISITE EFFECTIVE : ${new Date(effectiveLastVisitDate).toLocaleDateString('fr-FR')} (il y a ${daysSince} jours) — mise à jour via compte-rendu\n`;
  }

  return context;
}

/**
 * Récupère tous les comptes-rendus récents formatés pour le contexte LLM global.
 * Utilisé par le Coach IA pour des questions cross-praticiens.
 */
export function getAllRecentReportsForLLM(days: number = 90): string {
  const store = useUserDataStore.getState();
  const recentReports = store.getRecentVisitReports(days);

  if (recentReports.length === 0) return '';

  let context = `\n## COMPTES-RENDUS DE VISITE RÉCENTS (${recentReports.length} rapport(s) ces ${days} derniers jours)\n`;

  recentReports.forEach((report) => {
    const date = new Date(report.date).toLocaleDateString('fr-FR');
    context += `\n- [${date}] ${report.practitionerName} (${report.extractedInfo.sentiment})`;

    if (report.extractedInfo.keyPoints.length > 0) {
      context += ` : ${report.extractedInfo.keyPoints.slice(0, 3).join('; ')}`;
    }
    if (report.extractedInfo.productsDiscussed.length > 0) {
      context += ` | Produits: ${report.extractedInfo.productsDiscussed.join(', ')}`;
    }
    if (report.extractedInfo.competitorsMentioned.length > 0) {
      context += ` | Concurrents: ${report.extractedInfo.competitorsMentioned.join(', ')}`;
    }
    if (report.extractedInfo.nextActions.length > 0) {
      context += ` | Actions: ${report.extractedInfo.nextActions[0]}`;
    }
    context += '\n';
  });

  return context;
}

/**
 * Récupère le résumé des données dynamiques pour un praticien.
 * Utilisé pour l'affichage dans la fiche praticien.
 */
export function getPractitionerReportSummary(practitionerId: string): {
  totalReports: number;
  lastReportDate: string | null;
  lastSentiment: string | null;
  topProducts: string[];
  topCompetitors: string[];
  pendingActions: string[];
} {
  const store = useUserDataStore.getState();
  const reports = store.getVisitReportsForPractitioner(practitionerId);

  if (reports.length === 0) {
    return {
      totalReports: 0,
      lastReportDate: null,
      lastSentiment: null,
      topProducts: [],
      topCompetitors: [],
      pendingActions: [],
    };
  }

  // Agréger les produits et concurrents mentionnés
  const productFreq: Record<string, number> = {};
  const competitorFreq: Record<string, number> = {};
  const allActions: string[] = [];

  reports.forEach(r => {
    r.extractedInfo.productsDiscussed.forEach(p => {
      productFreq[p] = (productFreq[p] || 0) + 1;
    });
    r.extractedInfo.competitorsMentioned.forEach(c => {
      competitorFreq[c] = (competitorFreq[c] || 0) + 1;
    });
    allActions.push(...r.extractedInfo.nextActions);
  });

  const topProducts = Object.entries(productFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  const topCompetitors = Object.entries(competitorFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  return {
    totalReports: reports.length,
    lastReportDate: reports[0].date,
    lastSentiment: reports[0].extractedInfo.sentiment,
    topProducts,
    topCompetitors,
    pendingActions: allActions.slice(0, 5),
  };
}
