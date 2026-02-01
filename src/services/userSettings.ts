import { StorageService } from './storageService';

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  territory: string;
}

export interface NotificationSettings {
  upcomingVisits: boolean;
  unvisitedKOLs: boolean;
  objectivesReached: boolean;
  dailyReminders: boolean;
}

export interface UserSettings {
  profile: UserProfile;
  notifications: NotificationSettings;
  theme: 'light' | 'dark';
  language: 'fr' | 'en';
}

const DEFAULT_SETTINGS: UserSettings = {
  profile: {
    name: 'Marie Dupont',
    email: 'marie.dupont@airliquide.com',
    role: 'Déléguée Pharmaceutique',
    territory: 'Rhône-Alpes',
  },
  notifications: {
    upcomingVisits: true,
    unvisitedKOLs: true,
    objectivesReached: true,
    dailyReminders: false,
  },
  theme: 'light',
  language: 'fr',
};

/**
 * Service pour gérer les paramètres utilisateur
 */
export class UserSettingsService {
  private static SETTINGS_KEY = 'aria_user_settings';

  /**
   * Charge les paramètres utilisateur
   */
  static loadSettings(): UserSettings {
    try {
      const stored = localStorage.getItem(this.SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge avec defaults pour nouvelles propriétés
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
    return DEFAULT_SETTINGS;
  }

  /**
   * Sauvegarde les paramètres utilisateur
   */
  static saveSettings(settings: UserSettings): boolean {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving user settings:', error);
      return false;
    }
  }

  /**
   * Met à jour le profil utilisateur
   */
  static updateProfile(profile: Partial<UserProfile>): boolean {
    const settings = this.loadSettings();
    settings.profile = { ...settings.profile, ...profile };
    return this.saveSettings(settings);
  }

  /**
   * Met à jour les notifications
   */
  static updateNotifications(notifications: Partial<NotificationSettings>): boolean {
    const settings = this.loadSettings();
    settings.notifications = { ...settings.notifications, ...notifications };
    return this.saveSettings(settings);
  }

  /**
   * Met à jour le thème
   */
  static updateTheme(theme: 'light' | 'dark'): boolean {
    const settings = this.loadSettings();
    settings.theme = theme;
    return this.saveSettings(settings);
  }

  /**
   * Met à jour la langue
   */
  static updateLanguage(language: 'fr' | 'en'): boolean {
    const settings = this.loadSettings();
    settings.language = language;
    return this.saveSettings(settings);
  }

  /**
   * Exporte toutes les données utilisateur
   */
  static exportAllData(): string {
    const settings = this.loadSettings();
    const allData = StorageService.exportData();

    const exportData = {
      settings,
      data: JSON.parse(allData),
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Télécharge les données en fichier
   */
  static downloadData(): void {
    const data = this.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aria-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Efface toutes les données
   */
  static clearAllData(): boolean {
    try {
      localStorage.removeItem(this.SETTINGS_KEY);
      StorageService.clearAll();
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }
}
