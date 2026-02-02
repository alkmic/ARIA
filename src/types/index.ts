export interface Practitioner {
  id: string;
  firstName: string;
  lastName: string;
  title: string; // "Dr." ou "Pr."
  specialty: 'Médecin généraliste' | 'Pneumologue';
  isKOL: boolean;
  vingtile: number; // 1-20 (1 = top prescripteur)

  // Contact
  phone: string;
  email: string;
  address: string;
  postalCode: string;
  city: string;
  department: string;

  // Métriques
  volumeL: number; // Volume annuel en litres O2
  patientCount: number; // Nombre de patients estimé
  conventionSector: 1 | 2;
  activityType: 'Libéral intégral' | 'Libéral temps partiel' | 'Mixte';
  preferredChannel: 'Face-to-face' | 'Email' | 'Téléphone';

  // Historique
  lastVisitDate: string | null;
  visitCount: number;
  loyaltyScore: number; // 1-10
  trend: 'up' | 'down' | 'stable';

  // IA
  aiSummary: string; // Résumé généré (2-3 phrases)
  nextBestAction: string;
  riskLevel: 'low' | 'medium' | 'high';
  keyPoints?: string[]; // Points clés pour la visite
  notes?: string; // Notes personnelles de l'utilisateur

  // Conversations passées (mock)
  conversations: {
    date: string;
    summary: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    actions: string[];
    type?: string;
    duration?: string;
  }[];

  // Historique volumes (pour graphiques)
  volumeHistory?: {
    month: string;
    volume: number;
    vingtileAvg: number;
  }[];

  // Avatar (généré)
  avatarUrl: string; // On utilisera UI Avatars ou DiceBear
}

export interface User {
  id: string;
  name: string;
  role: string;
  territory: string;
  avatarUrl: string;
  objectives: {
    visitsMonthly: number;
    visitsCompleted: number;
    newPrescribers: number;
  };
}

export interface AIInsight {
  id: string;
  type: 'opportunity' | 'alert' | 'reminder' | 'achievement';
  icon?: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel?: string;
  practitionerId?: string;
}

export interface FilterOptions {
  specialty?: ('Médecin généraliste' | 'Pneumologue')[];
  vingtile?: number[];
  vingtileMin?: number;
  vingtileMax?: number;
  department?: string;
  isKOL?: boolean;
  riskLevel?: ('low' | 'medium' | 'high')[];
}

export interface UpcomingVisit {
  id: string;
  practitionerId: string;
  practitioner: Practitioner;
  date: string;
  time: string;
  type: 'scheduled' | 'tentative';
  notes?: string;
}

export interface PerformanceData {
  month: string;
  yourVolume: number;
  objective: number;
  teamAverage: number;
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  practitioners?: Practitioner[];
  insights?: string[];
  timestamp: Date;
}
