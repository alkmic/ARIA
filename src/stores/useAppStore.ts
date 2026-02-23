import { create } from 'zustand';
import type { Practitioner, User, AIInsight, FilterOptions, UpcomingVisit, PerformanceData } from '../types';
import { DataService } from '../services/dataService';
import { adaptPractitionerProfiles } from '../services/dataAdapter';
import { txt, localizeMonth } from '../utils/localizeData';

interface AppState {
  // Data
  practitioners: Practitioner[];
  currentUser: User;
  insights: AIInsight[];
  upcomingVisits: UpcomingVisit[];
  performanceData: PerformanceData[];

  // UI State
  selectedPractitioner: Practitioner | null;
  searchQuery: string;
  isLoading: boolean;
  currentPage: 'dashboard' | 'practitioners' | 'pitch' | 'coach';

  // Actions
  setSelectedPractitioner: (p: Practitioner | null) => void;
  setSearchQuery: (q: string) => void;
  setCurrentPage: (page: 'dashboard' | 'practitioners' | 'pitch' | 'coach') => void;
  filterPractitioners: (filters?: FilterOptions) => Practitioner[];
  getPractitionerById: (id: string) => Practitioner | undefined;
  getHighPriorityPractitioners: () => Practitioner[];
  getTodayVisits: () => UpcomingVisit[];
  addVisits: (visits: UpcomingVisit[]) => void;
  removeVisit: (visitId: string) => void;
  refreshLanguage: () => void;
}

// Mock data pour l'utilisateur connecté
function getMockUser(): User {
  return {
    id: 'U001',
    name: 'Marie Dupont',
    role: txt('Déléguée Pharmaceutique', 'Pharmaceutical Representative'),
    territory: 'Rhône-Alpes',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=MarieDupont&backgroundColor=0066B3',
    objectives: {
      visitsMonthly: 60,
      visitsCompleted: 47,
      newPrescribers: 12,
    },
  };
}

// Mock insights IA - bilingual
function getMockInsights(): AIInsight[] {
  return [
    {
      id: 'I001',
      type: 'opportunity',
      title: txt('Opportunité détectée', 'Opportunity detected'),
      message: txt(
        'Dr. Martin a augmenté ses prescriptions de 23% ce trimestre. Moment idéal pour renforcer la relation.',
        'Dr. Martin increased prescriptions by 23% this quarter. Ideal time to strengthen the relationship.'
      ),
      priority: 'high',
      actionLabel: txt('Voir le profil', 'View profile'),
      practitionerId: 'P042',
    },
    {
      id: 'I002',
      type: 'alert',
      title: txt('3 KOLs non visités', '3 unvisited KOLs'),
      message: txt(
        '3 leaders d\'opinion n\'ont pas été contactés depuis plus de 90 jours.',
        '3 opinion leaders have not been contacted for over 90 days.'
      ),
      priority: 'high',
      actionLabel: txt('Planifier visites', 'Schedule visits'),
    },
    {
      id: 'I003',
      type: 'reminder',
      title: txt('Visite demain', 'Visit tomorrow'),
      message: txt(
        'Rendez-vous confirmé avec Dr. Dupont demain à 10h. Documents de préparation disponibles.',
        'Confirmed appointment with Dr. Dupont tomorrow at 10am. Preparation documents available.'
      ),
      priority: 'medium',
      actionLabel: txt('Préparer visite', 'Prepare visit'),
      practitionerId: 'P023',
    },
    {
      id: 'I004',
      type: 'achievement',
      title: txt('Objectif atteint', 'Goal achieved'),
      message: txt(
        'Vous avez visité 100% des KOLs ce mois-ci.',
        'You visited 100% of KOLs this month.'
      ),
      priority: 'low',
    },
  ];
}

