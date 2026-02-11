/**
 * Types pour la base de données enrichie
 */

export interface PractitionerNote {
  id: string;
  date: string;
  content: string;
  author: string;
  type: 'visit' | 'phone' | 'email' | 'observation';
  nextAction?: string;
}

export interface PractitionerNews {
  id: string;
  date: string;
  title: string;
  content: string;
  type: 'publication' | 'certification' | 'event' | 'award' | 'conference';
  relevance?: string;
  source?: string;
}

export interface VisitRecord {
  id: string;
  date: string;
  type: 'scheduled' | 'completed' | 'cancelled';
  duration?: number; // minutes
  notes?: string;
  nextAction?: string;
  productsDiscussed?: string[];
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  coords: {
    lat: number;
    lng: number;
  };
}

export interface ContactInfo {
  email: string;
  phone: string;
  mobile?: string;
  fax?: string;
}

export type PracticeType = 'ville' | 'hospitalier' | 'mixte';

export interface BusinessMetrics {
  volumeL: number; // Volume annuel en litres
  volumeMonthly: number; // Volume mensuel moyen
  loyaltyScore: number; // 1-10
  vingtile: number; // 1-20
  isKOL: boolean;
  potentialGrowth: number; // Pourcentage de croissance potentielle
  churnRisk: 'low' | 'medium' | 'high';
}

export interface PractitionerProfile {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  specialty: string;
  subSpecialty?: string;
  practiceType: PracticeType; // ville, hospitalier ou mixte
  avatarUrl?: string;

  // Coordonnées
  address: Address;
  contact: ContactInfo;

  // Métriques business
  metrics: BusinessMetrics;

  // Données enrichies
  notes: PractitionerNote[];
  news: PractitionerNews[];
  visitHistory: VisitRecord[];

  // Métadonnées
  createdAt: string;
  lastVisitDate?: string;
  nextScheduledVisit?: string;
}

export interface Database {
  practitioners: PractitionerProfile[];
  lastUpdated: string;
  version: string;
}
