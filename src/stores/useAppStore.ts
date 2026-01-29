import { create } from 'zustand';
import type { Practitioner, User, AIInsight, FilterOptions, UpcomingVisit, PerformanceData } from '../types';
import practitionersData from '../data/practitioners.json';

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
}

// Mock data pour l'utilisateur connecté
const mockUser: User = {
  id: 'U001',
  name: 'Marie Dupont',
  role: 'Déléguée Pharmaceutique',
  territory: 'Rhône-Alpes',
  avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=MarieDupont&backgroundColor=0066B3',
  objectives: {
    visitsMonthly: 60,
    visitsCompleted: 47,
    newPrescribers: 12,
  },
};

// Mock insights IA
const mockInsights: AIInsight[] = [
  {
    id: 'I001',
    type: 'opportunity',
    icon: '🎯',
    title: 'Opportunité détectée',
    message: 'Dr. Martin a augmenté ses prescriptions de 23% ce trimestre. Moment idéal pour renforcer la relation.',
    priority: 'high',
    actionLabel: 'Voir le profil',
    practitionerId: 'P042',
  },
  {
    id: 'I002',
    type: 'alert',
    icon: '⚠️',
    title: '3 KOLs non visités',
    message: '3 leaders d\'opinion n\'ont pas été contactés depuis plus de 90 jours.',
    priority: 'high',
    actionLabel: 'Planifier visites',
  },
  {
    id: 'I003',
    type: 'reminder',
    icon: '📅',
    title: 'Visite demain',
    message: 'Rendez-vous confirmé avec Dr. Dupont demain à 10h. Documents de préparation disponibles.',
    priority: 'medium',
    actionLabel: 'Préparer visite',
    practitionerId: 'P023',
  },
  {
    id: 'I004',
    type: 'achievement',
    icon: '🏆',
    title: 'Objectif atteint !',
    message: 'Félicitations ! Vous avez visité 100% des KOLs ce mois-ci.',
    priority: 'low',
  },
];

// Mock upcoming visits
function generateMockVisits(practitioners: Practitioner[]): UpcomingVisit[] {
  const today = new Date();
  const visits: UpcomingVisit[] = [];

  // 3 visites aujourd'hui
  const todayPractitioners = practitioners.filter(p => p.specialty === 'Pneumologue').slice(0, 3);
  todayPractitioners.forEach((p, i) => {
    visits.push({
      id: `V00${i + 1}`,
      practitionerId: p.id,
      practitioner: p,
      date: today.toISOString().split('T')[0],
      time: ['10:00', '14:30', '16:00'][i],
      type: 'scheduled',
      notes: 'Présentation des nouvelles options thérapeutiques',
    });
  });

  return visits;
}

// Mock performance data
const mockPerformanceData: PerformanceData[] = [
  { month: 'Jan', yourVolume: 420000, objective: 500000, teamAverage: 450000 },
  { month: 'Fév', yourVolume: 480000, objective: 500000, teamAverage: 460000 },
  { month: 'Mar', yourVolume: 520000, objective: 500000, teamAverage: 470000 },
  { month: 'Avr', yourVolume: 510000, objective: 500000, teamAverage: 480000 },
  { month: 'Mai', yourVolume: 550000, objective: 500000, teamAverage: 490000 },
  { month: 'Jun', yourVolume: 580000, objective: 500000, teamAverage: 500000 },
  { month: 'Jul', yourVolume: 620000, objective: 600000, teamAverage: 520000 },
  { month: 'Aoû', yourVolume: 640000, objective: 600000, teamAverage: 530000 },
  { month: 'Sep', yourVolume: 680000, objective: 600000, teamAverage: 550000 },
  { month: 'Oct', yourVolume: 720000, objective: 650000, teamAverage: 580000 },
  { month: 'Nov', yourVolume: 750000, objective: 650000, teamAverage: 600000 },
  { month: 'Déc', yourVolume: 780000, objective: 700000, teamAverage: 620000 },
];

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  practitioners: practitionersData as Practitioner[],
  currentUser: mockUser,
  insights: mockInsights,
  upcomingVisits: generateMockVisits(practitionersData as Practitioner[]),
  performanceData: mockPerformanceData,
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
      if (filters.specialty) {
        filtered = filtered.filter((p) => p.specialty === filters.specialty);
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
      if (filters.isKOL !== undefined) {
        filtered = filtered.filter((p) => p.isKOL === filters.isKOL);
      }
      if (filters.riskLevel) {
        filtered = filtered.filter((p) => p.riskLevel === filters.riskLevel);
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
}));