// Mock upcoming visits
function generateMockVisits(practitioners: Practitioner[]): UpcomingVisit[] {
  const today = new Date();
  const visits: UpcomingVisit[] = [];
  let visitCounter = 1;

  // Helper to add days to a date
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // 3 visites aujourd'hui (Pneumologues)
  const todayPractitioners = practitioners.filter(p => p.specialty === 'Pneumologue').slice(0, 3);
  todayPractitioners.forEach((p, i) => {
    visits.push({
      id: `V${String(visitCounter++).padStart(3, '0')}`,
      practitionerId: p.id,
      practitioner: p,
      date: today.toISOString().split('T')[0],
      time: ['09:00', '14:30', '16:00'][i],
      type: 'scheduled',
      notes: txt('Présentation des nouvelles options thérapeutiques', 'Presentation of new therapeutic options'),
    });
  });

  // 2 visites demain
  const tomorrowPractitioners = practitioners.filter(p => p.isKOL).slice(0, 2);
  tomorrowPractitioners.forEach((p, i) => {
    visits.push({
      id: `V${String(visitCounter++).padStart(3, '0')}`,
      practitionerId: p.id,
      practitioner: p,
      date: addDays(today, 1).toISOString().split('T')[0],
      time: ['10:00', '15:00'][i],
      type: 'scheduled',
      notes: txt('Suivi KOL - Discussion nouveaux protocoles', 'KOL follow-up - New protocols discussion'),
    });
  });

  // 4 visites cette semaine (jours +2 à +5)
  const weekPractitioners = practitioners.filter(p => p.vingtile <= 3).slice(0, 8);
  for (let day = 2; day <= 5; day++) {
    const dayPractitioners = weekPractitioners.slice((day - 2) * 2, (day - 1) * 2);
    dayPractitioners.forEach((p, i) => {
      visits.push({
        id: `V${String(visitCounter++).padStart(3, '0')}`,
        practitionerId: p.id,
        practitioner: p,
        date: addDays(today, day).toISOString().split('T')[0],
        time: i === 0 ? '10:30' : '14:00',
        type: 'scheduled',
        notes: txt('Visite de routine - Point sur les prescriptions', 'Routine visit - Prescription review'),
      });
    });
  }

  // 3 visites semaine prochaine
  const nextWeekPractitioners = practitioners.filter(p => p.riskLevel === 'high').slice(0, 3);
  nextWeekPractitioners.forEach((p, i) => {
    visits.push({
      id: `V${String(visitCounter++).padStart(3, '0')}`,
      practitionerId: p.id,
      practitioner: p,
      date: addDays(today, 7 + i).toISOString().split('T')[0],
      time: ['09:30', '11:00', '15:30'][i],
      type: 'scheduled',
      notes: txt('Visite de réactivation - Praticien à risque', 'Reactivation visit - At-risk practitioner'),
    });
  });

  return visits;
}

// Mock performance data (toutes les valeurs en litres L — cohérence avec les graphiques)
// Volume mensuel réaliste pour un territoire Rhône-Alpes: ~40-60K L/mois
function getMockPerformanceData(): PerformanceData[] {
  const m = (fr: string) => localizeMonth(fr);
  return [
    { month: m('Jan'), yourVolume: 42000, objective: 45000, teamAverage: 40000 },
    { month: m('Fév'), yourVolume: 44000, objective: 45000, teamAverage: 41000 },
    { month: m('Mar'), yourVolume: 47000, objective: 46000, teamAverage: 42000 },
    { month: m('Avr'), yourVolume: 46000, objective: 46000, teamAverage: 43000 },
    { month: m('Mai'), yourVolume: 49000, objective: 47000, teamAverage: 44000 },
    { month: m('Jun'), yourVolume: 51000, objective: 48000, teamAverage: 45000 },
    { month: m('Jul'), yourVolume: 48000, objective: 48000, teamAverage: 44000 },
    { month: m('Aoû'), yourVolume: 43000, objective: 48000, teamAverage: 41000 },
    { month: m('Sep'), yourVolume: 52000, objective: 49000, teamAverage: 46000 },
    { month: m('Oct'), yourVolume: 54000, objective: 50000, teamAverage: 47000 },
    { month: m('Nov'), yourVolume: 56000, objective: 50000, teamAverage: 48000 },
    { month: m('Déc'), yourVolume: 53000, objective: 50000, teamAverage: 47000 },
  ];
}

