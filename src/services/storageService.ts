/**
 * Service de persistence locale avec localStorage
 * Permet de sauvegarder les données utilisateur sans backend
 */

const STORAGE_KEYS = {
  PERSONAL_NOTES: 'aria_personal_notes',
  KOL_PLANS: 'aria_kol_plans',
  TOUR_ROUTES: 'aria_tour_routes',
  USER_PREFERENCES: 'aria_user_preferences',
} as const;

export class StorageService {
  /**
   * Sauvegarde les notes personnelles d'un praticien
   */
  static savePersonalNotes(practitionerId: string, notes: string): boolean {
    try {
      const allNotes = this.getAllPersonalNotes();
      allNotes[practitionerId] = notes;
      localStorage.setItem(STORAGE_KEYS.PERSONAL_NOTES, JSON.stringify(allNotes));
      return true;
    } catch (error) {
      console.error('Error saving personal notes:', error);
      return false;
    }
  }

  /**
   * Récupère les notes personnelles d'un praticien
   */
  static getPersonalNotes(practitionerId: string): string {
    try {
      const allNotes = this.getAllPersonalNotes();
      return allNotes[practitionerId] || '';
    } catch (error) {
      console.error('Error loading personal notes:', error);
      return '';
    }
  }

  /**
   * Récupère toutes les notes personnelles
   */
  static getAllPersonalNotes(): Record<string, string> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PERSONAL_NOTES);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error parsing personal notes:', error);
      return {};
    }
  }

  /**
   * Supprime les notes personnelles d'un praticien
   */
  static deletePersonalNotes(practitionerId: string): boolean {
    try {
      const allNotes = this.getAllPersonalNotes();
      delete allNotes[practitionerId];
      localStorage.setItem(STORAGE_KEYS.PERSONAL_NOTES, JSON.stringify(allNotes));
      return true;
    } catch (error) {
      console.error('Error deleting personal notes:', error);
      return false;
    }
  }

  /**
   * Sauvegarde un plan KOL
   */
  static saveKOLPlan(planId: string, plan: any): boolean {
    try {
      const allPlans = this.getAllKOLPlans();
      allPlans[planId] = {
        ...plan,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.KOL_PLANS, JSON.stringify(allPlans));
      return true;
    } catch (error) {
      console.error('Error saving KOL plan:', error);
      return false;
    }
  }

  /**
   * Récupère tous les plans KOL
   */
  static getAllKOLPlans(): Record<string, any> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.KOL_PLANS);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading KOL plans:', error);
      return {};
    }
  }

  /**
   * Récupère un plan KOL spécifique
   */
  static getKOLPlan(planId: string): any | null {
    try {
      const allPlans = this.getAllKOLPlans();
      return allPlans[planId] || null;
    } catch (error) {
      console.error('Error loading KOL plan:', error);
      return null;
    }
  }

  /**
   * Supprime un plan KOL
   */
  static deleteKOLPlan(planId: string): boolean {
    try {
      const allPlans = this.getAllKOLPlans();
      delete allPlans[planId];
      localStorage.setItem(STORAGE_KEYS.KOL_PLANS, JSON.stringify(allPlans));
      return true;
    } catch (error) {
      console.error('Error deleting KOL plan:', error);
      return false;
    }
  }

  /**
   * Sauvegarde une route optimisée
   */
  static saveTourRoute(routeId: string, route: any): boolean {
    try {
      const allRoutes = this.getAllTourRoutes();
      allRoutes[routeId] = {
        ...route,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.TOUR_ROUTES, JSON.stringify(allRoutes));
      return true;
    } catch (error) {
      console.error('Error saving tour route:', error);
      return false;
    }
  }

  /**
   * Récupère toutes les routes
   */
  static getAllTourRoutes(): Record<string, any> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TOUR_ROUTES);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading tour routes:', error);
      return {};
    }
  }

  /**
   * Récupère une route spécifique
   */
  static getTourRoute(routeId: string): any | null {
    try {
      const allRoutes = this.getAllTourRoutes();
      return allRoutes[routeId] || null;
    } catch (error) {
      console.error('Error loading tour route:', error);
      return null;
    }
  }

  /**
   * Supprime une route
   */
  static deleteTourRoute(routeId: string): boolean {
    try {
      const allRoutes = this.getAllTourRoutes();
      delete allRoutes[routeId];
      localStorage.setItem(STORAGE_KEYS.TOUR_ROUTES, JSON.stringify(allRoutes));
      return true;
    } catch (error) {
      console.error('Error deleting tour route:', error);
      return false;
    }
  }

  /**
   * Sauvegarde les préférences utilisateur
   */
  static saveUserPreferences(preferences: any): boolean {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
      return true;
    } catch (error) {
      console.error('Error saving user preferences:', error);
      return false;
    }
  }

  /**
   * Récupère les préférences utilisateur
   */
  static getUserPreferences(): any {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading user preferences:', error);
      return {};
    }
  }

  /**
   * Efface toutes les données sauvegardées
   */
  static clearAll(): boolean {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }

  /**
   * Exporte toutes les données en JSON (pour backup)
   */
  static exportData(): string {
    try {
      const data: Record<string, any> = {};
      Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
        const value = localStorage.getItem(key);
        if (value) {
          data[name] = JSON.parse(value);
        }
      });
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      return '{}';
    }
  }

  /**
   * Importe des données depuis JSON (pour restauration)
   */
  static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
        if (data[name]) {
          localStorage.setItem(key, JSON.stringify(data[name]));
        }
      });
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  /**
   * Vérifie si localStorage est disponible
   */
  static isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retourne l'espace utilisé (en Ko)
   */
  static getUsedSpace(): number {
    try {
      let total = 0;
      Object.values(STORAGE_KEYS).forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          total += value.length;
        }
      });
      return Math.round(total / 1024);
    } catch (error) {
      console.error('Error calculating storage size:', error);
      return 0;
    }
  }
}
