/**
 * Store centralisé pour les données utilisateur (rapports, actions, notes)
 * Persiste dans localStorage pour simulation de backend
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types pour les rapports de visite
export interface VisitReportData {
  id: string;
  practitionerId: string;
  practitionerName: string;
  date: string;
  time: string;
  transcript: string;
  extractedInfo: {
    topics: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    nextActions: string[];
    keyPoints: string[];
    productsDiscussed: string[];
    competitorsMentioned: string[];
    objections: string[];
    opportunities: string[];
  };
  createdAt: string;
  updatedAt: string;
}

// Types pour les actions IA
export interface AIAction {
  id: string;
  type: 'visit_urgent' | 'visit_kol' | 'opportunity' | 'risk' | 'followup' | 'upsell' | 'competitor' | 'publication';
  priority: 'critical' | 'high' | 'medium' | 'low';
  practitionerId: string;
  title: string;
  reason: string;

  // Justifications IA enrichies
  aiJustification: {
    summary: string;           // Résumé de l'IA
    metrics: string[];         // Métriques justificatives
    risks: string[];           // Risques si non action
    opportunities: string[];   // Opportunités si action
    suggestedApproach: string; // Approche suggérée
    contextualNews?: string;   // News/publications liées
    competitorAlert?: string;  // Alerte concurrence
    trendAnalysis?: string;    // Analyse de tendance
  };

  // Scores calculés
  scores: {
    urgency: number;      // 0-100
    impact: number;       // 0-100
    probability: number;  // 0-100 probabilité de succès
    overall: number;      // Score global pondéré
  };

  suggestedDate: string;
  createdAt: string;

  // État de l'action
  status: 'pending' | 'completed' | 'snoozed' | 'dismissed';
  completedAt?: string;
  snoozedUntil?: string;
  completionNote?: string;
}

// Notes utilisateur personnalisées
export interface UserNote {
  id: string;
  practitionerId: string;
  content: string;
  type: 'observation' | 'reminder' | 'strategy' | 'competitive';
  createdAt: string;
  updatedAt: string;
  linkedActionId?: string;
}

// Configuration des seuils (ajustable)
export interface ActionThresholds {
  kolVisitDays: number;        // Jours avant alerte KOL
  kolCriticalDays: number;     // Jours avant critique KOL
  topPrescriberVisitDays: number; // Jours pour top prescripteurs
  churnLoyaltyThreshold: number;  // Score fidélité risque
  churnVolumeThreshold: number;   // Volume minimum risque
  opportunityGrowth: number;      // % croissance pour opportunité
  opportunityLoyalty: number;     // Score fidélité pour opportunité
}

interface UserDataState {
  // Données
  visitReports: VisitReportData[];
  actions: AIAction[];
  userNotes: UserNote[];

  // Configuration
  thresholds: ActionThresholds;

  // Actions pour les rapports de visite
  addVisitReport: (report: Omit<VisitReportData, 'id' | 'createdAt' | 'updatedAt'>) => VisitReportData;
  updateVisitReport: (id: string, updates: Partial<VisitReportData>) => void;
  getVisitReportsForPractitioner: (practitionerId: string) => VisitReportData[];
  getRecentVisitReports: (days: number) => VisitReportData[];

  // Actions pour les actions IA
  addAction: (action: Omit<AIAction, 'id' | 'createdAt' | 'status'>) => void;
  completeAction: (actionId: string, note?: string) => void;
  snoozeAction: (actionId: string, until: string) => void;
  dismissAction: (actionId: string) => void;
  reactivateAction: (actionId: string) => void;
  getActiveActions: () => AIAction[];
  getCompletedActions: () => AIAction[];
  getActionsForPractitioner: (practitionerId: string) => AIAction[];

  // Actions pour les notes
  addUserNote: (note: Omit<UserNote, 'id' | 'createdAt' | 'updatedAt'>) => UserNote;
  updateUserNote: (id: string, content: string) => void;
  deleteUserNote: (id: string) => void;
  getNotesForPractitioner: (practitionerId: string) => UserNote[];

  // Configuration
  updateThresholds: (thresholds: Partial<ActionThresholds>) => void;

  // Statistiques
  getStats: () => {
    totalReports: number;
    reportsThisWeek: number;
    reportsThisMonth: number;
    completedActions: number;
    pendingActions: number;
    avgSentiment: number;
  };
}

// Valeurs par défaut des seuils
const DEFAULT_THRESHOLDS: ActionThresholds = {
  kolVisitDays: 60,
  kolCriticalDays: 90,
  topPrescriberVisitDays: 45,
  churnLoyaltyThreshold: 5,
  churnVolumeThreshold: 50000,
  opportunityGrowth: 25,
  opportunityLoyalty: 7,
};

// Génération d'ID unique
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useUserDataStore = create<UserDataState>()(
  persist(
    (set, get) => ({
      visitReports: [],
      actions: [],
      userNotes: [],
      thresholds: DEFAULT_THRESHOLDS,

      // ===== VISIT REPORTS =====
      addVisitReport: (reportData) => {
        const now = new Date().toISOString();
        const report: VisitReportData = {
          ...reportData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };

        set(state => ({
          visitReports: [report, ...state.visitReports]
        }));

        return report;
      },

      updateVisitReport: (id, updates) => {
        set(state => ({
          visitReports: state.visitReports.map(r =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
          )
        }));
      },

      getVisitReportsForPractitioner: (practitionerId) => {
        return get().visitReports
          .filter(r => r.practitionerId === practitionerId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getRecentVisitReports: (days) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return get().visitReports
          .filter(r => new Date(r.createdAt) >= cutoff)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      // ===== AI ACTIONS =====
      addAction: (actionData) => {
        const action: AIAction = {
          ...actionData,
          id: generateId(),
          createdAt: new Date().toISOString(),
          status: 'pending',
        };

        // Éviter les doublons pour le même praticien et type
        set(state => {
          const exists = state.actions.some(
            a => a.practitionerId === action.practitionerId &&
                 a.type === action.type &&
                 a.status === 'pending'
          );

          if (exists) return state;

          return { actions: [action, ...state.actions] };
        });
      },

      completeAction: (actionId, note) => {
        set(state => ({
          actions: state.actions.map(a =>
            a.id === actionId
              ? { ...a, status: 'completed' as const, completedAt: new Date().toISOString(), completionNote: note }
              : a
          )
        }));
      },

      snoozeAction: (actionId, until) => {
        set(state => ({
          actions: state.actions.map(a =>
            a.id === actionId
              ? { ...a, status: 'snoozed' as const, snoozedUntil: until }
              : a
          )
        }));
      },

      dismissAction: (actionId) => {
        set(state => ({
          actions: state.actions.map(a =>
            a.id === actionId
              ? { ...a, status: 'dismissed' as const }
              : a
          )
        }));
      },

      reactivateAction: (actionId) => {
        set(state => ({
          actions: state.actions.map(a =>
            a.id === actionId
              ? { ...a, status: 'pending' as const, snoozedUntil: undefined }
              : a
          )
        }));
      },

      getActiveActions: () => {
        const now = new Date();
        return get().actions
          .filter(a => {
            if (a.status === 'pending') return true;
            if (a.status === 'snoozed' && a.snoozedUntil) {
              return new Date(a.snoozedUntil) <= now;
            }
            return false;
          })
          .sort((a, b) => b.scores.overall - a.scores.overall);
      },

      getCompletedActions: () => {
        return get().actions
          .filter(a => a.status === 'completed')
          .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
      },

      getActionsForPractitioner: (practitionerId) => {
        return get().actions
          .filter(a => a.practitionerId === practitionerId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      // ===== USER NOTES =====
      addUserNote: (noteData) => {
        const now = new Date().toISOString();
        const note: UserNote = {
          ...noteData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };

        set(state => ({
          userNotes: [note, ...state.userNotes]
        }));

        return note;
      },

      updateUserNote: (id, content) => {
        set(state => ({
          userNotes: state.userNotes.map(n =>
            n.id === id ? { ...n, content, updatedAt: new Date().toISOString() } : n
          )
        }));
      },

      deleteUserNote: (id) => {
        set(state => ({
          userNotes: state.userNotes.filter(n => n.id !== id)
        }));
      },

      getNotesForPractitioner: (practitionerId) => {
        return get().userNotes
          .filter(n => n.practitionerId === practitionerId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      // ===== CONFIGURATION =====
      updateThresholds: (newThresholds) => {
        set(state => ({
          thresholds: { ...state.thresholds, ...newThresholds }
        }));
      },

      // ===== STATISTIQUES =====
      getStats: () => {
        const { visitReports, actions } = get();
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const reportsThisWeek = visitReports.filter(r => new Date(r.createdAt) >= weekAgo);
        const reportsThisMonth = visitReports.filter(r => new Date(r.createdAt) >= monthAgo);

        // Calcul sentiment moyen
        const sentimentScores = { positive: 1, neutral: 0, negative: -1 };
        const avgSentiment = reportsThisMonth.length > 0
          ? reportsThisMonth.reduce((acc, r) => acc + sentimentScores[r.extractedInfo.sentiment], 0) / reportsThisMonth.length
          : 0;

        return {
          totalReports: visitReports.length,
          reportsThisWeek: reportsThisWeek.length,
          reportsThisMonth: reportsThisMonth.length,
          completedActions: actions.filter(a => a.status === 'completed').length,
          pendingActions: actions.filter(a => a.status === 'pending').length,
          avgSentiment: Math.round(avgSentiment * 100) / 100,
        };
      },
    }),
    {
      name: 'aria-user-data',
      version: 1,
    }
  )
);