// Charger les praticiens depuis le nouveau service de données
const loadedPractitioners = adaptPractitionerProfiles(DataService.getAllPractitioners());

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  practitioners: loadedPractitioners,
  currentUser: getMockUser(),
  insights: getMockInsights(),
  upcomingVisits: generateMockVisits(loadedPractitioners),
  performanceData: getMockPerformanceData(),
  selectedPractitioner: null,
  searchQuery: '',
  isLoading: false,
  currentPage: 'dashboard',

  // Actions
  setSelectedPractitioner: (p) => set({ selectedPractitioner: p }),

  setSearchQuery: (q) => set({ searchQuery: q }),

  setCurrentPage: (page) => set({ currentPage: page }),

  filterPractitioners: (filters) => {
    const { practitioners, searchQuery } = get();
    let filtered = [...practitioners];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.firstName.toLowerCase().includes(query) ||
          p.lastName.toLowerCase().includes(query) ||
          p.city.toLowerCase().includes(query) ||
          p.specialty.toLowerCase().includes(query)
      );
    }

    // Additional filters
    if (filters) {
      if (filters.specialty && filters.specialty.length > 0) {
        filtered = filtered.filter((p) => filters.specialty!.includes(p.specialty));
      }
      if (filters.vingtile && filters.vingtile.length > 0) {
        filtered = filtered.filter((p) => filters.vingtile!.includes(p.vingtile));
      }
      if (filters.vingtileMin !== undefined) {
        filtered = filtered.filter((p) => p.vingtile >= filters.vingtileMin!);
      }
      if (filters.vingtileMax !== undefined) {
        filtered = filtered.filter((p) => p.vingtile <= filters.vingtileMax!);
      }
      if (filters.department) {
        filtered = filtered.filter((p) => p.department === filters.department);
      }
      if (filters.practiceType && filters.practiceType.length > 0) {
        filtered = filtered.filter((p) => filters.practiceType!.includes(p.practiceType));
      }
      if (filters.isKOL !== undefined) {
        filtered = filtered.filter((p) => p.isKOL === filters.isKOL);
      }
      if (filters.riskLevel && filters.riskLevel.length > 0) {
        filtered = filtered.filter((p) => filters.riskLevel!.includes(p.riskLevel));
      }
    }

    return filtered;
  },

  getPractitionerById: (id) => {
    return get().practitioners.find((p) => p.id === id);
  },

  getHighPriorityPractitioners: () => {
    const { practitioners } = get();
    return practitioners
      .filter((p) => p.riskLevel === 'high' && (p.isKOL || p.vingtile <= 3))
      .sort((a, b) => {
        // KOLs first
        if (a.isKOL !== b.isKOL) return a.isKOL ? -1 : 1;
        // Then by vingtile
        if (a.vingtile !== b.vingtile) return a.vingtile - b.vingtile;
        // Then by volume
        return b.volumeL - a.volumeL;
      })
      .slice(0, 10);
  },

  getTodayVisits: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().upcomingVisits.filter((v) => v.date === today);
  },

  addVisits: (visits) => {
    set((state) => ({
      upcomingVisits: [...state.upcomingVisits, ...visits].sort((a, b) => {
        // Sort by date then by time
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      }),
    }));
  },

  removeVisit: (visitId) => {
    set((state) => ({
      upcomingVisits: state.upcomingVisits.filter((v) => v.id !== visitId),
    }));
  },

  refreshLanguage: () => {
    set({
      currentUser: getMockUser(),
      insights: getMockInsights(),
      performanceData: getMockPerformanceData(),
    });
  },
}));
