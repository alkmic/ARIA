/**
 * Service de gestion de l'historique des pitchs
 * Persistance dans localStorage
 */

export interface PitchHistoryItem {
  id: string;
  practitionerId: string;
  practitionerName: string;
  content: string;
  config: {
    length: 'short' | 'medium' | 'long';
    tone: 'formal' | 'conversational' | 'technical';
    products: string[];
    competitors: string[];
  };
  timestamp: string;
  isFavorite?: boolean;
}

const STORAGE_KEY = 'aria_pitch_history';
const MAX_HISTORY_ITEMS = 100;

export class PitchHistoryService {
  /**
   * Récupère tout l'historique
   */
  static getAll(): PitchHistoryItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading pitch history:', error);
      return [];
    }
  }

  /**
   * Récupère l'historique d'un praticien
   */
  static getByPractitioner(practitionerId: string): PitchHistoryItem[] {
    return this.getAll().filter(item => item.practitionerId === practitionerId);
  }

  /**
   * Récupère les favoris
   */
  static getFavorites(): PitchHistoryItem[] {
    return this.getAll().filter(item => item.isFavorite);
  }

  /**
   * Ajoute un pitch à l'historique
   */
  static add(pitch: Omit<PitchHistoryItem, 'id' | 'timestamp'>): PitchHistoryItem {
    const newPitch: PitchHistoryItem = {
      ...pitch,
      id: `pitch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    const history = this.getAll();
    history.unshift(newPitch);

    // Limiter à MAX_HISTORY_ITEMS
    const trimmed = history.slice(0, MAX_HISTORY_ITEMS);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Error saving pitch history:', error);
    }

    return newPitch;
  }

  /**
   * Toggle favori
   */
  static toggleFavorite(pitchId: string): void {
    const history = this.getAll();
    const pitch = history.find(p => p.id === pitchId);
    if (pitch) {
      pitch.isFavorite = !pitch.isFavorite;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch (error) {
        console.error('Error updating pitch favorite:', error);
      }
    }
  }

  /**
   * Supprime un pitch
   */
  static delete(pitchId: string): void {
    const history = this.getAll().filter(p => p.id !== pitchId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error deleting pitch:', error);
    }
  }

  /**
   * Supprime tout l'historique
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing pitch history:', error);
    }
  }

  /**
   * Exporte l'historique en JSON
   */
  static exportJSON(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }
}
